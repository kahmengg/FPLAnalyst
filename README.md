# ⚽ FPL Analyst - Fantasy Premier League Analytics Platform

A comprehensive Fantasy Premier League analytics platform featuring a Python Flask backend and Next.js frontend. The system processes FPL CSV data through Jupyter notebooks and serves insights via REST API to a modern web dashboard.

## 🏗️ Architecture Overview

```
FPLAnalyst/
├── 📊 fpl.ipynb                      # Main analysis notebook
├── 📊 fpl_analysis_v2.ipynb          # Advanced analysis notebook
├── 📋 fpl-data-stats.csv             # Raw FPL data (project root)
├── 🎯 fixture_template.csv           # Fixture data (project root)
├── 📂 backend/                       # Flask API server
│   ├── app.py                        # Main Flask application
│   ├── requirements.txt              # Python dependencies
│   ├── config/
│   │   └── config.py                 # Path configuration (DATA_DIR, PROJECT_ROOT)
│   ├── routes/                       # Blueprint modules
│   │   ├── top_performers.py         # Top performers endpoints
│   │   ├── fixtures.py               # Fixture analysis endpoints
│   │   ├── rankings.py               # Team rankings endpoints
│   │   ├── quick_picks.py            # Quick picks endpoints
│   │   ├── player_trends.py          # Player trends endpoints
│   │   ├── admin.py                  # Admin/upload endpoints
│   │   └── health.py                 # Health check endpoint
│   ├── utils/
│   │   └── data_loader.py            # Central JSON loader (always use this!)
│   └── data/                         # Processed JSON files
│       ├── top_performers/
│       ├── rankings/
│       ├── fixture_analysis/
│       ├── performance_analysis/
│       ├── player_trends/
│       └── quick_picks/
└── 📱 frontend/                      # Next.js 15 web application
    ├── app/                          # App Router pages
    │   ├── layout.tsx                # Root layout
    │   ├── page.tsx                  # Home page
    │   ├── top-performers/           # Top performers page
    │   ├── team-rankings/            # Team rankings page
    │   ├── fixture-analysis/         # Fixture analysis page
    │   ├── player-trends/            # Player trends page
    │   ├── quick-picks/              # Quick picks page
    │   ├── transfer-targets/         # Transfer targets page
    │   └── admin/                    # Admin upload page
    ├── components/                   # Reusable UI components
    │   ├── sidebar.tsx               # Navigation sidebar
    │   ├── theme-provider.tsx        # Dark/light theme support
    │   ├── theme-toggle.tsx          # Theme switcher
    │   └── ui/                       # shadcn/ui components
    ├── hooks/                        # Custom React hooks
    ├── lib/                          # Utility functions
    └── public/                       # Static assets
```

## � Data Flow

1. **Data Source**: Raw FPL data in `fpl-data-stats.csv` and `fixture_template.csv` (at project root)
2. **Processing**: Jupyter notebooks (`fpl.ipynb`, `fpl_analysis_v2.ipynb`) analyze data
3. **Export**: Notebooks export processed data as JSON files to `backend/data/` subdirectories
4. **API**: Flask backend serves JSON files via RESTful endpoints
5. **Frontend**: Next.js fetches from API and renders with client-side components

## 🔧 Setup Instructions

### Prerequisites
- **Python 3.8+**
- **Node.js 18+** and npm
- **Git** (optional)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

### 3. Generate Initial Data
1. Open `fpl_analysis_v2.ipynb` or `fpl.ipynb` in VS Code
2. Run all cells sequentially
3. Export cells write JSON files to `backend/data/`
4. Verify JSON files are created in appropriate subdirectories

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
python app.py
```
**Backend API**: `http://localhost:5000`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
**Frontend UI**: `http://localhost:3000`

### Production Build
```bash
# Frontend production build
cd frontend
npm run build
npm start
```

## 📡 API Endpoints

### Core Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/health` | Health check and data status | N/A |
| `GET /api/top-performers` | All top performer insights | `top_performers/all_insights.json` |
| `GET /api/goal-scorer-picks` | Top goal scorers | `top_performers/goal_scorers.json` |
| `GET /api/assist-gems` | Top assist providers | `top_performers/assist_providers.json` |
| `GET /api/defensive-leaders` | Top defensive players | `top_performers/defensive_leaders.json` |
| `GET /api/hidden-gems` | Low ownership high value players | `top_performers/hidden_gems.json` |
| `GET /api/value-players` | Best value for money | `top_performers/value_players.json` |
| `GET /api/season-performers` | Season leaders | `top_performers/season_performers.json` |

