import type { Page } from "@playwright/test";
import { openArea, pickOption, quizQuestion } from "./quizzes";
import type { Reply, ServiceStandIn } from "./service-stand-in";
import { expect } from "./test";

export const apiKey = "sk-or-test-key-do-not-leak";

export type ChatBody = { model: string; messages: { role: string; content: string }[] };

type Option = { text: string; explanation: string };

export type GeneratedReplyQuestion = {
  format: string;
  prompt: string;
  answer: Option;
  distractors: Option[];
};

export function replyWith(content: unknown): Reply {
  return { json: { choices: [{ message: { role: "assistant", content } }] } };
}

export function batchReply(questions: unknown) {
  return replyWith(JSON.stringify({ questions }));
}

const formats = ["complete", "to-english", "to-french", "closest-to-english", "closest-to-french"];

/** One valid question. `tag` makes its prompt and options unique within a batch. */
export function question(tag: string, format = "complete"): GeneratedReplyQuestion {
  const option = (name: string) => ({
    text: `${name} ${tag}`,
    explanation: `Pourquoi ${name} ${tag}`,
  });
  return {
    format,
    prompt: `Il faut ___ ${tag}.`,
    answer: option("juste"),
    distractors: ["faux-a", "faux-b", "faux-c", "faux-d"].map(option),
  };
}

/** A valid batch of ten that uses every format. */
export function batch(tag = "q") {
  return Array.from({ length: 10 }, (_, index) =>
    question(`${tag}${index + 1}`, formats[index % formats.length]),
  );
}

export async function saveKey(page: Page, key = apiKey) {
  await openArea(page, "AI");
  await page.getByLabel("OpenRouter API key").fill(key);
  await page.getByRole("button", { name: "Save AI settings" }).click();
  await expect(page.getByRole("status", { name: "AI settings" })).toHaveText("Saved.");
}

export async function createCollection(page: Page, name: string, french: string, english: string) {
  await openArea(page, "Vocabulary");
  await page.getByLabel("New collection name").fill(name);
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill(french);
  await page.getByLabel("English").fill(english);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: french })).toBeVisible();
  await page.getByRole("button", { name: "Back to collections" }).click();
}

export function reviewPanel(page: Page) {
  return page.getByRole("region", { name: "Review AI request" });
}

export function sendButton(page: Page) {
  return reviewPanel(page).getByRole("button", { name: "Send to AI" });
}

export function chatBody(ai: ServiceStandIn, index = 0) {
  return ai.requests[index]!.body as ChatBody;
}

export function moreQuestions(page: Page, topic: string) {
  return page.getByRole("button", { name: `More questions for ${topic}` }).click();
}

/** From the quiz start page, adds a batch to a topic and goes back. */
export async function generateBatch(page: Page, ai: ServiceStandIn, topic: string, questions: unknown) {
  ai.respond("POST", "/chat/completions", batchReply(questions));
  await moreQuestions(page, topic);
  await page.getByRole("button", { name: "Generate 10 questions" }).click();
  await sendButton(page).click();
  await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
    `Added 10 questions to ${topic}.`,
  );
  await page.getByRole("button", { name: "Back to quizzes" }).click();
}

/** Answers the question on screen from the batch it came from. Returns it. */
export async function answerGenerated(
  page: Page,
  questions: GeneratedReplyQuestion[],
  { correctly }: { correctly: boolean },
) {
  const prompt = await quizQuestion(page).getByRole("heading").innerText();
  const asked = questions.find((candidate) => candidate.prompt === prompt);
  if (!asked) throw new Error(`Not in this batch: ${prompt}`);
  await pickOption(page, correctly ? asked.answer.text : asked.distractors[0]!.text);
  return asked;
}

export function nextQuestion(page: Page) {
  return quizQuestion(page).getByRole("button", { name: /Next question|See result/ }).click();
}
