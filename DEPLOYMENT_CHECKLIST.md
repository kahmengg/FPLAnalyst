# Deployment Checklist

## ✅ Frontend (Vercel) - Missing Dependencies Fixed
- Added `next-themes` and `recharts` to package.json
- Vercel will auto-install on next build

## ✅ Backend (Render) - Deployed and Live
- Service is running
- CORS configured for your Vercel URL

## ⚠️ Supabase Database - EMPTY, Needs Setup

### Step 1: Apply Database Schema
1. Go to: https://supabase.com/dashboard
2. Select your project → **SQL Editor**
3. Click **New Query**
4. Copy all contents from `supabase_schema.sql` (in project root)
5. Paste and click **Run**
   - Creates tables: `teams`, `players`, `fixtures`, `player_gameweeks`, `team_rankings`, `team_fixture_summary`, `player_insights`, `analysis_reports`
   - Enables row-level security policies

### Step 2: Populate Data (Choose ONE)

#### Option A: Sync from Live Site (Recommended)
```bash
curl -X POST https://your-render-url/api/admin/sync-daily \
  -H "Content-Type: application/json"
```
Replace `your-render-url` with your Render backend URL (e.g., `https://fplanalyst-abc123.onrender.com`)

This will:
1. Download latest FPL CSV from fpl-data.co.uk
2. Run notebook ETL
3. Insert all data into Supabase

#### Option B: Local Migration (if you have CSV/JSON files)
```bash
cd C:\Users\kahme\Documents\FPLAnalyst
C:/Users/kahme/AppData/Local/Programs/Python/Python311/python.exe backend/migrate_to_supabase.py
```

## Environment Variables Required

### Vercel (Frontend)
```
NEXT_PUBLIC_API_BASE_URL = https://your-render-url/api
NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
```

### Render (Backend)
```
SUPABASE_URL = your-supabase-url
SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_KEY = (optional, falls back to anon key)
FPL_SEASON_KEY = 2025_26
FPL_DATA_SEASON = 2025_26
```

## Testing After Setup
1. Schema applied: Query Supabase and verify table count
2. Data populated: Call `/api/health` on your Render backend
3. Frontend works: Visit your Vercel deployment and check for data

## Common Issues
- **"Module not found: recharts"** → npm packages were missing, now added
- **Empty Supabase** → Schema not applied or data not synced yet
- **No data in frontend** → Check CORS in `backend/app.py` includes your Vercel URL
