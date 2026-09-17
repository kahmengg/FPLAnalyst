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

Apply `supabase_schema.sql` in the Supabase SQL editor, then create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_KEY=your-secret-service-role-key
FPL_DATA_SEASON=2026_27
```

The service-role key is required for ETL writes. Keep it server-side and never expose it through a `NEXT_PUBLIC_*` variable. The anon key is used for public reads only.

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_FPL_SEASON_KEY=2026_27
NEXT_PUBLIC_FPL_SEASON_COMPLETE=false
```

Install dependencies:

```bash
python -m pip install -r backend/requirements.txt
cd frontend
npm install
```

## Updating data

From the repository root:

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

Run the schema before the first ETL or after schema changes. The SQL views select the newest loaded season automatically; the backend and frontend season variables determine which season the applications request.

## Running locally

```bash
# Optional API: http://localhost:5000/api/health
python backend/app.py

# Frontend: http://localhost:3000
cd frontend
npm run dev
```

Frontend routes are `/`, `/top-performers`, `/team-rankings`, `/fixture-analysis`, `/player-trends`, `/quick-picks`, and `/transfer-targets`.

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
