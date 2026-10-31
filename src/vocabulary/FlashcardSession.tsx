import { useState } from "react";
import type { RatingValue, VocabularyItem } from "../db";
import { ratingChoices, recordRating } from "../ratings";

type Props = {
  collectionId: string;
  /** The cards as they stood when the session began. */
  items: VocabularyItem[];
  onBack: () => void;
};

export function FlashcardSession({ collectionId, items, onBack }: Props) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [position, setPosition] = useState(0);
  const [ended, setEnded] = useState(false);
  const item = items[position];

  if (ended || !item) {
    return (
      <section className="area-content">
        <p role="status">
          Session complete: {position} {position === 1 ? "card" : "cards"} rated
        </p>
        <button type="button" className="link-button" onClick={onBack}>
          Back to collection
        </button>
      </section>
    );
  }

  return (
    <section className="area-content">
      <div className="session-bar">
        <p className="muted">
          Card {position + 1} of {items.length}
        </p>
        <button type="button" className="link-button" onClick={() => setEnded(true)}>
          End session
        </button>
      </div>
      <Flashcard
        key={item.id}
        item={item}
        onRate={async (rating) => {
          // Move on only once the rating is saved, so nothing shown as done can
          // be lost by closing the app straight afterwards.
          await recordRating({
            kind: "vocabulary",
            cardId: item.id,
            topicId: collectionId,
            rating,
            sessionId,
          });
          setPosition(position + 1);
        }}
      />
    </section>
  );
}

type FlashcardProps = {
  item: VocabularyItem;
  onRate: (rating: RatingValue) => Promise<void>;
};

function Flashcard({ item, onRate }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const labelled = [
    { label: "Explanation", text: item.explanation },
    { label: "Etymology", text: item.etymology },
    { label: "History", text: item.history },
    { label: "Synonyms", text: item.synonyms },
  ].filter(({ text }) => text);
  const hasDetails =
    item.definition || item.example || item.pronunciation || labelled.length > 0;

  async function rate(rating: RatingValue) {
    setSaving(true);
    setSaveFailed(false);
    try {
      await onRate(rating);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flashcard" role="region" aria-label="Flashcard">
      <h3 lang="fr">{item.french}</h3>
      {revealed ? (
        <>
          <p className="flashcard-english">{item.english}</p>
          {hasDetails && (
            <details>
              <summary>Details</summary>
              {item.definition && <p>{item.definition}</p>}
              {labelled.map(({ label, text }) => (
                <p key={label}>
                  <strong>{label}:</strong> {text}
                </p>
              ))}
              {item.example && (
                <p lang="fr" className="multiline">
                  {item.example}
                </p>
              )}
              {item.pronunciation && <p>{item.pronunciation}</p>}
            </details>
          )}
          <div role="group" aria-label="Rate your recall" className="rating-buttons">
            {ratingChoices.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                className="action-button"
                disabled={saving}
                onClick={() => void rate(rating)}
              >
                {label}
              </button>
            ))}
          </div>
          {saveFailed && <p role="alert">That rating couldn't be saved. Please try again.</p>}
        </>
      ) : (
        <button type="button" className="primary-button" onClick={() => setRevealed(true)}>
          Show English
        </button>
      )}
    </article>
  );
}
