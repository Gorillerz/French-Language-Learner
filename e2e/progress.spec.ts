import type { Page } from "@playwright/test";
import { answer, openArea, quizQuestion, startTopicQuiz } from "./support/quizzes";
import { expect, test } from "./support/test";

function quizResults(page: Page) {
  return page.getByRole("region", { name: "Quiz results" });
}

function flashcardRatings(page: Page) {
  return page.getByRole("region", { name: "Flashcard ratings" });
}

function sessions(page: Page) {
  return page.getByRole("list", { name: "Sessions" }).getByRole("listitem");
}

function topicRow(section: ReturnType<Page["getByRole"]>, topic: string) {
  return section.getByRole("listitem").filter({ hasText: topic });
}

/** Answers the first questions of a focused quiz, one per entry, then ends the quiz. */
async function takeQuiz(page: Page, topic: string, answers: boolean[]) {
  await openArea(page, "Quiz");
  await startTopicQuiz(page, topic);
  for (const [index, correctly] of answers.entries()) {
    await expect(quizQuestion(page)).toContainText(`Question ${index + 1} of`);
    await answer(page, { correctly });
  }
  await page.getByRole("button", { name: "End quiz" }).click();
  await page.getByRole("button", { name: "Back to quizzes" }).click();
}

/** Rates the first cards of a collection, one per entry, then ends the session. */
async function studyCollection(page: Page, collection: string, ratings: string[]) {
  await openArea(page, "Vocabulary");
  await page.getByRole("button", { name: `Open ${collection}` }).click();
  await page.getByRole("button", { name: "Study flashcards" }).click();
  for (const [index, rating] of ratings.entries()) {
    await expect(page.getByText(`Card ${index + 1} of`)).toBeVisible();
    await page.getByRole("button", { name: "Show English" }).click();
    await page.getByRole("button", { name: rating, exact: true }).click();
  }
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: "Back to collection" }).click();
  await page.getByRole("button", { name: "Back to collections" }).click();
}

/** Rates the first cards of a grammar concept, one per entry, then leaves. */
async function practiseConcept(page: Page, concept: string, ratings: string[]) {
  await openArea(page, "Grammar");
  await page.getByRole("button", { name: concept }).click();
  await page.getByRole("button", { name: "French to English" }).click();
  for (const [index, rating] of ratings.entries()) {
    await expect(page.getByText(`Card ${index + 1} of`)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: rating, exact: true }).click();
  }
  await page.getByRole("button", { name: `Back to ${concept}` }).click();
}

test("before any study, Progress says there is nothing to report yet", async ({ page }) => {
  await page.goto("/");
  await openArea(page, "Progress");

  await expect(page.getByText("No study recorded yet.")).toBeVisible();
  await expect(sessions(page)).toHaveCount(0);
});

test("quiz results show percent correct and attempts by collection and grammar concept", async ({ page }) => {
  await page.goto("/");
  await takeQuiz(page, "Useful expressions", [true, true, false]);
  await takeQuiz(page, "Past tenses", [false]);

  await openArea(page, "Progress");

  const collections = quizResults(page).getByRole("list", { name: "Vocabulary collections" });
  await expect(topicRow(collections, "Useful expressions")).toContainText("67% correct");
  await expect(topicRow(collections, "Useful expressions")).toContainText("3 attempts");
  const grammar = quizResults(page).getByRole("list", { name: "Grammar concepts" });
  await expect(topicRow(grammar, "Past tenses")).toContainText("0% correct");
  await expect(topicRow(grammar, "Past tenses")).toContainText("1 attempt");
  await expect(grammar.getByRole("listitem")).toHaveCount(1);
});

test("flashcard ratings show counts and averages by collection and grammar concept", async ({ page }) => {
  await page.goto("/");
  await studyCollection(page, "Useful expressions", ["1 Forgot it", "4 Effortless", "4 Effortless"]);
  await practiseConcept(page, "Expressing cause", ["2", "3"]);

  await openArea(page, "Progress");

  const collections = flashcardRatings(page).getByRole("list", { name: "Vocabulary collections" });
  const expressions = topicRow(collections, "Useful expressions");
  await expect(expressions).toContainText("Average 3.0");
  await expect(expressions).toContainText("3 ratings");
  await expect(expressions).toContainText("Rated 1: 1 · 2: 0 · 3: 0 · 4: 2");
  const grammar = flashcardRatings(page).getByRole("list", { name: "Grammar concepts" });
  const cause = topicRow(grammar, "Expressing cause");
  await expect(cause).toContainText("Average 2.5");
  await expect(cause).toContainText("2 ratings");
  await expect(cause).toContainText("Rated 1: 0 · 2: 1 · 3: 1 · 4: 0");
});

test("each session keeps its own result, and repeated questions count every time", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-03-01T09:00:00.000Z"));
  await page.goto("/");
  await takeQuiz(page, "The subjunctive", [false]);

  await page.clock.setFixedTime(new Date("2026-03-02T09:00:00.000Z"));
  // The wrong answer comes back first, so this repeats the same question.
  await takeQuiz(page, "The subjunctive", [true]);

  await page.clock.setFixedTime(new Date("2026-03-03T09:00:00.000Z"));
  await studyCollection(page, "Useful expressions", ["2", "3"]);

  await openArea(page, "Progress");

  await expect(sessions(page)).toHaveCount(3);
  await expect(sessions(page).nth(0)).toContainText("Flashcards");
  await expect(sessions(page).nth(0)).toContainText("Useful expressions");
  await expect(sessions(page).nth(0)).toContainText("Average 2.5 from 2 ratings");
  await expect(sessions(page).nth(1)).toContainText("Quiz");
  await expect(sessions(page).nth(1)).toContainText("The subjunctive");
  await expect(sessions(page).nth(1)).toContainText("1 of 1 correct (100%)");
  await expect(sessions(page).nth(2)).toContainText("0 of 1 correct (0%)");
  const grammar = quizResults(page).getByRole("list", { name: "Grammar concepts" });
  await expect(topicRow(grammar, "The subjunctive")).toContainText("50% correct");
  await expect(topicRow(grammar, "The subjunctive")).toContainText("2 attempts");
});

