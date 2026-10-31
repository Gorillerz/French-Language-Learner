import { useLiveQuery } from "dexie-react-hooks";
import { db, type RatingValue } from "../db";

export function useConceptRatings(conceptId: string): RatingValue[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.flashcardRatings
      .where("topicId")
      .equals(conceptId)
      .filter((row) => row.kind === "grammar")
      .toArray();
    return rows.map((row) => row.rating);
  }, [conceptId]);
}
