# FPL Analyst

FPL Analyst is a Fantasy Premier League analytics dashboard for exploring player form, team strength, fixture difficulty, quick picks, and transfer targets. It uses a Python ETL pipeline to load FPL CSV data into Supabase, a Flask API for read endpoints, and a Next.js frontend for the dashboard.

## What It Does

- Tracks player season totals, per-90 metrics, value, form, expected stats, and gameweek history.
- Ranks teams by attack, defense, overall strength, recent form, and home/away trends.
- Builds fixture difficulty and opportunity ratings from team strength data.
- Surfaces top performers, hidden/value picks, defensive leaders, quick picks, and transfer targets.
- Syncs the latest FPL CSV from `fpl-data.co.uk` and reloads Supabase through the ETL pipeline.

## Project Structure

```text
FPLAnalyst/
  backend/
    app.py                         Flask API entry point
    sync_daily.py                  Download latest CSV and run ETL
    requirements.txt               Python dependencies
    config/config.py               Data path configuration
    etl/process_fpl_data.py        CSV -> Supabase ETL pipeline
    routes/                        Flask API blueprints
    utils/supabase_client.py       Supabase client and query helpers
  frontend/
    app/                           Next.js App Router pages
    components/                    Shared UI components
    hooks/                         React hooks
    lib/supabase.ts                Frontend Supabase data layer
    package.json                   Frontend scripts and dependencies
  fpl-data-stats.csv               Source FPL stats CSV
  fixture_template.csv             Fixture template/source data
  fpl.ipynb                        Analysis notebook
  render.yaml                      Render backend deployment config
  supabase_schema.sql              Supabase tables, views, indexes, and RLS policies
```

## Architecture

```text
FPL CSV data
  -> backend/etl/process_fpl_data.py
  -> Supabase tables and views
  -> Next.js frontend via frontend/lib/supabase.ts
  -> Optional Flask API via backend/routes/*
```

The frontend primarily reads Supabase directly with the public anon key. The Flask backend exposes API endpoints for health checks, player search/table data, player gameweek history, fixtures, and fixture grids.

## Tech Stack

- Backend: Python, Flask, pandas, NumPy, Supabase Python client, Gunicorn
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn-style UI components, Recharts, Supabase JS
- Data store: Supabase Postgres
- Deployment: Render backend config is included; the frontend is suitable for Vercel or any Next.js host

## Prerequisites

- Python 3.11 recommended
- Node.js 18+ recommended
- npm
- A Supabase project
- The schema in `supabase_schema.sql` applied to that Supabase project

## Environment Variables

Create `backend/.env` or set these in your shell/deployment host:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=optional-service-role-key
FPL_SEASON_KEY=2025_26
FPL_DATA_SEASON=2025_26
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The backend prefers `SUPABASE_ANON_KEY` and falls back to `SUPABASE_SERVICE_KEY`. The frontend requires the public `NEXT_PUBLIC_*` values.

## Setup

### 1. Create the Supabase Schema

Open the Supabase SQL editor and run:

```sql
-- contents of supabase_schema.sql
```

This creates the core tables, views, indexes, and public read/write RLS policies used by the app.

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Load Data

If `fpl-data-stats.csv` already exists at the project root, run:

```bash
cd backend
python -m etl.process_fpl_data --season 2025_26
```

To download the latest CSV and then run the ETL:

```bash
cd backend
python sync_daily.py --season 2025_26
```

The ETL upserts teams, players, player gameweeks, player season stats, team rankings, and fixture difficulty records into Supabase.

## Running Locally

Start the backend API:

```bash
cd backend
python app.py
```

The API runs at `http://localhost:5000`.

Start the frontend:

