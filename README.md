# French Learning

## Run and test

First time: `npm install`, then `npx playwright install chromium`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server. The service worker is only active in a built app. |
| `npm run build` | Typechecks the app and builds it to `dist/`. |
| `npm run preview` | Serves `dist/`. |
| `npm run typecheck` | Typechecks the app and the tests. |
| `npm test` | Runs the Vitest unit tests, then the Playwright tests. |
| `npm run test:e2e` | Runs only the Playwright tests. |

The Playwright tests build the app to `dist-test/` against local cloud and AI stand-ins, then run on desktop and mobile Chromium. They use ports 4310 to 4312; set `E2E_PORT_BASE` to run on others. `docs/sync-contract.md` describes what the cloud stand-in implements. The installability test runs in the Edge installed with Windows and is skipped on other platforms.
