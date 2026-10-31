import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";

function openCollection(page: Page, name: string) {
  return page.getByRole("button", { name: `Open ${name}` }).click();
}

async function createCollection(page: Page, name: string, items: [string, string][]) {
  await page.getByLabel("New collection name").fill(name);
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  for (const [french, english] of items) {
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("French").fill(french);
    await page.getByLabel("English").fill(english);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: french })).toBeVisible();
  }
}

async function rateCard(page: Page, rating: string) {
  await page.getByRole("button", { name: "Show English" }).click();
  await page.getByRole("button", { name: rating, exact: true }).click();
}

test("the Learner browses the 100 most common French words", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "100 most common French words");

  await expect(page.getByRole("heading", { name: "100 most common French words" })).toBeVisible();
  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items).toHaveCount(100);
  await expect(items.first()).toContainText("le");
  await expect(items.first()).toContainText("the");
});

test("the Learner browses the useful expressions", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "Useful expressions");

  await expect(page.getByText("il s'agit de")).toBeVisible();
  await expect(page.getByText("to stand someone up")).toBeVisible();
});

test("the Learner creates a collection and adds an item", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("New collection name").fill("Au bureau");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("heading", { name: "Au bureau" })).toBeVisible();
  await expect(page.getByText("No items yet")).toBeVisible();

  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill("la réunion");
  await page.getByLabel("English").fill("the meeting");
  await page.getByLabel("Definition").fill("A planned gathering of colleagues.");
  await page.getByRole("button", { name: "Save" }).click();

  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("la réunion");
  await expect(items.first()).toContainText("the meeting");

  await page.getByRole("button", { name: "Back to collections" }).click();
  await expect(page.getByRole("button", { name: "Open Au bureau" })).toBeVisible();
});

test("the Learner edits a built-in item and adds to a built-in collection", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "Useful expressions");

  await page.getByRole("button", { name: "Edit tant pis" }).click();
  await expect(page.getByLabel("Definition")).toHaveValue(/disappointing outcome/);
  await page.getByLabel("English").fill("oh well");
  await page.getByLabel("Definition").fill("What my colleagues say after a missed train.");
  await page.getByRole("button", { name: "Save" }).click();

  const row = page.getByRole("listitem").filter({ hasText: "tant pis" });
  await expect(row).toContainText("oh well");

  await page.getByRole("button", { name: "Edit tant pis" }).click();
  await expect(page.getByLabel("Definition")).toHaveValue("What my colleagues say after a missed train.");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill("on verra");
  await page.getByLabel("English").fill("we'll see");
  await page.getByRole("button", { name: "Save" }).click();

  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items).toHaveCount(51);
  await expect(items.last()).toContainText("on verra");
});

test("a rating that cannot be saved says so, and can be tried again", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "100 most common French words");
  await page.getByRole("button", { name: "Study flashcards" }).click();
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    (window as unknown as { restoreAdd: () => void }).restoreAdd = () => {
      IDBObjectStore.prototype.add = add;
    };
    IDBObjectStore.prototype.add = () => {
      throw new DOMException("No room", "QuotaExceededError");
    };
  });

  await rateCard(page, "1 Forgot it");

  await expect(page.getByRole("alert")).toHaveText("That rating couldn't be saved. Please try again.");
  await expect(page.getByText("Card 1 of 100")).toBeVisible();

  await page.evaluate(() => (window as unknown as { restoreAdd: () => void }).restoreAdd());
  await page.getByRole("button", { name: "1 Forgot it", exact: true }).click();

  await expect(page.getByText("Card 2 of 100")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a flashcard shows French, then English, with expandable details", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "100 most common French words");
  await page.getByRole("button", { name: "Study flashcards" }).click();

  const card = page.getByRole("region", { name: "Flashcard" });
  await expect(card.getByRole("heading", { name: "le", exact: true })).toBeVisible();
  await expect(page.getByText("Card 1 of 100")).toBeVisible();
  await expect(card.getByText("the; him, her, it")).toBeHidden();
  await expect(page.getByRole("group", { name: "Rate your recall" })).toBeHidden();

  await page.getByRole("button", { name: "Show English" }).click();
  await expect(card.getByText("the; him, her, it")).toBeVisible();
  await expect(card.getByText("Le chat dort sur le canapé.")).toBeHidden();

  await card.getByText("Details").click();
  await expect(card.getByText(/^Definite article/)).toBeVisible();
  await expect(card.getByText("Le chat dort sur le canapé.")).toBeVisible();
  await expect(card.getByText("/lə/")).toBeVisible();
});

