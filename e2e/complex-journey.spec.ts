import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

/**
 * A deliberately messy shopper path meant to surface edge-case bugs:
 * browse → filter/search → template editor → guest cart gate → register →
 * multi-product cart ops → checkout → designs rename/reopen → logout/login →
 * order ownership 404 → empty-cart checkout redirect.
 */
test.describe("complex shopper journey", () => {
  test("survives a long multi-surface path", async ({ page, context }) => {
    test.setTimeout(180_000);

    // Fresh guest session — prior e2e runs leave cookies on the shared server.
    await context.clearCookies();

    const consoleErrors: string[] = [];
    const unexpected404s: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      // Intentional ownership probe below.
      if (url.includes("00000000-0000-4000-8000-000000000000")) return;
      unexpected404s.push(url);
    });

    // --- Catalog exploration ---
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /start designing/i }).first().click();
    await expect(page).toHaveURL(/\/products/);

    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: "Mugs & Cups", exact: true })
      .click();
    await expect(page).toHaveURL(/category=cup/);
    await page.locator("#catalog-search").fill("mug");
    await page.getByRole("button", { name: /^Search$/i }).click();
    await expect(page).toHaveURL(/q=mug/);
    await expect(page.locator('a[href="/products/mug"]')).toBeVisible();

    await page.locator('a[href="/products/mug"]').click();
    await expect(page).toHaveURL(/\/products\/mug/);

    // Start from a template (harder than blank — exercises templateId wiring).
    await page.locator('a[href*="template="]').first().click();
    await expect(page).toHaveURL(/\/editor\/new\?product=mug&template=/);
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });

    // Guest add-to-cart should gate to login and keep a recoverable draft.
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 15_000 });
    await expect(page.getByText(/sign in to add this to your cart|welcome back/i).first()).toBeVisible();

    // Register via the login page link so returnTo is preserved.
    await page.getByRole("link", { name: /create an account/i }).click();
    await expect(page).toHaveURL(/\/register/);
    const email = uniqueEmail("complex");
    await page.getByLabel("Name").fill("Complex Shopper");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should land back in the editor (returnTo), not on /designs.
    await expect(page).toHaveURL(/\/editor\/new\?product=mug/, { timeout: 20_000 });
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });

    // Rename + save + editor tooling.
    const nameInput = page.locator("#design-name");
    await nameInput.fill("Anniversary Mug");
    await nameInput.blur();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText("Design saved.").or(page.getByText("Saved", { exact: true })).first()).toBeVisible({
      timeout: 20_000,
    });
    // First save should mint a real design id in the URL.
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/, { timeout: 10_000 });

    await page.getByRole("tab", { name: /^Text$/i }).click();
    await page.getByRole("button", { name: /^Heading$/i }).click();

    await page.getByRole("tab", { name: /^Shapes$/i }).click();
    await page.getByRole("button", { name: /add circle/i }).click();

    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText("Design saved.")).toBeVisible({ timeout: 20_000 });

    // 3D preview must stay open (regression: unmounting the click target
    // dismissed Radix immediately). Prefer Escape to avoid headless WebGL
    // layout thrash detaching the Close button mid-click.
    await page.getByRole("button", { name: /open 3d preview/i }).click();
    await expect(page.getByRole("heading", { name: /preview/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /preview/i })).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /open 3d preview/i })).toBeVisible();

    // First cart add.
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(page.getByText("Anniversary Mug")).toBeVisible();

    // Second product — tee — multi-line cart.
    await page.goto("/editor/new?product=premium-tee");
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });
    await page.locator("#design-name").fill("Tour Tee");
    await page.locator("#design-name").blur();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(page.getByText("Tour Tee")).toBeVisible();

    // Quantity bump.
    await page.getByRole("button", { name: /increase quantity of Anniversary Mug/i }).click();
    await expect(
      page.getByRole("group", { name: /quantity for Anniversary Mug/i }).getByText("2", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // Designs list should show both saved designs.
    await page.goto("/designs");
    await expect(page.getByText("Anniversary Mug")).toBeVisible();
    await expect(page.getByText("Tour Tee")).toBeVisible();

    // Rename via menu.
    await page.getByRole("button", { name: /more actions for Anniversary Mug/i }).click();
    await page.getByRole("menuitem", { name: /rename/i }).click();
    await page.getByRole("dialog", { name: /rename design/i }).getByRole("textbox", { name: "Name" }).fill(
      "Golden Anniversary Mug",
    );
    await page.getByRole("button", { name: /save name/i }).click();
    await expect(page.getByText("Golden Anniversary Mug")).toBeVisible({ timeout: 10_000 });

    // Re-open renamed design — must not 404 / blank.
    await page.getByRole("link", { name: /edit Golden Anniversary Mug/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/);
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#design-name")).toHaveValue("Golden Anniversary Mug");

    // Checkout path.
    await page.goto("/cart");
    await page.getByRole("link", { name: /^Checkout$/i }).click();
    await expect(page.getByText(/test mode — no real charge/i)).toBeVisible();
    await page.getByLabel("Full name").fill("Complex Shopper");
    await page.getByLabel("Address", { exact: true }).fill("42 Lathe Road");
    await page.getByLabel("City").fill("Alexandria");
    await page.getByLabel("State / region").fill("Alexandria");
    await page.getByLabel("Postal code").fill("21500");
    await page.getByLabel("Country").fill("Egypt");
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/orders\/.+\?placed=1/, { timeout: 30_000 });
    await expect(page.getByText(/order placed/i)).toBeVisible();
    const orderUrl = page.url();

    // Cart empty after success.
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();

    // Empty checkout redirects to cart.
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/cart/);

    // Account + logout + login round-trip.
    await page.goto("/account");
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/designs/);
    await page.goto("/orders");
    await expect(page.getByRole("link", { name: /order #/i }).first()).toBeVisible();

    // Revisit own order without ?placed.
    await page.goto(orderUrl.replace("?placed=1", ""));
    await expect(page.getByRole("heading", { name: /order #/i })).toBeVisible();

    // Foreign order id → 404 (ownership).
    const foreign = await page.goto("/orders/00000000-0000-4000-8000-000000000000");
    expect(foreign?.status()).toBe(404);

    const serious = consoleErrors.filter(
      (e) =>
        !/favicon/i.test(e) &&
        !/Download the React DevTools/i.test(e) &&
        !/hydration/i.test(e) &&
        !/ResizeObserver loop/i.test(e) &&
        !/Failed to load resource:.*404/i.test(e),
    );
    expect(serious, `Console errors:\n${serious.join("\n")}`).toEqual([]);
    expect(unexpected404s, `Unexpected 404s:\n${unexpected404s.join("\n")}`).toEqual([]);
  });
});
