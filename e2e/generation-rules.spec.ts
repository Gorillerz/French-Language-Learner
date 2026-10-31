import type { Page } from "@playwright/test";
import { curatedQuestions } from "../src/quiz/content";
import {
  apiKey,
  batch,
  batchReply,
  chatBody,
  createCollection,
  generateBatch,
  moreQuestions,
  question,
  replyWith,
  reviewPanel,
  saveKey,
  sendButton,
} from "./support/generation";
import { flashcardRatings } from "./support/progress";
import { openArea, quizQuestion, startTopicQuiz } from "./support/quizzes";
import type { Reply } from "./support/service-stand-in";
import { setUpFirstDevice } from "./support/sync";
import { expect, test } from "./support/test";

const curatedPrompts = (topicId: string) =>
  curatedQuestions.filter((curated) => curated.topicId === topicId).map(({ prompt }) => prompt);

/** Unusual case, no accents and stray whitespace: the same prompt to a French reader. */
function disguised(prompt: string) {
  const bare = prompt.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return `  ${bare.replace(/ /g, "  ")} `;
}

function withPrompt(prompt: string) {
  return [...batch().slice(0, 9), { ...question("last"), prompt }];
}

async function openGenerator(page: Page, topic: string) {
  await saveKey(page);
  await openArea(page, "Quiz");
  await moreQuestions(page, topic);
  await page.getByRole("button", { name: "Generate 10 questions" }).click();
}

async function expectRejected(page: Page, ai: { respond: (m: string, p: string, r: Reply) => void; requests: unknown[] }, reply: Reply) {
  ai.respond("POST", "/chat/completions", reply);
  const before = ai.requests.length;
  await sendButton(page).click();
  await expect(page.getByRole("alert")).toContainText("nothing was saved", { ignoreCase: true });
  await expect.poll(() => ai.requests.length).toBe(before + 1);
  await expect(sendButton(page)).toBeEnabled();
}

