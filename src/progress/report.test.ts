import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildProgressReport } from "./report";

const collections = [{ id: "bureau", name: "Au bureau" }];

const attempt = (topicId: string, isCorrect: boolean, overrides = {}) => ({
  topicId,
  isCorrect,
  sessionId: "session-1",
  answeredAt: "2026-03-01T09:00:00.000Z",
  ...overrides,
});

const rating = (kind: "vocabulary" | "grammar", topicId: string, value: 1 | 2 | 3 | 4, overrides = {}) => ({
  kind,
  topicId,
  rating: value,
  sessionId: "session-2",
  ratedAt: "2026-03-01T09:00:00.000Z",
  ...overrides,
});

describe("date ranges", () => {
  beforeAll(() => {
    // Five hours behind UTC in March, so a local day ends at 05:00 UTC the next day.
    vi.stubEnv("TZ", "America/New_York");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  const attemptsAt = (...answeredAt: string[]) =>
    answeredAt.map((at) => attempt("bureau", true, { answeredAt: at }));

  function attemptCount(answeredAt: string[], range: { from: string; to: string }) {
    const { quizzes } = buildProgressReport(
      { collections, ratings: [], attempts: attemptsAt(...answeredAt) },
      range,
    );
    return quizzes.collections[0]?.attempts ?? 0;
  }

  it("includes all of the first and last local days, and nothing either side", () => {
    const range = { from: "2026-03-02", to: "2026-03-03" };

    expect(attemptCount(["2026-03-02T04:59:59.999Z"], range)).toBe(0);
    expect(attemptCount(["2026-03-02T05:00:00.000Z"], range)).toBe(1);
    expect(attemptCount(["2026-03-04T04:59:59.999Z"], range)).toBe(1);
    expect(attemptCount(["2026-03-04T05:00:00.000Z"], range)).toBe(0);
  });

  it("covers a whole local day even when the clocks change", () => {
    // New York's 1 November 2026 lasts 25 hours: EDT until 2am, then EST.
    const range = { from: "2026-11-01", to: "2026-11-01" };

    expect(attemptCount(["2026-11-01T03:59:59.999Z"], range)).toBe(0);
    expect(attemptCount(["2026-11-01T04:00:00.000Z"], range)).toBe(1);
    expect(attemptCount(["2026-11-02T04:59:59.999Z"], range)).toBe(1);
    expect(attemptCount(["2026-11-02T05:00:00.000Z"], range)).toBe(0);
  });

  it("leaves a blank end of the range open", () => {
    const answers = ["2026-03-01T12:00:00.000Z", "2026-03-02T12:00:00.000Z", "2026-03-03T12:00:00.000Z"];

    expect(attemptCount(answers, { from: "2026-03-02", to: "" })).toBe(2);
    expect(attemptCount(answers, { from: "", to: "2026-03-02" })).toBe(2);
    expect(attemptCount(answers, { from: "", to: "" })).toBe(3);
  });

  it("filters flashcard ratings the same way", () => {
    const report = buildProgressReport(
      {
        collections,
        attempts: [],
        ratings: [
          rating("vocabulary", "bureau", 1, { ratedAt: "2026-03-01T12:00:00.000Z" }),
          rating("vocabulary", "bureau", 4, { ratedAt: "2026-03-02T12:00:00.000Z" }),
        ],
      },
      { from: "2026-03-02", to: "2026-03-02" },
    );

    expect(report.flashcards.collections).toEqual([
      { topicId: "bureau", name: "Au bureau", average: "4.0", ratings: 1, counts: [0, 0, 0, 1] },
    ]);
  });

  it("counts only the part of a session inside the range, so sessions match the totals", () => {
    const report = buildProgressReport(
      {
        collections,
        ratings: [],
        attempts: [
          attempt("bureau", false, { answeredAt: "2026-03-02T04:50:00.000Z" }),
          attempt("bureau", true, { answeredAt: "2026-03-02T05:10:00.000Z" }),
        ],
      },
      { from: "2026-03-02", to: "2026-03-02" },
    );

    expect(report.sessions).toEqual([
      expect.objectContaining({
        startedAt: "2026-03-02T05:10:00.000Z",
        quiz: { correct: 1, attempts: 1, percentCorrect: 100 },
      }),
    ]);
  });
});

describe("session results", () => {
  it("gives each session its own result, newest first, repeated attempts included", () => {
    const report = buildProgressReport({
      collections,
      attempts: [
        attempt("past-tenses", true, { sessionId: "older", answeredAt: "2026-03-01T09:00:00.000Z" }),
        attempt("bureau", false, { sessionId: "older", answeredAt: "2026-03-01T09:01:00.000Z" }),
        attempt("bureau", true, { sessionId: "newer", answeredAt: "2026-03-02T09:00:00.000Z" }),
      ],
      ratings: [
        rating("vocabulary", "bureau", 2, { sessionId: "cards", ratedAt: "2026-03-01T12:00:00.000Z" }),
        rating("vocabulary", "bureau", 3, { sessionId: "cards", ratedAt: "2026-03-01T12:01:00.000Z" }),
      ],
    });

    expect(report.sessions).toEqual([
      {
        sessionId: "newer",
        startedAt: "2026-03-02T09:00:00.000Z",
        topics: ["Au bureau"],
        quiz: { correct: 1, attempts: 1, percentCorrect: 100 },
        flashcards: null,
      },
      {
        sessionId: "cards",
        startedAt: "2026-03-01T12:00:00.000Z",
        topics: ["Au bureau"],
        quiz: null,
        flashcards: { average: "2.5", ratings: 2 },
      },
      {
        sessionId: "older",
        startedAt: "2026-03-01T09:00:00.000Z",
        topics: ["Au bureau", "Past tenses"],
        quiz: { correct: 1, attempts: 2, percentCorrect: 50 },
        flashcards: null,
      },
    ]);
  });
});

describe("flashcard ratings", () => {
  it("reports each 1-4 rating's count, the average and the total, by collection and grammar concept", () => {
    const report = buildProgressReport({
      collections,
      attempts: [],
      ratings: [
        rating("vocabulary", "bureau", 1),
        rating("vocabulary", "bureau", 4),
        rating("vocabulary", "bureau", 4),
        rating("grammar", "past-tenses", 2),
      ],
    });

    expect(report.flashcards.collections).toEqual([
      { topicId: "bureau", name: "Au bureau", average: "3.0", ratings: 3, counts: [1, 0, 0, 2] },
    ]);
    expect(report.flashcards.grammar).toEqual([
      { topicId: "past-tenses", name: "Past tenses", average: "2.0", ratings: 1, counts: [0, 1, 0, 0] },
    ]);
  });
});

describe("quiz results", () => {
  it("lists topics in the order the Learner knows them, not the order they were practised", () => {
    const report = buildProgressReport({
      collections: [
        { id: "first", name: "First" },
        { id: "second", name: "Second" },
      ],
      ratings: [],
      attempts: [
        attempt("second", true),
        attempt("first", true),
        attempt("expressing-cause", true),
        attempt("past-tenses", true),
      ],
    });

    expect(report.quizzes.collections.map(({ name }) => name)).toEqual(["First", "Second"]);
    expect(report.quizzes.grammar.map(({ name }) => name)).toEqual(["Past tenses", "Expressing cause"]);
  });

  it("keeps attempts whose collection this device doesn't know yet", () => {
    const report = buildProgressReport({
      collections,
      ratings: [],
      attempts: [attempt("synced-later", true), attempt("bureau", false)],
    });

    expect(report.quizzes.collections).toEqual([
      { topicId: "bureau", name: "Au bureau", percentCorrect: 0, attempts: 1 },
      { topicId: "synced-later", name: "Unknown topic", percentCorrect: 100, attempts: 1 },
    ]);
  });

  it("reports percent correct and every attempt, by collection and by grammar concept", () => {
    const report = buildProgressReport({
      collections,
      ratings: [],
      attempts: [
        attempt("bureau", true),
        attempt("bureau", true),
        attempt("bureau", false),
        attempt("past-tenses", false),
      ],
    });

    expect(report.quizzes.collections).toEqual([
      { topicId: "bureau", name: "Au bureau", percentCorrect: 67, attempts: 3 },
    ]);
    expect(report.quizzes.grammar).toEqual([
      { topicId: "past-tenses", name: "Past tenses", percentCorrect: 0, attempts: 1 },
    ]);
  });
});
