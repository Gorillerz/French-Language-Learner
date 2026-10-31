import type { Page } from "@playwright/test";
import type { Reply, ServiceStandIn } from "./support/service-stand-in";
import { expect, test } from "./support/test";

const apiKey = "sk-or-test-key-do-not-leak";

type ChatBody = { model: string; messages: { role: string; content: string }[] };

function replyWith(content: unknown): Reply {
  return { json: { choices: [{ message: { role: "assistant", content } }] } };
}

function generated(fields: Record<string, string>) {
  return replyWith(JSON.stringify(fields));
}

const allDetails = {
  definition: "A planned gathering of colleagues.",
  explanation: "Used for work and formal meetings.",
  etymology: "From réunir, to bring together.",
  history: "In office use since the nineteenth century.",
  synonyms: "le rendez-vous, l'assemblée",
  example: "La réunion commence à neuf heures.",
};

async function openArea(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function saveKey(page: Page, key = apiKey) {
  await openArea(page, "AI");
  await page.getByLabel("OpenRouter API key").fill(key);
  await page.getByRole("button", { name: "Save AI settings" }).click();
  await expect(page.getByRole("status", { name: "AI settings" })).toHaveText("Saved.");
}

async function createCard(page: Page, collection: string, french: string, english: string) {
  await openArea(page, "Grammar");
  await openArea(page, "Vocabulary");
  await page.getByLabel("New collection name").fill(collection);
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill(french);
  await page.getByLabel("English").fill(english);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: french })).toBeVisible();
}

function openDetails(page: Page, french: string) {
  return page.getByRole("button", { name: `Details for ${french}` }).click();
}

function reviewPanel(page: Page) {
  return page.getByRole("region", { name: "Review AI request" });
}

function sendButton(page: Page) {
  return reviewPanel(page).getByRole("button", { name: "Send to AI" });
}

function chatBody(ai: ServiceStandIn, index = 0) {
  return ai.requests[index]!.body as ChatBody;
}

const email = "learner@example.com";
const signInPassword = "ordinary-sign-in-password";
const passphrase = "le chat dort sur le canapé bleu";

async function signIn(page: Page, button: "Sign in" | "Create account") {
  await openArea(page, "Sync");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Sign-in password").fill(signInPassword);
  await page.getByRole("button", { name: button }).click();
}

async function setUpSync(page: Page) {
  await signIn(page, "Create account");
  await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await page.getByLabel("Repeat passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Set passphrase" }).click();
  await page.getByLabel("I have saved my recovery code").check();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByRole("status", { name: "Sync" })).toHaveText("Sync: up to date");
}

