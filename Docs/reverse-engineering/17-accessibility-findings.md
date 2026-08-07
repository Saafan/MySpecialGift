# 17 — Accessibility Findings

[← Index](./00-index.md)

**Method.** Static analysis of all 22 `.tsx` files plus `globals.css` and `tailwind.config.ts`. Contrast ratios below were **computed** from the actual token values using the WCAG 2.1 relative-luminance formula (sRGB linearisation, `L = 0.2126R + 0.7152G + 0.0722B`, ratio `(L₁+0.05)/(L₂+0.05)`), not estimated.

**Not done:** no screen-reader session, no axe-core run, no Lighthouse audit, no keyboard walkthrough of a running app. `[UNVERIFIED: actual assistive-technology behaviour and computed accessibility-tree output — resolving this requires running the app with NVDA/VoiceOver and an automated auditor.]`

**Baseline the project set for itself:** WCAG 2.1 AA (`.github/copilot-instructions.md:934`), plus a pre-delivery checklist at `design-system/mylovelygift/MASTER.md:190-204`. Both are largely unmet.

---

## Computed contrast ratios

### Failures (WCAG 2.1 §1.4.3 Contrast Minimum — AA requires 4.5:1 for normal text, 3:1 for large text ≥18.66 px bold or ≥24 px)

| Pair | Foreground | Background | **Ratio** | AA normal | AA large | Where used |
|------|-----------|-----------|----------:|:---------:|:--------:|-----------|
| Secondary on white | `#06B6D4` | `#FCFAFF` | **2.43:1** | ❌ | ❌ | `text-secondary` category labels at `page.tsx:187`, `products/page.tsx:237`, `products/[id]/page.tsx:205` — all `text-xs` (12 px) |
| White on secondary | `#FFFFFF` | `#06B6D4` | **2.43:1** | ❌ | ❌ | `Button variant="secondary"` (`button.tsx:17-18`), used for the active tool state at `editor-toolbar.tsx:156,167` |
| White on success | `#FFFFFF` | `#10B981` | **2.54:1** | ❌ | ❌ | `success-foreground` token (`tailwind.config.ts:68`) |
| Success on white | `#10B981` | `#FCFAFF` | **2.54:1** | ❌ | ❌ | "FREE" shipping (`cart/page.tsx:139`, `checkout/page.tsx:410`), the security note (`checkout/page.tsx:306`), feature bullets (`products/[id]/page.tsx:286`) |
| White on accent | `#FFFFFF` | `#F97316` | **2.80:1** | ❌ | ❌ | **The cart-count badge** — `bg-accent text-white text-[10px]` at `navbar.tsx:86`. 10 px text at 2.80:1 is the single worst combination in the app |
| `muted-foreground/60` on white | `#A29BA9` | `#FCFAFF` | **2.59:1** | ❌ | ❌ | Upload hint "PNG, JPG, SVG up to 10MB" (`editor-left-panel.tsx:218`) |
| `text-primary/40` on white | `#C6B0F2` | `#FCFAFF` | **2.02:1** | ❌ | ❌ | The "+" glyph on blank template cards (`templates/page.tsx:121`) — arguably decorative, but it is the only visual cue |
| `text-primary/30` on white | ~`#D4C4F5` | `#FCFAFF` | **1.74:1** | ❌ | ❌ | Empty-state icons (`my-designs/page.tsx:127`, `editor-left-panel.tsx:614`) |
| `text-primary/20` on white | ~`#E2D8F8` | `#FCFAFF` | **1.51:1** | ❌ | ❌ | `editor-right-panel.tsx:312` (Sliders icon), `checkout/page.tsx:71` (bag icon) |

### Passes

| Pair | Foreground | Background | **Ratio** | AA | AAA |
|------|-----------|-----------|----------:|:--:|:---:|
| White on primary | `#FFFFFF` | `#7C3AED` | **5.70:1** | ✅ | ❌ |
| Primary on white | `#7C3AED` | `#FCFAFF` | **5.70:1** | ✅ | ❌ |
| Primary on `primary/10` | `#7C3AED` | `#EFE7FD` | **4.75:1** | ✅ | ❌ |
| `muted-foreground` on background | `#665C70` | `#FCFAFF` | **6.10:1** | ✅ | ❌ |
| `foreground/70` on background | `#5E546 7` | `#FCFAFF` | **6.89:1** | ✅ | ❌ |
| `warning-foreground` on warning | `#1F2937` | `#FBBF24` | **8.80:1** | ✅ | ✅ |
| `foreground` on background | `#1A0D26` | `#FCFAFF` | **17.2:1** | ✅ | ✅ |