### Rankings Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/attack-rankings` | Team attack strength rankings | `rankings/attack_rankings.json` |
| `GET /api/defense-rankings` | Team defense strength rankings | `rankings/defense_rankings.json` |
| `GET /api/overall-rankings` | Overall team rankings | `rankings/overall_rankings.json` |

### Fixture Analysis Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/fixtures` | Detailed fixture analysis | `fixture_analysis/fixtures.json` |
| `GET /api/team-fixture-summary` | Team fixture summaries | `fixture_analysis/team_fixture_summary.json` |

### Player Trends Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/player-trends` | Player data with trends | `player_trends/player_data.json` |
| `GET /api/all-players` | All player statistics | `player_trends/all_players.json` |

### Quick Picks Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/attacking-picks` | Recommended attacking picks | `quick_picks/attackingpicks.json` |
| `GET /api/defensive-picks` | Recommended defensive picks | `quick_picks/defensivepicks.json` |

### Performance Analysis Endpoints

| Endpoint | Description | Data File |
|----------|-------------|-----------|
| `GET /api/overperformers` | Players overperforming xG/xA | `performance_analysis/overperformers.json` |
| `GET /api/underperformers` | Players underperforming xG/xA | `performance_analysis/underperformers.json` |
| `GET /api/sustainable-scorers` | Players with sustainable stats | `performance_analysis/sustainable_scorers.json` |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/upload` | POST | Upload new CSV data and trigger reprocessing |

## 🎯 Features

### 📊 Data Processing (Jupyter Notebooks)
- **Season Performance Analysis** - Cumulative player statistics across all gameweeks
- **Team Strength Rankings** - Attack and defense rankings based on xG, goals, shots, and clean sheets
- **Fixture Difficulty Calculator** - Rank-based system for analyzing upcoming matches
- **Hidden Gems Detection** - Undervalued players with strong underlying metrics
- **Expected Stats Analysis** - xG, xA, xCS for sustainability insights
- **Form Calculation** - Last 5 gameweeks performance scores
- **Value Metrics** - Points per million calculations

### 🌐 Web Dashboard (Frontend Features)
- **Top Performers** - Goal leaders, assist providers, defensive leaders, season stars
- **Team Rankings** - Attack/defense/overall strength with visual rankings
- **Fixture Analysis** - Gameweek-by-gameweek difficulty with favorability scores
- **Player Trends** - Form tracking and performance trends
- **Quick Picks** - Position-based recommendations (attacking/defensive)
- **Transfer Targets** - Transfer recommendations with fixture considerations
- **Performance Analysis** - Overperformers, underperformers, sustainable scorers
- **Dark/Light Theme** - User-preferred theme support
- **Responsive Design** - Mobile-friendly layout

### 🎨 UI Components
- **PositionBadge** - Displays player positions (GK, DEF, MID, FWD) with color coding
- **TeamBadge** - 3-letter team codes with brand-specific colors
- **FormBadge** - Color-coded form scores (≥7 green, 5-7 amber, <5 red)
- **Interactive Tables** - Sortable player and team statistics
- **Tab Navigation** - Easy switching between different analyses
- **Loading States** - Graceful loading indicators
- **Error Handling** - User-friendly error messages

## 🔄 Development Workflow

1. **Update Data** - Replace `fpl-data-stats.csv` and `fixture_template.csv` with latest FPL data
2. **Run Analysis** - Open notebook (`fpl_analysis_v2.ipynb`) in VS Code and run all cells
3. **Export Data** - Notebook cells automatically write JSON files to `backend/data/`
4. **Serve API** - Backend automatically serves updated data (no restart needed)
5. **View Insights** - Frontend fetches updated data and displays new insights

### Adding New Features

#### 1. Add New API Endpoint
```python
# In backend/routes/your_route.py
from flask import Blueprint, jsonify
from utils.data_loader import load_json_data

your_blueprint = Blueprint('your_route', __name__)

@your_blueprint.route('/api/your-endpoint')
def your_endpoint():
    data = load_json_data('your_category/your_file.json')
    return jsonify(data)
```

#### 2. Register Blueprint
```python
# In backend/app.py
from routes.your_route import your_blueprint

app.register_blueprint(your_blueprint)
```

#### 3. Create Frontend Page
```typescript
// In frontend/app/your-route/page.tsx
'use client'

export default function YourPage() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/your-endpoint`)
      .then(res => res.json())
      .then(setData)
  }, [])
  
  return <div>{/* Your component */}</div>
}
```

### Data Schema Standards

All player JSON files should follow this structure:
```json
{
  "player": "Mohamed Salah",
  "team": "Liverpool",
  "team_short": "LIV",
  "points": 150,
  "price": 13.0,
  "ownership": 45.5,
  "form": 8.2,
  "position": "MID"
}
```

