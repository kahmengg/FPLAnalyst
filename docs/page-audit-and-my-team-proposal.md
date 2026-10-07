# Page audit and personalised FPL team proposal

Reviewed: 7 October 2026. The original audit below records the starting point; the implemented changes are summarised here.

## Implemented review version

| Page | Current responsibility and changes |
| --- | --- |
| Dashboard | Weekly starting point with a three-gameweek club briefing, model freshness, and a link to import or review a squad. |
| My Team `/my-team` | New guest page: preview and confirm an ID/link import, optionally remember it locally, refresh/change/forget, see all 15 players and captain/bench information, highlight availability, minutes and model concerns, and research same-position replacements. Missing model players remain visible. |
| Top Players | Player discovery retains its maps, role lenses and ranked lists; shared queries and contextual links connect it to comparisons and schedule research. |
| Teams | Club-strength research remains the purpose, with clearer copy and contextual onward links. |
| Fixtures | Owns the full schedule grid and match detail. A shared model uses calendar weeks, excludes finished fixtures from forward research, retains double fixtures and shows blank weeks. Clubs with no remaining fixtures show no average. |
| Compare Players | Direct comparison now uses stable player IDs for trend and role joins, avoiding duplicate-name collisions. |
| Transfer Planner | Replaces the repeated club-schedule table with individual same-position candidates, compact fixture context, price filtering, imported-owned-player exclusion, and direct comparison links. Full schedule research stays on Fixtures. |

A shared research navigation carries compatible gameweek, horizon, position and club inputs between pages. Shared TanStack Query options reuse summary, fixture and role data. Freshness and role-score explanations appear consistently across the workflow.

Following review feedback, My Team now displays the XI by position on a pitch with selectable shirt markers, captain/vice-captain labels and a separate bench. Name lookup is available within public Classic leagues using the league ID or standings link. It searches at most ten standings pages (500 teams), reports searched coverage and distinguishes duplicate names by entry ID. A live search found a known entry; global search remains outside this version.

Recommendations now prioritise availability, minutes and insufficient model evidence. Missing data is explicitly not a sell signal. Suitable comparison suggestions must be eligible, unowned, the same position, no more expensive by current price, have at least 60% recent 60-minute appearances, and improve the shared research ordering by at least three without worsening role score. The three-point threshold is a heuristic, not an expected-points improvement. Actual bank, selling prices, club limits and alternative availability still need confirmation. Building stronger advice requires representative historical backtesting with information available at each deadline, calibrated minutes/points forecasts and a confirmed current planning squad.

The import adapter uses official public FPL data, a fixed upstream origin, bounded requests, season checks and a five-minute cache. Global team-name search and login are excluded. A public squad is the latest published deadline snapshot, so current transfers may be missing. Candidates are research suggestions; bank, selling prices, hits and squad legality are not confirmed. Configure host-level import request limits before public launch.

Verification: 17 unit tests, 13 browser tests, 11 backend regression tests and a production build passed. A live ID import and its replacement-to-comparison flow were also checked locally. The following sections retain the original audit and longer-term proposal for context.

## Scope and intended outcome

Document what each existing page lets visitors see and do, identify overlapping responsibilities and data handling, and propose a guest team-import experience that turns the existing analysis into advice for an individual squad. Revised on 7 October 2026 following the user's preference to avoid login and use an FPL Gameweek-style team lookup.

This audit is based on the checked-in routes, components, query functions, ETL and schema. It does not verify the deployed UI, live database contents, or deployed authentication settings. References below are repository-relative paths.

The intended outcome is that a visitor selects an FPL team, checks the imported squad, and receives explained recommendations using the website's player, club and fixture analysis. No FPL Analyst account is required. Proposed assumptions: one active Classic FPL team per browser, remembered locally by season; recommendations are advisory and do not execute transfers. Cross-device account sync is outside the first release.

## Existing pages

There are six sidebar destinations and one compatibility redirect. The sidebar's labels are more accurate than some route names.

