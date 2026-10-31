import Dexie, { type EntityTable } from "dexie";
import { seedCollections, seedItems } from "./vocabulary/content";

export type Collection = {
  id: string;
  name: string;
  position: number;
  /** ISO 8601. */
  savedAt: string;
};

export type VocabularyItem = {
  id: string;
  collectionId: string;
  french: string;
  english: string;
  definition: string;
  example: string;
  pronunciation: string;
  position: number;
  /** ISO 8601. */
  savedAt: string;
};

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
  collections: EntityTable<Collection, "id">;
  vocabularyItems: EntityTable<VocabularyItem, "id">;
  flashcardRatings: EntityTable<FlashcardRating, "id">;
};

db.version(1).stores({
  collections: "id, position",
  vocabularyItems: "id, collectionId",
  flashcardRatings: "id, kind, cardId, topicId, sessionId, ratedAt, savedAt",
});

db.on("populate", async (tx) => {
  await tx.table("collections").bulkAdd(seedCollections);
  await tx.table("vocabularyItems").bulkAdd(seedItems);
});
