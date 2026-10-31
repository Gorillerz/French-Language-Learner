import type { Page } from "@playwright/test";
import { curatedQuestions } from "../../src/quiz/content";
import { expect } from "./test";

export function openArea(page: Page, name: string) {
  return page.getByRole("navigation", { name: "Areas" }).getByRole("button", { name }).click();
}

export function quizQuestion(page: Page) {
  return page.getByRole("region", { name: "Quiz question" });
}

export async function currentQuestion(page: Page) {
  const prompt = await quizQuestion(page).getByRole("heading").innerText();
  const question = curatedQuestions.find((candidate) => candidate.prompt === prompt);
  if (!question) throw new Error(`Not a curated question: ${prompt}`);
  return question;
}

export function pickOption(page: Page, option: string) {
  return page
    .getByRole("group", { name: "Answer options" })
    .getByRole("button", { name: option, exact: true })
    .click();
}

/** Answers the current question and moves on. Returns the question that was asked. */
export async function answer(page: Page, { correctly }: { correctly: boolean }) {
  const question = await currentQuestion(page);
  await pickOption(page, correctly ? question.answer : (question.distractors[0] as string));
  await quizQuestion(page).getByRole("button", { name: /Next question|See result/ }).click();
  return question;
}

export async function startTopicQuiz(page: Page, topic: string) {
  await page.getByRole("button", { name: `Quiz on ${topic}` }).click();
  await expect(quizQuestion(page)).toBeVisible();
}