| Page and route | What people can see and do | Primary objective |
| --- | --- | --- |
| Dashboard `/` | Current gameweek, latest model gameweek, tracked-player count, last sync time, explanation of role scores, links through Teams → Fixtures → Top Players → Transfer Planner. | Orient visitors and guide their weekly research. |
| Top Players `/top-performers` | Position-specific player analysis; season or last-five-gameweek window; attack, goal threat, creation, defensive-floor, complete or goalkeeper lenses as applicable; archetype maps for outfield players; sortable leaderboards; search and club, price, ownership and low-sample filters; selected-player explanation and links to comparison and fixtures. | Discover players and understand how they generate returns. |
| Teams `/team-rankings` | Overall, attack and defence rankings; season/recent form comparison and rank changes; goals, expected goals, clean sheets, goals conceded and strength indicators; search, top/bottom-five filters and sorting; player-picks modal and fixture links. | Identify strong clubs and changes in club form. |
| Fixtures `/fixture-analysis` | Gameweek matchups with home/away context, attacking opportunity and defensive potential; a difficulty-grid tab with overall/attack/defence modes, club search, sorting and adjustable horizon; onward links to player research. | Understand opponents and future fixture opportunity. |
| Compare Players `/player-trends` | Select a position and compare up to four active players with recorded season minutes; club search; Output, Underlying and Security modes; price, ownership, minutes, points and relevant role metrics; individual recent-gameweek tables and role-score summaries. | Validate a shortlist through direct player comparison. |
| Transfer Planner `/transfer-targets` | Choose the number of upcoming fixtures; rank club schedules; opponent and venue sequence; model rating; top ten or all clubs; attacking/defensive player-picks modal with fixture context. | Find clubs and players worth targeting for an upcoming run. |
| Legacy Quick Picks `/quick-picks` | Redirects to `/transfer-targets`; no independent screen or sidebar item. | Preserve old bookmarks after consolidating recommendations. |

### Dashboard boundaries

Keep the dataset health indicators and introductory workflow. When a visitor has selected a team, add a small “My Team: three things to review” card linking to the personal workspace. Avoid embedding another full squad, fixture grid or player leaderboard here.

Source: `frontend/app/page.tsx`, `frontend/components/sidebar.tsx`.

### Top Players boundaries

This is the main discovery screen. Its 0–100 scores compare players within their position and analysis window; they are not predicted FPL points. Goalkeeper analysis is limited by the available source data. Low-minute samples are provisional.

Keep its rich research filters. Later, show an “In your squad” marker and an “Add to transfer comparison” action rather than adding a second squad-management interface.

Source: `frontend/app/top-performers/page.tsx`, `frontend/lib/player-role-insights.ts`.

### Teams boundaries

This page measures club quality independently of an individual manager's needs. The same player-picks modal is already reused by Transfer Planner, which is useful contextual reuse. Keep the modal as a shortcut and link into the full player or fixture screens for deeper work.

Source: `frontend/app/team-rankings/page.tsx`, `frontend/components/team-picks-modal.tsx`.

### Fixtures boundaries

Make this the canonical place for full schedule research, difficulty grids and attack/defence fixture explanations. It should own fixture exploration whether or not a visitor has selected a team.

Source: `frontend/app/fixture-analysis/page.tsx`, `getFixtures()` in `frontend/lib/supabase.ts`.

### Compare Players boundaries

Retain a dedicated comparison page. A shortlist leaderboard and a detailed comparison answer different questions. Personal transfer suggestions should deep-link here with the outgoing and incoming player IDs.

Currently, selection restores IDs from the URL but then stores names and resolves them again in `getPlayerTrends()`. Move this flow to stable IDs to avoid collisions between similar or identical display names. Its current eligibility filter also excludes players without season minutes, including potential new signings; decide whether to allow a clearly labelled low-data comparison later.

Source: `frontend/app/player-trends/page.tsx`, `getComparisonPlayers()` and `getPlayerTrends()` in `frontend/lib/supabase.ts`.

