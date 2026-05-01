# Form-Based Fixture Difficulty Rankings - Implementation Guide

## Overview
Replaced static **FDR-based fixture difficulty** (which created discrete 0/25/50/75/100% buckets) with **form-based rankings** that provide:

1. **Last 5 GW Attack/Defense Ranks** — Current attacking/defensive form
2. **Last 10 GW Home/Away Strength Modifiers** — Ground advantage quantification  
3. **Dynamic Percentages** — 20-100% range based on recent performance, not static FDR scale

---

## What Changed

### 1. Backend: Enhanced Python ETL (`process_fpl_data.py`)

**File:** `backend/etl/process_fpl_data.py`

**Added Constants (Lines 33-35):**
```python
LAST_5_GWS  = 5   # rolling window for form-based attack/defense rankings
LAST_10_GWS = 10  # rolling window for home/away strength modifiers
```

**Enhanced Function:** `upsert_team_rankings()` (lines 447-625)

**Calculations Added:**

| Field | Formula | Purpose |
|-------|---------|---------|
| `attack_rank_5` | Rank 1-20 based on (goals_5gw × 0.6 + assists_5gw × 0.4) | Current attacking form |
| `defense_rank_5` | Rank 1-20 based on (cs_rate_5gw × 0.6 + 1/(gc_pg_5gw)) | Current defensive form |
| `home_strength_10` | (home_goals_10 - away_goals_10) / (total_goals_10) × 50 | Home advantage modifier (-50 to +50) |
| `away_strength_10` | -home_strength_10 | Away weakness penalty |
| Plus 8 new supporting columns | last_5_goals, last_5_assists, last_5_clean_sheets, etc. | Raw data for rankings |

**Key Feature:** Keeps everything in **single .py file** for daily automation via cron `sync_daily.py`

---

### 2. Database Schema: New Columns in `team_rankings` Table

**Location:** File created at `backend/migrations/add_form_based_rankings.sql`

**Run These SQL Commands** in Supabase SQL Editor:

```sql
-- Form-based Rankings (Last 5 GWs)
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_5_goals FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_5_assists FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_5_clean_sheets INT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_5_goals_conceded INT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS attack_rank_5 INT DEFAULT 1;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS defense_rank_5 INT DEFAULT 1;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS attack_score_5 FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS defense_score_5 FLOAT DEFAULT 0;

-- Home/Away Strength (Last 10 GWs)
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_10_home_goals FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_10_away_goals FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_10_home_clean_sheets INT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS last_10_away_clean_sheets INT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS home_strength_10 FLOAT DEFAULT 0;
ALTER TABLE team_rankings ADD COLUMN IF NOT EXISTS away_strength_10 FLOAT DEFAULT 0;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_team_rankings_attack_rank_5 ON team_rankings(attack_rank_5);
CREATE INDEX IF NOT EXISTS idx_team_rankings_defense_rank_5 ON team_rankings(defense_rank_5);
```

**Do This Now:**
1. Go to https://supabase.com → Your Project → SQL Editor
2. Copy/paste the SQL above
3. Click "Run" ✅

---

### 3. Frontend: Updated Data Layer (`lib/supabase.ts`)

**Function:** `getFixtures()` (lines 728-800)

**Key Changes:**

```typescript
// OLD: Used static FDR ratings from fixtures table
const homeAttack = safeNumber(row.home_attacking_favorability, 0)  // 2.1-7.4 scale → 0/25/50/75/100%

// NEW: Fetches form-based ranks from team_rankings table
const homeRank = rankMap.get(row.home_team_id)  // Contains attack_rank_5, defense_rank_5, home_strength_10
const homeAttackPct = Math.max(20, Math.min(100, 120 - homeRank.attack_rank_5 * 5))  // Rank 1-20 → 100-20%
const homeStrengthMod = safeNumber(homeRank.home_strength_10, 0) / 2.5  // -50:50 scale → -20:20% points
const homeAttackFinal = Math.max(20, Math.min(100, homeAttackPct + homeStrengthMod))
```

