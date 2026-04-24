# Frontend-to-Backend Integration Audit

## ❌ CRITICAL ISSUES FOUND

### 1. Missing Backend Endpoints
- **Frontend calls**: `/api/fixtures_opportunity` 
- **Status**: ❌ DOES NOT EXIST IN BACKEND
- **File**: `frontend/app/fixture-analysis/page.tsx` line 534
- **Impact**: Fixture opportunity data will fail to load
- **Fix**: Either create endpoint or remove from frontend

### 2. Wrong Default API Base URL
- **File**: `frontend/app/player-trends/page.tsx` line 10
- **Current**: `https://fplanalyst.onrender.com`
- **Should be**: `process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"`
- **Impact**: Player trends page will call wrong URL when env var not set

### 3. CORS Allowlist Issue
- **File**: `backend/app.py` line 13
- **Current**: Only allows `https://fpelly.vercel.app` and `http://localhost:3000`
- **Issue**: If Vercel deployment is at different URL, will be blocked by CORS
- **Fix**: Verify Vercel URL matches or update CORS

### 4. Admin Routes Called but May Fail Without Auth
- **File**: `frontend/app/admin/page.tsx` line 30
- **Issue**: `NEXT_PUBLIC_ADMIN_PASSWORD` is exposed in frontend (security risk)
- **Impact**: Admin endpoints might not be properly secured

## ✅ WORKING ROUTES

### Player Insights (Top Performers)
- `/assist-gems` → assist_providers ✅
- `/def_lead` → defensive_leaders ✅
- `/goal_scorer-picks` → goal_scorers ✅
- `/hidden-gems` → hidden_gems ✅
- `/overperformers` ✅
- `/season-performers` ✅
- `/sustainable-scorers` ✅
- `/underperformers` ✅
- `/value-players` ✅

### Rankings
- `/attack_rankings` ✅
- `/defense_rankings` ✅
- `/overall_rankings` ✅

### Quick Picks
- `/top-attacking_qp` ✅
- `/top-defensive_qp` ✅

### Fixtures
- `/fixtures` ✅
- `/team_fixtures` ✅

### Dashboard
- `/layout` ✅
- `/health` ✅

### Player Trends
- `/player-search` ✅
- `/player-trends` ✅

## DATA VALIDATION

### Supabase Tables Populated ✅
- teams (from rankings)
- players (from top_performers)
- fixtures (from fixture_analysis)
- player_gameweeks (from CSV)
- player_insights (from all insight types)
- team_rankings ✅
- team_fixture_summary ✅

### Missing/Problematic Queries
- `quick_picks.py` queries for `attacking_picks` and `defensive_picks` insight types
  - ⚠️ These may not exist in player_insights table
  - Expected types: goal_scorers, assist_providers, defensive_leaders, value_players, hidden_gems, season_performers, overperformers, underperformers, sustainable_scorers

## RECOMMENDATIONS

1. ✅ Remove `/api/fixtures_opportunity` call or create endpoint
2. ✅ Fix player-trends API URL default  
3. ✅ Update CORS origins to actual Vercel URL
4. ⚠️ Move admin password to backend env vars (never expose in frontend)
5. ⚠️ Create `attacking_picks` and `defensive_picks` insight types in DB or update quick_picks routes
