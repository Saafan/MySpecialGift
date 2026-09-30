import { type Page, expect } from "@playwright/test";

/** Unique email so parallel-ish local runs don't collide on the unique index. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function registerAccount(
  page: Page,
  opts: { name?: string; email?: string; password?: string; returnTo?: string } = {},
) {
  const email = opts.email ?? uniqueEmail();
  const password = opts.password ?? "password123";
  const name = opts.name ?? "E2E Shopper";
  const path = opts.returnTo
    ? `/register?returnTo=${encodeURIComponent(opts.returnTo)}`
    : "/register";

  await page.goto(path);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).not.toHaveURL(/\/register/);
  return { email, password, name };
}
