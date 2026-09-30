import { test, expect } from "@playwright/test";

test.describe("catalog", () => {
  test("home renders the brand and shop CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /MySpecialGift/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("products list is DB-driven and searchable", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /blank canvas/i })).toBeVisible();
    // Seed ships eight active products — at least one card must appear.
    await expect(page.locator("a[href^='/products/']").first()).toBeVisible();

    await page.goto("/products?q=mug");
    await expect(page.locator("a[href*='mug']").first()).toBeVisible();

    await page.goto("/products?q=zzz-no-such-product");
    await expect(page.getByRole("heading", { name: /nothing matches that/i })).toBeVisible();
  });

  test("unknown product slug 404s (V1 silently showed product #1)", async ({ page }) => {
    const response = await page.goto("/products/definitely-not-a-product");
    expect(response?.status()).toBe(404);
  });

  test("product detail links into the editor", async ({ page }) => {
    await page.goto("/products/mug");
    await expect(page.getByRole("heading", { level: 1, name: "Mug" })).toBeVisible();
    await expect(page.getByRole("link", { name: /design yours/i })).toHaveAttribute(
      "href",
      /\/editor\/new\?product=mug/,
    );
  });

  test("templates gallery loads", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /blank pages are overrated/i })).toBeVisible();
  });
});
