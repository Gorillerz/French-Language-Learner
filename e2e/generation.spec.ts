import {
  answerGenerated,
  apiKey,
  batch,
  batchReply,
  chatBody,
  createCollection,
  generateBatch,
  moreQuestions,
  nextQuestion,
  reviewPanel,
  saveKey,
  sendButton,
} from "./support/generation";
import { openArea, pickOption, quizQuestion, startTopicQuiz } from "./support/quizzes";
import { expect, test } from "./support/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("generating a batch", () => {
  test("a Learner-created collection with no questions offers the batch, and it is reviewed before sending", async ({ page, ai }) => {
    const questions = batch();
    ai.respond("POST", "/chat/completions", batchReply(questions));
    await saveKey(page);
    await createCollection(page, "Au bureau", "la réunion", "the meeting");
    await openArea(page, "Quiz");
    await page.getByRole("button", { name: "Quiz on Au bureau" }).click();
    await expect(page.getByText("Au bureau has no questions yet.")).toBeVisible();

    await page.getByRole("button", { name: "Generate 10 questions" }).click();
    await expect(reviewPanel(page)).toBeVisible();
    expect(ai.requests).toEqual([]);
    const shown = (await reviewPanel(page).textContent())!;

    await sendButton(page).click();

    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Added 10 questions to Au bureau.",
    );
    await expect(page.getByText("Au bureau has no questions yet.")).toHaveCount(0);
    expect(ai.requests).toHaveLength(1);
    expect(ai.requests[0]!.headers.authorization).toBe(`Bearer ${apiKey}`);
    const body = chatBody(ai);
    expect(Object.keys(body).sort()).toEqual(["messages", "model"]);
    expect(shown).toContain(body.model);
    for (const { content } of body.messages) expect(shown).toContain(content);

    await page.getByRole("button", { name: "Start quiz" }).click();
    await expect(quizQuestion(page)).toContainText("Question 1 of 10");
  });

  test("answers are checked against the stored key with no AI call, on shuffled options", async ({ page, ai }) => {
    const questions = batch();
    await saveKey(page);
    await createCollection(page, "Au bureau", "la réunion", "the meeting");
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Au bureau", questions);
    const sentBefore = ai.requests.length;

    await startTopicQuiz(page, "Au bureau");
    const firstOptionWasAnswer: boolean[] = [];
    for (let position = 1; position <= 10; position++) {
      await expect(quizQuestion(page)).toContainText(`Question ${position} of 10`);
      const options = page.getByRole("group", { name: "Answer options" }).getByRole("button");
      const shown = await options.allInnerTexts();
      expect(shown).toHaveLength(5);
      const correctly = position % 2 === 0;
      const asked = await answerGenerated(page, questions, { correctly });
      expect([...shown].sort()).toEqual(
        [asked.answer.text, ...asked.distractors.map(({ text }) => text)].sort(),
      );
      firstOptionWasAnswer.push(shown[0] === asked.answer.text);
      await expect(quizQuestion(page).getByRole("status")).toHaveText(
        correctly ? "Correct" : `Incorrect. The answer is: ${asked.answer.text}`,
      );
      await nextQuestion(page);
    }

    await expect(page.getByRole("status").filter({ hasText: "5 of 10 correct" })).toBeVisible();
    expect(firstOptionWasAnswer).toContain(false);
    expect(ai.requests).toHaveLength(sentBefore);
  });

  test("every format is posed in its own languages", async ({ page, ai }) => {
    const questions = batch();
    await saveKey(page);
    await createCollection(page, "Au bureau", "la réunion", "the meeting");
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Au bureau", questions);
    await startTopicQuiz(page, "Au bureau");

    const expected: Record<string, [string, string, string]> = {
      complete: ["Complete the sentence", "fr", "fr"],
      "to-english": ["Choose the English meaning", "fr", "en"],
      "to-french": ["Choose the French translation", "en", "fr"],
      "closest-to-english": ["Choose the closest English meaning", "fr", "en"],
      "closest-to-french": ["Choose the closest French meaning", "en", "fr"],
    };
    for (let position = 1; position <= 10; position++) {
      await expect(quizQuestion(page)).toContainText(`Question ${position} of 10`);
      const prompt = quizQuestion(page).getByRole("heading");
      const shownPrompt = await prompt.innerText();
      const { format } = questions.find((candidate) => candidate.prompt === shownPrompt)!;
      const [instruction, promptLang, optionLang] = expected[format]!;
      const firstOption = page.getByRole("group", { name: "Answer options" }).getByRole("button").first();
      await expect(quizQuestion(page)).toContainText(instruction);
      await expect(prompt).toHaveAttribute("lang", promptLang);
      await expect(firstOption).toHaveAttribute("lang", optionLang);
      await pickOption(page, await firstOption.innerText());
      await nextQuestion(page);
    }
  });

  test("a built-in collection and a grammar concept grow by ten", async ({ page, ai }) => {
    await saveKey(page);
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Useful expressions", batch("a"));
    await generateBatch(page, ai, "The subjunctive", batch("b"));

    await startTopicQuiz(page, "Useful expressions");
    await expect(quizQuestion(page)).toContainText("Question 1 of 30");
    await page.getByRole("button", { name: "End quiz" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    await startTopicQuiz(page, "The subjunctive");
    await expect(quizQuestion(page)).toContainText("Question 1 of 30");
  });

  test("cancelling the review sends nothing and adds nothing", async ({ page, ai }) => {
    await saveKey(page);
    await openArea(page, "Quiz");
    await moreQuestions(page, "Useful expressions");
    await page.getByRole("button", { name: "Generate 10 questions" }).click();
    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();

    await expect(reviewPanel(page)).toBeHidden();
    expect(ai.requests).toEqual([]);
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    await startTopicQuiz(page, "Useful expressions");
    await expect(quizQuestion(page)).toContainText("Question 1 of 20");
  });
});
