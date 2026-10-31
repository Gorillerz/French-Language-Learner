import { useState } from "react";
import type { FlashcardRating, VocabularyItem } from "../db";
import { recordRating } from "./store";

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
      <section className="vocabulary">
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
    <section className="vocabulary">
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
          await recordRating({ item, topicId: collectionId, rating, sessionId });
          setPosition(position + 1);
        }}
      />
    </section>
  );
}

const ratings: { rating: FlashcardRating["rating"]; label?: string }[] = [
  { rating: 1, label: "Forgot it" },
  { rating: 2 },
  { rating: 3 },
  { rating: 4, label: "Effortless" },
];

type FlashcardProps = {
  item: VocabularyItem;
  onRate: (rating: FlashcardRating["rating"]) => Promise<void>;
};

function Flashcard({ item, onRate }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasDetails = item.definition || item.example || item.pronunciation;

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
              {item.example && <p lang="fr">{item.example}</p>}
              {item.pronunciation && <p>{item.pronunciation}</p>}
            </details>
          )}
          <div role="group" aria-label="Rate your recall" className="rating-buttons">
            {ratings.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  onRate(rating).catch(() => setSaving(false));
                }}
              >
                {label ? `${rating} ${label}` : rating}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button type="button" className="primary-button" onClick={() => setRevealed(true)}>
          Show English
        </button>
      )}
    </article>
  );
}
