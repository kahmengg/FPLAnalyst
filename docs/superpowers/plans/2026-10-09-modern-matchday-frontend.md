# Modern Matchday Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a more colorful, interactive, responsive FPL analysis interface with official player portraits, a shared player-detail drawer, and an honest aggregate touch profile.

**Architecture:** Extend the existing Paper and Ink tokens into a Modern Matchday design system, then roll shared shell and analytical primitives through the existing routes. Enrich the daily player snapshot with the official FPL portrait code, expose it through existing typed Supabase mappings, and open one URL-backed player drawer from every player-selection surface. Keep spatial heat maps out until coordinate event data exists.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix Dialog, TanStack Query, Recharts, Python 3.11, Supabase Postgres, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-modern-matchday-frontend-design.md`

## Global Constraints

- Preserve the fixed bright theme; do not add a light/dark toggle.
- Preserve all existing routes, model calculations, filters, URL state, and Supabase read-only RLS behavior.
- Use cobalt for product actions, pitch green for football context, coral/amber for editorial emphasis, and club colors only for club/player identity.
- Do not label aggregate touches as a spatial heat map or invent pitch coordinates.
- Use Newsreader for editorial headings, Inter for interface text, and JetBrains Mono/tabular numerals for statistics.
- Normal text must meet WCAG AA; color cannot be the only state indicator.
- Touch targets must be at least 44 px on touch layouts, with no horizontal page scrolling at 390 px.
- All motion must use opacity/transform where possible and respect `prefers-reduced-motion`.
- Player portraits must reserve layout space, use lazy loading below the fold, and fall back without breaking the interface.
- Preserve unrelated user files and the untracked `.agents/` directory.

## Review Focus

- Missing, zero, negative, or malformed portrait codes must render the initials fallback and never generate a broken URL; Task 4 tests this.
- An unavailable Premier League image CDN must swap to the fallback without layout shift or an exposed broken-image icon; Task 4 and Task 10 test this.
- An invalid or stale `player` URL parameter must leave the page usable and must not open an empty focus trap; Task 6 tests this.
- Zero-minute and incomplete touch samples must display “Not enough data,” never fabricated zero-volume insights; Task 5 tests this.
- At 390 px with reduced motion and keyboard navigation, the shell and drawer must remain operable without horizontal overflow or obscured focus; Tasks 2, 6, and 10 test this.

---

### Task 0: Preserve the completed pagination fix as a clean baseline

**Files:**
- Existing: `frontend/lib/pagination.ts`
- Existing: `frontend/lib/pagination.test.ts`
- Existing: `frontend/lib/supabase.ts`

**Interfaces:**
- Produces: `fetchAllPages<T>(loadPage, pageSize?) => Promise<T[]>`, already consumed by `getPlayerRoleInsights()`.

- [ ] **Step 1: Re-run the focused regression test**

Run: `cd frontend && npx vitest run lib/pagination.test.ts`

Expected: PASS with 1 test and 1,334 rows reconstructed across multiple pages.

- [ ] **Step 2: Re-run TypeScript and the complete unit suite**

Run: `cd frontend && npx tsc --noEmit && npm test`

Expected: both commands exit 0.

- [ ] **Step 3: Commit only the pagination files**

```bash
git add frontend/lib/pagination.ts frontend/lib/pagination.test.ts frontend/lib/supabase.ts
git commit -m "fix: paginate precomputed player insights"
```

### Task 1: Lock the Modern Matchday tokens and visual primitives

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/ui/button.tsx`
- Modify: `frontend/components/ui/card.tsx`
- Modify: `frontend/components/ui/badge.tsx`
- Modify: `frontend/components/ui/tabs.tsx`
- Modify: `frontend/components/page-header.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Produces: semantic Tailwind tokens for canvas, raised surface, ink, cobalt action, pitch context, editorial highlight, focus, elevation, and motion.
- Produces: compact `PageHeader` styling without changing its existing props.

- [ ] **Step 1: Add a failing visual-contract browser test**

Add `test("modern matchday tokens style the shared shell")` asserting the root background, primary action color, visible focus outline, and compact page header at desktop and 390 px.

- [ ] **Step 2: Run the test and verify the old theme fails it**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "modern matchday tokens"`