### Transfer Planner boundaries

Today this is a club-opportunity browser. It does not know the visitor's squad, available bank, selling prices, club limits, free transfers or planned moves. Its name suggests more personal planning than it currently implements.

Evolve it into the place to assess feasible player-out/player-in moves. Keep a guest “Explore targets” mode, but reduce the full schedule table to a compact opportunity summary linking to Fixtures once personal planning is available. The public candidate list must use the full eligible player pool; the current top-six-per-club picks are a presentation shortlist, not a sufficient transfer search space.

Source: `frontend/app/transfer-targets/page.tsx`, `getQuickPicks()` in `frontend/lib/supabase.ts`.

## Repetition and data consistency

### Findings and recommended handling

| Finding | Evidence and implication | Recommended handling |
| --- | --- | --- |
| Schedule exploration appears twice | Fixtures has a difficulty grid; Transfer Planner has a ranked club fixture sequence. Both answer which clubs have a good run. | Let Fixtures own detailed research. Make Transfer Planner use a small fixture summary to explain actual transfer choices. |
| Planning windows mean different things | Fixtures slices distinct gameweeks; Transfer Planner slices each club's next N fixtures. Blank/double gameweeks make the windows unequal. | Default personal planning to a start gameweek plus N calendar gameweeks. Include every match in the window and explicit blank weeks. Keep “next N matches” only as a separately labelled research option. |
| Fixture ratings follow different calculation paths | `getFixtures()` derives opportunity from recent club strength; `buildTeamFixtureSummaryFallback()` reads stored fixture difficulty/favourability; Transfer Planner converts difficulty back into a 0–100 rating. | Share one versioned fixture model and one window selector. Derive alternate display scales from that model and test parity. The code demonstrates divergent paths, not that every current displayed value differs. |
| Upcoming filters differ | Fixtures uses `gw >= current`; Transfer Planner uses `finished !== true`, and both have historical fallback behaviour. | Separate retrospective viewing from future planning. Do not silently present completed fixtures as upcoming when the season ends. |
| Page-specific bundles repeat shared resources | Sidebar and Dashboard share `dashboard-summary`, but Fixtures fetches it inside a separate bundle; Teams and Transfer Planner both load attacking/defensive picks; comparison bundles role insights separately from Top Players. | Use shared TanStack Query options and resource keys including season and relevant parameters; compose results at the page. Existing in-flight/module caches already reduce some repeated database work, so measure before claiming request savings. |
| Two cache layers manage freshness | TanStack Query and module variables in `supabase.ts` each cache for ten minutes. A query refetch can still receive the module cache's old result. | Give one layer clear ownership of public resource freshness, with explicit invalidation after sync. Never put user-private data in module-global caches. |
| Repeated player adapters and type aliases | Teams and Transfer Planner define similar pick/modal types and transformations; fields such as `price`/`now_cost` and `ownership`/`selected_by_percent` coexist. | Extract a typed public player model and one adapter for the shared modal. Generate database types with Supabase tooling to reduce `any` at the query boundary. |
| Precomputed and fallback role scores coexist | ETL can populate `player_role_insights`; frontend has a fallback controlled by a deployment flag. | Preserve the fallback during rollout; test the two paths against common fixtures and carry the score version into recommendations. Remove the fallback only after a deliberate migration. |
| Documentation still references obsolete page structure | Schema header says four pages; README introduces Quick Picks as a feature without explaining its redirect. | Use this inventory as the current page map and update older descriptions when the next product change ships. |

### What is not evidence of accidental duplication

The schema separates raw `player_gameweeks`, aggregate `player_season_stats`, derived `player_role_insights`, club rankings and fixtures. These are different grains of data. Keeping aggregates is useful for fast reads; removing them would force repeated calculations.

Unique keys on season/player/gameweek, season/player and season/player/window prevent repeated rows at those respective grains. A live-database query would still be needed to confirm deployed constraints and actual data quality. No live duplicate-row audit was performed.

