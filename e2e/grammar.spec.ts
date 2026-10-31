import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";

async function openConcept(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Areas" }).getByRole("button", { name: "Grammar" }).click();
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function rateCurrentCard(page: Page, rating: "Forgot it" | "Effortless") {
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: rating }).click();
}

test("the Learner can explore a concept for every grammar area", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grammar" }).click();

  for (const name of [
    "Past tenses",
    "Object pronouns, y and en",
    "Verbs and their prepositions",
    "The conditional and si clauses",
    "The subjunctive",
    "Expressing cause",
  ]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
});

test("a concept page explains the rule with translated examples", async ({ page }) => {
  await page.goto("/");
  await openConcept(page, "Past tenses");

  await expect(page.getByText("The imparfait sets the scene")).toBeVisible();
  await expect(page.getByText("Quand je suis arrivé, il pleuvait.")).toBeVisible();
  await expect(page.getByText("When I arrived, it was raining.")).toBeVisible();

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test("a French sentence asks for its English translation, revealed on request", async ({ page }) => {
  await page.goto("/");
  await openConcept(page, "Past tenses");
  await page.getByRole("button", { name: "French to English" }).click();

  const card = page.getByRole("region", { name: "Flashcard" });
  await expect(card).toContainText("Translate into English");
  await expect(card).toContainText("Je lisais mes mails quand le directeur est entré.");
  await expect(card).not.toContainText("I was reading my emails when the director came in.");
  await expect(card.getByRole("button", { name: "Effortless" })).toHaveCount(0);

  await card.getByRole("button", { name: "Show answer" }).click();

  await expect(card).toContainText("I was reading my emails when the director came in.");
  await expect(card.getByRole("button", { name: "Effortless" })).toBeVisible();
});

test("an English sentence asks for its French translation, revealed on request", async ({ page }) => {
  await page.goto("/");
  await openConcept(page, "Expressing cause");
  await page.getByRole("button", { name: "English to French" }).click();

  const card = page.getByRole("region", { name: "Flashcard" });
  await expect(card).toContainText("Translate into French");
  await expect(card).toContainText("I didn't go out because it was too cold.");
  await expect(card).not.toContainText("Je ne suis pas sorti parce qu'il faisait trop froid.");

  await card.getByRole("button", { name: "Show answer" }).click();

  await expect(card).toContainText("Je ne suis pas sorti parce qu'il faisait trop froid.");
});

test("rating a card moves on, and the session ends with its result", async ({ page }) => {
  await page.goto("/");
  await openConcept(page, "The subjunctive");
  await page.getByRole("button", { name: "French to English" }).click();

  const card = page.getByRole("region", { name: "Flashcard" });
  await expect(card).toContainText("Card 1 of 12");
  await rateCurrentCard(page, "Forgot it");

  await expect(card).toContainText("Card 2 of 12");
  await expect(card).toContainText("Je veux que tu fasses attention.");
  await expect(card.getByRole("button", { name: "Show answer" })).toBeVisible();

  for (let remaining = 11; remaining > 0; remaining--) {
    await rateCurrentCard(page, "Effortless");
  }

  await expect(page.getByText("12 cards rated, average 3.8")).toBeVisible();
});

test("ratings and grammar content are still there when the app reopens offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();

  await openConcept(page, "Object pronouns, y and en");
  await expect(page.getByText("No ratings yet")).toBeVisible();
  await page.getByRole("button", { name: "English to French" }).click();
  await rateCurrentCard(page, "Forgot it");
  await rateCurrentCard(page, "Effortless");
  await expect(page.getByText("Card 3 of 12")).toBeVisible();
  await page.close();

  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto("/");
  await openConcept(reopened, "Object pronouns, y and en");

  await expect(reopened.getByText("Envoie-la-moi dès que possible.")).toBeVisible();
  await expect(reopened.getByText("2 ratings, average 2.5")).toBeVisible();

  await reopened.getByRole("button", { name: "English to French" }).click();
  await rateCurrentCard(reopened, "Effortless");
  await expect(reopened.getByText("Card 2 of 12")).toBeVisible();
  await reopened.getByRole("button", { name: "Back to Object pronouns, y and en" }).click();
  await expect(reopened.getByText("3 ratings, average 3.0")).toBeVisible();
});

test("ratings are kept separately for each concept", async ({ page }) => {
  await page.goto("/");
  await openConcept(page, "Past tenses");
  await page.getByRole("button", { name: "French to English" }).click();
  await rateCurrentCard(page, "Effortless");
  await expect(page.getByText("Card 2 of 12")).toBeVisible();
  await page.getByRole("button", { name: "Back to Past tenses" }).click();
  await expect(page.getByText("1 rating, average 4.0")).toBeVisible();
  await page.getByRole("button", { name: "All concepts" }).click();

  await page.getByRole("button", { name: "Expressing cause" }).click();

  await expect(page.getByText("No ratings yet")).toBeVisible();
});
