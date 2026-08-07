# MyLovelyGift — Reverse-Engineering Dossier

> **Produced:** 2026-08-07 · **Mode:** read-only forensic analysis
> **Subject:** `D:\Tools\MyLovelyGift`
> **Rule of this document set:** every factual claim carries a `path:line` citation. Anything not verifiable from an artifact I opened is tagged `[UNVERIFIED: … — …]`.

---

## How to read this

Start with [01 — Executive Summary](./01-executive-summary.md). If you are about to change code, read [22 — Implementation Readiness Assessment](./22-implementation-readiness.md) **and** [13 — Historical Bug Report](./13-historical-bug-report.md) before you touch anything, because several pieces of apparently redundant code exist specifically to suppress bugs that were expensive to find.

---

## Table of contents

| # | Document | What it answers |
|---|----------|-----------------|
| 01 | [Executive Summary](./01-executive-summary.md) | What is this, is it healthy, what are the three biggest risks |
| 02 | [Repository Overview](./02-repository-overview.md) | Scope, domain, deployment model, maturity, **coverage statement** |
| 03 | [Technology Stack](./03-technology-stack.md) | Every language, runtime, tool, service, with versions |
| 04 | [Framework Inventory](./04-framework-inventory.md) | Per-framework coupling and lock-in assessment |
| 05 | [Dependency Analysis](./05-dependency-analysis.md) | Every direct dependency, where used, risk, licence |
| 06 | [Folder Structure](./06-folder-structure.md) | Annotated tree, organising principle, deviations |
| 07 | [Architecture Documentation](./07-architecture.md) | Style, layers, module graph, all architectural diagrams |
| 08 | [API Documentation](./08-api-documentation.md) | Every endpoint: shape, auth, errors, calling sites |
| 09 | [Navigation Documentation](./09-navigation.md) | Route map, navigation graph, deep links, guards |
| 10 | [State Management](./10-state-management.md) | Store inventory, lifecycles, data-flow sequences |
| 11 | [UI System Documentation](./11-ui-system.md) | Design tokens, colour, type, spacing, component API |
| 12 | [Feature Inventory](./12-feature-inventory.md) | Full dossier per feature + cross-feature matrix |
| 13 | [Historical Bug Report](./13-historical-bug-report.md) | **Previously Encountered Bugs** + defensive-code inventory |
| 14 | [Known Risks](./14-known-risks.md) | Technical, operational, security, bus-factor |
| 15 | [Technical Debt Report](./15-technical-debt.md) | The prioritised ledger |
| 16 | [Security Findings](./16-security-findings.md) | Severity-rated, with attack scenarios |
| 17 | [Accessibility Findings](./17-accessibility-findings.md) | WCAG-referenced violations, computed contrast |
| 18 | [Performance Findings](./18-performance-findings.md) | Bottlenecks with evidence |
| 19 | [Missing Documentation](./19-missing-documentation.md) | Gaps + every stale/contradictory existing doc |
| 20 | [Future Improvement Opportunities](./20-future-improvements.md) | Roadmap (Phase A–E) + redesign context |
| 21 | [Open Questions](./21-open-questions.md) | What I could not determine and why |
| 22 | [Implementation Readiness](./22-implementation-readiness.md) | Can an agent safely change this? Verdict + checklist |
| 90 | [Full File Inventory](./90-file-inventory.md) | Every first-party file with a one-line purpose |
| 91 | [Inspection Checklist](./91-inspection-checklist.md) | Phase 0.4 checklist, reconciled + every command run |
| 99 | [Self-Verification Gate](./99-self-verification.md) | The 12 mandatory questions, answered |

---

## The five sentences that matter most

1. **There is no git history.** `git rev-parse --is-inside-work-tree` returns `fatal: not a git repository`; no `.git` directory exists. All historical reconstruction in [13](./13-historical-bug-report.md) is derived from in-repo QA reports, regression tests, defensive code, and stale build logs — not from commits.
2. **The frontend does not talk to the backend** for anything except login/register/forgot-password. Products, templates, designs, cart, and orders are all hardcoded arrays or `localStorage` (`apps/web/src/app/(shop)/products/page.tsx:11-20`, `apps/web/src/app/(shop)/products/[id]/page.tsx:41-166`).
3. **Checkout does not place an order.** "Place Order" is a 1000 ms `setTimeout`, then the cart is cleared and a success toast is shown (`apps/web/src/app/(shop)/checkout/page.tsx:373-386`).
4. **The API has no authentication or authorization enforcement of any kind.** Every endpoint trusts a plaintext `x-user-id` request header (`apps/api/src/modules/orders/orders.controller.ts:39`, `apps/api/src/modules/designs/designs.controller.ts:21`). There is no guard, no middleware, and no token-verification function anywhere in the codebase.
5. **The web test suite has never run.** `apps/web/jest.config.ts:9` is malformed and Jest aborts before collecting a single test.

Details, evidence, and severity ratings for all of the above are in the linked documents.
