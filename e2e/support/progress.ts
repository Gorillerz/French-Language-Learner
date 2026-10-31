import type { Page } from "@playwright/test";
import { answer, openArea, quizQuestion, startTopicQuiz } from "./quizzes";
import { expect } from "./test";

export function quizResults(page: Page) {
  return page.getByRole("region", { name: "Quiz results" });
}

export function flashcardRatings(page: Page) {
  return page.getByRole("region", { name: "Flashcard ratings" });
}

export function sessions(page: Page) {
  return page.getByRole("list", { name: "Sessions" }).getByRole("listitem");
}

export function topicRow(section: ReturnType<Page["getByRole"]>, topic: string) {
  return section.getByRole("listitem").filter({ hasText: topic });
}

/** Answers the first questions of a focused quiz, one per entry, then ends the quiz. */
export async function takeQuiz(page: Page, topic: string, answers: boolean[]) {
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
export async function studyCollection(page: Page, collection: string, ratings: string[]) {
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
export async function practiseConcept(page: Page, concept: string, ratings: string[]) {
  await openArea(page, "Grammar");
  await page.getByRole("button", { name: concept }).click();
  await page.getByRole("button", { name: "Practise flashcards" }).click();
  for (const [index, rating] of ratings.entries()) {
    await expect(page.getByText(`Card ${index + 1} of`)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: rating, exact: true }).click();
  }
  await page.getByRole("button", { name: `Back to ${concept}` }).click();
}
