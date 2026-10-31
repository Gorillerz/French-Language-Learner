import { test as base, type BrowserContext, type Page } from "@playwright/test";
import { CloudStandIn } from "./cloud-stand-in";
import { aiPort, cloudPort } from "./ports";
import { ServiceStandIn } from "./service-stand-in";

async function runStandIn<T extends ServiceStandIn>(standIn: T, use: (standIn: T) => Promise<void>) {
  await standIn.start();
  await use(standIn);
  await standIn.stop();
}

type Fixtures = {
  /** The cloud-sync service the app is built against. See docs/sync-contract.md. */
  cloud: CloudStandIn;
  /** The AI service the app is built against. */
  ai: ServiceStandIn;
  /** Opens the app on another device: a separate context, so separate storage. */
  newDevice: () => Promise<Page>;
};

/**
 * Use this `test` in every spec. Both stand-ins run for every test, fresh each
 * time, whether or not the test asks for them.
 */
export const test = base.extend<Fixtures>({
  cloud: [({}, use) => runStandIn(new CloudStandIn(cloudPort), use), { auto: true }],
  ai: [({}, use) => runStandIn(new ServiceStandIn(aiPort), use), { auto: true }],
  newDevice: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async () => {
      const context = await browser.newContext({ baseURL: baseURL! });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto("/");
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect } from "@playwright/test";