**Summary: 9 failing pairs, 7 passing.** The three status colours (`secondary`, `success`, `accent`) all pair `#FFFFFF` foregrounds with mid-luminance backgrounds and all fail. Only `warning` — which correctly uses a dark `#1F2937` foreground — passes.

**Indeterminate:** `text-white/80` and `text-white/60` over the 3D modal's `bg-gradient-to-t from-black/30 to-transparent` (`editor-3d-preview.tsx:272-273`) composite over a rendered WebGL scene whose colour is content-dependent. `[UNVERIFIED: the effective ratio — it varies with the user's design.]`

---

## Findings, prioritised by user impact

### 🔴 Critical

#### A11Y-01 — Sixteen form labels are not associated with their inputs

**WCAG:** §1.3.1 Info and Relationships (A), §3.3.2 Labels or Instructions (A), §4.1.2 Name Role Value (A).

BUG #9 (`QA_AUDIT_REPORT.md:98-104`) fixed exactly two labels on the login page. The same defect remains everywhere else.

| File | Lines | Unassociated labels |
|------|-------|--------------------|
| `apps/web/src/app/(auth)/auth/register/page.tsx` | 86, 99, 112, 126 | Name, Email, Password, Confirm Password |
| `apps/web/src/app/(auth)/auth/forgot-password/page.tsx` | 64 | Email |
| `apps/web/src/app/(shop)/checkout/page.tsx` | 139, 151, 163, 175, 181, 193, 205, 217, 254, 267, 279, 292 | First Name, Last Name, Address 1, Address 2, City, State, ZIP, Country, Card Number, Expiry, CVC, Name on Card |
| `apps/web/src/components/editor/print-area-panel.tsx` | 81, 116 | Width, Height |
| `apps/web/src/components/editor/editor-right-panel.tsx` | 169, 427, 443, 459, 478, 679, 700, 712, 739, 759, 770, 866, 883, 935 | Every property label |

Screen-reader users hear "edit text, blank" for every one of these. Clicking the visible label does not focus the field.

**Fix.** Add `id` to each `Input` and `htmlFor` to each `<label>`, or nest the input inside the label. `eslint-plugin-jsx-a11y`'s `label-has-associated-control` rule is already installed via `eslint-config-next` and would catch all sixteen — **it does not run because no ESLint configuration file exists.**

#### A11Y-02 — Error messages are not programmatically associated with their fields

**WCAG:** §3.3.1 Error Identification (A), §3.3.3 Error Suggestion (AA), §4.1.3 Status Messages (AA).

Every validation error in checkout renders as a sibling paragraph:
```148:148:apps/web/src/app/(shop)/checkout/page.tsx
                    {shippingErrors.firstName && <p className="text-xs text-destructive mt-1">{shippingErrors.firstName}</p>}
