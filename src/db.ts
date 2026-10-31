import Dexie, { type EntityTable } from "dexie";

export type RatingValue = 1 | 2 | 3 | 4;

/** One flashcard self-rating. Every rating is kept, so a card can have many rows. */
export type FlashcardRating = {
  id: string;
  kind: "vocabulary" | "grammar";
  cardId: string;
  /** The collection or grammar concept id. */
  topicId: string;
  rating: RatingValue;
  sessionId: string;
  /** ISO 8601. */
  ratedAt: string;
  /** ISO 8601. */
  savedAt: string;
};

export const db = new Dexie("french-learning") as Dexie & {
  flashcardRatings: EntityTable<FlashcardRating, "id">;
};

db.version(1).stores({
  flashcardRatings: "id, kind, cardId, topicId, sessionId, ratedAt, savedAt",
});
