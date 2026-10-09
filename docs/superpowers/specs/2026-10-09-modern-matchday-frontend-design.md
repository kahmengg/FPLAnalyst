# Modern Matchday Frontend Design

**Date:** 2026-10-09

**Status:** Proposed for implementation

**Scope:** Global frontend visual system, official player portraits, player-detail drawer, and an aggregate touch profile. A true spatial touch heat map is explicitly deferred.

## Product intent

FPL Analyst should feel like a modern football analysis product: quick to scan, visually distinctive, and trustworthy. The redesign must add depth and personality without turning analytical pages into decorative dashboards. The weekly decision journey remains the organizing principle:

**Squad context → club strength → fixture opportunity → player shortlist → comparison → transfer choice**

Success means a first-time visitor can identify the primary decision on each screen, understand which controls are active, and inspect a player without losing their current filters or scroll position. Desktop layouts should feel information-rich; mobile layouts should prioritize one decision at a time without horizontal compression.

## Visual direction: Modern Matchday

The existing Paper and Ink foundation remains, but it gains a restrained football-broadcast palette and clearer surface hierarchy.

### Color roles

- **Canvas:** warm ivory, used only for the page background.
- **Primary surface:** near-white paper for content panels.
- **Raised surface:** a slightly cooler paper tone for drawers, popovers, and selected detail regions.
- **Ink:** deep navy-charcoal rather than neutral charcoal, creating stronger identity without using pure black.
- **Product action:** cobalt blue for links, selected controls, focus-adjacent emphasis, and primary analytical actions.
- **Football context:** pitch green for positive football signals and pitch illustrations, not every CTA.
- **Editorial highlight:** coral or amber for callouts, warnings, and high-attention insights.
- **Semantic states:** accessible green, amber, and red remain reserved for success, caution, and negative states.
- **Club identity:** club colors remain limited to badges, portraits, team markers, and club-specific detail panels.

Color will never be the sole carrier of state. Selected controls also use weight, borders, icons, or labels. Normal text must meet WCAG AA contrast; chart marks and control boundaries must meet non-text contrast requirements.

### Typography and numbers

- Keep Newsreader for editorial page titles and feature headings.
- Keep Inter for interface text.
- Keep JetBrains Mono with tabular numerals for scores, prices, gameweeks, and statistical columns.
- Reduce oversized utility-page headers so filters and primary analysis remain visible above the fold.
- Use a consistent hierarchy: eyebrow, page title, one-sentence purpose, section title, supporting label.

### Surfaces and depth

The redesign uses four depth levels instead of outlining every region equally:

1. Canvas with no border.
2. Flat grouped regions separated by spacing or a subtle divider.
3. Primary panels with a soft border and minimal shadow.
4. Drawers, menus, and selected-player panels with stronger elevation and a tinted edge.

Repeated nested cards will be removed. Related controls will share one toolbar surface. Cards may lift subtly on hover only when they are actionable.

### Motion

Motion communicates state changes rather than decorating page load:

- 140–220 ms color, opacity, and transform transitions for controls and panels.
- Player drawer enters from the right on desktop and from the bottom on mobile.
- Selected chart marks and table rows receive a short highlight transition.
- No animated counters, looping effects, or automatic carousels.
- `prefers-reduced-motion` renders the final state immediately.

## Global shell

### Desktop

The sidebar becomes a deep navy rail with an ivory content area. Navigation uses Lucide icons, text labels, a slim cobalt active indicator, and a lightly raised active item. The season and sync state move into a compact footer region instead of competing with page content.

The research workflow remains available but becomes a compact step rail. It highlights the current step and allows horizontal scrolling only at narrow tablet widths.

### Mobile

The current stacked season banner, workflow navigation, and model-status line consume too much vertical space. They will become:

- a 56 px top bar with menu, page context, and sync indicator;
- a slide-over navigation sheet;
- a compact horizontally scrollable workflow row below the page heading, with the active step brought into view;
- status details disclosed on tap instead of always occupying multiple lines.

