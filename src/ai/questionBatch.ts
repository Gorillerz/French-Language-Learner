import type { GeneratedQuestion } from "../db";
import type { QuestionFormat } from "../quiz/content";
import { AiError, prepareAiRequest } from "./client";
import { parseJson } from "./flashcardDetails";

export const BATCH_SIZE = 10;
const DISTRACTOR_COUNT = 4;
/** Enough to steer the model. The full check for repeats happens on this device. */
const MAX_PROMPTS_SENT = 100;
const MAX_WORDS_SENT = 100;

export type BatchDraft = Pick<
  GeneratedQuestion,
  "format" | "prompt" | "answer" | "distractors" | "explanations"
>;

/** What identifies a topic to the model. Nothing else about it leaves the device. */
export type BatchTopic =
  | { kind: "vocabulary"; name: string; words: { french: string; english: string }[] }
  | { kind: "grammar"; name: string; summary: string };

const formatGuides: Record<QuestionFormat, string> = {
  complete: "a French sentence with ___ for the blank, and French options",
  "to-english": "a French sentence to translate, and English options",
  "to-french": "an English sentence to translate, and French options",
  "closest-to-english": "a French word or expression, and English options, one closest in meaning",
  "closest-to-french": "an English word or expression, and French options, one closest in meaning",
};

const formatNames = Object.keys(formatGuides) as QuestionFormat[];

const instructions =
  "You write multiple-choice French practice questions for an advanced learner. Reply with one " +
  "JSON object and nothing else, in this form:\n" +
  '{"questions":[{"format":"...","prompt":"...","answer":{"text":"...","explanation":"..."},' +
  '"distractors":[{"text":"...","explanation":"..."}]}]}\n' +
  `Write exactly ${BATCH_SIZE} questions on the topic given. Each has one correct answer and ` +
  `exactly ${DISTRACTOR_COUNT} different wrong options, and every option has a short explanation ` +
  "in English of why it is right or wrong. Use a mix of these formats:\n" +
  formatNames.map((format) => `- ${format}: ${formatGuides[format]}`).join("\n") +
  "\nEvery question must be new: do not repeat an existing question or another in your reply.";

function describeTopic(topic: BatchTopic) {
  if (topic.kind === "grammar") {
    return { text: `Grammar concept: ${topic.name}\nSummary: ${topic.summary}`, words: null };
  }
  const words = topic.words.slice(0, MAX_WORDS_SENT);
  const list = words.map(({ french, english }) => `- ${french} = ${english}`).join("\n");
  return {
    text: `Vocabulary collection: ${topic.name}` + (list && `\nVocabulary:\n${list}`),
    words: { sent: words.length, total: topic.words.length },
  };
}

function capNote(words: { sent: number; total: number } | null, prompts: { sent: number; total: number }) {
  const left: string[] = [];
  if (prompts.sent < prompts.total) {
    left.push(`the ${prompts.sent} newest of its ${prompts.total} questions`);
  }
  if (words && words.sent < words.total) {
    left.push(`${words.sent} of its ${words.total} words`);
  }
  if (left.length === 0) return undefined;
  return (
    `This topic is large, so the request carries only ${left.join(" and ")}. ` +
    "Every question is still checked for repeats on this device."
  );
}

/** `existingPrompts` runs oldest first, so a cap keeps the newest. */
export async function prepareBatchRequest(topic: BatchTopic, existingPrompts: string[]) {
  const { text, words } = describeTopic(topic);
  const sent = existingPrompts.slice(-MAX_PROMPTS_SENT);
  const existing = sent.length
    ? `\n\nExisting questions, not to be repeated:\n${sent.map((prompt) => `- ${prompt}`).join("\n")}`
    : "";
  const request = await prepareAiRequest("generate-quiz-questions", [
    { role: "system", content: instructions },
    { role: "user", content: text + existing },
  ]);
  const note = capNote(words, { sent: sent.length, total: existingPrompts.length });
  return { request, note };
}

/** Prompts match when only case, accents or whitespace differ. */
export function promptKey(prompt: string) {
  return prompt
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Accents stay: "a" and "à" are a fair pair of options. */
function optionKey(option: string) {
  return option.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

const UNUSABLE =
  `The AI's reply did not hold ${BATCH_SIZE} usable new questions, so nothing was saved. ` +
  "Try again.";

function unusable(): never {
  throw new AiError(UNUSABLE);
}

function readOption(value: unknown) {
  const { text, explanation } = (value ?? {}) as { text?: unknown; explanation?: unknown };
  if (typeof text !== "string" || typeof explanation !== "string") unusable();
  if (text.trim() === "" || explanation.trim() === "") unusable();
  return { text: text.trim(), explanation: explanation.trim() };
}

function readQuestion(value: unknown): BatchDraft {
  const { format, prompt, answer, distractors } = (value ?? {}) as Record<string, unknown>;
  if (!formatNames.includes(format as QuestionFormat)) unusable();
  if (typeof prompt !== "string" || prompt.trim() === "") unusable();
  if (format === "complete" && !prompt.includes("___")) unusable();
  if (!Array.isArray(distractors) || distractors.length !== DISTRACTOR_COUNT) unusable();

  const correct = readOption(answer);
  const wrong = distractors.map(readOption);
  const options = [correct, ...wrong];
  if (new Set(options.map(({ text }) => optionKey(text))).size !== options.length) unusable();

  return {
    format: format as QuestionFormat,
    prompt: prompt.trim(),
    answer: correct.text,
    distractors: wrong.map(({ text }) => text),
    explanations: Object.fromEntries(options.map(({ text, explanation }) => [text, explanation])),
  };
}

/**
 * All or nothing: one bad or repeated question fails the whole reply, so a batch is
 * never saved short. `existingPrompts` must cover the topic's every question.
 */
export function parseBatchReply(text: string, existingPrompts: string[]): BatchDraft[] {
  const reply = parseJson(text, UNUSABLE) as { questions?: unknown } | null;
  const questions = reply?.questions;
  if (!Array.isArray(questions) || questions.length !== BATCH_SIZE) unusable();

  const drafts = questions.map(readQuestion);
  const seen = new Set(existingPrompts.map(promptKey));
  for (const { prompt } of drafts) {
    const key = promptKey(prompt);
    if (seen.has(key)) unusable();
    seen.add(key);
  }
  return drafts;
}