Expected: FAIL on at least the new cobalt action or compact header assertion.

- [ ] **Step 3: Implement the semantic tokens and shared component states**

Use CSS variables rather than raw per-component hex values. Define distinct canvas, card, raised, interactive, hover, pressed, focus, and semantic state pairs. Keep component APIs stable.

- [ ] **Step 4: Re-run the focused browser test and TypeScript**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "modern matchday tokens" && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/globals.css frontend/components/ui/button.tsx frontend/components/ui/card.tsx frontend/components/ui/badge.tsx frontend/components/ui/tabs.tsx frontend/components/page-header.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: add modern matchday visual tokens"
```

### Task 2: Redesign the responsive application shell

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/components/sidebar.tsx`
- Modify: `frontend/components/season-status-banner.tsx`
- Modify: `frontend/components/research-guide.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: Task 1 semantic tokens.
- Produces: desktop navy rail, 56 px mobile top bar, accessible navigation sheet, compact sync disclosure, and responsive workflow rail.

- [ ] **Step 1: Add failing shell interaction tests**

Add tests named `mobile navigation opens and restores focus`, `workflow remains usable at 390px`, and `reduced motion shell has no entrance animation`. Assert the menu’s accessible expanded state, Escape behavior, focus return, and `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "mobile navigation|workflow remains|reduced motion shell"`

Expected: FAIL before the responsive shell is implemented.

- [ ] **Step 3: Implement the desktop and mobile shell states**

Keep one navigation source of truth. Use buttons and semantic navigation rather than clickable generic containers. The mobile sheet must have a labeled close action, Escape support, and focus restoration.

- [ ] **Step 4: Run focused tests at desktop and mobile widths**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "mobile navigation|workflow remains|reduced motion shell"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/layout.tsx frontend/components/sidebar.tsx frontend/components/season-status-banner.tsx frontend/components/research-guide.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: redesign responsive application shell"
```

### Task 3: Add official portrait metadata to the daily pipeline

**Files:**
- Modify: `supabase_schema.sql`
- Modify: `backend/sync_daily.py`
- Modify: `backend/etl/process_fpl_data.py`
- Modify: `backend/tests/test_data_validation.py`
- Create: `backend/tests/test_player_metadata.py`
- Modify: `README.md`

**Interfaces:**
- Produces: optional CSV field `photo_code` and nullable database column `players.photo_code integer`.
- Produces: `enrich_stats_with_player_metadata(stats_content: str, bootstrap: dict) -> str`.
- Consumes: official bootstrap `elements[].id`, `elements[].code`, and the existing FPL `id` column.

- [ ] **Step 1: Write failing metadata enrichment tests**

Test that a matching bootstrap player adds `photo_code`, a missing match produces an empty field, a malformed/non-positive code produces an empty field, duplicate gameweek rows receive the same code, and existing CSV columns and row order remain unchanged.

- [ ] **Step 2: Run the focused backend tests**

Run: `python -m unittest backend.tests.test_player_metadata -v`

Expected: FAIL because the enrichment function does not exist.

- [ ] **Step 3: Implement bootstrap reuse and CSV enrichment**

Fetch bootstrap once per sync, pass it to fixture generation and `enrich_stats_with_player_metadata`, then validate both enriched statistics and fixtures before atomically replacing either file. Keep `photo_code` optional so old checked-in CSVs still reprocess.

- [ ] **Step 4: Add the schema column and ETL mapping**

Add `photo_code integer check (photo_code is null or photo_code > 0)` to `players`. In `upsert_players`, parse `photo_code` with `safe_int` and write null for missing or invalid values.

- [ ] **Step 5: Run backend validation**

Run: `python -m unittest discover -s backend/tests && python -m compileall -q backend`

Expected: all tests pass and compilation exits 0.

- [ ] **Step 6: Document the production ordering**

Update README: apply the schema first, run one daily sync, verify non-null portrait coverage, then deploy the frontend.

- [ ] **Step 7: Commit**

```bash
git add supabase_schema.sql backend/sync_daily.py backend/etl/process_fpl_data.py backend/tests/test_data_validation.py backend/tests/test_player_metadata.py README.md
git commit -m "feat: sync official player portrait metadata"
```

### Task 4: Build typed player portrait support