```
There is no `aria-describedby`, no `aria-invalid`, no `role="alert"`, and no `aria-live` region. Eleven fields in checkout follow this pattern (`:148,160,172,190,202,214,226,263,276,288,301`), plus the login and register form-level errors (`login/page.tsx:70-74`, `register/page.tsx:79-83`).

A screen-reader user who submits an invalid form receives **no announcement at all** and must manually hunt for the errors.

`.github/copilot-instructions.md:939` explicitly requires *"Error messages associated with inputs via `aria-describedby`"*.

**Fix.** `aria-invalid={!!errors.x}`, `aria-describedby="firstName-error"`, `<p id="firstName-error" role="alert">`, plus a form-level `aria-live="assertive"` summary.

#### A11Y-03 — The 3D preview modal is not an accessible dialog

**WCAG:** §2.1.2 No Keyboard Trap (A), §2.4.3 Focus Order (A), §4.1.2 Name Role Value (A).

`apps/web/src/components/editor/editor-3d-preview.tsx:213-278` is a `<div className="fixed inset-0 z-50">`. It has:
- ❌ no `role="dialog"` / `aria-modal="true"`
- ❌ no `aria-labelledby` (the `<h2>` at `:224` is never referenced)
- ❌ no focus trap — Tab escapes to the page behind it
- ❌ no initial focus management
- ❌ no focus restoration on close
- ❌ **no Escape-key handler** — the only dismissals are the X button (`:241`) and a backdrop click (`:216-218`)
- ❌ no `inert` / `aria-hidden` on the background

The trigger is a `<div onClick>` (`:179-183`), so it is **not focusable and not keyboard-operable at all** — a keyboard user cannot open the 3D preview.

`@radix-ui/react-dialog` is installed (`apps/web/package.json:17`) and provides every one of these behaviours.

#### A11Y-04 — The design-card dropdown is not an accessible menu

Same class as A11Y-03, at `apps/web/src/app/(shop)/my-designs/page.tsx:151-164`. No `role="menu"`, no `aria-expanded` on the trigger, no `aria-haspopup`, no Escape, no outside-click dismissal, no arrow-key navigation, no focus return. The trigger is additionally `opacity-0 group-hover:opacity-100` (`:147`) — **invisible until hovered**, so keyboard and touch users never discover it.

#### A11Y-05 — The products filter popover is not an accessible disclosure

`apps/web/src/app/(shop)/products/page.tsx:135-197`. No `aria-expanded` on the Filters button (`:121-133`), no `role`, no Escape, no outside-click dismissal, no focus management. The sort options are `<button>` elements with no `aria-pressed` (`:146-157`).

---

### 🟠 High

#### A11Y-06 — No skip-navigation link
**WCAG §2.4.1 Bypass Blocks (A).** `apps/web/src/app/layout.tsx:20-27` renders no skip link. Every page forces keyboard users through the logo, three nav links, a search field, a cart link, and a user link before reaching content. Required by the project's own standard (`.github/copilot-instructions.md:941`).

#### A11Y-07 — No landmark regions
**WCAG §1.3.1 (A), §2.4.1 (A).** `<nav>` exists (`navbar.tsx:25`) and `<footer>` exists (`footer.tsx:6`), but **no page has a `<main>`**. Every page body is `<div className="container mx-auto px-4 py-12">`. There is no `<header>`, no `<aside>`, and no `<section>` with an accessible name. Landmark navigation — the primary way screen-reader users orient on a page — is unavailable.

#### A11Y-08 — Icon-only controls without accessible names

| Control | Location | Has `title` | Has `aria-label` |
|---------|----------|:-----------:|:----------------:|
| Undo / Redo | `editor-toolbar.tsx:129-148` | ✅ | ❌ |
| Select / Pan tools | `editor-toolbar.tsx:155-174` | ✅ | ❌ |
| Zoom in / out | `editor-toolbar.tsx:178-207` | ✅ | ❌ |
| Design Info | `editor-toolbar.tsx:223` | ✅ | ❌ |
| Duplicate / Delete | `editor-right-panel.tsx:397-416` | ✅ | ❌ |
| Delete All (multi-select) | `editor-right-panel.tsx:333-348` | ✅ | ❌ |
| 15 colour swatches | `editor-right-panel.tsx:189-197` | ✅ (hex) | ❌ |
| 8 shape buttons | `editor-left-panel.tsx:405-413` | ✅ | ❌ |
| 7 background swatches | `editor-left-panel.tsx:533-542` | ✅ (hex) | ❌ |
| Layer visibility toggle | `editor-left-panel.tsx:654-664` | ❌ | ❌ |
| Product colour variants | `products/[id]/page.tsx:227-237` | ✅ | ❌ |
| Mobile menu toggle | `navbar.tsx:100-109` | ❌ | ❌ |
| 3D Refresh / Close | `editor-3d-preview.tsx:228-245` | ❌ | ❌ |
| Cart quantity +/− | `cart/page.tsx:95-109` | ❌ | ❌ |
| Cart remove | `cart/page.tsx:113-118` | ❌ | ❌ |
| Design card "More" | `my-designs/page.tsx:142-150` | ❌ | ❌ |

`title` is **not** a reliable accessible name — it is not announced by all screen readers, is unavailable on touch, and is not exposed consistently. Eight of the sixteen have neither.

The two controls that *do* have `aria-label` are the navbar cart and user links (`navbar.tsx:83,94`) — added by BUG #9's fix.

The layer visibility toggle is worst: its content is a bare emoji, `{obj.visible !== false ? "👁" : "🚫"}` (`editor-left-panel.tsx:663`), which screen readers announce as "eye" / "prohibited".

#### A11Y-09 — Toggle state is never exposed

No control in the application uses `aria-pressed`, `aria-selected`, `aria-current`, or `aria-checked`. Affected:
- Editor tool buttons (Select/Pan) — state conveyed only by `variant="secondary"` (`editor-toolbar.tsx:156,167`)
- Left-panel tabs — state conveyed only by background colour (`editor-left-panel.tsx:52-54`)
- Category tabs on `/products` — colour only (`products/page.tsx:207-211`)
- Sort options — colour only (`products/page.tsx:149-153`)
- Text alignment buttons — `variant` only (`editor-right-panel.tsx:744`)
- Colour and background swatches — a ring only
- Product colour variants — a ring only
- Lock/Unlock and Visible/Hidden — label text changes, which is at least announced ✅
- Navbar links — no `aria-current="page"`; `usePathname` is never used

This is also a **§1.4.1 Use of Colour (A)** failure: selection state is conveyed by colour alone in six of the above.

#### A11Y-10 — The left panel is a tab interface with no tab semantics

`editor-left-panel.tsx:45-63` renders seven `<button>` elements that switch a panel. There is no `role="tablist"`, no `role="tab"`, no `role="tabpanel"`, no `aria-controls`, no `aria-selected`, and **no arrow-key navigation** — the expected keyboard model for tabs. `@radix-ui/react-tabs` is installed and unused.

#### A11Y-11 — The canvas has no accessible alternative

**WCAG §1.1.1 Non-text Content (A).** `apps/web/src/components/editor/editor-canvas.tsx:497` renders `<canvas ref={canvasRef} data-testid="editor-canvas" className="block w-full h-full" />` with **no `role`, no `aria-label`, no fallback content, and no text alternative.** The two Babylon canvases (`editor-3d-preview.tsx:81`) are the same.

The entire design surface — the product's core value — is completely opaque to assistive technology. There is no keyboard alternative for placing, moving, resizing, or rotating an object; the only keyboard operations are the seven global shortcuts, and arrow-key nudging does not exist.

`.github/copilot-instructions.md:950` requires *"Verify custom components (canvas editor) have keyboard alternatives."* None exist.

**This is not cheaply fixable** and should be scoped as its own project, but at minimum the canvas needs a `role="img"` with an `aria-label` summarising the design, and the layers panel should become a fully keyboard-operable proxy for canvas manipulation.

---

### 🟡 Medium

#### A11Y-12 — No reduced-motion support
**WCAG §2.3.3 Animation from Interactions (AAA), and a §2.2.2 Pause Stop Hide (A) concern for the infinite animations.**

No `prefers-reduced-motion` query, no `motion-reduce:` variant, no JS check. Sixteen `animate-float` elements run infinitely (`page.tsx:73-75,233-234`; `products/page.tsx:233-234`; `products/[id]/page.tsx:197-198`; `login/page.tsx:46-48`; `register/page.tsx:58-59`; `forgot-password/page.tsx:36-37`), plus the 3D auto-rotate loop (`product-3d.ts:614-615`), plus `animate-pulse` and `animate-spin`. None can be paused or stopped by the user.

Explicitly required by `design-system/mylovelygift/MASTER.md:200`.

#### A11Y-13 — Touch targets below 44×44 px
**WCAG §2.5.5 Target Size (AAA); §2.5.8 Target Size Minimum (AA, WCAG 2.2) requires 24×24.**

| Control | Size | Location |
|---------|-----:|----------|
| Colour swatches | **16×16** | `editor-right-panel.tsx:193` (`w-4 h-4`) |
| Icon buttons in panel headers | **28×28** | `editor-right-panel.tsx:400,410,336` (`h-7 w-7`) |
| Cart quantity +/− | **32×32** | `cart/page.tsx:97,106` (`w-8 h-8`) |
| Cart remove | **~32×32** | `cart/page.tsx:115` (`p-2` around a 16 px icon) |
| Design card "More" | **~30×30** | `my-designs/page.tsx:147` (`p-1.5` around 16 px) |
| Left-panel tabs | **48×48** | `editor-left-panel.tsx:51` (`w-12 h-12`) ✅ passes AA, fails AAA |
| Product colour variants | **40×40** | `products/[id]/page.tsx:230` ✅ passes AA |
| `Button size="icon"` | **40×40** | `button.tsx:31` ✅ passes AA |

The 16 px swatches fail even WCAG 2.2 AA.

Required by `.github/copilot-instructions.md:430,943` ("minimum 44x44px").

#### A11Y-14 — Focus indicators are inconsistent

`Button` and `Input` have proper `focus-visible:ring-2` (`button.tsx:7`, `input.tsx:13`) ✅. But every raw `<button>` and `<input>` — and there are many — inherits only the browser default, and several actively remove it:

| Element | Issue | Location |
|---------|-------|----------|
| Category tabs | No focus style | `products/page.tsx:204-215` |
| Sort options | No focus style | `products/page.tsx:146-157` |
| Left-panel tabs | No focus style | `editor-left-panel.tsx:47-61` |
| Shape buttons | No focus style | `editor-left-panel.tsx:405-413` |
| Colour/background swatches | No focus style | `editor-right-panel.tsx:189-197`, `editor-left-panel.tsx:533-542` |
| Image search input | **`focus:outline-none` with no replacement** | `editor-left-panel.tsx:456` |
| Hex input | **`focus:outline-none` with only a border change** | `editor-left-panel.tsx:575` |
| Font/weight `<select>` | **`focus:outline-none` with only a border change** | `editor-right-panel.tsx:683` |
| Navbar search | **`focus:outline-none` with a border change** | `navbar.tsx:77` |
| Zoom percentage button | No focus style | `editor-toolbar.tsx:193` |
| Layer rows | `<div onClick>` — **not focusable at all** | `editor-left-panel.tsx:638-649` |
| 3D thumbnail | `<div onClick>` — **not focusable at all** | `editor-3d-preview.tsx:179-183` |
| Modal backdrop | `<div onClick>` | `editor-3d-preview.tsx:214-219` |

**WCAG §2.4.7 Focus Visible (AA).** Four elements remove the outline and replace it with a border colour change — insufficient contrast against the unfocused state.

#### A11Y-15 — Interactive `<div>` elements

Three controls are `<div onClick>` with no `role`, no `tabIndex`, and no keyboard handler — they are invisible to keyboard and screen-reader users:
- Layer rows (`editor-left-panel.tsx:638-649`)
- 3D thumbnail trigger (`editor-3d-preview.tsx:179-183`)
- 3D modal backdrop (`editor-3d-preview.tsx:214-219`)

#### A11Y-16 — Nested interactive content

`apps/web/src/app/page.tsx:174-201`: a `<button>` ("Customize →", line 196) is nested inside a `<Link>` (line 174). Invalid HTML, ambiguous activation, and a duplicated tab stop. **WCAG §4.1.1 Parsing / §4.1.2.**

#### A11Y-17 — Inert controls that appear operable

| Control | Location | Behaviour |
|---------|----------|-----------|
| Google login | `login/page.tsx:140-160` | Focusable, clickable, no `onClick`, no `disabled` |
| GitHub login | `login/page.tsx:161-166` | Same |
| "Remember me" checkbox | `login/page.tsx:106` | No `id`, no `name`, no state, no label association |
| 8 footer links | `footer.tsx:36-49` | `<span title="Coming soon">` — not focusable, not announced as disabled, but visually styled like links |
| 4 product-detail template tiles | `products/[id]/page.tsx:248-256` | Navigate to a URL whose `template` id matches nothing |
| 4 text-effect buttons | `editor-left-panel.tsx:299-308` | Show a "coming soon" toast |
| Crop Image | `editor-right-panel.tsx:931` | Shows a "coming soon" toast |
| Use AI Design | `products/[id]/page.tsx:268` | Shows a "coming soon" toast |

**§3.2.4 Consistent Identification / §4.1.2.** Controls should be `disabled` with `aria-disabled` and a visible affordance, not silently inert.

#### A11Y-18 — Images: alt text audit

| Image | `alt` | Verdict |
|-------|-------|---------|
| Featured products | `alt={product.name}` | ✅ `page.tsx:182` |
| Catalogue cards | `alt={product.name}` | ✅ `products/page.tsx:229` |
| Product detail | `alt={productData.name}` | ✅ `products/[id]/page.tsx:193` |
| Template thumbnails | `alt={template.name}` | ✅ `templates/page.tsx:130` |
| Cart thumbnails | `alt={item.productName}` | ✅ `cart/page.tsx:74` |
| Upload thumbnails | `alt={upload.name}` | ✅ `editor-left-panel.tsx:230` |
| Stock images | `alt={img.name}` | ✅ `editor-left-panel.tsx:473` |
| Editor template thumbnails | `alt={t.name}` | ✅ `editor-left-panel.tsx:151` |
| Google/GitHub `<svg>` | none | ❌ `login/page.tsx:141,162` — no `aria-hidden="true"` and no `<title>` |
| All decorative blur divs | n/a | ❌ No `aria-hidden="true"` on `page.tsx:72-76`, `products/page.tsx:233-234`, `products/[id]/page.tsx:197-198`, etc. Empty divs are usually ignored, but the parent wrapper at `page.tsx:72` should carry `aria-hidden` |
| Lucide icons | n/a | ⚠️ `lucide-react` emits `aria-hidden="true"` by default, so decorative icons are handled ✅ — but this also means icon-only buttons genuinely have **no** accessible name (A11Y-08) |

**Alt-text discipline is genuinely good.** All eight content images have meaningful alternatives. This is the strongest accessibility area in the codebase.

---

### 🟢 Low

#### A11Y-19 — Emoji used as UI content
`design-system/mylovelygift/MASTER.md:181` forbids emoji as icons. Present at: `page.tsx:9,15,21,27` (category tiles ☕👕🎨🏅), `page.tsx:158` ("Trending Now 🔥"), `templates/page.tsx:72` ("gonna be fire 🔥"), `editor-left-panel.tsx:663` (👁/🚫 — the only *functional* one), `forgot-password/page.tsx:89` (📧), `footer.tsx:55` (💜), and in six toast messages. Screen readers announce full emoji names, which is noisy.

#### A11Y-20 — Heading hierarchy
Generally correct — one `<h1>` per page, `<h2>` for sections, `<h3>`/`<h4>` beneath. Two issues: the editor route has **no `<h1>` at all** (`editor/[productId]/page.tsx`), and `editor-right-panel.tsx:329,393` uses `<h3>` with no preceding `<h2>` in its subtree.

#### A11Y-21 — `lang` is hardcoded to `"en"`
`apps/web/src/app/layout.tsx:21`. Correct today (the app is English-only) but there is no i18n system, so this cannot vary. See the i18n section below.

#### A11Y-22 — No `autoComplete` on any form field
None of the 11 checkout fields, 4 register fields, or 2 login fields declares `autoComplete`. Browser and password-manager autofill is unavailable, which disproportionately affects users with motor or cognitive disabilities. **WCAG §1.3.5 Identify Input Purpose (AA).**

#### A11Y-23 — Text-scaling resilience is unverified but structurally risky
The editor's fixed-width chrome (64 px rail + 224 px left + 224 px right = 512 px, `editor-left-panel.tsx:45,66`; `editor-right-panel.tsx:309,326,389`) does not scale with text. `text-[9px]` and `text-[10px]` at 200 % zoom become 18–20 px inside containers sized for 10 px. **WCAG §1.4.4 Resize Text (AA)** requires 200 % without loss of content. `[UNVERIFIED: actual behaviour at 200 % — not tested in a browser.]`

---

## Internationalization and localization (Phase 1.3)

**Status: entirely absent.**

- **No i18n library.** No `next-intl`, `next-i18next`, `react-i18next`, `formatjs`, `lingui`, or `@formatjs/intl`. Verified against `apps/web/package.json`.
- **No locale files.** No `messages/`, `locales/`, `i18n/`, `*.json` translation catalogue, `.po`, `.arb`, or `.strings` file exists anywhere in the tree.
- **Supported locales: one** — `en`, hardcoded at `apps/web/src/app/layout.tsx:21`.
- **Key coverage matrix: N/A** — there are no keys.
- **Pluralization / gender / ICU:** none.
- **RTL support: absent.** No `dir` attribute, no `rtl:` Tailwind variants, no logical properties (`ms-`/`me-`/`ps-`/`pe-`). All spacing uses physical `ml-`/`mr-`/`pl-`/`pr-`. **The layout would break entirely in Arabic or Hebrew.**
- **Number / currency formatting:** every price uses `.toFixed(2)` with a hardcoded `$` — `cart/page.tsx:89,134,146,156`; `checkout/page.tsx:406,411,416,421,388`; `page.tsx:194`; `products/page.tsx:245,167`; `products/[id]/page.tsx:212`. `Intl.NumberFormat` is **never used**, despite `.github/copilot-instructions.md:729` requiring it. The `currency` column exists on both `Product` and `Order` (`schema.prisma:62,219`) and is never read.
- **Date / time formatting:** no date is ever displayed. `date-fns` is installed and unused. `my-designs/page.tsx:33` shows the literal string `"Saved locally"`.
- **Hardcoded user-facing strings:** **every string in the application.** A conservative count from the 22 `.tsx` files exceeds **400** distinct literals — headings, labels, placeholders, button text, empty-state copy, toast messages, error messages, and the eight footer link labels.

**Consequence for a future i18n effort:** this is a full-string-extraction project across 22 files plus the API's 6 error messages (`auth.service.ts:22,87,91,105`; `designs.service.ts:20`; `orders.service.ts:30`), followed by an RTL layout audit of every `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`text-left`/`text-right` usage.