### Route Naming Convention
Backend routes use **hyphenated URLs** that map to **snake_case filenames**:
- Route: `/api/goal-scorer-picks` → File: `top_performers/goal_scorers.json`
- Route: `/api/assist-gems` → File: `top_performers/assist_providers.json`

## 🛠️ Technology Stack

### Backend
- **Flask** - Lightweight Python web framework
- **Python 3.8+** - Core programming language
- **pandas** - Data manipulation and analysis
- **numpy** - Numerical computing
- **Jupyter** - Interactive notebook environment

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **Radix UI** - Unstyled, accessible components

### API & Integration
- **RESTful API** - Standard HTTP endpoints
- **JSON** - Data exchange format
- **CORS** - Cross-origin resource sharing
- **Fetch API** - Frontend HTTP client with retry logic

## 🔒 CORS Configuration

The backend is configured to accept requests from:
- **Production**: `https://fpelly.vercel.app`
- **Local Development**: `http://localhost:3000`

To add additional origins, update the CORS configuration in `backend/app.py`.

## 📊 Data Requirements

### Expected CSV Format (`fpl-data-stats.csv`)
- **Structure**: Gameweek-by-gameweek player records
- **Key Columns**: 
  - `web_name` (Player name)
  - `team_name` (Team name)
  - `element_type` (Position: 1=GK, 2=DEF, 3=MID, 4=FWD)
  - `gameweek` (Gameweek number)
  - `total_points`, `minutes`, `now_cost`, `selected_by_percent`
  - `G`, `A`, `xG`, `xA` (Goals, Assists, Expected Goals, Expected Assists)
  - `CS`, `xCS`, `GC`, `xGC` (Clean Sheets, Goals Conceded)
  - `shots`, `SoT`, `key_passes`

### Fixture Data (`fixture_template.csv`)
- **home_team**: Home team name
- **away_team**: Away team name
- **gameweek**: Gameweek number
- Additional fixture metadata

## 🧮 Analysis Methodology

### Team Strength Calculation
```python
# Attack Strength Formula
attack_strength = (xG_per_game * 0.4) + (goals_per_game * 0.3) + (shots_per_game * 0.3)

# Defense Strength Formula  
defense_strength = (clean_sheet_rate * 0.4) + (1/(goals_conceded_per_game + 0.1) * 0.6)
```

### Fixture Difficulty Logic
```python
# For Attacking Players
rank_difference = away_defense_rank - home_attack_rank
favorability_score = rank_difference / total_teams * 10

# Example: Arsenal ATT#1 vs Brighton DEF#12
# favorability_score = (12 - 1) / 20 * 10 = +5.5 (Strong Pick)
```

### Form Score
Calculated from the last 5 gameweeks:
- **≥7.0**: Excellent form (Green)
- **5.0-6.9**: Good form (Amber)
- **<5.0**: Poor form (Red)

## 🚢 Deployment

### Backend Deployment
```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd frontend
vercel
```

### Environment Variables

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com
```

**Backend** (`.env` or system environment):
```env
FLASK_ENV=production
FLASK_APP=app.py
PORT=5000
```

## 🧪 Testing & Validation

### Backend Testing
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test specific endpoint
curl http://localhost:5000/api/top-performers

# Test with browser
# Visit: http://localhost:5000/api/[endpoint-name]
```

### Frontend Testing
```bash
# Run development server
npm run dev

# Check browser console for:
# - API errors
# - Retry attempts
# - Data loading issues

# Test responsive design
# - Use browser DevTools device emulation
```

### Data Validation
- Use `/api/health` to check data file availability
- Verify JSON structure matches expected schema
- Check browser console for hydration warnings
- Test error handling by temporarily removing data files

## ⚠️ Common Issues & Solutions

### Issue: API Returns 404 for JSON Files
**Solution**: Run notebook analysis to generate JSON files in `backend/data/`

### Issue: CORS Errors in Browser Console
**Solution**: Verify `NEXT_PUBLIC_API_BASE_URL` matches backend URL and CORS config in `app.py`

### Issue: Frontend Shows "Loading..." Indefinitely
**Solution**: Check backend is running, verify API endpoint spelling, check browser console for errors

### Issue: Position or Team Badges Not Displaying
**Solution**: Ensure `team_short` field exists in JSON data, verify badge component imports

### Issue: CSV Files Not Found
**Solution**: CSV files must be at **project root**, not in `backend/` directory

### Issue: Hydration Errors in Next.js
**Solution**: Add `suppressHydrationWarning` to `<html>` tag in root layout

## 📝 Best Practices

