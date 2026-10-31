import { db, type FlashcardRating, type RatingValue } from "./db";

/** The 1 to 4 self-rating, as offered on every flashcard. */
export const ratingChoices: { rating: RatingValue; label: string }[] = [
  { rating: 1, label: "1 Forgot it" },
  { rating: 2, label: "2" },
  { rating: 3, label: "3" },
  { rating: 4, label: "4 Effortless" },
];

type NewRating = Pick<FlashcardRating, "kind" | "cardId" | "topicId" | "rating" | "sessionId">;

export async function recordRating(rating: NewRating) {
  const now = new Date().toISOString();
  await db.flashcardRatings.add({
    ...rating,
    id: crypto.randomUUID(),
    ratedAt: now,
    savedAt: now,
  });
}

export function averageRating(ratings: RatingValue[]) {
  const total = ratings.reduce<number>((sum, rating) => sum + rating, 0);
  return (total / ratings.length).toFixed(1);
}
