# Connected weekly research implementation plan

Goal: give public research pages distinct jobs and add guest squad context without accounts or unverified global name search.

Architecture: retain Next.js, Supabase analytics, TanStack Query and existing visual tokens. Share a canonical fixture model and calendar-gameweek window across Fixtures and Transfer Planner. Import public FPL squads through a fixed-origin server adapter and remember only the entry ID optionally in this browser.

The user has requested implementation and will review the working result. Execute directly in the current workspace; preserve existing untracked skills and documentation.

- [x] Shared fixture model: test blank/double weeks, finished matches, window bounds; use canonical opportunity ratings for both research screens.
- [x] Guest squad: validate ID/link input and public responses; show a dated snapshot, unmatched players, storage failures and change/forget controls.
- [x] Connected pages: My Team links to same-role research alternatives in Transfer Planner; Planner focuses on candidates with compact fixture context and links to full schedule research; shared research navigation and freshness/score explanations.
- [x] Verification: unit tests, TypeScript/build, backend regression suite, browser checks for routes, mobile layout, import errors, persistence, and deterministic squad/recommendation fixtures.

Constraints: no login, no global name-search promise, no automated transfers, no points forecasts from role scores. Alternatives are research suggestions until bank/selling prices and current squad are confirmed. Keep public analytics functioning independently of FPL import availability.
