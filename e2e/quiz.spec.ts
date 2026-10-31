import type { Page } from "@playwright/test";
import { curatedQuestions } from "../src/quiz/content";
import { expect, test } from "./support/test";

type StoredAttempt = {
  id: string;
  questionId: string;
  topicId: string;
  isCorrect: boolean;
  sessionId: string;
  answeredAt: string;
  savedAt: string;
};

function openQuizzes(page: Page) {
  return page.getByRole("navigation", { name: "Areas" }).getByRole("button", { name: "Quiz" }).click();
}

function quizQuestion(page: Page) {
  return page.getByRole("region", { name: "Quiz question" });
}

/** Attempts have no Learner-visible home until #16, so read them from the local store. */
function storedAttempts(page: Page) {
  return page.evaluate(
    () =>
      new Promise<StoredAttempt[]>((resolve, reject) => {
        const open = indexedDB.open("french-learning");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const connection = open.result;
          const rows = connection.transaction("quizAttempts").objectStore("quizAttempts").getAll();
          rows.onerror = () => reject(rows.error);
          rows.onsuccess = () => {
            connection.close();
            resolve(rows.result);
          };
        };
      }),
  );
}

async function currentQuestion(page: Page) {
  const prompt = await quizQuestion(page).getByRole("heading").innerText();
  const question = curatedQuestions.find((candidate) => candidate.prompt === prompt);
  if (!question) throw new Error(`Not a curated question: ${prompt}`);
  return question;
}

function pickOption(page: Page, option: string) {
  return page
    .getByRole("group", { name: "Answer options" })
    .getByRole("button", { name: option, exact: true })
    .click();
}

/** Answers the current question and moves on. Returns the question that was asked. */
async function answer(page: Page, { correctly }: { correctly: boolean }) {
  const question = await currentQuestion(page);
  await pickOption(page, correctly ? question.answer : (question.distractors[0] as string));
  await quizQuestion(page).getByRole("button", { name: /Next question|See result/ }).click();
  return question;
}

async function startTopicQuiz(page: Page, topic: string) {
  await page.getByRole("button", { name: `Quiz on ${topic}` }).click();
  await expect(quizQuestion(page)).toBeVisible();
}

test("a right answer is confirmed, and a wrong one shows the answer key", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "The subjunctive");

  const first = await currentQuestion(page);
  await pickOption(page, first.answer);
  await expect(quizQuestion(page).getByRole("status")).toHaveText("Correct");
  await quizQuestion(page).getByRole("button", { name: "Next question" }).click();

  await expect(quizQuestion(page)).toContainText("Question 2 of 20");
  const second = await currentQuestion(page);
  await expect(quizQuestion(page).getByRole("status")).toHaveCount(0);
  await pickOption(page, second.distractors[0] as string);
  await expect(quizQuestion(page).getByRole("status")).toHaveText(
    `Incorrect. The answer is: ${second.answer}`,
  );
});

test("a question offers its answer and distractors, and can only be answered once", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "Useful expressions");

  const question = await currentQuestion(page);
  const options = page.getByRole("group", { name: "Answer options" }).getByRole("button");
  expect((await options.allInnerTexts()).sort()).toEqual([question.answer, ...question.distractors].sort());

  await pickOption(page, question.answer);
  for (const option of await options.all()) await expect(option).toBeDisabled();

  await expect.poll(async () => (await storedAttempts(page)).length).toBe(1);
});

test("a focused quiz covers the chosen topic and records every attempt", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "Past tenses");

  const asked = [await answer(page, { correctly: false })];
  for (let question = 2; question <= 20; question++) {
    await expect(quizQuestion(page)).toContainText(`Question ${question} of 20`);
    asked.push(await answer(page, { correctly: true }));
  }

  await expect(page.getByRole("status").filter({ hasText: "19 of 20 correct" })).toBeVisible();
  expect(new Set(asked.map(({ id }) => id)).size).toBe(20);
  expect(new Set(asked.map(({ topicId }) => topicId))).toEqual(new Set(["past-tenses"]));

  const attempts = await storedAttempts(page);
  expect(attempts).toHaveLength(20);
  expect(new Set(attempts.map(({ id }) => id)).size).toBe(20);
  expect(new Set(attempts.map(({ sessionId }) => sessionId)).size).toBe(1);
  expect(attempts.filter(({ isCorrect }) => !isCorrect).map(({ questionId }) => questionId)).toEqual([
    asked[0]?.id,
  ]);
  for (const attempt of attempts) {
    expect(attempt.topicId).toBe("past-tenses");
    expect(Date.parse(attempt.answeredAt)).not.toBeNaN();
    expect(attempt.savedAt).toBe(attempt.answeredAt);
  }
});

test("a general quiz draws from both vocabulary and grammar", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await page.getByRole("button", { name: "Start general quiz" }).click();

  const asked = [];
  for (let question = 1; question <= 10; question++) {
    await expect(quizQuestion(page)).toContainText(`Question ${question} of 10`);
    asked.push(await answer(page, { correctly: true }));
  }

  await expect(page.getByRole("status").filter({ hasText: "10 of 10 correct" })).toBeVisible();
  expect(new Set(asked.map(({ kind }) => kind))).toEqual(new Set(["vocabulary", "grammar"]));
  const sessions = (await storedAttempts(page)).map(({ sessionId }) => sessionId);
  expect(new Set(sessions).size).toBe(1);
});