**Percentage Calculation:**
- Base: `120 - (rank_1_to_20 × 5)` = Rank 1 (best) → 100%, Rank 20 (worst) → 20%
- Modifier: Home/away bonus/penalty ±20% applied on top
- Result: Smooth 20-100% range (not discrete 0/25/50/75/100%)

**Example:**
- Man City: attack_rank_5 = 1 (best) → 100%, home_strength_10 = +30 → +12% bonus = **92% at home**
- Same team away: away_strength_10 = -30 → -12% penalty = **80% away**
- Newly promoted team: attack_rank_5 = 20 (worst) → 20%, no penalty = **20% away**

---

## How It Works (Data Flow)

### Daily Processing (Automated)
```
1. CSV (fpl-data-stats.csv) contains per-player per-GW data
   ↓
2. process_fpl_data.py:upsert_team_rankings() runs:
   - Calculates last 5 GW attack/defense form
   - Ranks teams 1-20 for attack_rank_5 / defense_rank_5
   - Calculates home/away performance modifiers (last 10 GWs)
   - Stores in team_rankings table
   ↓
3. Frontend getFixtures() queries team_rankings:
   - Selects attack_rank_5, defense_rank_5, home_strength_10, away_strength_10
   - Converts ranks to percentages
   - Applies home/away modifiers
   - Returns 20-100% ratings
   ↓
4. UI displays fixture difficulty with smooth gradient (not discrete buckets)
```

### API Response Example
**Old (Static FDR):**
```json
{
  "home_team": {
    "attacking_fixture_rating": 0,
    "defensive_fixture_rating": 50,
    "fdr": { "overall": 25 }
  }
}
```

**New (Form-Based):**
```json
{
  "home_team": {
    "attacking_fixture_rating": 85,     // Rank 2 → 110% capped to 100%, no home boost
    "defensive_fixture_rating": 75,     // Rank 6 → 90%
    "fdr": { "overall": 80 }            // Average
  },
  "away_team": {
    "attacking_fixture_rating": 68,     // Rank 7 → 75%, -7% away penalty
    "defensive_fixture_rating": 62,     // Rank 9 → 65%
    "fdr": { "overall": 65 }
  }
}
```

---

## Deployment Checklist

### ✅ Step 1: Update Database Schema
- [ ] Copy SQL from `backend/migrations/add_form_based_rankings.sql`
- [ ] Run in Supabase SQL Editor
- [ ] Verify columns exist: `SELECT last_5_goals, attack_rank_5, home_strength_10 FROM team_rankings LIMIT 1;`

### ✅ Step 2: Run ETL Pipeline
```bash
cd c:\Users\kahme\Documents\FPLAnalyst
python -m backend.etl.process_fpl_data --season 2025_26
```

This will populate all 16 new columns in team_rankings with form-based calculations.

### ✅ Step 3: Start Services
**Terminal 1:**
```bash
cd backend && python app.py
# Backend runs on http://localhost:5000
```

**Terminal 2:**
```bash
cd frontend && npm run dev
# Frontend runs on http://localhost:3000
```

### ✅ Step 4: Test Fixture Analysis Page
- Navigate to http://localhost:3000/fixture-analysis
- Verify fixture difficulty shows percentages like 45%, 82%, 61% (not 0/25/50/75/100%)
- Home teams should show higher percentages than away teams for same matchup

---

## Verification Queries

### Check Updated Rankings in Supabase:
```sql
-- See form-based rankings
SELECT 
  team_id,
  attack_rank_5,
  defense_rank_5,
  home_strength_10,
  away_strength_10,
  last_5_goals,
  last_5_assists
FROM team_rankings
WHERE season_key = '2025_26'
ORDER BY attack_rank_5;

-- Check if columns populated
SELECT COUNT(*) as total_teams FROM team_rankings WHERE last_5_goals > 0;
```

