import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

/**
 * Stress journey aimed at edge cases the happy-path suite skims:
 * templates gallery → guest draft edits → guest uploads (25 MB / 10 photos) →
 * draft content recovery → duplicate cart upsert → qty down/remove →
 * free-shipping threshold → checkout validation → ordered badge →
 * delete-cascades-cart → catalog sort survives search → open-redirect guard →
 * deep order returnTo shape → ownership 404s.
 */
test.describe("nightmare shopper journey", () => {
  test("survives draft/template, cart, checkout, and auth edge cases", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000);
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
      if (url.includes("00000000-0000-4000-8000-000000000000")) return;
      unexpected404s.push(url);
    });

    // --- Catalog: sort must survive a subsequent search ---
    await page.goto("/products");
    await page.locator("#catalog-search").fill("");
    await page.getByLabel("Sort").selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);
    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: "Mugs & Cups", exact: true })
      .click();
    await expect(page).toHaveURL(/category=cup/);
    await expect(page).toHaveURL(/sort=price-desc/);
    await page.locator("#catalog-search").fill("mug");
    await page.getByRole("button", { name: /^Search$/i }).click();
    await expect(page).toHaveURL(/q=mug/);
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect(page).toHaveURL(/category=cup/);

    // --- Templates gallery → mug editor with template= (not the first category) ---
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: /blank pages are overrated/i })).toBeVisible();
    await page
      .locator('a[href*="product=mug"][href*="template="]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/editor\/new\?.*product=mug.*template=/);
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });

    // Guest edits, then confirm uploads work without signing in.
    await page.getByRole("tab", { name: /^Text$/i }).click();
    await page.getByRole("button", { name: /^Heading$/i }).click();
    await page.getByRole("tab", { name: /^Shapes$/i }).click();
    await page.getByRole("button", { name: /add circle/i }).click();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(/draft saved on this device/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("tab", { name: /^Uploads$/i }).click();
    await expect(page.getByText(/^Add images$/i)).toBeVisible();
    await expect(page.getByText(/25 MB/i)).toBeVisible();
    await expect(page.getByText(/10 photos as a guest/i)).toBeVisible();

    // Auth round trip still omits template= so the guest draft wins after login.
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    const guestLoginUrl = page.url();
    expect(decodeURIComponent(guestLoginUrl)).not.toMatch(/template=/);
    expect(decodeURIComponent(guestLoginUrl)).toMatch(/\/editor\/new\?product=/);

    await page.getByRole("link", { name: /create an account/i }).click();

    const email = uniqueEmail("nightmare");
    const password = "password123";
    await page.getByLabel("Name").fill("Nightmare Shopper");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/editor\/new\?product=/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/template=/);
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });

    // Draft content recovered — layers still show the guest heading + circle.
    await page.getByRole("tab", { name: /^Layers$/i }).click();
    await expect(page.getByText(/Text: "Your Heading"/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Circle$/i).or(page.getByText(/Circle/i)).first()).toBeVisible();

    // Save as account design.
    await page.locator("#design-name").fill("Nightmare Mug");
    await page.locator("#design-name").blur();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText("Design saved.")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/, { timeout: 10_000 });
    const mugEditorUrl = page.url();

    // First cart add.
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(page.getByText("Nightmare Mug")).toBeVisible();

    // Same design again → quantity upsert (not a duplicate line).
    await page.goto(mugEditorUrl);
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(
      page.getByRole("group", { name: /quantity for Nightmare Mug/i }).getByText("2", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Nightmare Mug")).toHaveCount(1);

    // Second product for multi-line cart + free-shipping math.
    await page.goto("/editor/new?product=premium-tee");
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });
    await page.locator("#design-name").fill("Nightmare Tee");
    await page.locator("#design-name").blur();
    await page.getByRole("tab", { name: /^Text$/i }).click();
    await page.getByRole("button", { name: /^Body text$/i }).click();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(page.getByText("Nightmare Tee")).toBeVisible();

    // Qty down on tee, then remove it entirely.
    await page.getByRole("button", { name: /decrease quantity of Nightmare Tee/i }).click();
    // Qty 1 → decrease to 0 deletes the line (setCartItemQuantity).
    await expect(page.getByText("Nightmare Tee")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText("Nightmare Mug")).toBeVisible();

    // Bump mug qty until free shipping (mug EGP 249; need subtotal > EGP 750 → qty ≥ 4).
    // Already at 2 from upsert.
    await page.getByRole("button", { name: /increase quantity of Nightmare Mug/i }).click();
    await expect(
      page.getByRole("group", { name: /quantity for Nightmare Mug/i }).getByText("3", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/away from free shipping/i)).toBeVisible();
    await page.getByRole("button", { name: /increase quantity of Nightmare Mug/i }).click();
    await expect(
      page.getByRole("group", { name: /quantity for Nightmare Mug/i }).getByText("4", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    // Mug is EGP 249 → qty 4 = EGP 996 subtotal → free shipping (threshold is > EGP 750).
    await expect(page.getByText(/away from free shipping/i)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator("aside").getByText("Free", { exact: true })).toBeVisible();

    // Checkout validation before a successful place.
    // Quantity bumps trigger router.refresh(); wait for a settled summary
    // before navigating so a mid-refresh soft nav doesn't bounce off an
    // empty-cart redirect race.
    await expect(page.locator("aside").getByText("Free", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /^Checkout$/i }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /^checkout$/i })).toBeVisible();
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page.getByText("Name is required")).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("Full name").fill("Nightmare Shopper");
    await page.getByLabel("Address", { exact: true }).fill("9 Stress Lane");
    await page.getByLabel("City").fill("Cairo");
    await page.getByLabel("State / region").fill("Cairo");
    await page.getByLabel("Postal code").fill("11511");
    await page.getByLabel("Country").fill("Egypt");
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/orders\/.+\?placed=1/, { timeout: 30_000 });
    await expect(page.getByText(/order placed/i)).toBeVisible();
    const orderPath = new URL(page.url()).pathname;

    // Ordered badge on designs list.
    await page.goto("/designs");
    await expect(page.getByText("Nightmare Mug")).toBeVisible();
    await expect(page.getByText(/^Ordered$/i).first()).toBeVisible();

    // Delete-cascades-cart: make a disposable draft, cart it, delete, cart empties.
    await page.goto("/editor/new?product=circle-sticker-pack");
    await expect(page.getByTestId("editor-canvas")).toBeVisible({ timeout: 30_000 });
    await page.locator("#design-name").fill("Doomed Sticker");
    await page.locator("#design-name").blur();
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/, { timeout: 25_000 });
    await expect(page.getByText("Doomed Sticker")).toBeVisible();

    await page.goto("/designs");
    await page.getByRole("button", { name: /more actions for Doomed Sticker/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: /delete design/i }).click();
    await expect(page.getByText("Doomed Sticker")).toHaveCount(0, { timeout: 10_000 });

    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();

    // Open-redirect guard for already-authenticated visits to /login.
    const redirectResponse = await page.goto("/login?returnTo=//evil.example/phish");
    expect(redirectResponse?.url() ?? page.url()).not.toMatch(/evil\.example/);
    await expect(page).toHaveURL(/\/designs/);

    // Account logout → protected order deep link preserves returnTo shape.
    await page.goto("/account");
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto(orderPath);
    await expect(page).toHaveURL(new RegExp(`/login\\?returnTo=.*${orderPath.replace(/\//g, "%2F")}`));
    // Or returnTo may be encoded differently — at least contain the order id segment.
    const loginUrl = page.url();
    expect(decodeURIComponent(loginUrl)).toContain(orderPath);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(orderPath), { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /order #/i })).toBeVisible();

    // Foreign order / design ownership → 404.
    const foreignOrder = await page.goto("/orders/00000000-0000-4000-8000-000000000000");
    expect(foreignOrder?.status()).toBe(404);
    const foreignDesign = await page.goto("/editor/00000000-0000-4000-8000-000000000000");
    expect(foreignDesign?.status()).toBe(404);

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
