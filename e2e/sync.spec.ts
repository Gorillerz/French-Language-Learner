import type { Page } from "@playwright/test";
import {
  email,
  joinDevice,
  openSync,
  passphrase,
  setUpFirstDevice,
  signIn,
  signInPassword,
  syncStatus,
} from "./support/sync";
import { expect, test } from "./support/test";

const newPassphrase = "une toute nouvelle phrase secrète";

/** Leaving the area and coming back always lands on the list of collections. */
async function openCollections(page: Page) {
  await page.getByRole("button", { name: "Grammar", exact: true }).click();
  await page.getByRole("button", { name: "Vocabulary", exact: true }).click();
}

async function createCollection(page: Page, name: string) {
  await openCollections(page);
  await page.getByLabel("New collection name").fill(name);
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function addItem(page: Page, french: string, english: string) {
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("French").fill(french);
  await page.getByLabel("English").fill(english);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: french })).toBeVisible();
}

async function goToCollection(page: Page, name: string) {
  await openCollections(page);
  await page.getByRole("button", { name: `Open ${name}` }).click();
}

/** Edits the first built-in expression: its row id is itself readable French. */
async function editExpression(page: Page, english: string) {
  await goToCollection(page, "Useful expressions");
  await page.getByRole("button", { name: "Edit il s'agit de" }).click();
  await page.getByLabel("English").fill(english);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: english })).toBeVisible();
}

