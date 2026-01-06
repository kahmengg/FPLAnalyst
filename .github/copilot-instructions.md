# FPL Analyst - Copilot Instructions

## Project Overview
FPL Analyst is a **Fantasy Premier League analytics platform** with a Python Flask backend and Next.js (React + TypeScript) frontend. The system processes FPL CSV data through Jupyter notebooks and serves insights via REST API to a modern web dashboard.

## Architecture & Data Flow

### Critical Flow Pattern
1. **Data Source**: Raw FPL data in `fpl-data-stats.csv` and `fixture_template.csv` (at project root)
2. **Processing**: Jupyter notebooks (`fpl.ipynb`, `fpl_analysis_v2.ipynb`) analyze data and export JSON
3. **Storage**: Processed data lands in `backend/data/` subdirectories (e.g., `top_performers/`, `rankings/`)
4. **API**: Flask backend serves JSON files via RESTful endpoints
5. **Frontend**: Next.js fetches from API and renders with client-side components

### Backend Structure (`backend/`)
- **`app.py`**: Main Flask application that registers blueprint routes
- **`routes/`**: Blueprint modules (e.g., `top_performers.py`, `fixtures.py`) - each route corresponds to a data analysis category
- **`utils/data_loader.py`**: Central JSON loader with error handling - **always use this** instead of raw file reads
- **`config/config.py`**: Path configuration (DATA_DIR, PROJECT_ROOT, CSV paths) - reference these instead of hardcoding paths
- **`data/`**: JSON files organized by analysis type (do not commit generated data to git)

### Frontend Structure (`frontend/`)
- **Next.js 15** with App Router (`app/` directory structure)
- **Pages pattern**: Each route (e.g., `/top-performers`) has a `page.tsx` in `app/[route-name]/`
- **API calls**: Use `NEXT_PUBLIC_API_BASE_URL` environment variable (defaults to `http://localhost:5000`)
- **Retry logic**: Implement `fetchWithRetry` for all API calls (3 retries with 1s delay) - see `app/page.tsx` for reference implementation
- **Components**: Reusable UI in `components/` (cards, badges, tabs) using shadcn/ui and Radix UI
- **Styling**: TailwindCSS v4 with custom component variants

## Key Conventions

### Route Naming Pattern
Backend routes use **hyphenated URLs** that map to **snake_case filenames**:
- Route: `/api/goal_scorer-picks` → File: `top_performers/goal_scorers.json`
- Route: `/api/assist-gems` → File: `top_performers/assist_providers.json`

### Position & Team Badge System
Frontend uses standardized badge components (see `app/top-performers/page.tsx`):
- **`PositionBadge`**: Maps full names to abbreviations (e.g., "Goalkeeper" → "GK")
- **`TeamBadge`**: 3-letter team codes with brand-specific colors (e.g., "MCI" → sky blue)
- **`FormBadge`**: Color-coded form scores (≥7 green, 5-7 amber, <5 red)

### Data Schema Standards
All player JSON files follow this structure:
```json
{
  "player": "string",
  "team": "string",
  "team_short": "string",  // 3-letter code (ARS, MCI, etc.)
  "points": number,
  "price": number,
  "ownership": number,     // Percentage
  "form": number,          // Last 5 gameweeks score
  "position": "string"     // Full name or abbreviation
}
```

## Development Workflows

### Starting the Application
**Backend**:
```bash
cd backend
python app.py
# Runs on http://localhost:5000
```

**Frontend**:
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Regenerating Data
1. Open `fpl_analysis_v2.ipynb` or `fpl.ipynb` in VS Code
2. Run all cells sequentially
3. Export cells write JSON files to `backend/data/`
4. Backend automatically serves updated data (no restart needed)

### Adding New API Endpoints
1. Create JSON file in appropriate `backend/data/` subdirectory
2. Add route to relevant blueprint in `backend/routes/` using `load_json_data()`
3. Register blueprint in `app.py` if new module
4. Add corresponding frontend page in `frontend/app/[route-name]/page.tsx`

### CORS Configuration
CORS is configured for:
- Production: `https://fpelly.vercel.app`
- Local: `http://localhost:3000`

Update in `backend/app.py` if deploying to new domain.

## Common Pitfalls

1. **Path References**: Never hardcode paths - use `Config.DATA_DIR` and `Config.PROJECT_ROOT`
2. **CSV Location**: CSV files are at **project root**, not in `backend/`
3. **JSON Loading**: Always use `utils/data_loader.py`, not `open()` or `json.load()` directly
4. **API Resilience**: Frontend must handle missing data gracefully (backend returns `{"error": "..."}` on failures)
5. **Position Normalization**: Frontend must handle both full names and abbreviations for positions
6. **Next.js Hydration**: Use `suppressHydrationWarning` on `<html>` for theme provider compatibility

## Deployment Notes

- **Backend**: Deployed with Gunicorn/Uvicorn (see `requirements.txt`)
- **Frontend**: Vercel deployment (see `frontend/package.json` scripts)
- **Data Updates**: Use `/api/admin/upload` endpoint to upload new CSV data and trigger reprocessing
- **Environment Variables**: Set `NEXT_PUBLIC_API_BASE_URL` for production API URL

## Testing Strategy

- Backend: Test endpoints with `curl` or browser at `http://localhost:5000/api/[endpoint]`
- Health check: `http://localhost:5000/api/health` shows data status
- Frontend: Check browser console for API errors and retry attempts
- Data validation: Use admin routes to verify JSON integrity after notebook runs