### Backend
1. **Always use `utils/data_loader.py`** for JSON loading - never use raw `open()` or `json.load()`
2. **Reference `Config.DATA_DIR` and `Config.PROJECT_ROOT`** instead of hardcoding paths
3. **Return error JSON** (`{"error": "message"}`) instead of throwing exceptions
4. **Log errors** for debugging while providing user-friendly error messages

### Frontend
1. **Implement `fetchWithRetry`** for all API calls (3 retries, 1s delay)
2. **Handle missing data gracefully** - show fallback UI or error messages
3. **Use environment variables** for API URLs - never hardcode
4. **Normalize position names** - handle both full names and abbreviations
5. **Test dark/light themes** - ensure readability in both modes

### Data Processing
1. **Validate CSV data** before processing in notebooks
2. **Handle missing values** appropriately in calculations
3. **Document formulas** for team strength and fixture difficulty
4. **Version control exclusions** - never commit generated JSON files
5. **Regular data updates** - update CSV files weekly during FPL season

## 🗂️ File Organization

### What to Commit
- ✅ Source code (`.py`, `.tsx`, `.ts`, `.ipynb`)
- ✅ Configuration files (`package.json`, `requirements.txt`, `config.py`)
- ✅ Documentation (`README.md`, `copilot-instructions.md`)
- ✅ UI components and styles

### What NOT to Commit
- ❌ Generated JSON files (`backend/data/*/*.json`)
- ❌ CSV data files (too large, update frequently)
- ❌ Node modules (`frontend/node_modules/`)
- ❌ Python cache (`__pycache__/`, `*.pyc`)
- ❌ Environment files (`.env`, `.env.local`)
- ❌ Build outputs (`frontend/.next/`, `frontend/out/`)

## 🔐 Security Considerations

- **No API Keys Required** - System uses public FPL data
- **No Authentication** - Dashboard is publicly accessible
- **CORS Restrictions** - Only specified origins can access API
- **Input Validation** - Admin upload endpoint should validate CSV format
- **Rate Limiting** - Consider adding rate limiting for production deployment

## 🎓 Learning Resources

### Flask
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask Blueprints](https://flask.palletsprojects.com/en/latest/blueprints/)

### Next.js
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### FPL Data
- [Fantasy Premier League Official](https://fantasy.premierleague.com/)
- [FPL API Documentation](https://fantasy.premierleague.com/api/bootstrap-static/)

### Data Analysis
- [pandas Documentation](https://pandas.pydata.org/docs/)
- [Expected Goals (xG) Explained](https://theanalyst.com/eu/2021/07/what-are-expected-goals-xg/)

---

## 📄 License & Disclaimer

### Usage Rights
- ✅ Personal use for FPL strategy and analysis
- ✅ Educational purposes and learning
- ✅ Modification and enhancement for personal projects
- ❌ Commercial redistribution of analysis outputs
- ❌ Selling insights or recommendations based on this tool

### Data Disclaimer
- **Accuracy**: Analysis quality depends on input data accuracy
- **Responsibility**: Users responsible for verifying data and making FPL decisions
- **Performance**: Past performance does not guarantee future results
- **Independence**: Not affiliated with or endorsed by Fantasy Premier League

### Technical Disclaimer
- **Dependencies**: Requires specific package versions for compatibility
- **Compatibility**: Tested on Windows/macOS with Python 3.8+ and Node.js 18+
- **Updates**: May require updates for new FPL seasons or data format changes
- **Support**: Community-driven support - no warranty or guarantee provided

---

## 👥 Contributing

Contributions are welcome! To contribute:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Test thoroughly** - ensure both backend and frontend work
5. **Commit with clear messages**: `git commit -m "Add: description"`
6. **Push to your fork**: `git push origin feature/your-feature`
7. **Submit a pull request**

### Contribution Guidelines
- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test API endpoints before submitting
- Ensure responsive design for frontend changes

---

## 📞 Support & Community

### Getting Help
- **Documentation**: Read this README and copilot instructions thoroughly
- **Issues**: Check existing issues or create a new one on GitHub
- **Code Comments**: Review inline documentation in source files

### Version Information
- **Current Version**: 2.0.0
- **Last Updated**: January 2026
- **Python Compatibility**: 3.8+
- **Node.js Compatibility**: 18+
- **Next.js Version**: 15

---

## 🎉 Acknowledgments

- **Fantasy Premier League** - Official data source
- **Next.js Team** - Excellent React framework
- **Flask Community** - Lightweight and powerful backend framework
- **shadcn/ui** - Beautiful, accessible component library
- **FPL Community** - Inspiration and ideas from fellow managers

---

**⚽ Happy FPL Analysis!**

*Transform your Fantasy Premier League strategy with data-driven insights. Make informed decisions that could be the difference between a green arrow and a red one!*