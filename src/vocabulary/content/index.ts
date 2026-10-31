import type { Collection, VocabularyItem } from "../../db";
import { mostCommonWords } from "./mostCommonWords";
import { usefulExpressions } from "./usefulExpressions";

export const builtInCollections = [mostCommonWords, usefulExpressions];

/**
 * savedAt 0 makes built-in rows older than any Learner edit, so an edit always
 * wins most-recent-save against the copy another device seeds for itself.
 */
export const seedCollections: Collection[] = builtInCollections.map(({ id, name }, position) => ({
  id,
  name,
  position,
  savedAt: 0,
}));

export const seedItems: VocabularyItem[] = builtInCollections.flatMap((collection) =>
  collection.items.map(({ slug, ...item }, position) => ({
    ...item,
    id: `${collection.id}/${slug}`,
    collectionId: collection.id,
    position,
    savedAt: 0,
  })),
);
