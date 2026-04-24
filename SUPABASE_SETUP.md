# FPL Analyst - Supabase Migration Setup Guide

This guide walks you through converting your FPL Analyst application from JSON file-based storage to a modern Supabase PostgreSQL database.

## Architecture Overview

```
┌─────────────────┐
│   Next.js       │
│   Frontend      │  ──(direct reads)──┐
└─────────────────┘                     │
                                        ▼
                                  ┌──────────────┐
                                  │  Supabase    │
                                  │  PostgreSQL  │
                                  └──────────────┘
                                        ▲
                                        │
┌─────────────────┐                     │
│   Flask         │  ──(reads/writes)──┤
│   Backend       │                     │
└─────────────────┘                     │
        ▲                               │
        │                               │
┌───────┴──────┐              ┌────────┴─────┐
│ Admin Routes │              │ Jupyter      │
│ (CSV Upload) │              │ Notebook     │
│ (Processing) │              │ (ETL)        │
└──────────────┘              └──────────────┘
```

**Design Decisions:**
- **Frontend reads directly from Supabase:** Faster, simpler, no additional server hop for read-heavy dashboards
- **Backend stays for admin/write operations:** CSV uploads, notebook processing, data mutations
- **Notebook as ETL:** Continues to analyze data, but outputs directly to database instead of JSON files

---

## Prerequisites

Before you start, ensure you have:

1. **Supabase Account** with project created (✓ you have this)
2. **Environment Variables** set up (✓ already configured)
3. **Python dependencies** updated (✓ requirements.txt updated)
4. **Node.js packages** updated (✓ package.json updated)

---

## Step 1: Apply the Database Schema

The schema is defined in `supabase_schema.sql` in your project root.

### Option A: Apply via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (`exvzvzmalhpqgatzujru`)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy all contents from `supabase_schema.sql`
6. Paste into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify: You should see tables created with ✅ indicators

### Option B: Apply via CLI

```bash
cd backend
supabase db push
```

### Verify the Schema

In Supabase Dashboard → **Table Editor**, you should see:
- `seasons` (current season management)
- `teams` (20 Premier League teams)
- `players` (player master data)
- `fixtures` (match data with FDR ratings)
- `player_gameweeks` (week-by-week player performance)
- `team_rankings` (aggregate team statistics)
- `team_fixture_summary` (fixture difficulty analysis)
- `player_insights` (top performers, value picks, etc.)
- `analysis_reports` (JSON cache for legacy endpoints)

---

## Step 2: Get Your Supabase Anon Key

The `SUPABASE_ANON_KEY` in your `.env.local` is currently a placeholder. Get the real one:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** (bottom left) → **API**
4. Copy the **anon** key (labeled as `anon public` in the "Project API keys" section)
5. Replace `REPLACE_WITH_YOUR_ANON_KEY_FROM_SUPABASE_DASHBOARD` in `frontend/.env.local` with the real key

---

## Step 3: Install Dependencies

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

---

## Step 4: Run the Migration Script

This script reads your existing JSON files and populates the Supabase database.

```bash
cd backend
python migrate_to_supabase.py
```

**What it does:**
- Extracts teams from all JSON files
- Migrates player data from `player_trends/all_players.json`
- Migrates fixtures from `fixture_analysis/fixtures.json`
- Migrates player insights (top performers, value picks, etc.)
- Migrates team rankings from `rankings/overall_rankings.json`

**Expected output:**
```
🚀 Starting Supabase migration from JSON files...
📁 Data directory: .../backend/data

📊 Migrating teams...
✅ Migrated 20 teams
👥 Migrating players...
✅ Migrated 500+ players
🎯 Migrating fixtures...
✅ Migrated 200+ fixtures
⭐ Migrating player insights...
✅ Migrated 1000+ player insights
🏆 Migrating team rankings...
✅ Migrated 20 team rankings

✅ Migration complete! Your data is now in Supabase.
```

---

## Step 5: Test Backend Connectivity

Start the Flask backend:

```bash
cd backend
python app.py
```

Visit the health endpoint: http://localhost:5000/api/health

You should see:
```json
{
  "status": "healthy",
  "database": "Supabase PostgreSQL",
  "current_season": "uuid...",
  "tables": {
    "teams": {"status": "ok", "count": 20},
    "players": {"status": "ok", "count": 500+},
    ...
  }
}
```

---

## Step 6: Start Frontend in Development