test("a general quiz begins with the question the Learner got wrong", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "Object pronouns, y and en");
  const missed = await answer(page, { correctly: false });
  const known = await answer(page, { correctly: true });
  await page.getByRole("button", { name: "End quiz" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();
  await page.getByRole("button", { name: "Back to quizzes" }).click();

  await page.getByRole("button", { name: "Start general quiz" }).click();

  const asked = [await currentQuestion(page)];
  expect(asked[0]?.id).toBe(missed.id);
  for (let question = 1; question < 10; question++) {
    await answer(page, { correctly: true });
    await expect(quizQuestion(page)).toContainText(`Question ${question + 1} of 10`);
    asked.push(await currentQuestion(page));
  }
  expect(asked.map(({ id }) => id)).not.toContain(known.id);
});

test("a focused quiz also begins with what the Learner got wrong", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "Expressing cause");
  await answer(page, { correctly: true });
  const missed = await answer(page, { correctly: false });
  await page.getByRole("button", { name: "End quiz" }).click();
  await page.getByRole("button", { name: "Back to quizzes" }).click();

  await startTopicQuiz(page, "Expressing cause");

  expect((await currentQuestion(page)).id).toBe(missed.id);
});

test("low flashcard self-ratings bring a topic's questions forward", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grammar" }).click();
  await page.getByRole("button", { name: "Expressing cause" }).click();
  await page.getByRole("button", { name: "French to English" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: "Forgot it" }).click();
  await expect(page.getByText("Card 2 of")).toBeVisible();

  await openQuizzes(page);
  await page.getByRole("button", { name: "Start general quiz" }).click();

  expect((await currentQuestion(page)).topicId).toBe("expressing-cause");
});

test("the question reviewed longest ago comes first", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-03-01T09:00:00.000Z"));
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "The conditional and si clauses");
  const oldest = await answer(page, { correctly: true });

  await page.clock.setFixedTime(new Date("2026-04-01T09:00:00.000Z"));
  for (let question = 2; question <= 20; question++) {
    await expect(quizQuestion(page)).toContainText(`Question ${question} of 20`);
    await answer(page, { correctly: true });
  }
  await page.getByRole("button", { name: "Back to quizzes" }).click();

  await page.clock.setFixedTime(new Date("2026-04-02T09:00:00.000Z"));
  await startTopicQuiz(page, "The conditional and si clauses");

  expect((await currentQuestion(page)).id).toBe(oldest.id);
});

test("a collection without questions says so", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New collection name").fill("Au bureau");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("heading", { name: "Au bureau" })).toBeVisible();

  await openQuizzes(page);
  await page.getByRole("button", { name: "Quiz on Au bureau" }).click();

  await expect(page.getByText("Au bureau has no questions yet.")).toBeVisible();
  await expect(quizQuestion(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Back to quizzes" }).click();
  await expect(page.getByRole("button", { name: "Start general quiz" })).toBeVisible();
});

test("quizzes work offline and attempts count after the app reopens", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();
  await page.close();

  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("/");
  await openQuizzes(offline);
  await startTopicQuiz(offline, "100 most common French words");
  const missed = await answer(offline, { correctly: false });
  await expect(quizQuestion(offline)).toContainText("Question 2 of 20");
  await offline.close();

  const reopened = await context.newPage();
  await reopened.goto("/");
  await openQuizzes(reopened);
  await reopened.getByRole("button", { name: "Start general quiz" }).click();

  expect((await currentQuestion(reopened)).id).toBe(missed.id);
  expect(await storedAttempts(reopened)).toHaveLength(1);
});

test("the longest question fits the screen", async ({ page }) => {
  await page.goto("/");
  await openQuizzes(page);
  await startTopicQuiz(page, "Expressing cause");

  for (let question = 1; question <= 20; question++) {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await answer(page, { correctly: true });
  }
});

test("data saved before quizzes existed survives the upgrade", async ({ page }) => {
  // Any same-origin page that doesn't start the app, so the old database comes first.
  await page.goto("/icon.svg");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        // Dexie stores version 1 of a schema as native version 10.
        const open = indexedDB.open("french-learning", 10);
        open.onerror = () => reject(open.error);
        open.onupgradeneeded = () => {
          const connection = open.result;
          const collections = connection.createObjectStore("collections", { keyPath: "id" });
          collections.createIndex("position", "position");
          const items = connection.createObjectStore("vocabularyItems", { keyPath: "id" });
          items.createIndex("collectionId", "collectionId");
          const ratings = connection.createObjectStore("flashcardRatings", { keyPath: "id" });
          for (const index of ["kind", "cardId", "topicId", "sessionId", "ratedAt", "savedAt"]) {
            ratings.createIndex(index, index);
          }
          const savedAt = "2026-01-01T00:00:00.000Z";
          collections.add({ id: "mine", name: "Mes mots", position: 0, savedAt });
          items.add({
            id: "mine-1",
            collectionId: "mine",
            french: "la réunion",
            english: "the meeting",
            definition: "",
            example: "",
            pronunciation: "",
            position: 0,
            savedAt,
          });
          ratings.add({
            id: "rating-1",
            kind: "vocabulary",
            cardId: "mine-1",
            topicId: "mine",
            rating: 2,
            sessionId: "session-1",
            ratedAt: savedAt,
            savedAt,
          });
        };
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
      }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Open Mes mots" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "la réunion" })).toContainText(
    "Last rating: 2",
  );

  await openQuizzes(page);
  await startTopicQuiz(page, "The subjunctive");
  await answer(page, { correctly: true });
  await expect(quizQuestion(page)).toContainText("Question 2 of 20");
  expect(await storedAttempts(page)).toHaveLength(1);
});
