import Dexie, { type EntityTable } from "dexie";
import type { SyncKeys } from "./sync/crypto";
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

/** One answered quiz question. Every attempt is kept, so a question can have many rows. */
export type QuizAttempt = {
  id: string;
  questionId: string;
  /** The collection or grammar concept id. */
  topicId: string;
  isCorrect: boolean;
  sessionId: string;
  /** ISO 8601. */
  answeredAt: string;
  /** ISO 8601. */
  savedAt: string;
};

/**
 * Every table that syncs. A table listed here needs rows with a string `id` and an
 * ISO `savedAt` that every write changes; nothing else has to know about sync.
 */
export const syncedTables = ["collections", "vocabularyItems"] as const;

/** A row's `savedAt` as the cloud holds it. A different local `savedAt` means unpushed. */
export type SyncedVersion = {
  /** `table/rowId`. */
  key: string;
  savedAt: string;
};

/** This device's link to the cloud. Absent until sync is set up. */
export type SyncDevice = {
  id: "this";
  email: string;
  token: string;
  /** Non-extractable, so this row cannot give up the raw key bytes. */
  keys: SyncKeys;
  cursor: number;
  /** The `syncedTables` the cursor has seen, so an added table pulls from the start. */
  cursorTables: string;
};

export const db = new Dexie("french-learning") as Dexie & {
  collections: EntityTable<Collection, "id">;
  vocabularyItems: EntityTable<VocabularyItem, "id">;
  flashcardRatings: EntityTable<FlashcardRating, "id">;
  quizAttempts: EntityTable<QuizAttempt, "id">;
  syncedVersions: EntityTable<SyncedVersion, "key">;
  syncDevice: EntityTable<SyncDevice, "id">;
};

db.version(1).stores({
  collections: "id, position",
  vocabularyItems: "id, collectionId",
  flashcardRatings: "id, kind, cardId, topicId, sessionId, ratedAt, savedAt",
});

db.version(2).stores({
  quizAttempts: "id, questionId, topicId, sessionId, answeredAt, savedAt",
});

db.version(3).stores({
  syncedVersions: "key",
  syncDevice: "id",
});

db.on("populate", async (tx) => {
  await tx.table("collections").bulkAdd(seedCollections);
  await tx.table("vocabularyItems").bulkAdd(seedItems);
});
