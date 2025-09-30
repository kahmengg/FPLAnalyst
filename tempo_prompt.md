# 🌐 Tempo.new Prompt for FPL Fixture Analysis Website

## PROMPT FOR TEMPO.NEW:

Create a modern, responsive Fantasy Premier League (FPL) Fixture Analysis Dashboard with the following specifications:

### 🎨 Design Requirements:
- **Theme**: Dark modern design with Premier League colors (purple #37003c, green #00ff85, white)
- **Layout**: Single-page application with multiple sections
- **Responsive**: Mobile-first design that works on all devices
- **Typography**: Clean, modern fonts (Inter or similar)
- **Icons**: Use football/soccer related icons throughout

### 📱 Main Sections:

#### 1. Header & Navigation
- **Title**: "FPL Fixture Analyzer Pro" with football icon
- **Subtitle**: "Advanced fixture difficulty analysis for Fantasy Premier League"
- **Navigation tabs**: Overview | Gameweek Analysis | Team Comparison | Heatmap | Transfers
- **Live GW indicator**: Show current gameweek with countdown timer

#### 2. Overview Dashboard
- **Key Metrics Cards** (4 cards in a row):
  - Current Gameweek with fixtures count
  - Best Attack Fixtures (top 3 teams)
  - Best Defense Fixtures (top 3 teams)  
  - Transfer Recommendations count
- **Quick Fixture List**: Next 10 fixtures with difficulty ratings (colored bars: green=easy, amber=medium, red=hard)

#### 3. Gameweek Analysis Section
- **Gameweek Selector**: Dropdown to choose any gameweek (7-38)
- **Fixture Cards**: Each fixture displayed as a card with:
  - Team logos/colors
  - Match prediction percentages (home win, draw, away win)
  - Expected goals for both teams
  - Attack/Defense ratings as progress bars
  - Venue and kickoff time
  - Match importance badge

#### 4. Team Comparison Tool
- **Team Selector**: Two dropdowns to compare any two teams
- **Head-to-Head Stats**:
  - Attack vs Defense radar chart
  - Form comparison graph
  - Fixture difficulty comparison (next 5 games)
  - Historical performance metrics
- **Transfer Recommendation**: Buy/Sell/Hold indicators

#### 5. Season Heatmap
- **Interactive Heatmap**: 
  - Y-axis: All 20 Premier League teams
  - X-axis: Gameweeks (7-38)
  - Color coding: Green (easy) to Red (difficult)
  - Hover effects showing exact difficulty scores
- **Filter Options**: Attack Difficulty | Defense Difficulty | Overall
- **Team Search**: Quick search to highlight specific team's row

#### 6. Transfer Planner
- **Position Tabs**: All | Forwards | Midfielders | Defenders | Goalkeepers
- **Best Fixtures Table**: 
  - Team name with logo
  - Next 4 fixtures with opponent names
  - Average difficulty score
  - Form indicator
  - Price trend arrows
- **Avoid List**: Teams with worst upcoming fixtures

### 🎯 Interactive Features:

#### Data Visualization:
- **Charts**: Use Chart.js or similar for radar charts, line graphs, bar charts
- **Color Coding**: Consistent green/amber/red system for difficulty
- **Tooltips**: Hover effects showing detailed information
- **Animations**: Smooth transitions between sections

#### User Experience:
- **Search Functionality**: Quick team/player search
- **Filters**: Multiple filter options for customized views
- **Export Options**: Download analysis as PDF or image
- **Bookmarks**: Save favorite team combinations

#### Real-time Elements:
- **Live Scores**: Show live match scores if available
- **Update Timestamp**: Show when data was last updated
- **Notification Banner**: Alert for important fixture changes

### 💾 Sample Data Structure:

```javascript
// Fixture Data Example
const fixtures = [
  {
    gameweek: 7,
    homeTeam: "Arsenal",
    awayTeam: "Brighton", 
    date: "2025-10-05",
    kickoff: "15:00",
    venue: "Emirates Stadium",
    homeDifficulty: { attack: 75, defense: 80, overall: 77.5 },
    awayDifficulty: { attack: 45, defense: 40, overall: 42.5 },
    predictions: { homeWin: 65, draw: 20, awayWin: 15 },
    expectedGoals: { home: 2.1, away: 1.2 }
  }
];

// Team Stats Example  
const teamStats = {
  "Arsenal": {
    attackScore: 85.2,
    defenseScore: 78.5,
    form: 8.5,
    fixtureRun: [
      { opponent: "Brighton", venue: "H", difficulty: 75 },
      { opponent: "Liverpool", venue: "A", difficulty: 25 }
    ]
  }
};
```

### 🎨 Color Scheme:
- **Primary Purple**: #37003c (headers, buttons)
- **Accent Green**: #00ff85 (easy fixtures, positive indicators)
- **Warning Amber**: #ffb000 (medium fixtures)
- **Danger Red**: #ff4757 (difficult fixtures)
- **Background Dark**: #1a1a1a (main background)
- **Card Dark**: #2d2d2d (card backgrounds)
- **Text Light**: #ffffff (primary text)
- **Text Muted**: #a0a0a0 (secondary text)

### 📊 Charts & Graphs:
1. **Radar Chart**: Team attack/defense comparison
2. **Line Chart**: Form over time
3. **Bar Chart**: Fixture difficulty comparison
4. **Heatmap**: Season-long fixture matrix
5. **Donut Chart**: Win/draw/loss predictions

### 🔧 Technical Requirements:
- **Framework**: React/Vue.js or vanilla JavaScript
- **Styling**: Tailwind CSS or modern CSS Grid/Flexbox
- **Charts**: Chart.js, D3.js, or Recharts
- **Icons**: Heroicons, Feather Icons, or Football Icons
- **Responsive**: Mobile-first, works from 320px to 1920px
- **Performance**: Fast loading, smooth animations
- **Accessibility**: WCAG compliant, keyboard navigation

### 📱 Mobile Optimizations:
- **Collapsible Sections**: Accordion-style for small screens
- **Swipe Navigation**: Horizontal swipe between tabs
- **Touch-Friendly**: Large buttons and touch targets
- **Simplified Charts**: Mobile-optimized chart versions

### 🚀 Advanced Features (if possible):
- **Dark/Light Mode Toggle**
- **Team Following**: Save favorite teams
- **Comparison Mode**: Side-by-side team analysis
- **Export Data**: CSV/PDF download options
- **Share Analysis**: Social media sharing buttons
- **Predictions Archive**: Historical prediction accuracy

### 🎯 Call-to-Action:
Create a professional, data-driven web application that FPL managers would actually use to make transfer decisions. Focus on clean design, intuitive navigation, and clear data visualization. The website should feel like a premium FPL tool that provides genuine value for fantasy football players.

**Key Success Metrics**: 
- Easy to understand fixture difficulty at a glance
- Quick comparison between teams and gameweeks
- Mobile-friendly for on-the-go FPL management
- Professional appearance suitable for FPL communities

---

### 📋 Additional Instructions for Tempo.new:

1. **Start with the Overview Dashboard** - make it the landing page
2. **Use placeholder data** that matches the sample structure above
3. **Focus on visual hierarchy** - most important info should be prominent
4. **Add loading states** for a polished feel
5. **Include error handling** for missing data
6. **Make it feel like a real product** - add polish and attention to detail

**Priority**: Make the heatmap and gameweek analysis sections especially impressive as these are the core features that differentiate this tool from basic fixture lists.