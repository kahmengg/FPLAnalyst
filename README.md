# FPL Analyst

FPL Analyst is a Fantasy Premier League dashboard for player form, team strength, fixture difficulty, quick picks, and transfer targets. A Python pipeline validates two CSV inputs and upserts derived data into Supabase; a Next.js frontend reads the resulting tables and views. A small Flask API exposes the same data for optional integrations and health checks.

## Data flow

```text
fpl-data.co.uk player/gameweek export ─┐
                                      ├─> backend/sync_daily.py
Official FPL bootstrap + fixtures API ┘      └─> backend/etl/process_fpl_data.py
                                                   └─> Supabase tables/views
                                                          ├─> Next.js frontend
                                                          └─> Flask read API
```

`backend/sync_daily.py` downloads and validates both inputs before replacing either local file. Fixture names from the official API are normalized to the names used by the player-stat export. The ETL then builds player aggregates, team rankings, and fixture ratings for the selected season.

## Project structure

```text
run_pipeline.ps1           One-command environment setup and complete pipeline
backend/
  app.py                    Optional Flask read API
  sync_daily.py             Download, validate, and atomically replace both CSVs
  etl/process_fpl_data.py   CSV-to-Supabase processing pipeline
  routes/                   Health, player, and fixture endpoints
  utils/supabase_client.py  Public read client and service-role ETL client
frontend/
  app/                      Next.js App Router pages
  components/               Shared UI components
  lib/supabase.ts           Frontend queries and data mapping
fixture_template.csv        Official 380-match season schedule
fpl-data-stats.csv          Player/gameweek input from fpl-data.co.uk
supabase_schema.sql         Tables, views, indexes, and read-only public policies
render.yaml                 Render backend service configuration
```

## Stack

- Python 3.11+, Flask, pandas, NumPy, Supabase Python client, Gunicorn
- Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, Supabase JS
- Supabase Postgres
- Render configuration for the optional API; the frontend is suitable for Vercel

## Setup

Apply `supabase_schema.sql` in the Supabase SQL editor, then copy `backend/.env.example` to `backend/.env` and replace the placeholders:

```powershell
Copy-Item backend\.env.example backend\.env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SECRET_KEY=sb_secret_your-key
FPL_DATA_SEASON=2026_27
```

The URL, publishable key, and secret key must all come from the same Supabase project. The secret key is required for ETL writes; keep it server-side and never expose it through a `NEXT_PUBLIC_*` variable. Legacy `anon` and `service_role` environment variables remain supported while migrating.

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
NEXT_PUBLIC_FPL_SEASON_KEY=2026_27
NEXT_PUBLIC_FPL_SEASON_COMPLETE=false
# Enable after player_role_insights has been created and populated by the ETL.
NEXT_PUBLIC_PLAYER_ROLE_INSIGHTS_PRECOMPUTED=false
```

Install dependencies:

```bash
python -m pip install -r backend/requirements.txt
cd frontend
npm install
```

## Updating data

From the repository root:

```powershell
# Recommended: set up dependencies, refresh both inputs, and update Supabase.
.\run_pipeline.ps1

# Optional: select a season or skip the dependency check.
.\run_pipeline.ps1 -Season 2026_27
.\run_pipeline.ps1 -SkipInstall
```

The launcher checks DNS, credentials, and the required Supabase schema before replacing either CSV. On a new database, run `supabase_schema.sql` once in the Supabase SQL Editor first.

Individual operations remain available:

```bash
# Validate the checked-in inputs without changing them.
python backend/sync_daily.py --validate-only

# Refresh only the official fixture schedule.
python backend/sync_daily.py --fixtures-only

# Refresh both inputs and upsert the selected season into Supabase.
python backend/sync_daily.py --season 2026_27

# Reprocess already-downloaded files.
python -m backend.etl.process_fpl_data --season 2026_27
```

### Daily automation with GitHub Actions

The repository includes `.github/workflows/daily-fpl-sync.yml`. It runs the same
validated download-and-ETL command every day at 06:00 UTC (14:00 Singapore time)
and can also be started manually from the Actions tab.

Configure these GitHub repository settings before enabling it:

- Actions secret `SUPABASE_URL`
- Actions secret `SUPABASE_SECRET_KEY` (never use a public frontend key for ETL writes)
- Optional Actions variable `FPL_DATA_SEASON`; it defaults to `2026_27`

The workflow does not commit downloaded CSV files. It uses them only inside the
temporary runner and writes the validated result to Supabase. Scheduled workflows
run from the repository's default branch and use UTC cron times.

Run the schema before the first ETL or after schema changes. The SQL views select the newest loaded season automatically; the backend and frontend season variables determine which season the applications request.

The role-based Top Players model is precomputed by the ETL in
`player_role_insights`. For an existing deployment, apply the latest schema,
run the ETL once, verify that both `season` and `last_5` rows exist, and then set
`NEXT_PUBLIC_PLAYER_ROLE_INSIGHTS_PRECOMPUTED=true`. Until that flag is enabled,
the frontend derives the same versioned scores from paginated gameweek rows.

## Running locally

```bash
# Optional API: http://localhost:5000/api/health
python backend/app.py

