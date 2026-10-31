import { useEffect, useState } from "react";
import type { RatingValue } from "../db";
import { grammarConcepts, type GrammarConcept } from "./content";
import { FlashcardPractice } from "./FlashcardPractice";
import { directions, type Direction } from "./flashcards";
import { averageRating, loadConceptRatings } from "./ratings";

function describeRatings(ratings: RatingValue[]) {
  if (ratings.length === 0) return "No ratings yet";
  const noun = ratings.length === 1 ? "rating" : "ratings";
  return `${ratings.length} ${noun}, average ${averageRating(ratings)}`;
}

export function GrammarArea() {
  const [concept, setConcept] = useState<GrammarConcept | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);

  if (concept && direction) {
    return (
      <FlashcardPractice concept={concept} direction={direction} onClose={() => setDirection(null)} />
    );
  }

  if (concept) {
    return (
      <ConceptPage concept={concept} onPractise={setDirection} onBack={() => setConcept(null)} />
    );
  }

  return (
    <ul className="concept-list">
      {grammarConcepts.map((item) => (
        <li key={item.id}>
          <button type="button" className="concept-link" onClick={() => setConcept(item)}>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

type ConceptPageProps = {
  concept: GrammarConcept;
  onPractise: (direction: Direction) => void;
  onBack: () => void;
};

function ConceptPage({ concept, onPractise, onBack }: ConceptPageProps) {
  const [ratings, setRatings] = useState<RatingValue[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadConceptRatings(concept.id).then((loaded) => {
      if (!cancelled) setRatings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [concept.id]);

  return (
    <article className="concept">
      <button type="button" className="link-button" onClick={onBack}>
        All concepts
      </button>
      <h3>{concept.title}</h3>

      {concept.explanation.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <h4>Examples</h4>
      <ul className="examples">
        {concept.examples.map((example) => (
          <li key={example.fr}>
            <span lang="fr">{example.fr}</span>
            <span className="translation">{example.en}</span>
          </li>
        ))}
      </ul>

      <h4>Sentence flashcards</h4>
      {ratings && <p className="translation">{describeRatings(ratings)}</p>}
      <div className="practice-buttons">
        {directions.map((item) => (
          <button
            key={item.id}
            type="button"
            className="action-button"
            onClick={() => onPractise(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </article>
  );
}
