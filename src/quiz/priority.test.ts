import { describe, expect, it } from "vitest";
import { pickGeneralQuiz, rankByPriority, type ReviewEvidence } from "./priority";

const now = new Date("2026-06-15T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => hoursAgo(days * 24);

const question = (id: string, topicId = "topic") => ({ id, topicId });
const attempt = (questionId: string, isCorrect: boolean, answeredAt: string) => ({
  questionId,
  isCorrect,
  answeredAt,
});
const rating = (topicId: string, cardId: string, value: number, ratedAt = daysAgo(1)) => ({
  topicId,
  cardId,
  rating: value,
  ratedAt,
});

function order(
  questions: ReturnType<typeof question>[],
  evidence: Partial<ReviewEvidence>,
  random = () => 0.5,
) {
  return rankByPriority(questions, { attempts: [], ratings: [], ...evidence }, { now, random }).map(
    (item) => item.id,
  );
}

describe("review priority", () => {
  it("puts a question answered incorrectly ahead of one never answered", () => {
    const ranked = order([question("unseen"), question("missed")], {
      attempts: [attempt("missed", false, hoursAgo(1))],
    });

    expect(ranked).toEqual(["missed", "unseen"]);
  });

  it("ranks a fresh wrong answer above every other signal combined", () => {
    const ranked = order(
      [question("forgotten-topic", "weak"), question("missed", "strong")],
      {
        attempts: [attempt("missed", false, hoursAgo(1))],
        ratings: [rating("weak", "card", 1), rating("strong", "card", 4)],
      },
    );

    expect(ranked).toEqual(["missed", "forgotten-topic"]);
  });

  it("raises a question whose topic has low self-ratings", () => {
    const ranked = order([question("plain", "untouched"), question("weak", "struggling")], {
      ratings: [rating("struggling", "card-1", 1), rating("struggling", "card-2", 2)],
    });

    expect(ranked).toEqual(["weak", "plain"]);
  });

  it("lowers a question whose topic has strong self-ratings", () => {
    const ranked = order([question("confident", "easy"), question("plain", "untouched")], {
      ratings: [rating("easy", "card-1", 4), rating("easy", "card-2", 4)],
    });

    expect(ranked).toEqual(["plain", "confident"]);
  });

  it("counts only the latest self-rating of each card", () => {
    const ranked = order([question("plain", "untouched"), question("recovered", "better")], {
      ratings: [rating("better", "card", 4, daysAgo(1)), rating("better", "card", 1, daysAgo(9))],
    });

    expect(ranked).toEqual(["plain", "recovered"]);
  });

  it("raises a question the longer it has gone without review", () => {
    const ranked = order([question("yesterday"), question("last-month")], {
      attempts: [
        attempt("yesterday", true, daysAgo(1)),
        attempt("last-month", true, daysAgo(30)),
      ],
    });

    expect(ranked).toEqual(["last-month", "yesterday"]);
  });

  it("keeps raising priority with time, with no interval after which it stops", () => {
    const ranked = order([question("one-year"), question("two-years")], {
      attempts: [
        attempt("one-year", true, daysAgo(365)),
        attempt("two-years", true, daysAgo(730)),
      ],
    });

    expect(ranked).toEqual(["two-years", "one-year"]);
  });

  it("lowers a question with a run of correct answers", () => {
    const answeredAt = daysAgo(2);
    const ranked = order([question("solid"), question("once")], {
      attempts: [
        attempt("solid", true, daysAgo(40)),
        attempt("solid", true, daysAgo(20)),
        attempt("solid", true, answeredAt),
        attempt("once", true, answeredAt),
      ],
    });

    expect(ranked).toEqual(["once", "solid"]);
  });

  it("lets a recent mistake outweigh an older one", () => {
    const answeredAt = daysAgo(1);
    const ranked = order([question("recovering"), question("slipping")], {
      attempts: [
        attempt("recovering", false, daysAgo(3)),
        attempt("recovering", true, answeredAt),
        attempt("slipping", true, daysAgo(3)),
        attempt("slipping", false, answeredAt),
      ],
    });

    expect(ranked).toEqual(["slipping", "recovering"]);
  });

  it("reads attempts in time order, whatever order they are stored in", () => {
    const ranked = order([question("recovering"), question("slipping")], {
      attempts: [
        attempt("recovering", true, daysAgo(1)),
        attempt("recovering", false, daysAgo(3)),
        attempt("slipping", false, daysAgo(1)),
        attempt("slipping", true, daysAgo(3)),
      ],
    });

    expect(ranked).toEqual(["slipping", "recovering"]);
  });

  it("shuffles ties, following the injected randomness", () => {
    const tied = ["a", "b", "c", "d"].map((id) => question(id));
    const fromSequence = (...values: number[]) => () => values.shift() ?? 0;

    // Fisher-Yates from the last slot: swap with 0, then 0, then 0.
    expect(order(tied, {}, fromSequence(0, 0, 0))).toEqual(["b", "c", "d", "a"]);
    // 0.99 always picks the slot itself, leaving the input order.
    expect(order(tied, {}, fromSequence(0.99, 0.99, 0.99))).toEqual(["a", "b", "c", "d"]);
  });

  it("only shuffles among ties", () => {
    const questions = [question("a"), question("b"), question("c")];
    const ranked = order(questions, { attempts: [attempt("c", false, hoursAgo(1))] }, () => 0);

    expect(ranked[0]).toBe("c");
  });

  it("leaves the questions it was given in their order", () => {
    const questions = [question("a"), question("b"), question("c")];

    order(questions, {}, () => 0);

    expect(questions.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("general quiz selection", () => {
  const vocabulary = (id: string) => ({ id, kind: "vocabulary" as const });
  const grammar = (id: string) => ({ id, kind: "grammar" as const });

  it("takes the highest-ranked questions, in order", () => {
    const ranked = [grammar("g1"), vocabulary("v1"), grammar("g2"), vocabulary("v2")];

    expect(pickGeneralQuiz(ranked, 3).map((item) => item.id)).toEqual(["g1", "v1", "g2"]);
  });

  it("always draws from both vocabulary and grammar", () => {
    const ranked = [grammar("g1"), grammar("g2"), grammar("g3"), vocabulary("v1"), vocabulary("v2")];

    expect(pickGeneralQuiz(ranked, 3).map((item) => item.id)).toEqual(["g1", "g2", "v1"]);
  });

  it("gets by when one kind has no questions", () => {
    const ranked = [grammar("g1"), grammar("g2")];

    expect(pickGeneralQuiz(ranked, 5).map((item) => item.id)).toEqual(["g1", "g2"]);
  });
});
