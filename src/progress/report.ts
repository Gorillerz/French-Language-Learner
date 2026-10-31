import type { Collection, FlashcardRating, QuizAttempt, RatingValue } from "../db";
import { grammarConcepts } from "../grammar/content";
import { groupBy } from "../groupBy";
import { averageRating } from "../ratings";

export type ProgressActivity = {
  attempts: Pick<QuizAttempt, "topicId" | "isCorrect" | "sessionId" | "answeredAt">[];
  ratings: Pick<FlashcardRating, "kind" | "topicId" | "rating" | "sessionId" | "ratedAt">[];
  collections: Pick<Collection, "id" | "name">[];
};

/** Local calendar days as YYYY-MM-DD, both inclusive. A blank end is open. */
export type DateRange = { from: string; to: string };

export const allTime: DateRange = { from: "", to: "" };

export type QuizTopicResult = {
  topicId: string;
  name: string;
  percentCorrect: number;
  attempts: number;
};

export type FlashcardTopicResult = {
  topicId: string;
  name: string;
  average: string;
  ratings: number;
  /** How many times each rating was given: index 0 counts 1s, index 3 counts 4s. */
  counts: [number, number, number, number];
};

/** A session has at most one of each today, but both are derived from its rows. */
export type SessionResult = {
  sessionId: string;
  /** ISO 8601: the session's earliest answer or rating. */
  startedAt: string;
  topics: string[];
  quiz: { correct: number; attempts: number; percentCorrect: number } | null;
  flashcards: { average: string; ratings: number } | null;
};

const grammarNames = new Map(grammarConcepts.map(({ id, title }) => [id, title]));
const grammarOrder = grammarConcepts.map(({ id }) => id);

/** Groups rows by topic: known topics in `order`, then any this device can't name yet. */
function byTopic<Row extends { topicId: string }>(rows: Row[], order: string[]) {
  const groups = groupBy(rows, ({ topicId }) => topicId);
  const others = [...groups.keys()].filter((topicId) => !order.includes(topicId));
  return [...order, ...others].flatMap((topicId) => {
    const group = groups.get(topicId);
    return group ? [{ topicId, rows: group }] : [];
  });
}

function percentCorrect(attempts: { isCorrect: boolean }[]) {
  return Math.round((100 * attempts.filter(({ isCorrect }) => isCorrect).length) / attempts.length);
}

function ratingValues(ratings: { rating: RatingValue }[]) {
  return ratings.map(({ rating }) => rating);
}

function earliest(timestamps: string[]) {
  return timestamps.reduce((first, timestamp) =>
    Date.parse(timestamp) < Date.parse(first) ? timestamp : first,
  );
}

/** The Learner's local calendar day of a timestamp, as YYYY-MM-DD. */
function localDay(timestamp: string) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${month}-${day}`;
}

/**
 * Comparing calendar days rather than instants keeps a day whole whatever its
 * length, so the clocks changing can't push a row out of the range.
 */
function isWithin({ from, to }: DateRange, timestamp: string) {
  const day = localDay(timestamp);
  return (from === "" || day >= from) && (to === "" || day <= to);
}

/**
 * Everything is derived from stored rows on each call, so reports include rows
 * synced from other devices. A range filters individual rows, not whole
 * sessions, so session results always add up to the topic results beside them.
 */
export function buildProgressReport(
  { attempts: allAttempts, ratings: allRatings, collections }: ProgressActivity,
  range: DateRange = allTime,
) {
  const attempts = allAttempts.filter(({ answeredAt }) => isWithin(range, answeredAt));
  const ratings = allRatings.filter(({ ratedAt }) => isWithin(range, ratedAt));
  const collectionNames = new Map(collections.map(({ id, name }) => [id, name]));
  const collectionOrder = collections.map(({ id }) => id);
  const topicName = (topicId: string) =>
    grammarNames.get(topicId) ?? collectionNames.get(topicId) ?? "Unknown topic";

  const quizResults = (rows: ProgressActivity["attempts"], order: string[]) =>
    byTopic(rows, order).map(
      ({ topicId, rows: topicRows }): QuizTopicResult => ({
        topicId,
        name: topicName(topicId),
        percentCorrect: percentCorrect(topicRows),
        attempts: topicRows.length,
      }),
    );

  const flashcardResults = (rows: ProgressActivity["ratings"], order: string[]) =>
    byTopic(rows, order).map(({ topicId, rows: topicRows }): FlashcardTopicResult => {
      const values = ratingValues(topicRows);
      const count = (rating: RatingValue) => values.filter((value) => value === rating).length;
      return {
        topicId,
        name: topicName(topicId),
        average: averageRating(values),
        ratings: values.length,
        counts: [count(1), count(2), count(3), count(4)],
      };
    });

  function sessionResults() {
    const quizRows = groupBy(attempts, ({ sessionId }) => sessionId);
    const cardRows = groupBy(ratings, ({ sessionId }) => sessionId);
    const sessionIds = new Set([...quizRows.keys(), ...cardRows.keys()]);

    return [...sessionIds]
      .map((sessionId): SessionResult => {
        const sessionAttempts = quizRows.get(sessionId) ?? [];
        const sessionRatings = cardRows.get(sessionId) ?? [];
        const sessionTopics = byTopic([...sessionAttempts, ...sessionRatings], [
          ...collectionOrder,
          ...grammarOrder,
        ]);
        return {
          sessionId,
          startedAt: earliest([
            ...sessionAttempts.map(({ answeredAt }) => answeredAt),
            ...sessionRatings.map(({ ratedAt }) => ratedAt),
          ]),
          topics: sessionTopics.map(({ topicId }) => topicName(topicId)),
          quiz:
            sessionAttempts.length > 0
              ? {
                  correct: sessionAttempts.filter(({ isCorrect }) => isCorrect).length,
                  attempts: sessionAttempts.length,
                  percentCorrect: percentCorrect(sessionAttempts),
                }
              : null,
          flashcards:
            sessionRatings.length > 0
              ? { average: averageRating(ratingValues(sessionRatings)), ratings: sessionRatings.length }
              : null,
        };
      })
      .sort(
        (a, b) =>
          Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.sessionId.localeCompare(b.sessionId),
      );
  }

  // Attempts carry no kind, so a grammar concept is told apart by its id.
  const isGrammar = ({ topicId }: { topicId: string }) => grammarNames.has(topicId);

  return {
    sessions: sessionResults(),
    quizzes: {
      collections: quizResults(
        attempts.filter((attempt) => !isGrammar(attempt)),
        collectionOrder,
      ),
      grammar: quizResults(attempts.filter(isGrammar), grammarOrder),
    },
    flashcards: {
      collections: flashcardResults(
        ratings.filter(({ kind }) => kind === "vocabulary"),
        collectionOrder,
      ),
      grammar: flashcardResults(
        ratings.filter(({ kind }) => kind === "grammar"),
        grammarOrder,
      ),
    },
  };
}