### Monitor ETL Run:
```bash
python -m backend.etl.process_fpl_data --season 2025_26 --verbose
# Will print:
#   🏆 Team rankings (including form-based rankings)...
#   42 team ranking records (with form-based & home/away strength)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FPL Analyst - Form-Based Rankings                  │
└─────────────────────────────────────────────────────────────────────┘

CSV Data (fpl-data-stats.csv)
└─→ Python ETL (process_fpl_data.py)
    └─→ upsert_team_rankings()
        ├─ Match-level aggregation (1 row per team per GW)
        ├─ Last 5 GW form calculation
        │  ├─ attack_score_5 = goals_5gw(0.6) + assists_5gw(0.4)
        │  └─ defense_score_5 = cs_rate_5gw(0.6) + 1/gc_pg_5gw(0.4)
        ├─ Last 10 GW home/away calculation
        │  ├─ home_strength_10 = (home_goals_10 - away_goals_10) / total × 50
        │  └─ away_strength_10 = -home_strength_10
        └─→ Supabase: team_rankings table
            ├─ attack_rank_5 (1-20, 1=best)
            ├─ defense_rank_5 (1-20, 1=best)
            ├─ home_strength_10 (-50 to +50)
            ├─ away_strength_10 (-50 to +50)
            └─ 8 supporting columns (goals, assists, clean sheets, etc.)

                              ↓

Frontend Data Layer (getFixtures in lib/supabase.ts)
└─→ Query Supabase: fixtures + team_rankings
    └─→ Convert ranks to percentages
        ├─ homeAttackPct = 120 - (attack_rank_5 × 5)
        ├─ Apply home_strength_10 modifier (+12% to -12%)
        └─→ Return 20-100% range (smooth gradient)

                              ↓

UI (fixture-analysis page)
└─→ Display fixture difficulty with color gradient
    ├─ 80-100%: ✅ Great attacking/defending fixture (green)
    ├─ 60-80%: 🟡 Moderate fixture (yellow)
    └─ 20-60%: ❌ Difficult fixture (red)
```

---

## Key Differences: Old vs New

| Aspect | Old (Static FDR) | New (Form-Based) |
|--------|-----------------|------------------|
| **Data Source** | FDR column in fixtures table | team_rankings table |
| **Time Window** | Full season average | Last 5 GWs (form) |
| **Home/Away Factor** | Not considered | Last 10 GWs advantage/penalty |
| **Percentage Range** | 0, 25, 50, 75, 100% (5 discrete) | 20-100% (smooth gradient) |
| **Calculation** | Linear FDR (2.1-7.4) → (1-FDR/6) × 100 | Rank-based (1-20) → (120 - rank×5) + modifier |
| **Responsiveness** | Slow (season-long lag) | Fast (updated every processing run) |
| **Example** | City always ~50% | City 92% at home, 80% away, changes weekly |

---

## Troubleshooting

### Issue: Still Seeing 0/25/50/75/100%
**Cause:** Database columns not created yet
**Fix:** Run the SQL migration in Supabase SQL Editor

### Issue: Fixture page showing 404 / Error
**Cause:** Backend not running or Supabase columns don't exist
**Fix:** 
1. Check backend running: `http://localhost:5000/api/health`
2. Verify schema columns exist in Supabase
3. Restart frontend dev server: `npm run dev`

### Issue: Rankings all showing same percentage
**Cause:** ETL hasn't run yet or new columns null
**Fix:** Run `python -m backend.etl.process_fpl_data --season 2025_26`

### Issue: Home teams not showing advantage
**Cause:** home_strength_10 not calculated
**Fix:** Ensure ETL ran successfully, check Supabase for non-zero values

---

## Next Steps

1. **Apply Schema** ✅ Run SQL migration
2. **Run ETL** ✅ `python -m backend.etl.process_fpl_data --season 2025_26`
3. **Test UI** ✅ Load fixture-analysis page
4. **Set Up Cron** ✅ Schedule daily ETL via `sync_daily.py`

All code is in **one .py file** (`process_fpl_data.py`) for easy automation! 🚀
