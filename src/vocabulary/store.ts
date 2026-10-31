import { useLiveQuery } from "dexie-react-hooks";
import type { GeneratedDetails } from "../ai/flashcardDetails";
import { db, type RatingValue, type VocabularyItem } from "../db";

export type ItemFields = Pick<
  VocabularyItem,
  | "french"
  | "english"
  | "definition"
  | "explanation"
  | "etymology"
  | "history"
  | "synonyms"
  | "example"
  | "pronunciation"
>;

/**
 * Rows saved before a card had these details lack them, and so can rows pulled from
 * a device still on an older version, so they are filled in on the way out rather
 * than once at upgrade.
 */
function withDetails(item: VocabularyItem): VocabularyItem {
  return { ...laterDetails, ...item };
}

const laterDetails = { explanation: "", etymology: "", history: "", synonyms: "" };

export function useCollections() {
  return useLiveQuery(() => db.collections.orderBy("position").toArray());
}

export function useCollection(id: string) {
  return useLiveQuery(() => db.collections.get(id), [id]);
}

export function useItems(collectionId: string) {
  return useLiveQuery(async () => {
    const items = await db.vocabularyItems
      .where("collectionId")
      .equals(collectionId)
      .sortBy("position");
    return items.map(withDetails);
  }, [collectionId]);
}

export function useItem(id: string) {
  return useLiveQuery(async () => {
    const item = await db.vocabularyItems.get(id);
    return item && withDetails(item);
  }, [id]);
}

/** The most recent self-rating of each card in a collection, by card id. */
export function useLastRatings(collectionId: string) {
  return useLiveQuery(async () => {
    const ratings = await db.flashcardRatings
      .where("topicId")
      .equals(collectionId)
      .sortBy("ratedAt");
    return new Map(ratings.map(({ cardId, rating }) => [cardId, rating]));
  }, [collectionId]);
}

type NewRating = {
  item: VocabularyItem;
  topicId: string;
  rating: RatingValue;
  sessionId: string;
};

export function recordRating({ item, topicId, rating, sessionId }: NewRating) {
  const now = new Date().toISOString();
  return db.flashcardRatings.add({
    id: crypto.randomUUID(),
    kind: "vocabulary",
    cardId: item.id,
    topicId,
    rating,
    sessionId,
    ratedAt: now,
    savedAt: now,
  });
}

export function createCollection(name: string) {
  return db.transaction("rw", db.collections, async () => {
    const last = await db.collections.orderBy("position").last();
    const id = crypto.randomUUID();
    await db.collections.add({
      id,
      name,
      position: (last?.position ?? -1) + 1,
      savedAt: new Date().toISOString(),
    });
    return id;
  });
}

export function addItem(collectionId: string, fields: ItemFields) {
  return db.transaction("rw", db.vocabularyItems, async () => {
    const items = await db.vocabularyItems.where("collectionId").equals(collectionId).toArray();
    await db.vocabularyItems.add({
      ...fields,
      id: crypto.randomUUID(),
      collectionId,
      position: Math.max(-1, ...items.map((item) => item.position)) + 1,
      savedAt: new Date().toISOString(),
    });
  });
}

export function updateItem(id: string, fields: ItemFields) {
  return db.vocabularyItems.update(id, { ...fields, savedAt: new Date().toISOString() });
}

/**
 * Writes only details that are blank now, not just when the AI was asked: the
 * Learner or another device may have filled one in meanwhile. Returns how many landed.
 */
export function saveGeneratedDetails(id: string, details: GeneratedDetails) {
  return db.transaction("rw", db.vocabularyItems, async () => {
    const stored = await db.vocabularyItems.get(id);
    if (!stored) return 0;
    const item = withDetails(stored);
    const entries = Object.entries(details).filter(
      ([name]) => item[name as keyof GeneratedDetails].trim() === "",
    );
    if (entries.length === 0) return 0;
    await db.vocabularyItems.update(id, {
      ...Object.fromEntries(entries),
      savedAt: new Date().toISOString(),
    });
    return entries.length;
  });
}