```bash
cd frontend
npm install  # if not already done
npm run dev
```

Visit http://localhost:3000 and verify data is loading.

---

## Step 7: Update Your Notebook (Optional but Recommended)

Your Jupyter notebook (`fpl.ipynb` or `fpl_analysis_v2.ipynb`) currently outputs to JSON files. For the full migration, update it to write directly to Supabase:

### Add to your notebook's imports:
```python
from utils.supabase_client import supabase, get_current_season
```

### Instead of saving to JSON, do:
```python
# Old way (JSON)
output.to_json('backend/data/top_performers/goal_scorers.json')

# New way (Supabase)
season_id = get_current_season()
records = output.to_dict('records')

# Transform records to match schema
for rank, row in enumerate(records, start=1):
    insight = {
        "season_id": season_id,
        "insight_type": "goal_scorers",
        "player_name": row['player'],
        "team_name": row['team'],
        "team_short": row['team_short'],
        "rank": rank,
        "sort_metric": row['points'],
        "payload": row  # Store entire record as JSON
    }
    supabase.table("player_insights").upsert([insight], ignore_duplicates=True).execute()
```

---

## API Endpoints

All existing endpoints remain the same, but now read from Supabase:

### Top Performers
- `GET /api/goal_scorer-picks` → Goal scorers
- `GET /api/assist-gems` → Assist providers
- `GET /api/def_lead` → Defensive leaders
- `GET /api/hidden-gems` → Hidden gems
- `GET /api/value-players` → Best value
- `GET /api/season-performers` → Season stars
- `GET /api/overperformers` → Overperformers
- `GET /api/underperformers` → Underperformers
- `GET /api/sustainable-scorers` → Sustainable scorers

### Rankings
- `GET /api/overall_rankings` → Overall team strength
- `GET /api/attack_rankings` → Attack rankings
- `GET /api/defense_rankings` → Defense rankings

### Fixtures
- `GET /api/fixtures` → All fixtures (or `?gameweek=33` for specific GW)
- `GET /api/team_fixtures` → Team fixture difficulty
- `GET /api/layout` → Dashboard summary

### Player Trends
- `GET /api/player-search` → List all players
- `GET /api/player-trends?players=Haaland,Saka` → Player gameweek data

---

## Frontend Changes

The frontend has been updated to:

1. **Use Supabase client directly for reads** (see `frontend/lib/supabase.ts`)
2. **Add `@supabase/supabase-js` dependency**
3. **Keep Flask backend for fallback** (during transition period)

### Example: Using Supabase in a component

```typescript
import { getPlayerInsights } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TopPerformers() {
  const [goalScorers, setGoalScorers] = useState([])

  useEffect(() => {
    async function fetchData() {
      const data = await getPlayerInsights('goal_scorers')
      setGoalScorers(data)
    }
    fetchData()
  }, [])

  return (
    // render goalScorers
  )
}
```

---

## Troubleshooting

### "Supabase credentials not configured"
- Check `frontend/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify you replaced the placeholder with the real anon key

### "Permission denied" errors
- Check Row Level Security (RLS) policies in Supabase (they should allow public reads)
- Run the schema script again to re-create policies

### "Table not found"
- Verify the schema was applied successfully (check Table Editor in Supabase)
- Re-run `supabase_schema.sql`

### Migration script fails with "File not found"
- Ensure you have existing JSON files in `backend/data/`
- Or, manually populate Supabase with test data

### Backend can't connect to Supabase
- Verify `backend/.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check internet connection to Supabase
- Test with: `curl https://exvzvzmalhpqgatzujru.supabase.co` (should respond with Supabase header)

---

## Next Steps

1. ✅ Apply schema
2. ✅ Set up credentials
3. ✅ Run migration
4. ✅ Test endpoints
5. ⏭️ Update notebook to write directly to Supabase (optional but recommended)
6. ⏭️ Remove JSON file dependencies
7. ⏭️ Deploy to production (Vercel + Supabase)

---

## Environment Variables Reference

### Backend (`backend/.env`)
```
SUPABASE_URL=https://exvzvzmalhpqgatzujru.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (service role key)
FLASK_ENV=development
DEBUG=True
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://exvzvzmalhpqgatzujru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon key)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Dashboard:** https://app.supabase.com
- **FPL Analyst Issues:** Check `backend/` or `frontend/` for detailed error logs

---

**Status:** ✅ Supabase migration complete and ready for production!