```bash
cd frontend
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Frontend Pages

- `/` - dashboard summary and navigation
- `/top-performers` - goal scorers, assist providers, defensive leaders, value players, and other insight groups
- `/team-rankings` - attack, defense, and overall team rankings
- `/fixture-analysis` - fixture opportunity and difficulty analysis
- `/player-trends` - player search and gameweek trend charts
- `/quick-picks` - attacking and defensive pick groups
- `/transfer-targets` - transfer ideas using fixture and pick context
- `/players` - player table and filters
- `/teams` - team-level views
- `/fixtures` - fixture views
- `/admin` - admin-oriented app route

## Backend API

All routes are prefixed with `/api`.

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Returns liveness and dashboard summary data from `dashboard_summary`. |
| `GET /api/players` | Returns rows from `player_overview`. Supports filtering, sorting, limit, and offset. |
| `GET /api/players/<player_id>/gameweeks` | Returns recent gameweek rows from `player_gw_history`. |
| `GET /api/fixtures` | Returns rows from `fixture_grid`, optionally filtered by gameweek or team. |
| `GET /api/fixtures/grid` | Returns fixture difficulty data grouped by team and gameweek. |

### Player Query Parameters

`GET /api/players` supports:

| Parameter | Example | Notes |
| --- | --- | --- |
| `position` | `3` | Position number: 1 GK, 2 DEF, 3 MID, 4 FWD. |
| `team` | `ARS` | Team short name. |
| `min_mins` | `450` | Minimum total minutes. |
| `sort` | `total_points` | Must be one of the allowed sortable columns in `backend/routes/players.py`. |
| `order` | `desc` | Use `asc` or `desc`. |
| `limit` | `200` | Number of rows. |
| `offset` | `0` | Pagination offset. |

### Fixture Query Parameters

`GET /api/fixtures` supports:

| Parameter | Example | Notes |
| --- | --- | --- |
| `gw` | `15` | Single gameweek. |
| `team` | `ARS` | Matches home or away team short name. |

## Data Model

The main Supabase objects are:

- `teams`
- `players`
- `player_gameweeks`
- `player_season_stats`
- `team_rankings`
- `fixtures`
- `dashboard_summary` view
- `player_overview` view
- `player_gw_history` view
- `team_overview` view
- `fixture_grid` view

Run `supabase_schema.sql` whenever the database needs to be recreated or brought back in line with the application.

## Data Workflow

1. Update or download `fpl-data-stats.csv`.
2. Run `python sync_daily.py --season 2025_26` from `backend/`, or run the ETL directly if the CSV is already present.
3. Confirm `/api/health` returns `status: ok`.
4. Start the frontend and verify the dashboard summary, players, teams, and fixtures load.

## Development Notes

- Backend route modules live in `backend/routes/` and are registered in `backend/app.py`.
- Frontend data helpers live in `frontend/lib/supabase.ts`.
- The current frontend uses Supabase directly rather than calling the Flask API for most screens.
- The ETL assumes the source CSV columns match the current `fpl-data.co.uk` export shape.
- Season-specific SQL views currently reference `2025_26`; update `supabase_schema.sql` and environment variables for a new season.

## Useful Commands

```bash
# Backend API
cd backend
python app.py

# ETL only
cd backend
python -m etl.process_fpl_data --season 2025_26

# Download latest CSV and run ETL
cd backend
python sync_daily.py --season 2025_26

# Frontend development
cd frontend
npm run dev

# Frontend production build
cd frontend
npm run build
npm start
```

## Deployment

### Backend on Render

`render.yaml` defines a Python web service:

```yaml
buildCommand: pip install -r backend/requirements.txt
startCommand: cd backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120
```

Set the required Supabase and season environment variables in Render.

### Frontend

Deploy `frontend/` as a Next.js app. Set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Troubleshooting

### Supabase environment variables are missing

The backend raises an error during startup if `SUPABASE_URL` and a Supabase key are not set. The frontend returns empty data if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.

### Dashboard loads but shows zero data

Check that:

- `supabase_schema.sql` has been applied.
- The ETL completed successfully.
- `FPL_SEASON_KEY`, `FPL_DATA_SEASON`, and the season filters in SQL views point to the same season.
- The Supabase anon key can read the required tables/views.

### ETL cannot find the CSV

`backend/config/config.py` expects `fpl-data-stats.csv` at the project root:

```text
FPLAnalyst/fpl-data-stats.csv
```

Run `python sync_daily.py --season 2025_26` from `backend/` to fetch a fresh copy.

### Frontend build fails

Run dependency installation again from `frontend/`:

```bash
npm install
npm run build
```

Then check TypeScript or environment variable errors in the build output.

## License and Disclaimer

This project is for personal and educational FPL analysis. It is not affiliated with, endorsed by, or maintained by Fantasy Premier League. Data quality and recommendations depend on the source data and the assumptions in the ETL calculations.
