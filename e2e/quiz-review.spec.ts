import type { Page } from "@playwright/test";
import {
  answerGenerated,
  apiKey,
  batch,
  batchReply,
  chatBody,
  createCollection,
  generateBatch,
  nextQuestion,
  replyWith,
  reviewPanel,
  saveKey,
  sendButton,
} from "./support/generation";
import { sessions, takeQuiz, topicRow, quizResults } from "./support/progress";
import { answer, openArea, quizQuestion, startTopicQuiz } from "./support/quizzes";
import { joinDevice, setUpFirstDevice, syncStatus } from "./support/sync";
import { expect, test } from "./support/test";

function quizReview(page: Page) {
  return page.getByRole("region", { name: "Quiz review" });
}

function reviewed(page: Page, position: number) {
  return quizReview(page).getByRole("article", { name: `Question ${position}`, exact: true });
}

function option(page: Page, position: number, text: string) {
  return reviewed(page, position).getByRole("listitem").filter({ hasText: text });
}

async function collectionWithBatch(page: Page, ai: Parameters<typeof generateBatch>[1], questions = batch()) {
  await saveKey(page);
  await createCollection(page, "Au bureau", "la réunion", "the meeting");
  await openArea(page, "Quiz");
  await generateBatch(page, ai, "Au bureau", questions);
  return questions;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("reviewing a quiz", () => {
  test("every option's explanation appears from the end of a session, and only there", async ({ page, ai }) => {
    const questions = await collectionWithBatch(page, ai);
    await startTopicQuiz(page, "Au bureau");

    const first = await answerGenerated(page, questions, { correctly: false });
    await expect(quizQuestion(page).getByRole("status")).toBeVisible();
    for (const { explanation } of [first.answer, ...first.distractors]) {
      await expect(page.getByText(explanation)).toHaveCount(0);
    }
    await nextQuestion(page);
    await expect(quizQuestion(page)).toContainText("Question 2 of 10");
    const second = await answerGenerated(page, questions, { correctly: true });
    await nextQuestion(page);
    const unanswered = questions.filter((candidate) => candidate !== first && candidate !== second);

    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();

    await expect(quizReview(page).getByRole("article")).toHaveCount(2);
    await expect(reviewed(page, 1)).toContainText(first.prompt);
    await expect(reviewed(page, 1)).toContainText("Incorrect");
    for (const { text, explanation } of [first.answer, ...first.distractors]) {
      await expect(option(page, 1, text)).toContainText(explanation);
    }
    await expect(option(page, 1, first.answer.text)).toContainText("Correct answer");
    await expect(option(page, 1, first.answer.text)).not.toContainText("Your answer");
    await expect(option(page, 1, first.distractors[0]!.text)).toContainText("Your answer");

    await expect(reviewed(page, 2)).toContainText(second.prompt);
    await expect(option(page, 2, second.answer.text)).toContainText("Correct answer");
    await expect(option(page, 2, second.answer.text)).toContainText("Your answer");

    for (const { prompt, answer: key } of unanswered) {
      await expect(page.getByText(prompt)).toHaveCount(0);
      await expect(page.getByText(key.explanation)).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Back to result" }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 of 2 correct" })).toBeVisible();
  });

  test("a curated question shows just the correct and chosen answers", async ({ page }) => {
    await openArea(page, "Quiz");
    await startTopicQuiz(page, "Useful expressions");
    const missed = await answer(page, { correctly: false });
    const known = await answer(page, { correctly: true });
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();

    await expect(reviewed(page, 1)).toContainText(missed.prompt);
    await expect(reviewed(page, 1).getByRole("listitem")).toHaveCount(2);
    await expect(option(page, 1, missed.answer)).toContainText("Correct answer");
    await expect(option(page, 1, missed.distractors[0]!)).toContainText("Your answer");
    await expect(reviewed(page, 2).getByRole("listitem")).toHaveCount(1);
    await expect(option(page, 2, known.answer)).toContainText("Correct answer");
    await expect(option(page, 2, known.answer)).toContainText("Your answer");
  });

  test("no answers means nothing to review", async ({ page }) => {
    await openArea(page, "Quiz");
    await startTopicQuiz(page, "Useful expressions");
    await page.getByRole("button", { name: "End quiz" }).click();

    await expect(page.getByText("No questions answered")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review answers" })).toHaveCount(0);
  });

  test("a past quiz can be reviewed from the quiz area", async ({ page }) => {
    await takeQuiz(page, "Useful expressions", [true, false]);

    await page
      .getByRole("list", { name: "Recent quizzes" })
      .getByRole("button", { name: /Review Useful expressions: 1 of 2 correct/ })
      .click();

    await expect(quizReview(page).getByRole("article")).toHaveCount(2);
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    await expect(page.getByRole("button", { name: "Start general quiz" })).toBeVisible();
  });

  test("an attempt saved before answers were kept can still be reviewed", async ({ page }) => {
    await takeQuiz(page, "Useful expressions", [false]);
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("french-learning");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const connection = open.result;
            const tx = connection.transaction("quizAttempts", "readwrite");
            const store = tx.objectStore("quizAttempts");
            const all = store.getAll();
            all.onsuccess = () => {
              for (const { chosenOption: _dropped, ...attempt } of all.result) store.put(attempt);
            };
            tx.oncomplete = () => {
              connection.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await openArea(page, "Quiz");

    await page.getByRole("button", { name: /Review Useful expressions/ }).click();

    await expect(reviewed(page, 1)).toContainText("Your answer to this question was not recorded.");
    await expect(reviewed(page, 1).getByRole("listitem")).toHaveCount(1);
    await expect(reviewed(page, 1)).toContainText("Correct answer");
  });

  test("a long review fits the screen", async ({ page, ai }) => {
    const questions = await collectionWithBatch(page, ai);
    await startTopicQuiz(page, "Au bureau");
    for (let position = 1; position <= 10; position++) {
      await expect(quizQuestion(page)).toContainText(`Question ${position} of 10`);
      await answerGenerated(page, questions, { correctly: false });
      await nextQuestion(page);
    }
    await page.getByRole("button", { name: "Review answers" }).click();
    await expect(quizReview(page).getByRole("article")).toHaveCount(10);

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});

test.describe("follow-up questions", () => {
  test("go through the request review, carry only this question, and are not kept", async ({ page, ai }) => {
    const questions = await collectionWithBatch(page, ai);
    const sentBefore = ai.requests.length;
    await startTopicQuiz(page, "Au bureau");
    const asked = await answerGenerated(page, questions, { correctly: false });
    await nextQuestion(page);
    const other = await answerGenerated(page, questions, { correctly: true });
    await nextQuestion(page);
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();

    const row = reviewed(page, 1);
    await row.getByRole("button", { name: "Ask AI about this question" }).click();
    ai.respond("POST", "/chat/completions", replyWith("Parce que le contexte l'exige."));
    await row.getByLabel("Your question").fill("Why not the other one?");
    await row.getByRole("button", { name: "Ask AI" }).click();
    expect(ai.requests).toHaveLength(sentBefore);
    const shown = (await reviewPanel(page).textContent())!;
    await sendButton(page).click();

    const answers = row.getByRole("list", { name: "AI answers" });
    await expect(answers).toContainText("Parce que le contexte l'exige.");

    const first = chatBody(ai, sentBefore).messages;
    expect(first.map(({ role }) => role)).toEqual(["system", "user"]);
    expect(first[1]!.content).toBe("Why not the other one?");
    const context = first[0]!.content;
    for (const { content } of first) expect(shown).toContain(content);
    expect(context).toContain(asked.prompt);
    for (const { text, explanation } of [asked.answer, ...asked.distractors]) {
      expect(context).toContain(text);
      expect(context).toContain(explanation);
    }
    expect(context).toContain(`The Learner chose: ${asked.distractors[0]!.text}`);

    ai.respond("POST", "/chat/completions", replyWith("Oui, toujours."));
    await row.getByLabel("Your question").fill("Always?");
    await row.getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();
    await expect(answers).toContainText("Oui, toujours.");
    expect(chatBody(ai, sentBefore + 1).messages.slice(1)).toEqual([
      { role: "user", content: "Why not the other one?" },
      { role: "assistant", content: "Parce que le contexte l'exige." },
      { role: "user", content: "Always?" },
    ]);

    const sent = JSON.stringify(ai.requests.slice(sentBefore).map(({ body, path }) => ({ body, path })));
    for (const unrelated of [
      other.prompt,
      other.answer.text,
      "Au bureau",
      "la réunion",
      "isCorrect",
      "sessionId",
      "savedAt",
      "rating",
      apiKey,
    ]) {
      expect(sent).not.toContain(unrelated);
    }

    await page.getByRole("button", { name: "Back to result" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();
    await expect(page.getByText("Parce que le contexte l'exige.")).toHaveCount(0);
    await page.getByRole("button", { name: "Back to result" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    await page.getByRole("button", { name: /Review Au bureau/ }).click();
    await expect(page.getByText("Parce que le contexte l'exige.")).toHaveCount(0);
  });

  test("work on a curated question too", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", replyWith("Voilà pourquoi."));
    await saveKey(page);
    await openArea(page, "Quiz");
    await startTopicQuiz(page, "Useful expressions");
    const missed = await answer(page, { correctly: false });
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();

    await reviewed(page, 1).getByRole("button", { name: "Ask AI about this question" }).click();
    await reviewed(page, 1).getByLabel("Your question").fill("Why?");
    await reviewed(page, 1).getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();

    await expect(reviewed(page, 1)).toContainText("Voilà pourquoi.");
    const context = chatBody(ai).messages[0]!.content;
    expect(context).toContain(missed.prompt);
    expect(context).toContain(`The Learner chose: ${missed.distractors[0]}`);
  });

  test("a failed follow-up is explained and a Learner offline is told why not", async ({ page, context, ai }) => {
    await saveKey(page);
    await openArea(page, "Quiz");
    await startTopicQuiz(page, "Useful expressions");
    await answer(page, { correctly: true });
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Review answers" }).click();
    await reviewed(page, 1).getByRole("button", { name: "Ask AI about this question" }).click();
    await reviewed(page, 1).getByLabel("Your question").fill("Why?");

    ai.respond("POST", "/chat/completions", { status: 429, json: {} });
    await reviewed(page, 1).getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("alert")).toContainText("limiting requests");
    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();

    await context.setOffline(true);
    await expect(reviewed(page, 1).getByRole("button", { name: "Ask AI", exact: true })).toBeDisabled();
    await expect(reviewed(page, 1).getByText("AI help needs an internet connection")).toBeVisible();
  });
});

test.describe("offline", () => {
  test("generated questions stay available, with their review, and nothing calls the AI", async ({ page, context, ai }) => {
    await expect(page.getByText("Ready for offline use")).toBeVisible();
    const questions = await collectionWithBatch(page, ai);
    const sentBefore = ai.requests.length;
    await page.close();

    await context.setOffline(true);
    const offline = await context.newPage();
    await offline.goto("/");
    await openArea(offline, "Quiz");
    await startTopicQuiz(offline, "Au bureau");
    await expect(quizQuestion(offline)).toContainText("Question 1 of 10");
    const asked = await answerGenerated(offline, questions, { correctly: false });
    await nextQuestion(offline);
    await offline.getByRole("button", { name: "End quiz" }).click();
    await offline.getByRole("button", { name: "Review answers" }).click();

    await expect(option(offline, 1, asked.answer.text)).toContainText(asked.answer.explanation);
    expect(ai.requests).toHaveLength(sentBefore);
  });
});

test("generated questions and quiz review never call the AI on their own", async ({ page, ai, cloud }) => {
  const questions = await collectionWithBatch(page, ai);
  const sentBefore = ai.requests.length;
  await setUpFirstDevice(page);
  await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

  await openArea(page, "Quiz");
  await startTopicQuiz(page, "Au bureau");
  await answerGenerated(page, questions, { correctly: true });
  await nextQuestion(page);
  await page.getByRole("button", { name: "End quiz" }).click();
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(quizReview(page).getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Back to result" }).click();
  await page.getByRole("button", { name: "Back to quizzes" }).click();
  await page.getByRole("button", { name: "Start general quiz" }).click();
  await openArea(page, "Progress");
  await expect(sessions(page)).toHaveCount(1);
  await page.reload();
  await expect(syncStatus(page)).toHaveText("Sync: up to date");

  expect(ai.requests).toHaveLength(sentBefore);
});

test.describe("across devices", () => {
  test("a batch and its review activity reach the other device, unreadable to the cloud", async ({ page, ai, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);
    const questions = await collectionWithBatch(page, ai);
    await startTopicQuiz(page, "Au bureau");
    const asked = await answerGenerated(page, questions, { correctly: false });
    await nextQuestion(page);
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    await expect(syncStatus(page)).toHaveText("Sync: up to date");

    await openArea(other, "Progress");
    await expect(sessions(other)).toContainText("0 of 1 correct (0%)");
    await expect(
      topicRow(quizResults(other).getByRole("list", { name: "Vocabulary collections" }), "Au bureau"),
    ).toContainText("0% correct");

    await openArea(other, "Quiz");
    await other.getByRole("button", { name: /Review Au bureau: 0 of 1 correct/ }).click();
    await expect(reviewed(other, 1)).toContainText(asked.prompt);
    for (const { text, explanation } of [asked.answer, ...asked.distractors]) {
      await expect(option(other, 1, text)).toContainText(explanation);
    }
    await expect(option(other, 1, asked.distractors[0]!.text)).toContainText("Your answer");

    // The key is a synced setting, so follow-ups work there with no setup.
    await reviewed(other, 1).getByRole("button", { name: "Ask AI about this question" }).click();
    await reviewed(other, 1).getByLabel("Your question").fill("Why?");
    await expect(reviewed(other, 1).getByRole("button", { name: "Ask AI" })).toBeEnabled();

    await other.getByRole("button", { name: "Back to quizzes" }).click();
    await startTopicQuiz(other, "Au bureau");
    await expect(quizQuestion(other)).toContainText("Question 1 of 10");
    // The missed question leads there too, and the other device has its answer key.
    await expect(quizQuestion(other).getByRole("heading")).toHaveText(asked.prompt);
    await answerGenerated(other, questions, { correctly: true });
    await expect(quizQuestion(other).getByRole("status")).toHaveText("Correct");

    const stored = cloud.everythingStored();
    const received = cloud.everythingReceived();
    for (const text of [
      asked.prompt,
      asked.answer.text,
      asked.answer.explanation,
      asked.distractors[0]!.text,
      "generatedQuestions",
      "chosenOption",
      "explanations",
    ]) {
      expect(stored).not.toContain(text);
      expect(received).not.toContain(text);
    }
  });

  test("a device that joins later gets earlier batches, and repeats of them are refused there", async ({ page, ai, newDevice }) => {
    await setUpFirstDevice(page);
    const questions = await collectionWithBatch(page, ai);
    await expect(syncStatus(page)).toHaveText("Sync: up to date");

    const other = await newDevice();
    await joinDevice(other);
    await openArea(other, "Quiz");
    await startTopicQuiz(other, "Au bureau");
    await expect(quizQuestion(other)).toContainText("Question 1 of 10");
    await other.getByRole("button", { name: "End quiz" }).click();
    await other.getByRole("button", { name: "Back to quizzes" }).click();

    await other.getByRole("button", { name: "More questions for Au bureau" }).click();
    await other.getByRole("button", { name: "Generate 10 questions" }).click();
    await expect(reviewPanel(other)).toContainText(questions[0]!.prompt);

    ai.respond("POST", "/chat/completions", batchReply(questions));
    await sendButton(other).click();
    await expect(other.getByRole("alert")).toContainText("nothing was saved");
  });
});
