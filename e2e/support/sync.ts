import type { Page } from "@playwright/test";
import { expect } from "./test";

export const email = "learner@example.com";
export const signInPassword = "ordinary-sign-in-password";
export const passphrase = "le chat dort sur le canapé bleu";

export function openSync(page: Page) {
  return page.getByRole("button", { name: "Sync", exact: true }).click();
}

export function syncStatus(page: Page) {
  return page.getByRole("status", { name: "Sync" });
}

export async function signIn(page: Page, button: "Sign in" | "Create account") {
  await openSync(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Sign-in password").fill(signInPassword);
  await page.getByRole("button", { name: button }).click();
}

/** Takes a device through first setup and returns the recovery code it shows. */
export async function setUpFirstDevice(page: Page) {
  await signIn(page, "Create account");
  await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await page.getByLabel("Repeat passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Set passphrase" }).click();
  const recoveryCode = (await page.getByLabel("Your recovery code").textContent())!;
  await page.getByLabel("I have saved my recovery code").check();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(syncStatus(page)).toHaveText("Sync: up to date");
  return recoveryCode;
}

export async function joinDevice(page: Page, withPassphrase = passphrase) {
  await signIn(page, "Sign in");
  await page.getByLabel("Passphrase", { exact: true }).fill(withPassphrase);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(syncStatus(page)).toHaveText("Sync: up to date");
}