test("a general quiz is one session across every topic it touched", async ({ page }) => {
  await page.goto("/");
  await openArea(page, "Quiz");
  await page.getByRole("button", { name: "Start general quiz" }).click();
  for (let question = 1; question <= 10; question++) {
    await expect(quizQuestion(page)).toContainText(`Question ${question} of 10`);
    await answer(page, { correctly: true });
  }
  await expect(page.getByRole("status").filter({ hasText: "10 of 10 correct" })).toBeVisible();

  await openArea(page, "Progress");

  await expect(sessions(page)).toHaveCount(1);
  await expect(sessions(page)).toContainText("10 of 10 correct (100%)");
  await expect(quizResults(page).getByRole("list", { name: "Vocabulary collections" })).toBeVisible();
  await expect(quizResults(page).getByRole("list", { name: "Grammar concepts" })).toBeVisible();
});

test("a Learner-created collection is reported under its own name", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New collection name").fill("Au bureau");
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill("la réunion");
  await page.getByLabel("English").fill("the meeting");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Study flashcards" }).click();
  await page.getByRole("button", { name: "Show English" }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();

  await openArea(page, "Progress");

  const collections = flashcardRatings(page).getByRole("list", { name: "Vocabulary collections" });
  await expect(topicRow(collections, "Au bureau")).toContainText("Average 3.0");
});

test.describe("date-range filters", () => {
  // UTC+13 in March, so these UTC evenings are already the next local day.
  test.use({ timezoneId: "Pacific/Auckland" });

  test("use local calendar days, inclusive at both ends", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-03-01T10:59:00.000Z")); // 1 March, 23:59 local
    await page.goto("/");
    await takeQuiz(page, "Past tenses", [true]);
    await page.clock.setFixedTime(new Date("2026-03-01T11:01:00.000Z")); // 2 March, 00:01 local
    await takeQuiz(page, "Past tenses", [false]);
    await page.clock.setFixedTime(new Date("2026-03-02T10:59:00.000Z")); // 2 March, 23:59 local
    await takeQuiz(page, "Past tenses", [false]);
    await studyCollection(page, "Useful expressions", ["2"]);
    await page.clock.setFixedTime(new Date("2026-03-02T11:01:00.000Z")); // 3 March, 00:01 local
    await takeQuiz(page, "Past tenses", [true]);
    await studyCollection(page, "Useful expressions", ["4 Effortless"]);

    await openArea(page, "Progress");
    await expect(sessions(page)).toHaveCount(6);
    const grammar = quizResults(page).getByRole("list", { name: "Grammar concepts" });
    const flashcards = flashcardRatings(page).getByRole("list", { name: "Vocabulary collections" });
    await expect(topicRow(grammar, "Past tenses")).toContainText("4 attempts");

    await page.getByLabel("From", { exact: true }).fill("2026-03-02");
    await page.getByLabel("To", { exact: true }).fill("2026-03-02");

    await expect(sessions(page)).toHaveCount(3);
    await expect(topicRow(grammar, "Past tenses")).toContainText("0% correct");
    await expect(topicRow(grammar, "Past tenses")).toContainText("2 attempts");
    await expect(topicRow(flashcards, "Useful expressions")).toContainText("Average 2.0");
    await expect(topicRow(flashcards, "Useful expressions")).toContainText("1 rating");

    await page.getByLabel("To", { exact: true }).fill("");
    await expect(topicRow(grammar, "Past tenses")).toContainText("3 attempts");

    await page.getByRole("button", { name: "Show all time" }).click();
    await expect(page.getByLabel("From", { exact: true })).toHaveValue("");
    await expect(topicRow(grammar, "Past tenses")).toContainText("4 attempts");
    await expect(sessions(page)).toHaveCount(6);
  });

  test("say so when nothing falls in the range", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-03-01T22:00:00.000Z"));
    await page.goto("/");
    await takeQuiz(page, "Past tenses", [true]);
    await openArea(page, "Progress");

    await page.getByLabel("From", { exact: true }).fill("2026-04-01");

    await expect(page.getByText("No study in this date range.")).toBeVisible();
    await expect(sessions(page)).toHaveCount(0);
  });
});

test("Progress works offline and shows study done offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();
  await page.close();

  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("/");
  await takeQuiz(offline, "Useful expressions", [true, false]);
  await offline.close();

  const reopened = await context.newPage();
  await reopened.goto("/");
  await openArea(reopened, "Progress");

  const collections = quizResults(reopened).getByRole("list", { name: "Vocabulary collections" });
  await expect(topicRow(collections, "Useful expressions")).toContainText("50% correct");
  await expect(sessions(reopened)).toContainText("1 of 2 correct (50%)");
});

test("reports fit the screen, even with a long collection name", async ({ page }) => {
  await page.goto("/");
  const longName = "Vocabulaire-pour-les-reunions-du-lundi-matin-au-bureau-et-ailleurs";
  await page.getByLabel("New collection name").fill(longName);
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill("la réunion");
  await page.getByLabel("English").fill("the meeting");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Study flashcards" }).click();
  await page.getByRole("button", { name: "Show English" }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();

  await openArea(page, "Progress");
  await expect(sessions(page)).toHaveCount(1);

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