**Files:**
- Create: `frontend/lib/player-media.ts`
- Create: `frontend/lib/player-media.test.ts`
- Create: `frontend/components/player-portrait.tsx`
- Create: `frontend/next.config.ts`
- Modify: `frontend/lib/player-role-insights.ts`
- Modify: `frontend/lib/supabase.ts`
- Modify: `frontend/components/player-summary-card.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Produces: `getPlayerPortraitUrl(photoCode: number | null, size?: 110 | 250): string | null`.
- Produces: `PlayerPortraitProps = { name: string; photoCode?: number | null; teamCode?: string; size?: "sm" | "md" | "lg"; priority?: boolean }`.
- Extends: `PlayerRoleInsight.photoCode: number | null` and shared player DTOs that render portraits.

- [ ] **Step 1: Write failing portrait URL tests**

```ts
expect(getPlayerPortraitUrl(154561)).toContain("/p154561.png")
expect(getPlayerPortraitUrl(154561, 250)).toContain("/250x250/")
expect(getPlayerPortraitUrl(null)).toBeNull()
expect(getPlayerPortraitUrl(0)).toBeNull()
expect(getPlayerPortraitUrl(-1)).toBeNull()
```

- [ ] **Step 2: Run the focused unit test**

Run: `cd frontend && npx vitest run lib/player-media.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement URL generation, Next image configuration, and `PlayerPortrait`**

Allow only `https://resources.premierleague.com/premierleague/photos/players/**`. Reserve a fixed aspect ratio, use `next/image`, and switch to initials with a club-color treatment on missing input or `onError`.

- [ ] **Step 4: Extend Supabase selections and mapping**

Add `photo_code` to explicit `players(...)` selections, source types, `mapStoredRoleInsight`, fallback reconstruction, comparison data, imported-squad enrichment, and `PlayerSummary` without changing score calculations.

- [ ] **Step 5: Add and run image-failure browser coverage**

Mock the portrait request to return 404, open a player card, and assert that the accessible initials fallback is visible in the same reserved container.

Run: `cd frontend && npx vitest run lib/player-media.test.ts && npx playwright test tests/e2e/routes.spec.ts -g "portrait" && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/next.config.ts frontend/lib/player-media.ts frontend/lib/player-media.test.ts frontend/lib/player-role-insights.ts frontend/lib/supabase.ts frontend/components/player-portrait.tsx frontend/components/player-summary-card.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: display official player portraits"
```

### Task 5: Calculate an honest aggregate touch profile

**Files:**
- Create: `frontend/lib/touch-profile.ts`
- Create: `frontend/lib/touch-profile.test.ts`
- Create: `frontend/components/touch-profile.tsx`

**Interfaces:**
- Produces: `buildTouchProfile(rows: TouchGameweek[], cohortBoxTouchesPer90: number[]) => TouchProfileResult`.
- Produces: `TouchProfileResult = { minutes: number; touchesPer90: number | null; boxTouchesPer90: number | null; boxShare: number | null; boxTouchesPercentile: number | null }`.
- Produces: `<TouchProfile profile={result} />`, labeled “Touch profile” and “Volume summary,” never “Heat map.”

- [ ] **Step 1: Write failing calculation tests**

Cover weighted per-90 aggregation, box share, tied percentiles, empty cohorts, zero minutes, missing metrics, and the rule that incomplete samples return null rather than misleading zeroes.

- [ ] **Step 2: Run the focused test**

Run: `cd frontend && npx vitest run lib/touch-profile.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure calculation and accessible two-zone visualization**

Use a simple pitch SVG with a total-touch zone and opponent-box zone. Include exact values and a text summary adjacent to the visual so color and geometry are not the only carriers.

- [ ] **Step 4: Run unit tests and TypeScript**

Run: `cd frontend && npx vitest run lib/touch-profile.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/touch-profile.ts frontend/lib/touch-profile.test.ts frontend/components/touch-profile.tsx
git commit -m "feat: add aggregate player touch profiles"
```

### Task 6: Build the URL-backed player-detail drawer

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/components/ui/sheet.tsx`
- Create: `frontend/lib/player-detail-state.ts`
- Create: `frontend/lib/player-detail-state.test.ts`
- Create: `frontend/components/player-detail-drawer.tsx`
- Modify: `frontend/lib/supabase.ts`
- Modify: `frontend/lib/research-queries.ts`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Produces: `readSelectedPlayerId(params: URLSearchParams, availableIds: Set<string>): string | null`.
- Produces: `getPlayerGameweeksById(playerId: string, limitGws?: number)`; existing name lookup delegates after resolution.
- Produces: `PlayerDetailDrawerProps = { player: PlayerRoleInsight | null; cohort: PlayerRoleInsight[]; open: boolean; onOpenChange(open: boolean): void }`.
- Consumes: Tasks 4 and 5 portrait and touch-profile components.