async function joinSync(page: Page) {
  await signIn(page, "Sign in");
  await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("status", { name: "Sync" })).toHaveText("Sync: up to date");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("filling blank flashcard details", () => {
  test("the Learner sees exactly what is sent, sends it, and gets saved details", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");

    await page.getByRole("button", { name: "Fill blank details" }).click();
    await expect(reviewPanel(page)).toBeVisible();
    expect(ai.requests).toEqual([]);
    const shown = (await reviewPanel(page).textContent())!;

    await sendButton(page).click();

    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Filled 6 blank details.",
    );
    for (const value of Object.values(allDetails)) {
      await expect(page.getByText(value, { exact: true })).toBeVisible();
    }

    expect(ai.requests).toHaveLength(1);
    const [request] = ai.requests;
    expect(request).toMatchObject({ method: "POST", path: "/chat/completions" });
    expect(request!.headers.authorization).toBe(`Bearer ${apiKey}`);
    const body = chatBody(ai);
    expect(Object.keys(body).sort()).toEqual(["messages", "model"]);
    expect(body.messages.at(-1)).toEqual({
      role: "user",
      content: "French: la réunion\nEnglish: the meeting",
    });
    expect(shown).toContain(body.model);
    for (const { content } of body.messages) expect(shown).toContain(content);
  });

  test("the review fits the screen and cancelling sends nothing", async ({ page, ai }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();

    await expect(reviewPanel(page)).toBeHidden();
    expect(ai.requests).toEqual([]);
  });

  test("only blank details are asked for or filled, whatever the model replies", async ({ page, ai }) => {
    ai.respond(
      "POST",
      "/chat/completions",
      generated({ ...allDetails, definition: "Not what I wrote.", french: "le piège" }),
    );
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await page.getByRole("button", { name: "Edit la réunion" }).click();
    await page.getByLabel("Definition").fill("Ce que j'ai écrit moi-même.");
    await page.getByRole("button", { name: "Save" }).click();
    await openDetails(page, "la réunion");

    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();

    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Filled 5 blank details.",
    );
    await expect(page.getByText("Ce que j'ai écrit moi-même.")).toBeVisible();
    await expect(page.getByText("Not what I wrote.")).toHaveCount(0);
    await expect(page.getByText("le piège")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "la réunion", exact: true })).toBeVisible();
    await expect(page.getByText("This card has no blank details")).toBeVisible();

    const [instructions, content] = chatBody(ai).messages;
    expect(instructions!.content).not.toContain("- definition");
    expect(instructions!.content).toContain("- etymology");
    expect(content!.content).not.toContain("Ce que j'ai écrit");
  });

  test("a detail the Learner writes while the AI is working is kept", async ({ page, context, ai }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();

    let releaseRequest = () => {};
    const released = new Promise<void>((resolve) => (releaseRequest = resolve));
    await page.route(`${ai.url}/**`, async (route) => {
      await released;
      await route.continue();
    });
    await sendButton(page).click();

    const otherTab = await context.newPage();
    await otherTab.goto("/");
    await otherTab.getByRole("button", { name: "Open Au bureau" }).click();
    await otherTab.getByRole("button", { name: "Edit la réunion" }).click();
    await otherTab.getByLabel("Etymology").fill("Mon étymologie à moi.");
    await otherTab.getByRole("button", { name: "Save" }).click();
    await expect(otherTab.getByRole("button", { name: "Add item" })).toBeVisible();
    await otherTab.close();

    releaseRequest();

    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Filled 5 blank details.",
    );
    await expect(page.getByText("Mon étymologie à moi.")).toBeVisible();
    await expect(page.getByText(allDetails.etymology)).toHaveCount(0);
  });

  test("a malformed reply saves nothing and says so, and the Learner can resend", async ({ page, ai }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();

    const malformed: Reply[] = [
      replyWith("Bien sûr ! Voici les détails."),
      replyWith(JSON.stringify(["definition"])),
      generated({ definition: "A gathering." }),
      replyWith(JSON.stringify({ ...allDetails, synonyms: ["le rendez-vous"] })),
      replyWith(JSON.stringify(Object.fromEntries(Object.keys(allDetails).map((key) => [key, " "])))),
      replyWith(null),
      { json: { error: { code: 502, message: "Upstream failed" } } },
    ];
    for (const reply of malformed) {
      ai.respond("POST", "/chat/completions", reply);
      const before = ai.requests.length;
      await sendButton(page).click();
      await expect(page.getByRole("alert")).toContainText("nothing was saved", { ignoreCase: true });
      await expect.poll(() => ai.requests.length).toBe(before + 1);
      await expect(sendButton(page)).toBeEnabled();
    }
    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Blank", { exact: true })).toHaveCount(7);

    ai.respond("POST", "/chat/completions", replyWith("```json\n" + JSON.stringify(allDetails) + "\n```"));
    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Filled 6 blank details.",
    );
  });

  test("generated details stay editable and show up when studying", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toContainText("Filled");

    await page.getByRole("button", { name: "Edit la réunion" }).click();
    await expect(page.getByLabel("Definition")).toHaveValue(allDetails.definition);
    await expect(page.getByLabel("Explanation")).toHaveValue(allDetails.explanation);
    await expect(page.getByLabel("History")).toHaveValue(allDetails.history);
    await expect(page.getByLabel("Synonyms")).toHaveValue(allDetails.synonyms);
    await expect(page.getByLabel("Example sentences")).toHaveValue(allDetails.example);
    await page.getByLabel("Etymology").fill("Du verbe réunir, je préfère.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Add item" })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Open Au bureau" }).click();
    await openDetails(page, "la réunion");
    await expect(page.getByText("Du verbe réunir, je préfère.")).toBeVisible();
    await page.getByRole("button", { name: "Back to collection" }).click();

    await page.getByRole("button", { name: "Study flashcards" }).click();
    await page.getByRole("button", { name: "Show English" }).click();
    const card = page.getByRole("region", { name: "Flashcard" });
    await card.getByText("Details").click();
    await expect(card.getByText("Du verbe réunir, je préfère.")).toBeVisible();
    await expect(card.getByText(allDetails.history)).toBeVisible();
    await expect(card.getByText(allDetails.example)).toBeVisible();
  });

  test("cards saved before these details existed can be opened, edited and filled", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    await page.goto("/icon.svg");
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          // Dexie stores version 1 of a schema as native version 10.
          const open = indexedDB.open("french-learning", 10);
          open.onerror = () => reject(open.error);
          open.onupgradeneeded = () => {
            const connection = open.result;
            const collections = connection.createObjectStore("collections", { keyPath: "id" });
            collections.createIndex("position", "position");
            const items = connection.createObjectStore("vocabularyItems", { keyPath: "id" });
            items.createIndex("collectionId", "collectionId");
            const ratings = connection.createObjectStore("flashcardRatings", { keyPath: "id" });
            for (const index of ["kind", "cardId", "topicId", "sessionId", "ratedAt", "savedAt"]) {
              ratings.createIndex(index, index);
            }
            const savedAt = "2026-01-01T00:00:00.000Z";
            collections.add({ id: "mine", name: "Mes mots", position: 0, savedAt });
            items.add({
              id: "mine-1",
              collectionId: "mine",
              french: "la réunion",
              english: "the meeting",
              definition: "Mine.",
              example: "",
              pronunciation: "",
              position: 0,
              savedAt,
            });
          };
          open.onsuccess = () => {
            open.result.close();
            resolve();
          };
        }),
    );

    await page.goto("/");
    await saveKey(page);
    await openArea(page, "Vocabulary");
    await page.getByRole("button", { name: "Open Mes mots" }).click();

    await page.getByRole("button", { name: "Edit la réunion" }).click();
    await expect(page.getByLabel("Etymology")).toHaveValue("");
    await page.getByRole("button", { name: "Cancel" }).click();

    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();

    await expect(page.getByRole("status", { name: "AI result" })).toHaveText(
      "Filled 5 blank details.",
    );
    await expect(page.getByText("Mine.")).toBeVisible();
    await expect(page.getByText(allDetails.etymology)).toBeVisible();
  });
});