Showing the same player's price or score on multiple screens is also reasonable. The goal is consistent definitions and shared sources, not making each number visible in only one place.

## Where the new experience should live

| Approach | Benefit | Trade-off |
| --- | --- | --- |
| **New My Team page + extend Transfer Planner (recommended)** | Clear home for the squad, sync and weekly priorities; transfers use the existing planning destination; public research remains useful. | Adds one sidebar destination and needs shared squad context between pages. |
| Add a My Team tab inside Transfer Planner | Fewer navigation items; squad and transfers are close together. | Squad review, captain advice and team selection become buried in a transfer-oriented page. |
| Integrate everything into Dashboard | Personal advice appears immediately after team selection. | Dashboard becomes crowded with onboarding, squad management and repeated analytics. |

Recommended destinations:

- `/my-team`: new personal workspace with **Squad** and **Recommendations** tabs.
- `/transfer-targets`: existing planner with **Explore targets** and **Plan my transfers** modes. Use one planning implementation, with My Team linking into it.
- Team selection: an empty state on `/my-team`, reachable from a **Find my FPL team** action on Dashboard.
- Team controls: **Change team**, **Refresh squad** and **Forget this team**; the last action clears the locally remembered selection and drafts.

Keep existing public routes and the Quick Picks redirect. Add small personal-context actions to Top Players, Compare Players and Fixtures instead of reproducing those pages inside My Team.

## Proposed user journey

1. Browse existing public analysis. Choose **Find my FPL team**.
2. Enter an FPL team ID or paste its public entry URL. The server accepts only a positive entry ID extracted from an allowed FPL URL, not an arbitrary fetch URL. Include a short guide to finding the ID.
3. If team-name search is available, enter all or part of the fantasy team name and select from matching teams. The fantasy squad name is distinct from the Premier League club name, such as Arsenal. Search is a lookup convenience; the chosen entry ID remains the canonical identifier.
4. Preview the returned team identity and ask the user to confirm the intended team before remembering it locally. This confirms selection; a public team ID does not prove ownership of the FPL account. Offer **Remember on this device** and explain that it is visible to other people using the same browser profile.
5. Show the imported 15-player squad, recorded XI/bench/captain where available, source gameweek and fetch time. Map official player `element` IDs to analytics identities; show unmatched players explicitly.
6. Ask the user to confirm changes made since the source deadline, available bank, free transfers and relevant selling prices. Keep edits as a planning draft separate from the imported snapshot.
7. Show prioritised squad concerns and explained suggestions. Open Transfer Planner for a specific move and Compare Players for the evidence.
8. Allow refresh, relink and unlink. Refresh must not silently overwrite a draft; offer to preserve it or reset it from the newer snapshot.

### Public import limitation

No FPL Analyst login is required. Start with a public team-ID import and do not collect FPL passwords or session cookies.

FPL's official public transfer page states that another team's transfers are visible only up to the last deadline. The import must therefore be presented as a gameweek snapshot, not guaranteed current pre-deadline squad access. Unpublished transfers, current selling values, available free transfers and chip effects may need user confirmation. Before the first deadline, offer a manual squad draft if no public picks are available.

Proposed adapter inputs are the public entry, entry history and event-picks endpoints, plus bootstrap player/event data. The feasibility investigation now confirms public standings → entry ID → entry profile → 15 gameweek picks through direct HTTP requests without login. The original web research tool could not read entry/picks, but direct requests succeeded. Other contracts, field freshness and recommendation-specific inputs still require validation. Do not assume an official third-party FPL OAuth connection is available.