- [ ] **Step 1: Write failing URL-state tests**

Assert that valid IDs open, missing/blank IDs return null, unavailable IDs return null, and closing removes only `player` while preserving position, lens, gameweek, horizon, club, and other research parameters.

- [ ] **Step 2: Run the focused unit test**

Run: `cd frontend && npx vitest run lib/player-detail-state.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add Radix Dialog and the sheet primitive**

Install a pinned `@radix-ui/react-dialog` version. Implement right-side desktop and bottom-sheet mobile variants with overlay, title/description semantics, close control, focus trap, Escape handling, and reduced-motion styles.

- [ ] **Step 4: Implement ID-based detail fetching and drawer composition**

Use TanStack Query with a key containing player ID and season. Render portrait, identity, role score, availability, role-specific metrics, recent output, touch profile, fixtures when available, loading skeleton, retry state, and contextual actions.

- [ ] **Step 5: Add failing-then-passing browser interaction tests**

Test pointer open, keyboard open, Escape close, focus return, browser Back closing the drawer, refresh restoring it, invalid ID behavior, and mobile bottom-sheet layout.

Run: `cd frontend && npx vitest run lib/player-detail-state.test.ts && npx playwright test tests/e2e/routes.spec.ts -g "player detail drawer"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components/ui/sheet.tsx frontend/components/player-detail-drawer.tsx frontend/lib/player-detail-state* frontend/lib/supabase.ts frontend/lib/research-queries.ts frontend/tests/e2e/routes.spec.ts
git commit -m "feat: add player detail drawer"
```

### Task 7: Upgrade Top Players around the detail experience

**Files:**
- Modify: `frontend/app/top-performers/page.tsx`
- Create: `frontend/components/analysis-toolbar.tsx`
- Create: `frontend/components/metric-pill.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: `PlayerDetailDrawer`, `PlayerPortrait`, semantic tokens, and existing Top Players URL parameters.
- Produces: reusable `AnalysisToolbar` and `MetricPill` primitives for later routes.

- [ ] **Step 1: Add failing Top Players workflow tests**

Assert a visible `<qualified> qualified · <total> total` count whose total is not lower than the qualified count, a direct “Show provisional players” action that increases or preserves the visible pool, portraits in ranked rows, row/chart selection opening `?player=<uuid>`, and existing position/lens/window filters surviving drawer navigation. Do not pin changing production counts in the test.

- [ ] **Step 2: Run the focused tests**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "top players"`

Expected: at least the new count and drawer tests fail.

- [ ] **Step 3: Implement the compact toolbar and visual hierarchy**

Replace repeated outlined filter regions with one responsive toolbar. Add qualified/total disclosure, stronger selected states, subtle quadrant tinting, portraits in the ranked list, club-color selection rings, and drawer triggers without changing model scores.

- [ ] **Step 4: Verify desktop, tablet, and mobile behavior**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "top players" && npx tsc --noEmit`

Expected: PASS at configured desktop plus explicit 768 px and 390 px viewports.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/top-performers/page.tsx frontend/components/analysis-toolbar.tsx frontend/components/metric-pill.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: refresh top player exploration"
```

### Task 8: Integrate portraits and the drawer into Compare, My Team, and Transfer Planner

**Files:**
- Modify: `frontend/app/player-trends/page.tsx`
- Modify: `frontend/app/my-team/page.tsx`
- Modify: `frontend/app/transfer-targets/page.tsx`
- Modify: `frontend/components/squad-pitch.tsx`
- Modify: `frontend/components/squad-review-panel.tsx`
- Modify: `frontend/components/team-picks-modal.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: Tasks 4, 6, and 7 shared portrait, drawer, toolbar, and metric components.
- Preserves: comparison modes, imported-squad storage, fixture horizon, picks ranking, and existing URL parameters.

