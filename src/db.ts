import Dexie, { type EntityTable } from "dexie";
import { seedCollections, seedItems } from "./vocabulary/content";

export type Collection = {
  id: string;
  name: string;
  position: number;
  savedAt: number;
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
  savedAt: number;
};

export type FlashcardRating = {
  id: string;
  kind: "vocabulary" | "grammar";
  cardId: string;
  /** The collection id for vocabulary, the grammar concept id for grammar. */
  topicId: string;
  rating: 1 | 2 | 3 | 4;
  sessionId: string;
  ratedAt: number;
  savedAt: number;
};

export const db = new Dexie("french-learning") as Dexie & {
  collections: EntityTable<Collection, "id">;
  vocabularyItems: EntityTable<VocabularyItem, "id">;
  flashcardRatings: EntityTable<FlashcardRating, "id">;
};

db.version(1).stores({
  collections: "id, position",
  vocabularyItems: "id, collectionId",
  flashcardRatings: "id, kind, cardId, topicId, sessionId, ratedAt",
});

db.on("populate", async (tx) => {
  await tx.table("collections").bulkAdd(seedCollections);
  await tx.table("vocabularyItems").bulkAdd(seedItems);
});