async function questionCount(page: Page, topic: string) {
  await startTopicQuiz(page, topic);
  const text = await quizQuestion(page).getByText(/Question 1 of \d+/).innerText();
  await page.getByRole("button", { name: "End quiz" }).click();
  await page.getByRole("button", { name: "Back to quizzes" }).click();
  return Number(text.split(" of ")[1]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("a reply that cannot be used", () => {
  test("saves nothing, says so and can be resent, whatever is wrong with it", async ({ page, ai }) => {
    await openGenerator(page, "Useful expressions");

    const valid = batch();
    const changed = (change: (first: ReturnType<typeof question>) => unknown) => [
      change(question("changed")),
      ...valid.slice(1),
    ];
    const unusable: Reply[] = [
      replyWith("Bien sûr ! Voici dix questions."),
      replyWith(JSON.stringify(valid)),
      replyWith(JSON.stringify({ items: valid })),
      replyWith(null),
      { json: { error: { code: 502, message: "Upstream failed" } } },
      batchReply(valid.slice(0, 9)),
      batchReply([...valid, question("eleventh")]),
      batchReply([...valid.slice(0, 9), "not a question"]),
      batchReply([...valid.slice(0, 9), null]),
      // Repeated within the batch, plainly and in disguise.
      batchReply([...valid.slice(0, 9), valid[0]]),
      batchReply(withPrompt(disguised(valid[0]!.prompt))),
      // The answer key among the distractors, plainly and in another case.
      batchReply(changed((first) => ({ ...first, distractors: [first.answer, ...first.distractors.slice(1)] }))),
      batchReply(
        changed((first) => ({
          ...first,
          distractors: [
            { ...first.distractors[0], text: first.answer.text.toUpperCase() },
            ...first.distractors.slice(1),
          ],
        })),
      ),
      batchReply(changed((first) => ({ ...first, distractors: [first.distractors[0], ...first.distractors.slice(0, 3)] }))),
      batchReply(changed((first) => ({ ...first, distractors: first.distractors.slice(0, 3) }))),
      batchReply(
        changed((first) => ({
          ...first,
          distractors: [...first.distractors, { text: "de trop", explanation: "En trop." }],
        })),
      ),
      batchReply(changed((first) => ({ ...first, answer: { text: first.answer.text } }))),
      batchReply(changed((first) => ({ ...first, answer: { text: first.answer.text, explanation: "  " } }))),
      batchReply(
        changed((first) => ({
          ...first,
          distractors: [{ text: "sans raison" }, ...first.distractors.slice(1)],
        })),
      ),
      batchReply(changed((first) => ({ ...first, answer: "juste" }))),
      batchReply(changed((first) => ({ ...first, format: "essay" }))),
      batchReply(changed((first) => ({ ...first, prompt: "  " }))),
      batchReply(changed((first) => ({ ...first, prompt: "Pas de blanc ici." }))),
    ];
    for (const reply of unusable) await expectRejected(page, ai, reply);

    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    expect(await questionCount(page, "Useful expressions")).toBe(20);

    ai.respond("POST", "/chat/completions", replyWith("```json\n" + JSON.stringify({ questions: valid }) + "\n```"));
    await moreQuestions(page, "Useful expressions");
    await page.getByRole("button", { name: "Generate 10 questions" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Added 10 questions to Useful expressions.",
    );
  });
});

test.describe("new within the topic", () => {
  test("a repeat of a curated question is refused despite case, accents and whitespace", async ({ page, ai }) => {
    const [curated] = curatedPrompts("past-tenses").filter((prompt) => /[^\p{ASCII}]/u.test(prompt));
    await openGenerator(page, "Past tenses");

    await expectRejected(page, ai, batchReply(withPrompt(curated!)));
    await expectRejected(page, ai, batchReply(withPrompt(disguised(curated!))));

    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    expect(await questionCount(page, "Past tenses")).toBe(20);
  });

  test("a repeat of an earlier generated question is refused", async ({ page, ai }) => {
    const earlier = batch("earlier");
    await saveKey(page);
    await createCollection(page, "Au bureau", "la réunion", "the meeting");
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Au bureau", earlier);

    await moreQuestions(page, "Au bureau");
    await page.getByRole("button", { name: "Generate 10 questions" }).click();
    await expectRejected(page, ai, batchReply(withPrompt(disguised(earlier[3]!.prompt))));

    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Back to quizzes" }).click();
    expect(await questionCount(page, "Au bureau")).toBe(10);
  });

  test("a question on another topic does not count as a repeat", async ({ page, ai }) => {
    await saveKey(page);
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Past tenses", withPrompt(curatedPrompts("subjunctive")[0]!));

    expect(await questionCount(page, "Past tenses")).toBe(30);
  });

  test("a question added elsewhere while the AI was working counts as a repeat", async ({ page, context, ai }) => {
    const elsewhere = batch("elsewhere");
    await saveKey(page);
    await openArea(page, "Quiz");
    await moreQuestions(page, "Past tenses");
    await page.getByRole("button", { name: "Generate 10 questions" }).click();

    const otherTab = await context.newPage();
    await otherTab.goto("/");
    await openArea(otherTab, "Quiz");
    await generateBatch(otherTab, ai, "Past tenses", elsewhere);
    await otherTab.close();

    await expectRejected(page, ai, batchReply(withPrompt(elsewhere[0]!.prompt)));
  });

  test("the request lists the topic's existing prompts but not their answers", async ({ page, ai }) => {
    const earlier = batch("earlier");
    await saveKey(page);
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Expressing cause", earlier);
    await moreQuestions(page, "Expressing cause");
    await page.getByRole("button", { name: "Generate 10 questions" }).click();
    ai.respond("POST", "/chat/completions", batchReply(batch("later")));
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toBeVisible();

    const sent = JSON.stringify(chatBody(ai, 1).messages);
    const curated = curatedQuestions.filter(({ topicId }) => topicId === "expressing-cause");
    const inPrompts = (text: string) => curated.some(({ prompt }) => prompt.includes(text));
    for (const { prompt } of [...curated, ...earlier]) {
      expect(sent).toContain(JSON.stringify(prompt).slice(1, -1));
    }
    expect(sent).not.toContain(earlier[0]!.answer.text);
    expect(sent).not.toContain(earlier[0]!.answer.explanation);
    for (const { answer, distractors } of curated) {
      for (const option of [answer, ...distractors]) {
        if (option.length > 12 && !inPrompts(option)) {
          expect(sent).not.toContain(JSON.stringify(option).slice(1, -1));
        }
      }
    }
  });

  test("a large topic sends a capped list and says so, but still checks every question", async ({ page, ai }) => {
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("french-learning");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const connection = open.result;
            const tx = connection.transaction(["generatedQuestions", "vocabularyItems"], "readwrite");
            for (let index = 0; index < 120; index++) {
              tx.objectStore("generatedQuestions").add({
                id: `seed-${index}`,
                topicId: "useful-expressions",
                kind: "vocabulary",
                format: "complete",
                prompt: `Ancienne question ${index} ___.`,
                answer: "juste",
                distractors: ["a", "b", "c", "d"],
                explanations: { juste: "x", a: "x", b: "x", c: "x", d: "x" },
                savedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
              });
              tx.objectStore("vocabularyItems").add({
                id: `seed-item-${index}`,
                collectionId: "useful-expressions",
                french: `mot ajouté ${index};`,
                english: `added word ${index};`,
                definition: "",
                explanation: "",
                etymology: "",
                history: "",
                synonyms: "",
                example: "",
                pronunciation: "",
                position: 10_000 + index,
                savedAt: "2026-01-01T00:00:00.000Z",
              });
            }
            tx.oncomplete = () => {
              connection.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await openGenerator(page, "Useful expressions");

    await expect(reviewPanel(page)).toContainText("the 100 newest of its 140 questions");
    await expect(reviewPanel(page)).toContainText(/100 of its \d+ words/);
    await expect(reviewPanel(page)).toContainText("still checked for repeats on this device");
    const shown = (await reviewPanel(page).textContent())!;
    expect(shown).toContain("Ancienne question 119 ___.");
    expect(shown).not.toContain("Ancienne question 0 ___.");
    expect(shown).not.toContain("mot ajouté 119;");

    // Never sent, yet still caught as a repeat.
    await expectRejected(page, ai, batchReply(withPrompt("Ancienne question 0 ___.")));
    expect(JSON.stringify(chatBody(ai).messages)).not.toContain("- Ancienne question 0 ___.");
  });
});

test.describe("what a batch request shares", () => {
  test("a collection sends only its own words and prompts", async ({ page, ai, cloud }) => {
    await saveKey(page);
    await setUpFirstDevice(page);
    await createCollection(page, "Mes secrets", "le mot caché", "the hidden word");
    await createCollection(page, "Au bureau", "la réunion", "the meeting");
    await page.getByRole("button", { name: "Open Au bureau" }).click();
    await page.getByRole("button", { name: "Study flashcards" }).click();
    await page.getByRole("button", { name: "Show English" }).click();
    await page.getByRole("button", { name: "1 Forgot it" }).click();
    await page.getByRole("button", { name: "Back to collection" }).click();
    await page.getByRole("button", { name: "Edit la réunion" }).click();
    await page.getByLabel("Pronunciation").fill("/la ʁe.y.njɔ̃/");
    await page.getByLabel("Definition").fill("Ma définition privée.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Add item" })).toBeVisible();
    await openArea(page, "Progress");
    await expect(flashcardRatings(page)).toContainText("Au bureau");

    await openArea(page, "Quiz");
    await generateBatch(page, ai, "Au bureau", batch());

    expect(ai.requests).toHaveLength(1);
    const { path } = ai.requests[0]!;
    expect(path).toBe("/chat/completions");
    const sent = JSON.stringify(ai.requests[0]!.body);
    expect(sent).toContain("Au bureau");
    expect(sent).toContain("la réunion = the meeting");
    for (const unrelated of [
      "Mes secrets",
      "le mot caché",
      "the hidden word",
      "Useful expressions",
      "ʁe.y",
      "Ma définition privée",
      "Forgot",
      "rating",
      "savedAt",
      "sessionId",
      "isCorrect",
      "passphrase",
      apiKey,
      "learner@example.com",
      "ordinary-sign-in-password",
      "le chat dort",
    ]) {
      expect(sent).not.toContain(unrelated);
    }
    expect(cloud.everythingReceived()).not.toContain(apiKey);
  });

  test("a grammar concept sends its title and summary, no other topic and no lesson text", async ({ page, ai }) => {
    await saveKey(page);
    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    const lesson = (await page.locator("article.concept p").first().textContent())!;
    await openArea(page, "Quiz");
    await generateBatch(page, ai, "The subjunctive", batch());

    const sent = JSON.stringify(ai.requests[0]!.body);
    expect(sent).toContain("The subjunctive");
    expect(sent).not.toContain(lesson.slice(0, 40));
    for (const other of ["Past tenses", "Expressing cause", "Useful expressions", "Conditional"]) {
      expect(sent).not.toContain(other);
    }
    for (const prompt of curatedPrompts("past-tenses")) {
      expect(sent).not.toContain(JSON.stringify(prompt).slice(1, -1));
    }
  });
});

test("the generator explains what it needs when AI cannot run", async ({ page, context, ai }) => {
  await openArea(page, "Quiz");
  await moreQuestions(page, "Useful expressions");
  await expect(page.getByRole("button", { name: "Generate 10 questions" })).toBeDisabled();
  await expect(page.getByText("add your OpenRouter API key")).toBeVisible();
  await page.getByRole("button", { name: "Back to quizzes" }).click();

  await saveKey(page);
  await openArea(page, "Quiz");
  await moreQuestions(page, "Useful expressions");
  await page.getByRole("button", { name: "Generate 10 questions" }).click();
  await context.setOffline(true);

  await expect(sendButton(page)).toBeDisabled();
  await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Generate 10 questions" })).toBeDisabled();
  await expect(page.getByText("AI help needs an internet connection")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Generate 10 questions" })).toBeEnabled();
  expect(ai.requests).toEqual([]);
});

test("the generator and its review fit the screen", async ({ page }) => {
  await openGenerator(page, "100 most common French words");

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
