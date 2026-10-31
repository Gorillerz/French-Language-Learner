import { useState } from "react";
import type { RatingValue } from "../db";
import type { GrammarConcept } from "./content";
import { flashcardsFor, type Direction } from "./flashcards";
import { averageRating, saveGrammarRating } from "./ratings";

const ratingChoices: { value: RatingValue; label: string }[] = [
  { value: 1, label: "1 Forgot it" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4 Effortless" },
];

type Props = {
  concept: GrammarConcept;
  direction: Direction;
  onClose: () => void;
};

export function FlashcardPractice({ concept, direction, onClose }: Props) {
  const [cards] = useState(() => flashcardsFor(concept, direction));
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sessionRatings, setSessionRatings] = useState<RatingValue[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const card = cards[sessionRatings.length];
  const answerLang = direction.promptLang === "fr" ? "en" : "fr";

  async function rate(rating: RatingValue) {
    if (!card) return;
    setIsSaving(true);
    setSaveFailed(false);
    try {
      await saveGrammarRating({ cardId: card.id, topicId: concept.id, rating, sessionId });
      setSessionRatings((ratings) => [...ratings, rating]);
      setIsRevealed(false);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="concept" aria-label="Flashcard">
      <button type="button" className="link-button" onClick={onClose}>
        Back to {concept.title}
      </button>

      {!card ? (
        <p>
          {cards.length} cards rated, average {averageRating(sessionRatings)}
        </p>
      ) : (
        <>
          <p className="translation">
            Card {sessionRatings.length + 1} of {cards.length}
          </p>
          <p className="translation">{direction.instruction}</p>
          <p className="flashcard-text" lang={direction.promptLang}>
            {card.prompt}
          </p>
          {isRevealed ? (
            <>
              <p className="flashcard-text flashcard-answer" lang={answerLang}>
                {card.answer}
              </p>
              <div className="rating-buttons">
                {ratingChoices.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className="action-button"
                    disabled={isSaving}
                    onClick={() => rate(choice.value)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              {saveFailed && <p role="alert">That rating couldn't be saved. Please try again.</p>}
            </>
          ) : (
            <button type="button" className="action-button" onClick={() => setIsRevealed(true)}>
              Show answer
            </button>
          )}
        </>
      )}
    </section>
  );
}
