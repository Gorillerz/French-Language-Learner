import { chromium } from "@playwright/test";
import { expect, test } from "./support/test";

test("the browser considers the app installable", async ({ baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Install criteria are checked once, in desktop Edge.");
  test.skip(process.platform !== "win32", "Relies on the Edge that ships with Windows.");

  // Playwright's bundled headless shell reports no install errors for any page,
  // even one with no manifest icons, and a default context counts as incognito.
  // Only a real browser with a real profile gives a meaningful answer.
  const edge = await chromium.launchPersistentContext(testInfo.outputPath("edge-profile"), {
    channel: "msedge",
  });
  try {
    const page = await edge.newPage();
    await page.goto(baseURL!);
    await expect(page.getByText("Ready for offline use")).toBeVisible();

    const browser = await edge.newCDPSession(page);
    const { installabilityErrors } = await browser.send("Page.getInstallabilityErrors");

    expect(installabilityErrors).toEqual([]);
  } finally {
    await edge.close();
  }
});

test("the installed app launches standalone at the app's start page", async ({ page, context }) => {
  await page.goto("/");

  const browser = await context.newCDPSession(page);
  const { url, errors, data } = await browser.send("Page.getAppManifest");

  expect(url).not.toBe("");
  expect(errors).toEqual([]);
  expect(JSON.parse(data!)).toMatchObject({
    name: "French Learning",
    display: "standalone",
    start_url: "/",
  });
});