async function expectExpression(page: Page, english: string) {
  await goToCollection(page, "Useful expressions");
  await expect(page.getByRole("listitem").filter({ hasText: english })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("setup", () => {
  test("the app works without sync, and makes no call to the cloud", async ({ page, cloud }) => {
    await expect(syncStatus(page)).toHaveText("Sync: not set up");
    await createCollection(page, "Au bureau");
    expect(cloud.requests).toEqual([]);
  });

  test("a first device gets a recovery code and clear warnings about its limits", async ({ page }) => {
    await signIn(page, "Create account");
    await expect(page.getByText("resetting it cannot restore your encrypted learning data")).toBeVisible();

    await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
    await page.getByLabel("Repeat passphrase").fill(passphrase);
    await page.getByRole("button", { name: "Set passphrase" }).click();

    await expect(page.getByLabel("Your recovery code")).toHaveText(/^(\w{4}-){7}\w{4}$/);
    await expect(page.getByText("somewhere you control")).toBeVisible();
    await expect(page.getByText("If you forget your passphrase and also lose your recovery code and every device")).toBeVisible();
    await expect(page.getByText("Resetting your sign-in cannot restore")).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish setup" })).toBeDisabled();

    await page.getByLabel("I have saved my recovery code").check();
    await page.getByRole("button", { name: "Finish setup" }).click();

    await expect(syncStatus(page)).toHaveText("Sync: up to date");
    await expect(page.getByText("If you forget your passphrase and also lose your recovery code and every device")).toBeVisible();
  });

  test("a short passphrase is refused and the app asks for a unique one", async ({ page, cloud }) => {
    await signIn(page, "Create account");
    await expect(page.getByText("choose a passphrase you use nowhere else")).toBeVisible();

    await page.getByLabel("Passphrase", { exact: true }).fill("fourteen chars");
    await page.getByLabel("Repeat passphrase").fill("fourteen chars");
    await page.getByRole("button", { name: "Set passphrase" }).click();

    await expect(page.getByRole("alert")).toHaveText("Use at least 15 characters.");
    expect(cloud.storedKeyBundles()).toEqual([]);
  });

  test("a passphrase that only repeats a short pattern is refused, and the rule is explained", async ({ page, cloud }) => {
    await signIn(page, "Create account");
    await expect(page.getByText("not just one short pattern repeated")).toBeVisible();

    for (const weak of ["aaaaaaaaaaaaaaaaaaaa", "abcabcabcabcabcabc", "le chat le chat le chat"]) {
      await page.getByLabel("Passphrase", { exact: true }).fill(weak);
      await page.getByLabel("Repeat passphrase").fill(weak);
      await page.getByRole("button", { name: "Set passphrase" }).click();

      await expect(page.getByRole("alert")).toContainText("short pattern");
    }
    expect(cloud.storedKeyBundles()).toEqual([]);
    await expect(page.getByLabel("Your recovery code")).toHaveCount(0);
  });

  test("the sign-in password cannot double as the passphrase", async ({ page }) => {
    await signIn(page, "Create account");

    await page.getByLabel("Passphrase", { exact: true }).fill(signInPassword);
    await page.getByLabel("Repeat passphrase").fill(signInPassword);
    await page.getByRole("button", { name: "Set passphrase" }).click();

    await expect(page.getByRole("alert")).toContainText("different from your sign-in password");
  });

  test("the sign-in password cannot slip through in another Unicode form", async ({ page }) => {
    await signIn(page, "Create account");
    // Full-width letters, which key derivation folds to their plain forms.
    const disguised = signInPassword.replace("ordinary", "ｏｒｄｉｎａｒｙ");

    await page.getByLabel("Passphrase", { exact: true }).fill(disguised);
    await page.getByLabel("Repeat passphrase").fill(disguised);
    await page.getByRole("button", { name: "Set passphrase" }).click();

    await expect(page.getByRole("alert")).toContainText("different from your sign-in password");
  });

  test("mistyped repeats are caught", async ({ page }) => {
    await signIn(page, "Create account");

    await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
    await page.getByLabel("Repeat passphrase").fill(`${passphrase}x`);
    await page.getByRole("button", { name: "Set passphrase" }).click();

    await expect(page.getByRole("alert")).toHaveText("The two passphrases do not match.");
  });

  test("abandoning the recovery code step leaves nothing in the cloud", async ({ page, cloud }) => {
    await signIn(page, "Create account");
    await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
    await page.getByLabel("Repeat passphrase").fill(passphrase);
    await page.getByRole("button", { name: "Set passphrase" }).click();
    await expect(page.getByLabel("Your recovery code")).toBeVisible();

    await page.reload();

    await expect(syncStatus(page)).toHaveText("Sync: not set up");
    expect(cloud.storedKeyBundles()).toEqual([]);
  });

  test("a wrong sign-in password is refused", async ({ page }) => {
    await openSync(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Sign-in password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText("That email and password were not recognised.");
  });

  test("setup explains itself when the cloud cannot be reached", async ({ page, cloud }) => {
    cloud.goDown();
    await openSync(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Sign-in password").fill(signInPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("You can keep studying");
  });

  test("data saved before setup survives it and reaches the cloud", async ({ page, newDevice }) => {
    await createCollection(page, "Avant la configuration");
    await addItem(page, "la mémoire", "memory");

    await setUpFirstDevice(page);

    await goToCollection(page, "Avant la configuration");
    await expect(page.getByRole("listitem").filter({ hasText: "la mémoire" })).toBeVisible();

    const other = await newDevice();
    await joinDevice(other);
    await goToCollection(other, "Avant la configuration");
    await expect(other.getByRole("listitem").filter({ hasText: "la mémoire" })).toBeVisible();
  });

  test("after setup, the app opens and edits offline with no passphrase", async ({ page, context }) => {
    await expect(page.getByText("Ready for offline use")).toBeVisible();
    await setUpFirstDevice(page);
    await page.close();

    await context.setOffline(true);
    const reopened = await context.newPage();
    await reopened.goto("/");

    await expect(syncStatus(reopened)).toHaveText("Sync: waiting for connection");
    await createCollection(reopened, "Hors ligne");
    await expect(reopened.getByLabel("Passphrase", { exact: true })).toHaveCount(0);
  });
});

test.describe("a second device", () => {
  test("joins with the passphrase alone and sees shared data", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    await createCollection(page, "Au bureau");
    await addItem(page, "la réunion", "the meeting");

    const other = await newDevice();
    await joinDevice(other);

    await goToCollection(other, "Au bureau");
    await expect(other.getByRole("listitem").filter({ hasText: "la réunion" })).toBeVisible();
  });

  test("cannot join with a wrong passphrase", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    await createCollection(page, "Au bureau");

    const other = await newDevice();
    await signIn(other, "Sign in");
    await other.getByLabel("Passphrase", { exact: true }).fill("not the right passphrase at all");
    await other.getByRole("button", { name: "Unlock" }).click();

    await expect(other.getByRole("alert")).toContainText("did not unlock your data");
    await expect(syncStatus(other)).toHaveText("Sync: not set up");
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Au bureau" })).toHaveCount(0);
  });

  test("two devices converge on edits made on either side", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    await createCollection(page, "Depuis le premier");
    await createCollection(other, "Depuis le second");

    await other.getByRole("button", { name: "Back to collections" }).click();
    await expect(other.getByRole("button", { name: "Open Depuis le premier" })).toBeVisible();
    await page.getByRole("button", { name: "Back to collections" }).click();
    await expect(page.getByRole("button", { name: "Open Depuis le second" })).toBeVisible();
  });

  test("a built-in item edited on one device replaces the fresh seed on another", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    await editExpression(page, "it concerns");

    const other = await newDevice();
    await joinDevice(other);

    await expectExpression(other, "it concerns");
  });
});