test.describe("topic help", () => {
  test("the Learner asks about a flashcard, with follow-ups, and nothing is kept", async ({ page, ai }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");

    ai.respond("POST", "/chat/completions", replyWith("Oui, surtout au travail."));
    await page.getByLabel("Your question").fill("Is it formal?");
    await page.getByRole("button", { name: "Ask AI" }).click();
    expect(ai.requests).toEqual([]);
    const shown = (await reviewPanel(page).textContent())!;
    await sendButton(page).click();

    const answers = page.getByRole("list", { name: "AI answers" });
    await expect(answers).toContainText("Is it formal?");
    await expect(answers).toContainText("Oui, surtout au travail.");

    const first = chatBody(ai).messages;
    expect(first.map(({ role }) => role)).toEqual(["system", "user"]);
    expect(first[0]!.content).toContain("French: la réunion\nEnglish: the meeting");
    expect(first[1]!.content).toBe("Is it formal?");
    for (const { content } of first) expect(shown).toContain(content);

    ai.respond("POST", "/chat/completions", replyWith("Non, pas vraiment."));
    await page.getByLabel("Your question").fill("And with friends?");
    await page.getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();
    await expect(answers).toContainText("Non, pas vraiment.");

    expect(chatBody(ai, 1).messages.slice(1)).toEqual([
      { role: "user", content: "Is it formal?" },
      { role: "assistant", content: "Oui, surtout au travail." },
      { role: "user", content: "And with friends?" },
    ]);

    await page.getByRole("button", { name: "Back to collection" }).click();
    await openDetails(page, "la réunion");
    await expect(page.getByText("Oui, surtout au travail.")).toHaveCount(0);
    await expect(page.getByText("Etymology").locator("..")).toContainText("Blank");
  });

  test("the Learner asks about a grammar concept", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", replyWith("Parce que le doute appelle le subjonctif."));
    await saveKey(page);
    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    const firstParagraph = (await page.locator("article.concept p").first().textContent())!;

    await page.getByLabel("Your question").fill("Why after douter que?");
    await page.getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();

    await expect(page.getByRole("list", { name: "AI answers" })).toContainText(
      "Parce que le doute appelle le subjonctif.",
    );
    const sent = JSON.stringify(ai.requests[0]!.body);
    expect(sent).toContain("The subjunctive");
    expect(sent).toContain("Why after douter que?");
    expect(sent).not.toContain(firstParagraph.slice(0, 40));
  });
});

