import { test, expect } from "@playwright/test";
import { registerAccount } from "./helpers";

/**
 * End-to-end money path. Prices come from the products table; the cart never
 * stores a unit price; checkout never accepts a client total. The mock
 * payment provider is labelled in the UI — this test asserts that honesty.
 */
test.describe("checkout journey", () => {
  test("design → cart → test payment → order history", async ({ page }) => {
    test.setTimeout(120_000);

    await registerAccount(page, { returnTo: "/editor/new?product=mug" });
    await expect(page).toHaveURL(/\/editor\/new/);

    // Wait for Fabric to mount (ResizeObserver-driven init).
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();

    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /^cart/i })).toBeVisible();
    await expect(page.getByText(/summary/i)).toBeVisible();

    await page.getByRole("link", { name: /^checkout$/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText(/test mode — no real charge/i)).toBeVisible();

    await page.getByLabel("Full name").fill("E2E Shopper");
    await page.getByLabel("Address", { exact: true }).fill("1 Print Lane");
    await page.getByLabel("City").fill("Cairo");
    await page.getByLabel("State / region").fill("Cairo");
    await page.getByLabel("Postal code").fill("11511");
    await page.getByLabel("Country").fill("Egypt");

    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/orders\/.+\?placed=1/, { timeout: 30_000 });
    await expect(page.getByText(/order placed/i)).toBeVisible();
    await expect(page.getByText(/test mode/i)).toBeVisible();

    // Cart must be empty after a successful charge (V1 cleared it even on failure).
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();

    await page.goto("/orders");
    await expect(page.getByRole("link", { name: /order #/i }).first()).toBeVisible();
  });
});