# Frontend: http://localhost:3000
cd frontend
npm run dev
```

Frontend routes are `/`, `/my-team`, `/top-performers`, `/team-rankings`, `/fixture-analysis`, `/player-trends`, `/quick-picks`, and `/transfer-targets`.

For each page's features and objective, overlap findings, and the implemented guest experience, see [Page audit and My Team proposal](docs/page-audit-and-my-team-proposal.md). `/quick-picks` redirects to Transfer Planner; there are seven navigable pages.

My Team imports the latest public deadline squad by numeric FPL entry ID or official team link, without login. Visitors can also search a fantasy team name inside a public Classic league by entering that league's ID or standings link. `GET /api/fpl-search?league=<id>&name=<query>` searches at most ten standings pages (500 teams), reports partial coverage, preserves duplicate-name entries by ID, and allows confirmation through the usual team preview. It accepts 3–80 characters, caches public standings for five minutes, and bounds upstream work to 18 seconds. Global team-name search is not implemented.

The squad appears on a pitch grouped by position, with a separate ordered bench and selectable player details. Recommendations prioritise availability, minutes and insufficient evidence, preserving hold as an option. A suggested comparison requires an unowned eligible player in the same position at or below the outgoing player's current price, at least 60% recent 60-minute appearances, no worse role score, and an improvement of at least three in the 70/30 research ordering. That threshold is a conservative UI heuristic, not a calibrated points gain; availability of alternatives still needs confirmation.

Visitors preview and confirm the team, optionally remember its ID on this device, and research replacements. The Next.js `GET /api/fpl-team?entry=<id>` adapter validates a complete 15-player response, checks season compatibility, caches public results for five minutes, and does not forward manager personal details. Running the frontend requires a server runtime for these endpoints; a static export alone cannot support imports or league searches.

Fixtures and Transfer Planner share calendar gameweek windows, including blank and double gameweeks. The planner ranks same-position, eligible players using 70% role score and 30% fixture opportunity; this is a research order, not predicted points. Current bank, selling prices, transfer hits and three-per-club legality are not calculated. Public squads may omit transfers made after the latest deadline. Before a public launch, configure host-level request limits for the import endpoint and monitor upstream failures.

The optional Flask API provides:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness and dashboard summary |
| `GET /api/players` | Filtered, sorted, paginated player overview |
| `GET /api/players/<player_id>/gameweeks` | Recent player gameweek history |
| `GET /api/fixtures` | Fixtures, optionally filtered by `gw` or team code |
| `GET /api/fixtures/grid` | Fixture ratings grouped by team and gameweek |

The browser application reads Supabase directly; it does not depend on the Flask API for its normal pages.

## Validation

```bash
python backend/sync_daily.py --validate-only
python -m unittest discover -s backend/tests
python -m compileall -q backend
cd frontend
npm run build
npm test
npm run test:e2e
npm audit
```

`fixture_template.csv` must contain exactly the columns `gameweek,home_team,away_team`, 380 rows, gameweeks 1–38, 20 clubs, and 38 appearances per club. The player export must contain the columns validated in `backend/sync_daily.py`.

## Operational notes

- Public RLS policies are read-only. All mutations go through the server-side service role.
- The sync stages replacements in memory and only writes after both downloads validate, avoiding a half-updated input pair.
- The player source has one row per player/gameweek. Double gameweeks therefore need additional source detail before fixture-level player output can be fully disaggregated.
- CORS is open on the optional API because it exposes public read data only. Restrict origins before adding authenticated or mutating endpoints.

## Deployment

`render.yaml` installs `backend/requirements.txt` and starts Gunicorn. Set the backend variables above in Render. Deploy `frontend/` as the Next.js project and set its four public variables in the frontend host.

This project is for personal and educational analysis and is not affiliated with Fantasy Premier League. Rankings depend on upstream data quality and the model assumptions in the ETL.
