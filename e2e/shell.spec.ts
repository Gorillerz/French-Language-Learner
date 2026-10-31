import { expect, test } from "./support/test";

test("the Learner opens the app online", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "French Learning" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Connection" })).toHaveText("Online");
});

test("the shell fits the screen and the Learner can reach each area", async ({ page }) => {
  await page.goto("/");

  for (const area of ["Grammar", "Quiz", "Progress", "Vocabulary"]) {
    await page.getByRole("button", { name: area }).click();
    await expect(page.getByRole("heading", { name: area })).toBeVisible();
  }

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test("the connection state follows the network while the app is open", async ({ page, context }) => {
  await page.goto("/");
  const connection = page.getByRole("status", { name: "Connection" });

  await context.setOffline(true);
  await expect(connection).toHaveText("Offline");

  await context.setOffline(false);
  await expect(connection).toHaveText("Online");
});

test("after the first online load, the app reopens offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();
  await page.close();

  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto("/");

  await expect(reopened.getByRole("heading", { name: "French Learning" })).toBeVisible();
  await expect(reopened.getByRole("status", { name: "Connection" })).toHaveText("Offline");
});