test("a flashcard with no details has nothing to expand", async ({ page }) => {
  await page.goto("/");
  await createCollection(page, "Bare", [["la réunion", "the meeting"]]);
  await page.getByRole("button", { name: "Study flashcards" }).click();

  await page.getByRole("button", { name: "Show English" }).click();
  await expect(page.getByText("the meeting")).toBeVisible();
  await expect(page.getByText("Details")).toBeHidden();
});

test("a collection with no items has nothing to study", async ({ page }) => {
  await page.goto("/");
  await createCollection(page, "Empty", []);

  await expect(page.getByRole("button", { name: "Study flashcards" })).toBeHidden();
});

test("the Learner self-rates each card from 1 to 4 through a session", async ({ page }) => {
  await page.goto("/");
  await createCollection(page, "Au bureau", [
    ["la réunion", "the meeting"],
    ["le congé", "the leave"],
  ]);
  await page.getByRole("button", { name: "Study flashcards" }).click();

  await page.getByRole("button", { name: "Show English" }).click();
  const ratings = page.getByRole("group", { name: "Rate your recall" }).getByRole("button");
  await expect(ratings).toHaveText(["1 Forgot it", "2", "3", "4 Effortless"]);

  await ratings.first().click();
  await expect(page.getByRole("heading", { name: "le congé" })).toBeVisible();
  await rateCard(page, "4 Effortless");

  await expect(page.getByText("Session complete: 2 cards rated")).toBeVisible();
  await page.getByRole("button", { name: "Back to collection" }).click();

  const row = (french: string) => page.getByRole("listitem").filter({ hasText: french });
  await expect(row("la réunion")).toContainText("Last rating: 1");
  await expect(row("le congé")).toContainText("Last rating: 4");
});

test("rating a card again updates its last rating, and ending early keeps ratings", async ({ page }) => {
  await page.goto("/");
  await createCollection(page, "Au bureau", [
    ["la réunion", "the meeting"],
    ["le congé", "the leave"],
  ]);

  await page.getByRole("button", { name: "Study flashcards" }).click();
  await rateCard(page, "2");
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByText("Session complete: 1 card rated")).toBeVisible();
  await page.getByRole("button", { name: "Back to collection" }).click();

  const row = (french: string) => page.getByRole("listitem").filter({ hasText: french });
  await expect(row("la réunion")).toContainText("Last rating: 2");
  await expect(row("le congé")).not.toContainText("Last rating");

  await page.getByRole("button", { name: "Study flashcards" }).click();
  await rateCard(page, "3");
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: "Back to collection" }).click();
  await expect(row("la réunion")).toContainText("Last rating: 3");
});

test("collections, items and ratings work offline and persist when the app is reopened", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();

  await createCollection(page, "Avant le vol", [["la réunion", "the meeting"]]);
  await page.getByRole("button", { name: "Study flashcards" }).click();
  await rateCard(page, "3");
  await page.getByRole("button", { name: "Back to collection" }).click();
  await page.getByRole("button", { name: "Back to collections" }).click();
  await openCollection(page, "Useful expressions");
  await page.getByRole("button", { name: "Edit tant pis" }).click();
  await page.getByLabel("English").fill("oh well");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "tant pis" })).toContainText("oh well");
  await page.close();

  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("/");
  await expect(offline.getByRole("status", { name: "Connection" })).toHaveText("Offline");

  await openCollection(offline, "Useful expressions");
  const expression = offline.getByRole("listitem").filter({ hasText: "tant pis" });
  await expect(expression).toContainText("oh well");
  await expect(offline.getByRole("list", { name: "Items" }).getByRole("listitem")).toHaveCount(50);
  await offline.getByRole("button", { name: "Back to collections" }).click();

  await openCollection(offline, "Avant le vol");
  await expect(offline.getByRole("listitem").filter({ hasText: "la réunion" })).toContainText("Last rating: 3");
  await offline.getByRole("button", { name: "Back to collections" }).click();

  await createCollection(offline, "Hors ligne", [["le vol", "the flight"]]);
  await offline.getByRole("button", { name: "Study flashcards" }).click();
  await rateCard(offline, "4 Effortless");
  await expect(offline.getByText("Session complete: 1 card rated")).toBeVisible();
  await offline.close();

  const reopened = await context.newPage();
  await reopened.goto("/");
  await openCollection(reopened, "Hors ligne");
  await expect(reopened.getByRole("listitem").filter({ hasText: "le vol" })).toContainText("Last rating: 4");
});

test("a long entry fits the screen while studying", async ({ page }) => {
  await page.goto("/");
  await openCollection(page, "Useful expressions");
  await page.getByRole("button", { name: "Study flashcards" }).click();
  await page.getByRole("button", { name: "Show English" }).click();
  await page.getByText("Details").click();

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