Touch targets remain at least 44 px and the layout must work at 390 px without horizontal page scrolling.

## Page composition

Every analytical page uses the same three-part structure:

1. **Context header:** compact title, purpose, and at most one primary action.
2. **Decision toolbar:** filters, time horizon, and view controls grouped by importance.
3. **Analysis workspace:** primary chart/table plus a selected-item detail panel or drawer.

Each route keeps its existing data and behavior. The redesign changes presentation and interaction hierarchy, not model calculations.

### Dashboard

The dashboard becomes a concise weekly briefing rather than a collection of equal cards. It uses one prominent opportunity panel, a compact squad-import action, three small operational metrics, and a visual explanation of the weekly workflow. Decorative copy is reduced. Color is concentrated in the opportunity marker, workflow steps, and primary actions.

### Top Players

The archetype map remains the primary exploration tool. Improvements include:

- position tabs with icons and distinct selected states;
- a single compact filter toolbar;
- an explicit `qualified / total` count so low-minute filtering is understandable;
- player portraits on leading points and in table rows where space allows;
- club-color rings on selected players;
- clearer quadrant backgrounds and direct labels that remain accessible without color;
- clicking a point or row opens the shared player-detail drawer.

### Team Rankings and Fixtures

Team Rankings gains clearer rank movement, club-color markers, and stronger selected-row affordances while retaining the comparison table. Fixtures use pitch green only for favorable football context; attack and defence opportunity remain separately labeled. Mobile views stay record-based rather than compressing desktop tables.

### Compare Players

Portraits and club identity strengthen the selected-player chips and comparison header. The existing role-specific metrics remain authoritative. Chart series use product colors plus line styles and direct labels so they remain distinguishable without color.

### Transfer Planner and My Team

Player picks and squad positions become the most visually expressive areas. Portraits appear in the squad pitch, candidate rows, and pick drawer. Fixture outlook, role score, availability, and price remain separate concepts. No unexplained combined predicted-points number is introduced.

## Official player portraits

### Source and storage

The official FPL bootstrap response currently provides each player’s `photo` value and stable Premier League `code`. The daily sync will collect the portrait identifier alongside the current player snapshot.

Add a nullable `photo_code` integer column to `players`. The ETL writes the value when available and leaves it null when unavailable. The frontend builds the official Premier League image URL from this code through one typed helper rather than storing a complete mutable CDN URL in every row.

The schema change must be represented in `supabase_schema.sql` and applied to production before the ETL starts writing the new column. Existing read-only RLS remains sufficient because the new field belongs to the already-public player record.

### Rendering behavior

A reusable `PlayerPortrait` component will:

- use `next/image` with explicit dimensions or a fixed aspect-ratio container;
- allow the official Premier League image host in Next.js configuration;
- use meaningful alt text when the portrait conveys player identity;
- fall back to initials plus the club color if the image is absent or fails;
- use lazy loading outside the initial viewport;
- avoid loading portraits for every hidden table row.

The UI must not depend on the image service to remain usable.

## Player-detail drawer

The drawer is a reusable, URL-aware analytical surface opened from Top Players, Compare, My Team, and Transfer Planner.

### Header

- portrait and fallback avatar;
- player name, club, position, price, and ownership;
- role score with its correct position-specific label;
- availability or provisional-sample status.

### Analysis sections

- recent output summary;
- role-specific underlying metrics;
- minutes and start reliability;
- next fixtures when available;
- contextual actions: Compare, View team fixtures, and Plan transfer.

Desktop uses a right-side sheet of approximately 420–480 px. Mobile uses a bottom sheet that can expand to full height. Focus is trapped while open, Escape closes it, focus returns to the trigger, and the close control has an accessible label. The selected player ID is placed in the URL so refresh and back navigation behave predictably.

## Touch profile and heat-map boundary

Current data contains only total touches and opponent-box touches per player/gameweek. It does not contain event coordinates, pitch zones, or individual touch locations. Therefore the first release must not display a spatial heat map.

