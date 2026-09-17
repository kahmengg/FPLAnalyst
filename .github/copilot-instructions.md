# FPL Analyst contributor instructions

## Runtime architecture

The supported pipeline is CSV -> Python ETL -> Supabase -> Next.js. Do not add runtime dependencies on generated JSON files.

1. `backend/sync_daily.py` fetches player/gameweek data from fpl-data.co.uk and the season schedule from the official FPL APIs.
2. The sync validates both payloads and atomically replaces `fpl-data-stats.csv` and `fixture_template.csv`.
3. `backend/etl/process_fpl_data.py` aggregates and upserts tables through the Supabase service role.
4. The Next.js frontend reads Supabase directly through `frontend/lib/supabase.ts`.
5. Flask routes in `backend/routes/` are optional public read endpoints over the same Supabase views.

## Data and security rules

- Preserve the fixture schema exactly: `gameweek,home_team,away_team`.
- Keep official-to-project team aliases in `backend/sync_daily.py` synchronized with the player export.
- Validate a new source payload before replacing a checked-in CSV.
- Use the anon Supabase client for reads and `get_admin_client()` for ETL writes.
- Never expose `SUPABASE_SERVICE_KEY` to the frontend or place it in a `NEXT_PUBLIC_*` variable.
- Public RLS is SELECT-only. Do not add anonymous write policies.
- Keep `FPL_DATA_SEASON` and `NEXT_PUBLIC_FPL_SEASON_KEY` aligned.

## Commands

```bash
python backend/sync_daily.py --validate-only
python backend/sync_daily.py --fixtures-only
python backend/sync_daily.py --season 2026_27
python -m unittest discover -s backend/tests
python -m compileall -q backend

cd frontend
npm run build
npm audit
```

## Frontend conventions

- Next.js App Router pages live in `frontend/app/`.
- Shared Supabase queries and row mapping belong in `frontend/lib/supabase.ts`.
- Treat browser queries as public and untrusted; privileged operations belong on the server.
- Prefer a shared cached query over repeated per-component or per-row requests.
- Preserve loading, empty, and error states when changing data flows.

## Known data-model constraint

The player export is one row per player/gameweek. Do not claim fixture-level accuracy for player stats in double gameweeks unless the source and schema are extended to include a fixture identifier.
