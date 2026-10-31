import type { Page } from "@playwright/test";
import { expect, test } from "./support/test";

/** Calls a service from inside the app's page, as the app's own code would. */
function callFromApp(page: Page, url: string, body?: unknown) {
  return page.evaluate(
    async ({ url, body }) => {
      try {
        const response = await fetch(url, {
          method: body === undefined ? "GET" : "POST",
          headers: body === undefined ? {} : {
            "Content-Type": "application/json",
            Authorization: "Bearer test-key",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, json: await response.json() };
      } catch {
        return { unreachable: true };
      }
    },
    { url, body },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the AI stand-in replies as scripted and captures what it was sent", async ({ page, ai }) => {
  ai.respond("POST", "/chat/completions", { json: { choices: [{ message: { content: "Bonjour" } }] } });

  const reply = await callFromApp(page, `${ai.url}/chat/completions`, { prompt: "Say hello" });

  expect(reply).toEqual({
    status: 200,
    json: { choices: [{ message: { content: "Bonjour" } }] },
  });
  expect(ai.requests).toHaveLength(1);
  expect(ai.requests[0]).toMatchObject({
    method: "POST",
    path: "/chat/completions",
    body: { prompt: "Say hello" },
  });
  expect(ai.requests[0]?.headers.authorization).toBe("Bearer test-key");
});

test("the cloud stand-in can build a reply from the request", async ({ page, cloud }) => {
  cloud.respond("POST", "/push", (request) => ({ status: 201, json: { received: request.body } }));

  const reply = await callFromApp(page, `${cloud.url}/push`, { id: "item-1" });

  expect(reply).toEqual({ status: 201, json: { received: { id: "item-1" } } });
});

test("a call nothing has scripted fails loudly and is still captured", async ({ page, cloud }) => {
  const reply = await callFromApp(page, `${cloud.url}/unscripted`);

  expect(reply).toMatchObject({ status: 501 });
  expect(cloud.requests).toMatchObject([{ method: "GET", path: "/unscripted" }]);
});

test("a stand-in can go down and come back", async ({ page, cloud }) => {
  cloud.respond("GET", "/pull", { json: { records: [] } });

  cloud.goDown();
  expect(await callFromApp(page, `${cloud.url}/pull`)).toEqual({ unreachable: true });

  cloud.comeBack();
  expect(await callFromApp(page, `${cloud.url}/pull`)).toMatchObject({ status: 200 });
});

test("stand-ins cannot be reached while the browser is offline", async ({ page, context, cloud }) => {
  cloud.respond("GET", "/pull", { json: { records: [] } });

  await context.setOffline(true);

  expect(await callFromApp(page, `${cloud.url}/pull`)).toEqual({ unreachable: true });
  expect(cloud.requests).toEqual([]);
});

test("each test starts with empty stand-ins", async ({ cloud, ai }) => {
  expect(cloud.requests).toEqual([]);
  expect(ai.requests).toEqual([]);
});