test.describe("offline and reconnection", () => {
  test("offline edits sync automatically on reconnect", async ({ page, context, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    await context.setOffline(true);
    await expect(page.getByRole("status", { name: "Connection", exact: true })).toHaveText("Offline");
    await createCollection(page, "Écrit hors ligne");
    await expect(syncStatus(page)).toHaveText("Sync: waiting for connection");

    await context.setOffline(false);

    await expect(page.getByRole("status", { name: "Network notice" })).toHaveText(/Connection restored/);
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Écrit hors ligne" })).toBeVisible();
  });

  test("offline edits survive closing the app", async ({ page, context, newDevice }) => {
    await expect(page.getByText("Ready for offline use")).toBeVisible();
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    await context.setOffline(true);
    await createCollection(page, "Fermé hors ligne");
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto("/");
    await context.setOffline(false);

    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Fermé hors ligne" })).toBeVisible();
  });

  test("the app notices when the cloud is gone though the browser says online", async ({ page, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    cloud.goDown();

    const connection = page.getByRole("status", { name: "Connection", exact: true });
    const notice = page.getByRole("status", { name: "Network notice" });
    await expect(connection).toHaveText("Connection lost");
    await expect(notice).toHaveText(/Connection lost/);
    await createCollection(page, "Pendant la panne");
    await expect(syncStatus(page)).toHaveText("Sync: waiting for connection");

    cloud.comeBack();

    await expect(connection).toHaveText("Online");
    await expect(notice).toHaveText(/Connection restored/);
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Pendant la panne" })).toBeVisible();
  });

  test("the browser going offline shows a lost notice, even before setup", async ({ page, context }) => {
    await context.setOffline(true);
    await expect(page.getByRole("status", { name: "Network notice" })).toHaveText(/Connection lost/);

    await context.setOffline(false);
    await expect(page.getByRole("status", { name: "Network notice" })).toHaveText(/Connection restored/);
  });

  test("a request the cloud refuses is a sync failure, not a lost connection", async ({ page, cloud }) => {
    await setUpFirstDevice(page);
    await page.route(`${cloud.url}/push`, (route) =>
      route.fulfill({
        status: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        json: {},
      }),
    );

    await createCollection(page, "Refusée");

    await expect(syncStatus(page)).toHaveText("Sync: failed");
    await expect(page.getByRole("status", { name: "Connection", exact: true })).toHaveText("Online");
    await expect(page.getByRole("status", { name: "Network notice" })).toHaveCount(0);
    await openSync(page);
    await expect(page.getByRole("alert")).toContainText("refused");

    await page.unroute(`${cloud.url}/push`);
    await expect(syncStatus(page)).toHaveText("Sync: up to date");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("setup does not blame the connection for a refused request", async ({ page, cloud }) => {
    cloud.respond("POST", "/sign-in", { status: 400, json: {} });

    await openSync(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Sign-in password").fill(signInPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("refused");
    await expect(page.getByRole("alert")).not.toContainText("cannot be reached");
  });

  test("an expired sign-in pauses sync without touching study or keys", async ({ page, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    const other = await newDevice();
    await joinDevice(other);

    cloud.expireSessions();
    await expect(syncStatus(page)).toHaveText("Sync: sign in again");
    await expect(page.getByRole("status", { name: "Connection", exact: true })).toHaveText("Online");
    await createCollection(page, "Après expiration");

    await openSync(page);
    await page.getByLabel("Sign-in password").fill(signInPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(syncStatus(page)).toHaveText("Sync: up to date");

    await signInOtherDeviceAgain(other);
    await expect(other.getByRole("button", { name: "Open Après expiration" })).toBeVisible();
  });
});

async function signInOtherDeviceAgain(page: Page) {
  await expect(syncStatus(page)).toHaveText("Sync: sign in again");
  await openSync(page);
  await page.getByLabel("Sign-in password").fill(signInPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(syncStatus(page)).toHaveText("Sync: up to date");
  await openCollections(page);
}

test.describe("conflicts keep the most recent save", () => {
  async function twoDevicesOffline(
    page: Page,
    other: Page,
    setOffline: (offline: boolean) => Promise<void>,
    setOtherOffline: (offline: boolean) => Promise<void>,
  ) {
    await setUpFirstDevice(page);
    await joinDevice(other);
    await editExpression(page, "before the conflict");
    await expectExpression(other, "before the conflict");
    await setOffline(true);
    await setOtherOffline(true);
  }

  test("the later edit wins when the earlier device reconnects last", async ({ page, context, newDevice }) => {
    const other = await newDevice();
    const setOtherOffline = (offline: boolean) => other.context().setOffline(offline);
    await twoDevicesOffline(page, other, (offline) => context.setOffline(offline), setOtherOffline);

    await editExpression(page, "older edit");
    await editExpression(other, "newer edit");

    await setOtherOffline(false);
    await expect(syncStatus(other)).toHaveText("Sync: up to date");
    await context.setOffline(false);

    await expectExpression(page, "newer edit");
    await expectExpression(other, "newer edit");
  });

  test("the later edit wins when the earlier device reconnects first", async ({ page, context, newDevice }) => {
    const other = await newDevice();
    const setOtherOffline = (offline: boolean) => other.context().setOffline(offline);
    await twoDevicesOffline(page, other, (offline) => context.setOffline(offline), setOtherOffline);

    await editExpression(page, "older edit");
    await editExpression(other, "newer edit");

    await context.setOffline(false);
    await expect(syncStatus(page)).toHaveText("Sync: up to date");
    await setOtherOffline(false);

    await expectExpression(page, "newer edit");
    await expectExpression(other, "newer edit");
  });

  test("the outcome is the same with the devices' roles swapped", async ({ page, context, newDevice }) => {
    const other = await newDevice();
    const setOtherOffline = (offline: boolean) => other.context().setOffline(offline);
    await twoDevicesOffline(page, other, (offline) => context.setOffline(offline), setOtherOffline);

    await editExpression(other, "older edit");
    await editExpression(page, "newer edit");

    await context.setOffline(false);
    await setOtherOffline(false);

    await expectExpression(page, "newer edit");
    await expectExpression(other, "newer edit");
  });

  test("a device that joins afterwards gets the winner", async ({ page, context, newDevice }) => {
    const other = await newDevice();
    const setOtherOffline = (offline: boolean) => other.context().setOffline(offline);
    await twoDevicesOffline(page, other, (offline) => context.setOffline(offline), setOtherOffline);

    await editExpression(page, "older edit");
    await editExpression(other, "newer edit");
    await setOtherOffline(false);
    await expect(syncStatus(other)).toHaveText("Sync: up to date");
    await context.setOffline(false);
    await expectExpression(page, "newer edit");

    const third = await newDevice();
    await joinDevice(third);
    await expectExpression(third, "newer edit");
  });
});

test.describe("edits saved at the same instant", () => {
  const instant = new Date("2031-01-01T09:00:00.000Z");
  const winner = "zebra, the larger text";
  const loser = "aardvark, the smaller text";

  for (const firstBack of ["loser", "winner"] as const) {
    test(`every device settles on one winner when the ${firstBack} reconnects first`, async ({ page, context, newDevice }) => {
      const other = await newDevice();
      await setUpFirstDevice(page);
      await joinDevice(other);
      await editExpression(page, "before the conflict");
      await expectExpression(other, "before the conflict");
      await context.setOffline(true);
      await other.context().setOffline(true);
      await page.clock.setFixedTime(instant);
      await other.clock.setFixedTime(instant);

      await editExpression(page, loser);
      await editExpression(other, winner);

      const [first, second] = firstBack === "loser" ? [page, other] : [other, page];
      await first.context().setOffline(false);
      await expect(syncStatus(first)).toHaveText("Sync: up to date");
      await second.context().setOffline(false);

      await expectExpression(page, winner);
      await expectExpression(other, winner);
      const third = await newDevice();
      await joinDevice(third);
      await expectExpression(third, winner);
    });
  }
});

test.describe("recovery", () => {
  async function recover(page: Page, recoveryCode: string) {
    await signIn(page, "Sign in");
    await page.getByRole("button", { name: "I forgot my passphrase" }).click();
    await expect(page.getByText("If you forget your passphrase and also lose your recovery code and every device")).toBeVisible();
    await page.getByLabel("Recovery code").fill(recoveryCode);
    await page.getByLabel("New passphrase", { exact: true }).fill(newPassphrase);
    await page.getByLabel("Repeat new passphrase").fill(newPassphrase);
    await page.getByRole("button", { name: "Set new passphrase" }).click();
  }

  test("the recovery code sets a new passphrase without changing the data key", async ({ page, cloud, newDevice }) => {
    const recoveryCode = await setUpFirstDevice(page);
    await createCollection(page, "À récupérer");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

    const recovering = await newDevice();
    await recover(recovering, recoveryCode);
    await expect(syncStatus(recovering)).toHaveText("Sync: up to date");
    await openCollections(recovering);
    await expect(recovering.getByRole("button", { name: "Open À récupérer" })).toBeVisible();

    // The first device still holds the same data key, so it keeps syncing.
    await createCollection(recovering, "Après la récupération");
    await page.getByRole("button", { name: "Back to collections" }).click();
    await expect(page.getByRole("button", { name: "Open Après la récupération" })).toBeVisible();

    const withNew = await newDevice();
    await joinDevice(withNew, newPassphrase);
    await openCollections(withNew);
    await expect(withNew.getByRole("button", { name: "Open À récupérer" })).toBeVisible();
  });

  test("the old passphrase stops working and the code keeps working", async ({ page, newDevice }) => {
    const recoveryCode = await setUpFirstDevice(page);
    const recovering = await newDevice();
    await recover(recovering, recoveryCode);
    await expect(syncStatus(recovering)).toHaveText("Sync: up to date");

    const withOld = await newDevice();
    await signIn(withOld, "Sign in");
    await withOld.getByLabel("Passphrase", { exact: true }).fill(passphrase);
    await withOld.getByRole("button", { name: "Unlock" }).click();
    await expect(withOld.getByRole("alert")).toContainText("did not unlock your data");

    await withOld.getByRole("button", { name: "I forgot my passphrase" }).click();
    await withOld.getByLabel("Recovery code").fill(recoveryCode);
    await withOld.getByLabel("New passphrase", { exact: true }).fill(`${newPassphrase} encore`);
    await withOld.getByLabel("Repeat new passphrase").fill(`${newPassphrase} encore`);
    await withOld.getByRole("button", { name: "Set new passphrase" }).click();
    await expect(syncStatus(withOld)).toHaveText("Sync: up to date");
  });

  test("a device already set up can use the code, and nothing is lost", async ({ page, context, newDevice }) => {
    const recoveryCode = await setUpFirstDevice(page);
    await createCollection(page, "Déjà synchronisée");
    const other = await newDevice();
    await joinDevice(other);
    await context.setOffline(true);
    await createCollection(page, "Pas encore envoyée");
    await context.setOffline(false);
    await expect(syncStatus(page)).toHaveText("Sync: up to date");

    await openSync(page);
    await page.getByRole("button", { name: "I forgot my passphrase" }).click();
    await page.getByLabel("Sign-in password").fill(signInPassword);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Recovery code").fill(recoveryCode);
    await page.getByLabel("New passphrase", { exact: true }).fill(newPassphrase);
    await page.getByLabel("Repeat new passphrase").fill(newPassphrase);
    await page.getByRole("button", { name: "Set new passphrase" }).click();

    await expect(page.getByRole("status", { name: "Recovery" })).toHaveText(/new passphrase is set/);
    await expect(syncStatus(page)).toHaveText("Sync: up to date");
    await openCollections(page);
    await expect(page.getByRole("button", { name: "Open Déjà synchronisée" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Pas encore envoyée" })).toBeVisible();

    await createCollection(page, "Après coup");
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Après coup" })).toBeVisible();

    const withNew = await newDevice();
    await joinDevice(withNew, newPassphrase);
    await openCollections(withNew);
    await expect(withNew.getByRole("button", { name: "Open Pas encore envoyée" })).toBeVisible();
  });

  test("a device already set up can back out of recovery and change nothing", async ({ page, cloud }) => {
    await setUpFirstDevice(page);
    const bundles = JSON.stringify(cloud.storedKeyBundles());

    await openSync(page);
    await page.getByRole("button", { name: "I forgot my passphrase" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("This device is set up")).toBeVisible();

    await page.getByRole("button", { name: "I forgot my passphrase" }).click();
    await page.getByLabel("Sign-in password").fill(signInPassword);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Back" }).click();

    await expect(page.getByText("This device is set up")).toBeVisible();
    expect(JSON.stringify(cloud.storedKeyBundles())).toBe(bundles);
  });

  test("a wrong recovery code fails cleanly", async ({ page, newDevice }) => {
    await setUpFirstDevice(page);
    const recovering = await newDevice();

    await recover(recovering, "0000-0000-0000-0000-0000-0000-0000-0000");

    await expect(recovering.getByRole("alert")).toContainText("did not unlock your data");
    await expect(syncStatus(recovering)).toHaveText("Sync: not set up");
  });

  test("resetting sign-in leaves encrypted data for the passphrase alone to open", async ({ page, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    await createCollection(page, "Toujours chiffré");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);

    cloud.resetSignIn(email, "a-brand-new-sign-in-password");

    const other = await newDevice();
    await openSync(other);
    await other.getByLabel("Email").fill(email);
    await other.getByLabel("Sign-in password").fill("a-brand-new-sign-in-password");
    await other.getByRole("button", { name: "Sign in" }).click();

    await expect(other.getByRole("heading", { name: "Unlock your learning data" })).toBeVisible();
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Toujours chiffré" })).toHaveCount(0);
  });
});

test.describe("what the cloud can see", () => {
  const readable = [
    "Mes secrets de vocabulaire",
    "la réunion", "réunion",
    "the meeting",
    "il s'agit de",
    "ça vaut le coup",
    "useful-expressions",
    "il-s-agit-de",
    "vocabularyItems",
    "collections",
    "savedAt",
  ];

  test("no readable learning data reaches the cloud, stored or in transit", async ({ page, cloud, newDevice }) => {
    await createCollection(page, "Mes secrets de vocabulaire");
    await addItem(page, "la réunion", "the meeting");
    await setUpFirstDevice(page);
    await editExpression(page, "it is a matter of");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThanOrEqual(3);

    const other = await newDevice();
    await joinDevice(other);
    await expectExpression(other, "it is a matter of");

    const stored = cloud.everythingStored();
    const received = cloud.everythingReceived();
    for (const text of [...readable, "it is a matter of"]) {
      expect(stored).not.toContain(text);
      expect(received).not.toContain(text);
    }
    for (const { blob } of cloud.storedRecords()) expect(blob).toMatch(/^v1\.[A-Za-z0-9+/]+=*$/);
  });

  test("neither the passphrase nor the recovery code ever leaves a device", async ({ page, cloud, newDevice }) => {
    const recoveryCode = await setUpFirstDevice(page);
    await createCollection(page, "Au bureau");
    const other = await newDevice();
    await joinDevice(other);

    const received = cloud.everythingReceived();
    expect(received).not.toContain(passphrase);
    expect(received).not.toContain(recoveryCode);
    expect(received).not.toContain(recoveryCode.replaceAll("-", ""));
  });

  test("saving the same text twice stores different ciphertext", async ({ page, cloud }) => {
    await setUpFirstDevice(page);
    await editExpression(page, "same text");
    await expect.poll(() => cloud.storedRecords().length).toBe(1);
    const first = cloud.storedRecords()[0]!.blob;

    await editExpression(page, "other text");
    await expect.poll(() => cloud.storedRecords()[0]!.blob).not.toBe(first);
  });

  test("a blob the cloud moved to another record is refused, and sync carries on", async ({ page, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    await createCollection(page, "Première");
    await createCollection(page, "Seconde");
    await expect.poll(() => cloud.storedRecords().length).toBe(2);
    const other = await newDevice();
    await joinDevice(other);

    const [first, second] = cloud.storedRecords();
    cloud.swapBlobs(first!.id, second!.id);

    await expect(other.getByRole("alert")).toContainText("failed their integrity check");
    await expect(syncStatus(other)).toHaveText("Sync: up to date");
    await openCollections(other);
    await expect(other.getByRole("button", { name: "Open Première" })).toBeVisible();
    await expect(other.getByRole("button", { name: "Open Seconde" })).toBeVisible();
  });

  test("nothing secret is left readable in this device's storage", async ({ page }) => {
    const recoveryCode = await setUpFirstDevice(page);

    const stored = await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      const dump: unknown[] = [{ ...localStorage }, { ...sessionStorage }];
      const keys: boolean[] = [];
      const seen = (value: unknown): unknown => {
        if (value instanceof CryptoKey) {
          keys.push(value.extractable);
          return "[CryptoKey]";
        }
        if (Array.isArray(value)) return value.map(seen);
        if (value && typeof value === "object") {
          return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, seen(item)]));
        }
        return value;
      };
      for (const { name } of databases) {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(name!);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        for (const storeName of database.objectStoreNames) {
          const rows = await new Promise<unknown[]>((resolve, reject) => {
            const request = database.transaction(storeName).objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          dump.push(rows.map(seen));
        }
        database.close();
      }
      return { text: JSON.stringify(dump), keys };
    });

    expect(stored.keys).toEqual([false, false]);
    expect(stored.text).not.toContain(passphrase);
    expect(stored.text).not.toContain(signInPassword);
    expect(stored.text).not.toContain(recoveryCode);
  });

  test("sync never touches the AI service", async ({ page, ai, cloud, newDevice }) => {
    await setUpFirstDevice(page);
    await createCollection(page, "Au bureau");
    await expect.poll(() => cloud.storedRecords().length).toBeGreaterThan(0);
    const other = await newDevice();
    await joinDevice(other);

    expect(ai.requests).toEqual([]);
  });
});
