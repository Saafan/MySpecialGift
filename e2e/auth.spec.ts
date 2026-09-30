import { test, expect } from "@playwright/test";
import { registerAccount, uniqueEmail } from "./helpers";

test.describe("auth", () => {
  test("protected /designs redirects guests to login with returnTo", async ({ page }) => {
    await page.goto("/designs");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fdesigns/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("register creates a session and lands on designs", async ({ page }) => {
    await registerAccount(page);
    await expect(page).toHaveURL(/\/designs/);
    await expect(page.getByRole("heading", { name: /my designs/i })).toBeVisible();
    await expect(page.getByText(/nothing here yet/i)).toBeVisible();
  });

  test("login rejects bad credentials without leaking which field failed", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(uniqueEmail("ghost"));
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("logout clears the session", async ({ page }) => {
    await registerAccount(page);
    await page.goto("/account");
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/designs");
    await expect(page).toHaveURL(/\/login/);
  });
});
