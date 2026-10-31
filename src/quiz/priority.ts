/**
 * Review priority: a relative ordering, never a schedule. A question has no due
 * date and is never finished; scores only say which question to ask first.
 */

export type ReviewEvidence = {
  attempts: { questionId: string; isCorrect: boolean; answeredAt: string }[];
  /** Flashcard self-ratings. Cards don't map onto questions, so they count per topic. */
  ratings: { topicId: string; cardId: string; rating: number; ratedAt: string }[];
};

type Options = {
  now: Date;
  /** Returns a number in [0, 1), like Math.random. */
  random: () => number;
};

// The weights are chosen so that a wrong latest answer always leads: its minimum
// is MISTAKE_WEIGHT - RATING_WEIGHT, more than anything without a mistake can
// reach (MAX_TIME_WEIGHT + RATING_WEIGHT).
const MISTAKE_WEIGHT = 10;
const RATING_WEIGHT = 3;
const MAX_TIME_WEIGHT = 3;
const STREAK_WEIGHT = 2;

/** Each older attempt counts half as much as the one after it. */
const AGE_DECAY = 0.5;
/** Self-ratings run from 1 to 4, so this is the neutral average. */
const NEUTRAL_RATING = 2.5;
const RATING_RANGE = 1.5;
/** Sets the pace of the time signal: half its maximum after this many days. */
const TIME_HALF_POINT_DAYS = 7;

const DAY_MS = 86_400_000;

const byTime = (a: string, b: string) => Date.parse(a) - Date.parse(b);

function groupBy<T>(rows: T[], keyOf: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(keyOf(row));
    if (group) group.push(row);
    else groups.set(keyOf(row), [row]);
  }
  return groups;
}

/** Above zero for a topic rated low, below zero for one rated high. */
function ratingSignal(ratings: ReviewEvidence["ratings"]) {
  const latestByCard = new Map(
    [...ratings]
      .sort((a, b) => byTime(a.ratedAt, b.ratedAt))
      .map(({ cardId, rating }) => [cardId, rating]),
  );
  if (latestByCard.size === 0) return 0;
  const latest = [...latestByCard.values()];
  const average = latest.reduce((sum, rating) => sum + rating, 0) / latest.length;
  return ((NEUTRAL_RATING - average) / RATING_RANGE) * RATING_WEIGHT;
}

function attemptSignal(attempts: ReviewEvidence["attempts"], now: Date) {
  const newestFirst = [...attempts].sort((a, b) => byTime(b.answeredAt, a.answeredAt));
  const latest = newestFirst[0];
  if (!latest) return MAX_TIME_WEIGHT;

  const mistakes = newestFirst.reduce(
    (sum, { isCorrect }, age) => (isCorrect ? sum : sum + AGE_DECAY ** age),
    0,
  );
  const firstMistake = newestFirst.findIndex(({ isCorrect }) => !isCorrect);
  const streak = firstMistake === -1 ? newestFirst.length : firstMistake;
  const days = Math.max(0, now.getTime() - Date.parse(latest.answeredAt)) / DAY_MS;

  return (
    mistakes * MISTAKE_WEIGHT +
    MAX_TIME_WEIGHT * (days / (days + TIME_HALF_POINT_DAYS)) -
    STREAK_WEIGHT * (1 - AGE_DECAY ** streak)
  );
}

export function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let last = result.length - 1; last > 0; last--) {
    const other = Math.floor(random() * (last + 1));
    [result[last], result[other]] = [result[other] as T, result[last] as T];
  }
  return result;
}

/** Highest priority first. Equal priorities come out in random order. */
export function rankByPriority<Q extends { id: string; topicId: string }>(
  questions: Q[],
  evidence: ReviewEvidence,
  { now, random }: Options,
): Q[] {
  const attempts = groupBy(evidence.attempts, ({ questionId }) => questionId);
  const ratings = groupBy(evidence.ratings, ({ topicId }) => topicId);
  const scores = new Map(
    questions.map(({ id, topicId }) => [
      id,
      attemptSignal(attempts.get(id) ?? [], now) + ratingSignal(ratings.get(topicId) ?? []),
    ]),
  );
  const scoreOf = ({ id }: Q) => scores.get(id) ?? 0;

  // Array.prototype.sort is stable, so ties keep their shuffled order.
  return shuffled(questions, random).sort((a, b) => scoreOf(b) - scoreOf(a));
}

/**
 * The first `size` ranked questions, with the last swapped out if that's what it
 * takes for a general quiz to draw on both vocabulary and grammar.
 */
export function pickGeneralQuiz<Q extends { kind: "vocabulary" | "grammar" }>(
  ranked: Q[],
  size: number,
): Q[] {
  const picked = ranked.slice(0, size);
  const hasKind = (kind: Q["kind"]) => picked.some((question) => question.kind === kind);
  const missing = hasKind("vocabulary") ? "grammar" : "vocabulary";
  const substitute = ranked.find((question) => question.kind === missing);
  if (!hasKind(missing) && substitute) picked[picked.length - 1] = substitute;
  return picked;
}