test.describe("what is shared", () => {
  test("a request carries nothing unrelated to the card", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    await saveKey(page);
    await createCard(page, "Mes secrets", "le mot caché", "the hidden word");
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await page.getByRole("button", { name: "Study flashcards" }).click();
    await page.getByRole("button", { name: "Show English" }).click();
    await page.getByRole("button", { name: "1 Forgot it" }).click();
    await page.getByRole("button", { name: "Back to collection" }).click();
    await page.getByRole("button", { name: "Edit la réunion" }).click();
    await page.getByLabel("Pronunciation").fill("/la ʁe.y.njɔ̃/");
    await page.getByRole("button", { name: "Save" }).click();

    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toContainText("Filled");

    const sent = JSON.stringify(ai.requests.map(({ body, path }) => ({ body, path })));
    for (const unrelated of [
      "Mes secrets",
      "le mot caché",
      "the hidden word",
      "Au bureau",
      "Useful expressions",
      "ʁe.y",
      "Forgot",
      "rating",
      "savedAt",
      "sessionId",
      apiKey,
    ]) {
      expect(sent).not.toContain(unrelated);
    }
  });

  test("browsing, studying, quizzing and syncing never call the AI", async ({ page, ai, cloud }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Back to collection" }).click();
    await page.getByRole("button", { name: "Study flashcards" }).click();
    await page.getByRole("button", { name: "Show English" }).click();
    await page.getByRole("button", { name: "2", exact: true }).click();

    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    await openArea(page, "Quiz");
    await openArea(page, "Progress");
    await setUpSync(page);
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

    expect(ai.requests).toEqual([]);
  });

  test("the API key goes only to the AI service and is never logged or shown", async ({ page, ai, cloud }) => {
    ai.respond("POST", "/chat/completions", generated(allDetails));
    const logged: string[] = [];
    const elsewhere: string[] = [];
    page.on("console", (message) => logged.push(message.text()));
    page.on("pageerror", (error) => logged.push(error.message));
    page.on("request", async (request) => {
      const everything = request.url() + JSON.stringify(await request.allHeaders()) + request.postData();
      if (everything.includes(apiKey) && !request.url().startsWith(ai.url)) {
        elsewhere.push(request.url());
      }
    });

    await saveKey(page);
    await expect(page.getByLabel("OpenRouter API key")).toHaveValue("");
    await setUpSync(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();
    expect(await page.content()).not.toContain(apiKey);
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toContainText("Filled");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

    expect(logged.join("\n")).not.toContain(apiKey);
    expect(elsewhere).toEqual([]);
    expect(cloud.everythingStored()).not.toContain(apiKey);
    expect(cloud.everythingReceived()).not.toContain(apiKey);
  });

  test("details filled on a built-in card sync as encrypted content", async ({ page, ai, cloud, newDevice }) => {
    ai.respond("POST", "/chat/completions", generated({ ...allDetails, etymology: "Du latin agere." }));
    await saveKey(page);
    await setUpSync(page);
    await openArea(page, "Vocabulary");
    await page.getByRole("button", { name: "Open Useful expressions" }).click();
    await openDetails(page, "il s'agit de");
    await page.getByRole("button", { name: "Fill blank details" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("status", { name: "AI result" })).toContainText("Filled");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

    const other = await newDevice();
    await joinSync(other);
    await openArea(other, "Vocabulary");
    await other.getByRole("button", { name: "Open Useful expressions" }).click();
    await openDetails(other, "il s'agit de");
    await expect(other.getByText("Du latin agere.")).toBeVisible();

    const stored = cloud.everythingStored();
    for (const text of ["Du latin agere.", allDetails.history, allDetails.synonyms]) {
      expect(stored).not.toContain(text);
      expect(cloud.everythingReceived()).not.toContain(text);
    }
  });
});

test.describe("when AI cannot run", () => {
  test("without a key each action explains what is needed", async ({ page, ai }) => {
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");

    await expect(page.getByRole("button", { name: "Fill blank details" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Ask AI" })).toBeDisabled();
    await expect(page.getByText("add your OpenRouter API key").first()).toBeVisible();

    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    await page.getByLabel("Your question").fill("Pourquoi ?");
    await expect(page.getByRole("button", { name: "Ask AI" })).toBeDisabled();
    await expect(page.getByText("add your OpenRouter API key")).toBeVisible();
    expect(ai.requests).toEqual([]);
  });

  test("a removed key stops AI, and a saved one survives a reload", async ({ page }) => {
    await saveKey(page);
    await page.reload();
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await expect(page.getByRole("button", { name: "Fill blank details" })).toBeEnabled();

    await openArea(page, "AI");
    await page.getByRole("button", { name: "Remove key" }).click();
    await expect(page.getByRole("status", { name: "AI settings" })).toHaveText("Key removed.");
    await openArea(page, "Vocabulary");
    await page.getByRole("button", { name: "Open Au bureau" }).click();
    await openDetails(page, "la réunion");
    await expect(page.getByRole("button", { name: "Fill blank details" })).toBeDisabled();
  });

  test("the chosen model is used", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", replyWith("D'accord."));
    await openArea(page, "AI");
    await page.getByLabel("Model").fill("mistralai/mistral-large");
    await saveKey(page);
    await page.reload();
    await openArea(page, "AI");
    await expect(page.getByLabel("Model")).toHaveValue("mistralai/mistral-large");

    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    await page.getByLabel("Your question").fill("Pourquoi ?");
    await page.getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();
    await expect(page.getByRole("list", { name: "AI answers" })).toContainText("D'accord.");

    expect(chatBody(ai).model).toBe("mistralai/mistral-large");
  });

  test("offline, actions are disabled with an explanation until the network returns", async ({ page, context, ai }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();

    await context.setOffline(true);

    await expect(sendButton(page)).toBeDisabled();
    await expect(reviewPanel(page).getByText("AI help needs an internet connection")).toBeVisible();
    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Fill blank details" })).toBeDisabled();
    await page.getByLabel("Your question").fill("Pourquoi ?");
    await expect(page.getByRole("button", { name: "Ask AI" })).toBeDisabled();
    await expect(page.getByText("AI help needs an internet connection").first()).toBeVisible();

    await context.setOffline(false);

    await expect(page.getByRole("button", { name: "Fill blank details" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Ask AI" })).toBeEnabled();
    expect(ai.requests).toEqual([]);
  });

  test("each kind of failure is explained, saves nothing and is not retried", async ({ page, ai }) => {
    await saveKey(page);
    await createCard(page, "Au bureau", "la réunion", "the meeting");
    await openDetails(page, "la réunion");
    await page.getByRole("button", { name: "Fill blank details" }).click();

    const failures: [number, string][] = [
      [401, "refused your API key"],
      [429, "limiting requests"],
      [500, "having trouble"],
      [503, "having trouble"],
      [402, "error 402"],
    ];
    for (const [status, message] of failures) {
      ai.respond("POST", "/chat/completions", { status, json: { error: { message: "Nope" } } });
      const before = ai.requests.length;
      await sendButton(page).click();
      await expect(page.getByRole("alert")).toContainText(message);
      await expect(sendButton(page)).toBeEnabled();
      expect(ai.requests).toHaveLength(before + 1);
    }

    ai.goDown();
    await sendButton(page).click();
    await expect(page.getByRole("alert")).toContainText("Could not reach the AI service");
    ai.comeBack();

    await reviewPanel(page).getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Blank", { exact: true })).toHaveCount(7);
  });

  test("topic help explains a failure too", async ({ page, ai }) => {
    ai.respond("POST", "/chat/completions", { status: 429, json: {} });
    await saveKey(page);
    await openArea(page, "Grammar");
    await page.getByRole("button", { name: /The subjunctive/ }).click();
    await page.getByLabel("Your question").fill("Pourquoi ?");
    await page.getByRole("button", { name: "Ask AI" }).click();
    await sendButton(page).click();

    await expect(page.getByRole("alert")).toContainText("limiting requests");
    await expect(page.getByRole("list", { name: "AI answers" })).toHaveCount(0);
  });
});
