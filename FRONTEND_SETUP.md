# Frontend Supabase & Environment Setup Guide

## Problem Diagnosis

### The Issue: "Failed to Fetch or Load"

**Root Cause:** Frontend environment variables not properly configured in Vercel deployment.

**Current State:**
- Frontend works via backend API (✅ correct architecture)
- Frontend has Supabase client setup (not currently used)
- Environment variable `NEXT_PUBLIC_API_BASE_URL` may not be set in Vercel

## Frontend Data Flow (Correct)

```
Frontend Page
    ↓
fetch(`${NEXT_PUBLIC_API_BASE_URL}/api/goal_scorer-picks`)
    ↓
Vercel (Next.js)
    ↓
Render Backend (Flask)
    ↓
Supabase Database
```

**This is the correct architecture!** No direct Supabase queries from frontend needed.

## Environment Configuration

### Local Development (.env.local)

File: `frontend/.env.local`

```env
# Backend API Base URL (local development)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

# Supabase (optional, not currently used by frontend)
NEXT_PUBLIC_SUPABASE_URL=https://exvzvzmalhpqgatzujru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**To test locally:**
```bash
cd frontend
npm run dev
# Should connect to http://localhost:5000
```

### Production (Vercel)

**Current Missing Setup:**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add the following:

```
Name: NEXT_PUBLIC_API_BASE_URL
Value: https://fplanalyst.onrender.com
Production: ✓
Preview: ✓
Development: ✓
```

**Optional (Supabase direct queries, not needed but good for future):**

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://exvzvzmalhpqgatzujru.supabase.co
Production: ✓

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Production: ✓
```

### Backend (Render)

**Environment Variables Required:**

```
SUPABASE_URL=https://exvzvzmalhpqgatzujru.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service role, full access)
FPL_SEASON_KEY=2025_26
```

**Note:** Backend MUST use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for full database access.

## Verification Steps

### Step 1: Check Frontend Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Look for `NEXT_PUBLIC_API_BASE_URL`
3. Value should be: `https://fplanalyst.onrender.com`

### Step 2: Test Backend API

Open browser console and run:
```javascript
fetch('https://fplanalyst.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected response:
```json
{
  "status": "healthy",
  "tables": {
    "players": 600,
    "teams": 20,
    "fixtures": 50,
    "player_gameweeks": 18500
  }
}
```

### Step 3: Test Data Endpoint

```javascript
fetch('https://fplanalyst.onrender.com/api/goal_scorer-picks')
  .then(r => r.json())
  .then(d => console.log(d.slice(0, 1)))
```

Expected: Array of player objects with goals, assists, points, etc.

### Step 4: Verify Frontend Page

Visit: `https://yourfpelly.vercel.app/top-performers`

Check browser console (F12):
- Should see fetch requests to `https://fplanalyst.onrender.com/api/*`
- No errors about "Supabase credentials"
- Data should load and display

## Troubleshooting

### Issue 1: "Failed to fetch" Error

**Symptoms:**
- Frontend page shows loading spinner indefinitely
- Console shows: `fetch: Failed to fetch` or CORS error

**Solutions:**

a) **Check Vercel env vars:**
```bash
# In Vercel dashboard
Settings → Environment Variables → Filter by NEXT_PUBLIC_API_BASE_URL
```

b) **Check CORS in backend:**
```bash
# Visit https://fplanalyst.onrender.com/api/health
# Should work without CORS errors
# Backend app.py should have:
CORS(app, resources={"/api/*": {"origins": "*"}})
```

c) **Check backend is running:**
```bash
curl -v https://fplanalyst.onrender.com/api/health
# Should return 200 OK
```

d) **Verify API_BASE_URL fallback in page:**
```typescript
// In frontend/app/*/page.tsx (line 11 of top-performers/page.tsx)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://fplanalyst.onrender.com"
// This fallback should work even if env var not set
```

### Issue 2: Supabase Credential Warning (Safe to Ignore)

**Message:**
```
Supabase credentials are not configured. Check your .env.local file.
```

**Why it appears:**
- Frontend has Supabase client setup in `frontend/lib/supabase.ts`
- It's not being used (all queries go through backend)
- Safe to ignore or remove

**If you want to fix it:**
Add to `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://exvzvzmalhpqgatzujru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Issue 3: Backend Render URL Changed

If backend is deployed elsewhere:

1. Update Vercel env var: `NEXT_PUBLIC_API_BASE_URL=<new-url>`
2. Redeploy Vercel: `git push` (auto-redeploys)
3. Clear cache: Vercel Dashboard → Deployments → Redeploy

### Issue 4: Slow Data Loading

**Symptoms:**
- Pages take 10+ seconds to load data
- But data eventually appears

**Causes:**
- Render backend on free tier (sleeps after 15 min inactivity)
- First request wakes it up (cold start ~5 sec)

**Solutions:**
- Upgrade Render to paid tier (always on)
- Or: Set up a cron job to ping `/api/health` every 10 minutes

### Issue 5: No Data Displayed (Empty Tables)

**Symptoms:**
- Pages load, but all tables are empty
- No console errors

**Causes:**
- Supabase data not synced
- ETL pipeline hasn't run recently

**Solutions:**

a) **Run ETL manually:**
```bash
cd backend
python -m etl.process_fpl_data --season 2025_26
```

b) **Check Supabase tables directly:**
```bash
# Via Supabase dashboard
Table: players
Should have ~600+ rows
```

c) **Check backend health endpoint:**
```bash
curl https://fplanalyst.onrender.com/api/health
# Should show non-zero counts for all tables
```

## Architecture Decision: Why Backend API + Not Direct Supabase?

### ✅ Backend API (Current, GOOD):

**Pros:**
- Secure: Backend uses service role key, frontend doesn't expose secrets
- Reliable: Backend handles retries, rate limiting, error handling
- Flexible: Can add caching, aggregations, filtering on backend
- Tested: API endpoints already working and verified

**Cons:**
- Extra hop (frontend → backend → DB)
- But negligible latency (backend and DB on same cloud)

### ❌ Direct Supabase from Frontend (NOT recommended):

**Pros:**
- One less hop
- Theoretically slightly faster

**Cons:**
- Security risk: Anon key exposed to client code
- RLS policies complex to set up correctly
- Limited to client-side filters (bad for large datasets)
- Can't do server-side computations

## Recommended: Keep Current Architecture

```
Frontend API calls → Backend (Render) → Supabase
```

This is the **correct, secure, and efficient** approach.

## Next Steps

1. **Verify Vercel env vars are set correctly** (see Step 1 above)
2. **Test backend API** (see Step 2-3 above)
3. **If still failing, check Render logs:**
   - Render Dashboard → Your Service → Logs
   - Look for errors during API calls

4. **If everything checks out:**
   - Clear browser cache: Cmd+Shift+Del (or Ctrl+Shift+Del)
   - Hard refresh Vercel site: Cmd+Shift+R (or Ctrl+Shift+R)
   - Should see data loading

## Support

**Before contacting support, collect:**
1. Browser console errors (F12 → Console tab)
2. Network tab showing failed requests (F12 → Network tab)
3. Vercel env vars screenshot
4. Render backend logs
5. Supabase dashboard screenshot of table counts

This info will help diagnose the issue quickly.
