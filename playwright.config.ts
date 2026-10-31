import { defineConfig, devices } from "@playwright/test";
import { aiPort, appPort, cloudPort } from "./e2e/support/ports";

const appUrl = `http://127.0.0.1:${appPort}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  // Stand-ins listen on the fixed ports baked into the test build, so only one
  // test can hold them at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // A separate outDir keeps stand-in URLs out of the deployable dist/.
    command: `npx vite build --outDir dist-test --emptyOutDir && npx vite preview --outDir dist-test --host 127.0.0.1 --port ${appPort} --strictPort`,
    url: appUrl,
    timeout: 120_000,
    // Never reuse: an existing server could be another worktree's build.
    reuseExistingServer: false,
    env: {
      VITE_CLOUD_BASE_URL: `http://127.0.0.1:${cloudPort}`,
      VITE_AI_BASE_URL: `http://127.0.0.1:${aiPort}`,
      VITE_SYNC_POLL_MS: "400",
    },
  },
});
