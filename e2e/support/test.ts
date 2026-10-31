import { test as base } from "@playwright/test";
import { aiPort, cloudPort } from "./ports";
import { ServiceStandIn } from "./service-stand-in";

async function runStandIn(port: number, use: (standIn: ServiceStandIn) => Promise<void>) {
  const standIn = new ServiceStandIn(port);
  await standIn.start();
  await use(standIn);
  await standIn.stop();
}

type StandIns = {
  /** The cloud-sync service the app is built against. */
  cloud: ServiceStandIn;
  /** The AI service the app is built against. */
  ai: ServiceStandIn;
};

/**
 * Use this `test` in every spec. Both stand-ins run for every test, fresh each
 * time, whether or not the test asks for them.
 */
export const test = base.extend<StandIns>({
  cloud: [({}, use) => runStandIn(cloudPort, use), { auto: true }],
  ai: [({}, use) => runStandIn(aiPort, use), { auto: true }],
});

export { expect } from "@playwright/test";
