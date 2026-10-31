import type { Page } from "@playwright/test";
import {
  flashcardRatings,
  practiseConcept,
  quizResults,
  sessions,
  studyCollection,
  takeQuiz,
  topicRow,
} from "./support/progress";
import { answer, currentQuestion, openArea, quizQuestion, startTopicQuiz } from "./support/quizzes";
import { joinDevice, setUpFirstDevice, syncStatus } from "./support/sync";
import { expect, test } from "./support/test";

async function openConcept(page: Page, name: string) {
  await openArea(page, "Grammar");
  await page.getByRole("button", { name }).click();
}

function directionChoice(page: Page, name: string) {
  return page.getByRole("radio", { name });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("quiz attempts on one device appear in Progress on the other", async ({ page, newDevice }) => {
  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);

  await takeQuiz(page, "Useful expressions", [true, false]);

  await openArea(other, "Progress");
  const collections = quizResults(other).getByRole("list", { name: "Vocabulary collections" });
  await expect(topicRow(collections, "Useful expressions")).toContainText("50% correct");
  await expect(sessions(other)).toContainText("1 of 2 correct (50%)");
});

test("flashcard ratings from vocabulary and grammar appear on the other device", async ({ page, newDevice }) => {
  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);

  await studyCollection(page, "Useful expressions", ["1 Forgot it", "4 Effortless"]);
  await practiseConcept(page, "Expressing cause", ["2"]);

  await openArea(other, "Progress");
  const collections = flashcardRatings(other).getByRole("list", { name: "Vocabulary collections" });
  await expect(topicRow(collections, "Useful expressions")).toContainText("Average 2.5");
  await expect(topicRow(collections, "Useful expressions")).toContainText("Rated 1: 1 · 2: 0 · 3: 0 · 4: 1");
  const grammar = flashcardRatings(other).getByRole("list", { name: "Grammar concepts" });
  await expect(topicRow(grammar, "Expressing cause")).toContainText("1 rating");
});

test("a concept page counts ratings made on another device while it is open", async ({ page, newDevice }) => {
  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);
  await openArea(other, "Grammar");
  await other.getByRole("button", { name: "Expressing cause" }).click();
  await expect(other.getByText("No ratings yet")).toBeVisible();

  await practiseConcept(page, "Expressing cause", ["3"]);

  await expect(other.getByText("1 rating, average 3.0")).toBeVisible();
});

test("both devices report the same study, with every session kept once", async ({ page, newDevice }) => {
  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);

  await takeQuiz(page, "Past tenses", [true, true]);
  await takeQuiz(other, "Past tenses", [false]);
  await studyCollection(other, "Useful expressions", ["2", "3"]);

  for (const device of [page, other]) {
    await openArea(device, "Progress");
    await expect(sessions(device)).toHaveCount(3);
    const grammar = quizResults(device).getByRole("list", { name: "Grammar concepts" });
    await expect(topicRow(grammar, "Past tenses")).toContainText("67% correct");
    await expect(topicRow(grammar, "Past tenses")).toContainText("3 attempts");
    await expect(sessions(device).filter({ hasText: "2 of 2 correct (100%)" })).toHaveCount(1);
    await expect(sessions(device).filter({ hasText: "0 of 1 correct (0%)" })).toHaveCount(1);
    await expect(sessions(device).filter({ hasText: "Average 2.5 from 2 ratings" })).toHaveCount(1);
  }

  // Further sync cycles must not count anything again.
  await expect(syncStatus(page)).toHaveText("Sync: up to date");
  await page.reload();
  await openArea(page, "Progress");
  await expect(sessions(page)).toHaveCount(3);
});

test("a device that joins later gets the whole history", async ({ page, newDevice }) => {
  await setUpFirstDevice(page);
  await takeQuiz(page, "Past tenses", [true]);
  await expect(syncStatus(page)).toHaveText("Sync: up to date");

  const other = await newDevice();
  await joinDevice(other);

  await openArea(other, "Progress");
  await expect(sessions(other)).toContainText("1 of 1 correct (100%)");
});

test("practice from before setup reaches the other device", async ({ page, newDevice }) => {
  await takeQuiz(page, "Useful expressions", [true]);
  await practiseConcept(page, "Expressing cause", ["2"]);

  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);

  await openArea(other, "Progress");
  await expect(sessions(other)).toHaveCount(2);
});

test("offline practice syncs automatically when the connection returns", async ({ page, context, newDevice }) => {
  await setUpFirstDevice(page);
  const other = await newDevice();
  await joinDevice(other);
  await openArea(other, "Progress");
  await expect(other.getByText("No study recorded yet.")).toBeVisible();

  await context.setOffline(true);
  await takeQuiz(page, "Useful expressions", [false]);
  await studyCollection(page, "Useful expressions", ["3"]);
  await expect(syncStatus(page)).toHaveText("Sync: waiting for connection");
  await expect(other.getByText("No study recorded yet.")).toBeVisible();

  await context.setOffline(false);

  await expect(sessions(other)).toHaveCount(2);
  await expect(sessions(other).filter({ hasText: "0 of 1 correct (0%)" })).toHaveCount(1);
});

