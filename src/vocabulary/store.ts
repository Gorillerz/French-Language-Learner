import { useLiveQuery } from "dexie-react-hooks";
import { db, type FlashcardRating, type VocabularyItem } from "../db";

export type ItemFields = Pick<
  VocabularyItem,
  "french" | "english" | "definition" | "example" | "pronunciation"
>;

export function useCollections() {
  return useLiveQuery(() => db.collections.orderBy("position").toArray());
}

export function useCollection(id: string) {
  return useLiveQuery(() => db.collections.get(id), [id]);
}

export function useItems(collectionId: string) {
  return useLiveQuery(
    () => db.vocabularyItems.where("collectionId").equals(collectionId).sortBy("position"),
    [collectionId],
  );
}

export function useItem(id: string) {
  return useLiveQuery(() => db.vocabularyItems.get(id), [id]);
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
  rating: FlashcardRating["rating"];
  sessionId: string;
};

export function recordRating({ item, topicId, rating, sessionId }: NewRating) {
  const now = Date.now();
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
      savedAt: Date.now(),
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
      savedAt: Date.now(),
    });
  });
}

export function updateItem(id: string, fields: ItemFields) {
  return db.vocabularyItems.update(id, { ...fields, savedAt: Date.now() });
}
