import { db, type FlashcardRating, type RatingValue } from "../db";

type NewRating = Pick<FlashcardRating, "cardId" | "topicId" | "rating" | "sessionId">;

export async function saveGrammarRating(rating: NewRating) {
  const now = new Date().toISOString();
  await db.flashcardRatings.add({
    ...rating,
    id: crypto.randomUUID(),
    kind: "grammar",
    ratedAt: now,
    savedAt: now,
  });
}

export async function loadConceptRatings(conceptId: string): Promise<RatingValue[]> {
  const rows = await db.flashcardRatings
    .where("topicId")
    .equals(conceptId)
    .filter((row) => row.kind === "grammar")
    .toArray();
  return rows.map((row) => row.rating);
}

export function averageRating(ratings: RatingValue[]) {
  const total = ratings.reduce<number>((sum, rating) => sum + rating, 0);
  return (total / ratings.length).toFixed(1);
}