test.describe("date-range filters", () => {
  test.use({ timezoneId: "UTC" });

  test("use the local calendar day of the device showing the report", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice({ timezoneId: "Pacific/Auckland" }); // UTC+13 in March
    await joinDevice(other);

    await page.clock.setFixedTime(new Date("2026-03-01T11:01:00.000Z")); // 2 March in Auckland.
    await takeQuiz(page, "Past tenses", [true]);
    await page.clock.setFixedTime(new Date("2026-03-05T12:00:00.000Z"));
    await takeQuiz(page, "Past tenses", [false]);

    await openArea(page, "Progress");
    await openArea(other, "Progress");
    await expect(sessions(other)).toHaveCount(2);

    for (const device of [page, other]) {
      await device.getByLabel("From", { exact: true }).fill("2026-03-02");
      await device.getByLabel("To", { exact: true }).fill("2026-03-02");
    }

    await expect(page.getByText("No study in this date range.")).toBeVisible();
    await expect(sessions(other)).toHaveCount(1);
    await expect(sessions(other)).toContainText("1 of 1 correct (100%)");
  });
});

test.describe("review priority", () => {
  test("a question missed on one device comes first on the other", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    await openArea(page, "Quiz");
    await startTopicQuiz(page, "The subjunctive");
    const missed = await answer(page, { correctly: false });
    await openArea(other, "Progress");
    await expect(sessions(other)).toHaveCount(1);

    await openArea(other, "Quiz");
    await startTopicQuiz(other, "The subjunctive");

    expect((await currentQuestion(other)).id).toBe(missed.id);
  });

  test("a concept rated low on one device leads a general quiz on the other", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    await practiseConcept(page, "Expressing cause", ["1 Forgot it"]);
    await openArea(other, "Progress");
    await expect(sessions(other)).toHaveCount(1);

    await openArea(other, "Quiz");
    await other.getByRole("button", { name: "Start general quiz" }).click();
    await expect(quizQuestion(other)).toBeVisible();

    expect((await currentQuestion(other)).topicId).toBe("expressing-cause");
  });
});

test("the cloud cannot read practice history", async ({ page, cloud, newDevice }) => {
  await setUpFirstDevice(page);
  await takeQuiz(page, "Useful expressions", [true]);
  await practiseConcept(page, "Expressing cause", ["2"]);
  await expect.poll(() => cloud.storedRecords().length).toBeGreaterThanOrEqual(2);

  const other = await newDevice();
  await joinDevice(other);
  await openArea(other, "Progress");
  await expect(sessions(other)).toHaveCount(2);

  const stored = cloud.everythingStored();
  const received = cloud.everythingReceived();
  for (const text of [
    "flashcardRatings",
    "quizAttempts",
    "sessionId",
    "isCorrect",
    "topicId",
    "useful-expressions",
    "expressing-cause",
  ]) {
    expect(stored).not.toContain(text);
    expect(received).not.toContain(text);
  }
});

test.describe("the default flashcard direction", () => {
  test("chosen on one device, it becomes the default on the other", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);
    await openConcept(other, "Past tenses");
    await expect(directionChoice(other, "French to English")).toBeChecked();

    await openConcept(page, "Expressing cause");
    await directionChoice(page, "English to French").check();

    await expect(directionChoice(other, "English to French")).toBeChecked();
    await other.getByRole("button", { name: "Practise flashcards" }).click();
    await expect(other.getByRole("region", { name: "Flashcard" })).toContainText("Translate into French");
  });

  test("a choice made offline syncs when the connection returns", async ({ page, context, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);
    await openConcept(other, "Past tenses");
    await context.setOffline(true);
    await openConcept(page, "Past tenses");
    await directionChoice(page, "English to French").check();
    await expect(syncStatus(page)).toHaveText("Sync: waiting for connection");

    await context.setOffline(false);

    await expect(directionChoice(other, "English to French")).toBeChecked();
  });

  test("when both devices choose offline, the later choice wins on both", async ({ page, context, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);
    await openConcept(page, "Past tenses");
    await openConcept(other, "Past tenses");
    await directionChoice(page, "English to French").check();
    await expect(directionChoice(other, "English to French")).toBeChecked();

    await context.setOffline(true);
    await other.context().setOffline(true);
    await directionChoice(page, "French to English").check();
    await directionChoice(other, "French to English").check();
    await directionChoice(other, "English to French").check();

    await other.context().setOffline(false);
    await expect(syncStatus(other)).toHaveText("Sync: up to date");
    await context.setOffline(false);

    await expect(directionChoice(page, "English to French")).toBeChecked();
    await expect(directionChoice(other, "English to French")).toBeChecked();
  });

  test("the cloud cannot read it", async ({ page, cloud }) => {
    await setUpFirstDevice(page);
    await openConcept(page, "Past tenses");
    await directionChoice(page, "English to French").check();
    await expect.poll(() => cloud.storedRecords().length).toBe(1);

    const received = cloud.everythingReceived();
    for (const text of ["settings", "irection", "en-fr"]) expect(received).not.toContain(text);
  });
});