Sources: [official FPL public transfer visibility](https://fantasy.premierleague.com/en/entry/7561496/transfers), [official bootstrap endpoint](https://fantasy.premierleague.com/api/bootstrap-static/).

### Team-name search feasibility

[FPL Gameweek](https://www.fplgameweek.com/) currently offers both team-ID entry and partial team-name search, and says it remembers the chosen team. Inspection of its public application bundle found calls to its own Azure-hosted `SearchEntryFunction`, including function-key headers. One request to that backend without credentials returned HTTP 401. This is evidence of its own backend search implementation, not a supported search service for this project. No credentials were extracted or used.

**Verdict: team-name search is technically feasible using our own index of public FPL standings. A complete, maintained search service is a separate data-ingestion project, not a simple official name-search API integration.** No supported global FPL team-name search endpoint was identified in this investigation. A reusable third-party search agreement was not found either.

Direct HTTP probes on 7 October 2026 confirmed:

- Overall league `/api/leagues-classic/314/standings/?page_standings=1` and page 2 both returned HTTP 200, 50 records, `has_next: true`, and `entry_name` plus `entry` fields. These provide fantasy team names and canonical entry IDs.
- Page 10000 also returned HTTP 200 with 50 records and a continuation flag, so deep pagination was not blocked in this small probe.
- One returned entry's profile matched its standings team name, and `/api/entry/{id}/event/5/picks/` returned all 15 picks without authentication.
- The bootstrap response reported 11,025,131 managers. At 50 records per page, an index of that order would require approximately 220,503 page reads, before retries or refreshes. That is an order-of-magnitude estimate, not a verified exact league membership count. At a hypothetical one request per second it would take about 61 hours; no safe or guaranteed upstream request rate has been established.

The verified path is: standings ingestion → store season/entry ID/team name → search our index → select entry ID → fetch public squad. Deduplicate by season and entry ID, allow multiple teams with identical names, and update renamed teams. Ingestion must be resumable and bounded with backoff. Changing ranks while a crawl runs can move entries between pages, causing gaps or repeats; a single sequential crawl does not prove full coverage. Late/new entries and season resets also need handling.

The small probe proves the data path, not nationwide/global production coverage, permission for bulk ingestion, throughput, ongoing costs or freshness. Before implementing a global-search UI, validate a sustainable ingestion/source arrangement and coverage reporting. Do not promise that every team can be found until those criteria are met. If an index contains only previously encountered teams, label its coverage explicitly; a missing result must not imply the team does not exist. Always keep ID/link entry available.

Show multiple matches with enough public context to distinguish them, minimise manager information, debounce input, require a useful minimum query length, and rate-limit the server endpoint. Given the user's preference to establish feasibility before starting implementation, treat sustainable search ingestion and coverage as a prerequisite if global name search is required for launch; do not begin the UI and discover the data dependency midway.

Primary probe references: [overall standings](https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=1), [bootstrap](https://fantasy.premierleague.com/api/bootstrap-static/), [FPL Gameweek application bundle](https://www.fplgameweek.com/app.2cdf69f5f3c7a8d0e2ef.bundle.js).

## Proposed implementation architecture

The actual frontend is Next.js App Router, with Supabase and TanStack Query already installed. Keep Supabase for shared analytics, use Next.js handlers for public FPL fetching, and reuse TanStack Query for resource caching. The optional Flask API is not required for this experience.

### Browser selection and planning drafts

No auth subsystem or user-owned database tables are needed for the first release. Store the selected entry ID and season locally when the visitor opts to remember it. Keep public snapshots in the query cache; store only the minimum draft data needed to resume planned moves locally, with a versioned format and timestamps.

Local browser storage is enough for a small team selection and transfer draft; IndexedDB is unnecessary unless offline/history needs grow. Reuse Zustand only if it helps share draft state across pages; React context is sufficient for a small state surface. Read browser storage after hydration, handle unavailable storage gracefully, and validate saved drafts before reuse.

Changing teams must isolate the old draft from the new team. **Forget this team** clears the remembered selection, associated drafts and query state. Local drafts do not sync across devices, are not secret from someone sharing the browser profile, and can disappear if browser data is cleared. Never treat an entry ID as permission to modify an FPL account.

If accounts are added later for cross-device drafts, introduce owner-scoped storage and RLS at that point. Do not store anonymous drafts in public writable tables keyed only by entry ID.

### FPL adapter and identity mapping

Add public read-only Next.js route handlers for import and refresh. Fetch from fixed FPL endpoint templates; validate response shape, apply timeouts and rate limits, and return useful errors for invalid teams, unavailable picks and upstream failure. A validator such as Zod is useful at this external-data boundary. Abuse controls matter because requests are unauthenticated.

Cache only canonical public source responses by season, entry ID and source gameweek, with bounded freshness and an explicit refresh policy. Include those identities in TanStack Query keys. Compute draft-specific recommendations locally initially; never put a visitor's bank overrides or planned moves into shared caches. If draft evaluation later runs on the server, use no-store responses for it. Keep the locally remembered team association out of shared server state.

`players.fpl_id` already provides a potential mapping. Verify that the CSV IDs match official bootstrap IDs before relying on it. Its current global uniqueness and mutable team/price fields are also a season-rollover risk: official IDs should be mapped by season, rather than assuming an integer represents the same player across years. Unknown IDs must remain visible and block affected recommendations, not disappear from the squad.

Store monetary values in integer tenths of a million at the planning boundary. Distinguish current market price from confirmed selling price. Official player price/status/deadline data may require a fresher fetch than the daily analytical pipeline; show separate freshness for squad, market data and model data.

### Recommendation engine

Start with deterministic, explainable rules using existing role insights, minute security, club strength and a shared fixture window. There is no need for an LLM or a new machine-learning model in the first release.

For each owned player, show strengths, concerns and relevant fixture context. For single transfers, consider same-position replacements from the full eligible pool; exclude already-owned players; enforce affordability using selling price plus bank, squad composition and club limits under current FPL rules. Include a “hold” option. Mark assumptions and provisional scores.

Recommend a short ranked list with an explanation such as “stronger attacking profile, steadier minutes and a better three-gameweek run.” Rank replacements within the same role; do not sum position-normalised scores into a supposed squad points forecast. A higher model score cannot be translated into expected points gained or weighed against a points hit without a separately validated points model.

My Team Recommendations initially contains review priorities, hold/monitor/consider-replacing guidance and links to feasible single-transfer alternatives. Captain/vice-captain and starting-XI advice can follow after availability, formation and fixture-volume handling are reliable. Exclude automated transfers, multi-week optimisation and chip strategy from the first release.

## Suggested delivery sequence

This is a proposed sequence for discussion, not a detailed approved implementation plan.

1. **Verify import and settle data definitions.** Test public endpoint contracts, deadline visibility and ID mapping; standardise fixture windows and ratings. Confirm current FPL legality rules. Retain useful public research screens.
2. **Add guest team selection and local persistence.** Ship ID/link entry, preview, optional remembering and change/forget controls. Verify team switching, hydration, unavailable browser storage and isolation of drafts by team/season. Investigate team-name search separately before promising broad coverage.
3. **Ship My Team import and draft confirmation.** Cover loading, invalid ID, upstream outage, no public squad, missing analytics, stale snapshot, refresh conflict and season rollover.
4. **Add explained single-transfer recommendations.** Check ownership, budget/selling price, club limits, no-op hold, unavailable/low-data players, blank/double gameweeks and identical-name players. Integrate with Transfer Planner and Compare Players.
5. **Refine personal context.** Dashboard summary, owned-player badges, shortlist actions; consider captain/lineup guidance and saved multi-week planning after user feedback.

Acceptance target: a visitor can select a public FPL team without an account, see a clearly dated imported squad, confirm current changes, and receive feasible explained recommendations. A returning visitor can restore an optionally remembered team on the same browser. Switching teams never applies another team's draft. Public research still works; local draft information never enters shared server caches; recommendations on different pages use the same score version and fixture window.

## Discussion decisions

The primary decision is whether **My Team as a new page, with personal transfers in the existing planner**, matches the desired workflow. Login has been removed from the proposal. The remaining lookup decision is whether reliable ID/link import can ship before team-name search, whose source and coverage need verification. Automatic access to the manager's current unpublished FPL team would require a separate feasibility and access-design discussion.