---

## Prioritised remediation

| # | Action | Fixes | Effort | User impact |
|---|--------|-------|--------|-------------|
| 1 | **Create `.eslintrc.json` extending `next/core-web-vitals` + `plugin:jsx-a11y/recommended`** | Catches A11Y-01, A11Y-15, A11Y-16, A11Y-18 automatically | **S** | Very high — the tooling is already installed and simply not configured |
| 2 | Add `id`/`htmlFor` to all 16 label/input pairs | A11Y-01 | S | Very high |
| 3 | Add `aria-invalid` + `aria-describedby` + `role="alert"` to all validation errors | A11Y-02 | S | Very high |
| 4 | Replace the 3D modal and the design-card menu with `@radix-ui/react-dialog` and `react-dropdown-menu` (already installed) | A11Y-03, A11Y-04 | M | High |
| 5 | Add `aria-label` to all 16 icon-only controls | A11Y-08 | S | High |
| 6 | Add a skip link and wrap page content in `<main>` | A11Y-06, A11Y-07 | S | High |
| 7 | Darken `secondary`, `success`, and `accent`, or switch their foregrounds to a dark token | 6 of the 9 failing contrast pairs | S | High |
| 8 | Add `aria-pressed` / `aria-selected` / `aria-current` to all toggles | A11Y-09, §1.4.1 | S | Medium |
| 9 | Add a global `prefers-reduced-motion` rule disabling the infinite animations and 3D auto-rotate | A11Y-12 | S | Medium |
| 10 | Convert the three interactive `<div>`s to `<button>` | A11Y-15 | S | Medium |
| 11 | Add `focus-visible` styles to every raw `<button>`/`<input>`; stop removing outlines | A11Y-14 | S | Medium |
| 12 | Add `autoComplete` to all 17 form fields | A11Y-22 | S | Medium |
| 13 | Enlarge swatches to ≥24 px and header icon buttons to ≥44 px | A11Y-13 | S | Medium |
| 14 | Replace the left panel with `@radix-ui/react-tabs` | A11Y-10 | M | Medium |
| 15 | `disabled` + `aria-disabled` on all inert controls, or remove them | A11Y-17 | S | Medium |
| 16 | Fix the nested button-in-link on the homepage | A11Y-16 | S | Low |
| 17 | **Design a keyboard model for the canvas** — arrow-key nudge, Tab between objects, a canvas `aria-label`, and the Layers panel as a full keyboard proxy | A11Y-11 | **XL** | Very high, but a project in its own right |