The drawer may show an **aggregate touch profile**:

- touches per 90;
- opponent-box touches per 90;
- share of touches occurring in the opponent box;
- position-relative percentile labels;
- a simple two-zone pitch illustration explicitly labeled as a volume summary, not a location map.

A genuine heat map becomes a separate data project. It requires licensed or otherwise authorized event data with player ID, match ID, event type, x coordinate, and y coordinate. When that source exists, raw events should be aggregated server-side into a fixed pitch grid per player and time window. The frontend would render the grid with a numeric legend and a textual/table summary for accessibility.

## Data flow and interfaces

1. Daily sync downloads FPL bootstrap data and the existing statistical inputs.
2. Player portrait codes are joined by FPL player ID.
3. ETL upserts `players.photo_code` with the existing player snapshot.
4. Supabase queries select the new field through existing player relations.
5. Mapping functions expose `photoCode: number | null` on typed frontend player models.
6. `PlayerPortrait` converts the code to a URL and handles fallback behavior.
7. The drawer consumes existing TanStack Query caches and route query keys; it must not introduce page-level duplicate fetches.

No service-role credential reaches the browser. No image is proxied through Supabase Storage in this release.

## Components and boundaries

New shared primitives are intentionally limited:

- `PlayerPortrait`: image, fallback, size variants.
- `PlayerDetailDrawer`: focus-managed responsive sheet and player analysis composition.
- `MetricPill`: compact metric with label, value, and semantic treatment.
- `AnalysisToolbar`: consistent responsive shell for page filters.
- `TouchProfile`: aggregate touch visualization with accessible text fallback.

Existing button, badge, tabs, tooltip, and card primitives remain. Page-specific data shaping stays close to each route, while URL building, portrait URL generation, and shared player-display logic live in `frontend/lib`.

## Error and empty states

- Portrait failures fall back silently to initials; they do not show broken-image icons.
- Missing metrics show `Not enough data`, not zero.
- The drawer shows a retry action when detail data fails.
- Low-minute players remain explicitly provisional.
- Empty filtered lists preserve the toolbar and provide a clear reset action.
- Coordinate heat-map UI is not rendered when coordinate data is unavailable.

## Responsive and accessibility requirements

- Verify at 1440 px, 1024 px, 768 px, and 390 px.
- No horizontal page scrolling at 390 px.
- All interactive targets are at least 44 px on touch layouts.
- Visible keyboard focus is preserved against every new surface color.
- Drawers, tabs, and filters are keyboard operable and announce selected/expanded state.
- Charts retain text summaries and table alternatives.
- Club color never carries meaning by itself.
- Portraits reserve layout space to prevent cumulative layout shift.
- Reduced-motion mode disables entrance and selection movement while preserving state feedback.

## Testing and rollout

Implementation should ship in reviewable slices:

1. Design tokens and global shell.
2. Shared analytical toolbar and responsive page composition.
3. Portrait schema, sync, ETL, mapping, and portrait component.
4. Player-detail drawer integrated into Top Players, Compare, My Team, and Transfer Planner.
5. Aggregate touch profile.
6. Page-by-page polish and responsive verification.

Required verification:

- backend tests for portrait-code joins and missing-photo behavior;
- frontend unit tests for portrait URL generation, fallbacks, drawer URL parsing, and touch-profile calculations;
- Playwright tests for drawer keyboard behavior, URL restoration, and primary routes;
- TypeScript validation, production build, and existing test suites;
- browser checks at the target widths, including reduced motion and console errors;
- Supabase read verification after applying the schema and running one ETL cycle.

## Out of scope

- Fabricated or estimated spatial touch locations.
- Scraping unauthorized football-stat sites.
- A dark/light theme toggle.
- Changes to role-score formulas, fixture ratings, or transfer-ranking calculations.
- Storing or redistributing portrait files in Supabase Storage.
- A broad component-library replacement.