- [ ] **Step 1: Add failing cross-route player-detail tests**

Test opening the same player drawer from a comparison chip, squad pitch, replacement suggestion, and transfer candidate; assert contextual actions preserve route state and portraits fall back for mocked imported players without photo metadata.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "cross-route player detail"`

Expected: FAIL before integration.

- [ ] **Step 3: Implement route integrations**

Keep player triggers semantic buttons, avoid nested interactive controls, and reuse cached role insights rather than refetching each card. Make desktop comparison headers and mobile selection chips visually distinct with portraits and club identity.

- [ ] **Step 4: Run focused tests and the existing guest-team tests**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "cross-route player detail|guest import" && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/player-trends/page.tsx frontend/app/my-team/page.tsx frontend/app/transfer-targets/page.tsx frontend/components/squad-pitch.tsx frontend/components/squad-review-panel.tsx frontend/components/team-picks-modal.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: connect player details across planning pages"
```

### Task 9: Roll the visual system through Dashboard, Team Rankings, and Fixtures

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/team-rankings/page.tsx`
- Modify: `frontend/app/fixture-analysis/page.tsx`
- Modify: `frontend/components/weekly-briefing.tsx`
- Modify: `frontend/components/team-badge.tsx`
- Test: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, and 7 shared tokens, shell, toolbar, and metric treatments.
- Preserves: season/recent rankings, fixture modes, gameweek/horizon URL state, score displays, and team actions.

- [ ] **Step 1: Add failing page-composition tests**

Assert one primary dashboard opportunity, compact operational metrics, visible rank movement with non-color direction labels, separate attack/defence opportunity labels, and mobile team/fixture records without horizontal overflow.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "dashboard composition|team ranking composition|fixture composition"`

Expected: FAIL before rollout.

- [ ] **Step 3: Implement page-specific composition**

Remove redundant borders and nested cards, use club identity only in team contexts, keep one primary action per page, and retain existing tables on desktop with stacked records on mobile.

- [ ] **Step 4: Run focused tests and TypeScript**

Run: `cd frontend && npx playwright test tests/e2e/routes.spec.ts -g "dashboard composition|team ranking composition|fixture composition" && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx frontend/app/team-rankings/page.tsx frontend/app/fixture-analysis/page.tsx frontend/components/weekly-briefing.tsx frontend/components/team-badge.tsx frontend/tests/e2e/routes.spec.ts
git commit -m "feat: unify analytical page presentation"
```

### Task 10: Production verification and Supabase rollout

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `frontend/tests/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified production schema/data/frontend rollout sequence.

- [ ] **Step 1: Run complete automated verification**

Run:

```bash
python -m unittest discover -s backend/tests
python -m compileall -q backend
cd frontend
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Expected: every command exits 0.

- [ ] **Step 2: Run targeted browser accessibility checks**

At 1440 px, 1024 px, 768 px, and 390 px, verify keyboard-only navigation, focus not obscured by sticky UI, drawer focus trap/return, no page-level horizontal overflow, image failure fallback, empty/error/loading states, and reduced-motion behavior. Confirm zero browser console errors.

- [ ] **Step 3: Apply the production schema change before the ETL**

Run the reviewed `alter table players add column if not exists photo_code integer check (photo_code is null or photo_code > 0);` through the approved Supabase SQL workflow. Do not expose a new table or broaden grants/RLS.

- [ ] **Step 4: Run and verify one production sync**

Run the existing daily workflow manually. Verify `players.photo_code` has sensible non-null coverage, invalid values are absent, existing player/gameweek counts are unchanged, and the frontend public role can read the new field.

- [ ] **Step 5: Verify deployed behavior before closing**

Check the deployed Top Players, Compare, My Team, Fixtures, Team Rankings, Dashboard, and Transfer Planner routes. Confirm portrait fallback under a blocked image request and confirm no UI claims to provide a spatial heat map.

- [ ] **Step 6: Commit any verification-only adjustments**

```bash
git add README.md frontend/tests/e2e/routes.spec.ts
git commit -m "test: verify modern matchday experience"
```
