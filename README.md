# 📊 Fantasy Premier League (FPL) - Complete Data Analysis & Strategy Tools

## 🎯 **Project Overview**

This comprehensive FPL analysis system provides data-driven insights for Fantasy Premier League decision-making. The project transforms raw gameweek data into actionable strategic intelligence through advanced statistical analysis, team strength rankings, and fixture difficulty assessments.

### **Key Features**
- ✅ **Season Performance Analysis** - Cumulative player statistics across all gameweeks
- ✅ **Team Strength Rankings** - Attack and defense rankings based on xG, goals, shots, and clean sheets
- ✅ **Fixture Difficulty Calculator** - Rank-based system for analyzing upcoming matches
- ✅ **Player Recommendations** - Top performers by position with value analysis
- ✅ **Hidden Gems Detection** - Undervalued players with strong underlying metrics
- ✅ **Real-time Fixture Analysis** - Input actual fixtures for comprehensive breakdowns

---

## 🚀 **Installation & Setup**

### **Prerequisites**
```python
# Required Python packages
pandas >= 1.3.0
numpy >= 1.21.0
jupyter >= 1.0.0
```

### **Quick Start**
1. **Clone or download** the project files
2. **Install dependencies**: `pip install pandas numpy jupyter`
3. **Place your data file** (`fpl-data-stats.csv`) in the project directory
4. **Open**: `fpl.ipynb` in Jupyter Notebook or VS Code
5. **Run all cells** sequentially from top to bottom

---

## 📊 **Data Requirements**

### **Expected Dataset Format**
- **File**: `fpl-data-stats.csv`
- **Structure**: Gameweek-by-gameweek player records
- **Key Columns**: 
  - `web_name` (Player name)
  - `team_name` (Team name)
  - `element_type` (Position: 1=GK, 2=DEF, 3=MID, 4=FWD)
  - `gameweek` (Gameweek number)
  - `total_points`, `minutes`, `now_cost`, `selected_by_percent`
  - `G`, `A`, `xG`, `xA` (Goals, Assists, Expected Goals, Expected Assists)
  - `CS`, `xCS`, `GC`, `xGC` (Clean Sheets, Expected Clean Sheets, Goals Conceded, Expected Goals Conceded)
  - `shots`, `SoT`, `key_passes` (Shots, Shots on Target, Key Passes)

### **Data Coverage**
- **Players**: 700+ active FPL players
- **Teams**: All 20 Premier League teams
- **Timeframe**: Complete gameweek data (typically covers 6+ gameweeks)
- **Quality**: No missing values in critical columns

---

## 🔧 **Core Components**

### **1. Data Processing Engine**
- **Gameweek Aggregation**: Converts individual gameweek records to season totals
- **Data Validation**: Handles missing values and data quality issues
- **Performance Metrics**: Calculates per-game averages and efficiency ratios

### **2. Team Strength Analysis**
- **Attack Strength**: Based on xG (40%), Goals (30%), Shots (30%)
- **Defense Strength**: Based on Clean Sheet Rate (40%), Inverse Goals Conceded (60%)
- **Rankings**: All 20 teams ranked from #1 (best) to #20 (worst)

### **3. Fixture Difficulty System**
- **Rank-Based Logic**: Compares team attack rank vs opponent defense rank
- **Home Advantage**: +1 rank improvement for home teams
- **Difficulty Scale**: Very Easy → Easy → Medium → Hard → Very Hard
- **Favorability Score**: -10 to +10 scale for quantitative comparison

### **4. Player Analysis Tools**
- **Top Performers**: Season leaders by total points and per-game averages
- **Value Analysis**: Points per million £ calculations
- **Hidden Gems**: Low ownership players with strong underlying metrics
- **Position-Specific Rankings**: Optimized scoring for GK/DEF/MID/FWD

---

## 📖 **Usage Guide**

### **Basic Workflow**
1. **Run Data Loading** (Cells 1-3): Import and explore dataset
2. **Process Season Stats** (Cell 14): Aggregate gameweek data
3. **Generate Team Rankings** (Cell 19): Create strength rankings
4. **Analyze Fixtures** (Cell 20): Input your fixtures and get recommendations
5. **Review Player Recommendations** (Cell 21): Find best picks by position


### **Interpreting Results**
- **🔥 Strong Pick**: Favorability score > 3.0
- **⭐ Good Pick**: Favorability score 1.5-3.0  
- **Average**: Favorability score 0-1.5
- **⚠️ Avoid**: Favorability score -1.5-0
- **❌ Strong Avoid**: Favorability score < -1.5

---

## 🧮 **Analysis Methodology**

### **Team Strength Calculation**
```python
# Attack Strength Formula
attack_strength = (xG_per_game * 0.4) + (goals_per_game * 0.3) + (shots_per_game * 0.3)

# Defense Strength Formula  
defense_strength = (clean_sheet_rate * 0.4) + (1/(goals_conceded_per_game + 0.1) * 0.6)
```

### **Fixture Difficulty Logic**
```python
# For Attacking Players
rank_difference = away_defense_rank - home_attack_rank
favorability_score = rank_difference / total_teams * 10

# Example: Arsenal ATT#1 vs Brighton DEF#12
# rank_difference = 12 - 1 = 11 (very favorable)
# favorability_score = 11/20 * 10 = +5.5 (Strong Pick)
```

### **Statistical Approach**
- **Expected Stats Priority**: xG and xA weighted heavily for sustainability
- **Volume Metrics**: Shots and key passes indicate involvement
- **Efficiency Ratios**: Points per game and points per million for value
- **Consistency Factors**: Minutes played and games started

---

## 📄 **License & Disclaimer**

### **Usage Rights**
- ✅ Personal use for FPL strategy and analysis
- ✅ Educational purposes and learning
- ✅ Modification and enhancement for personal projects
- ❌ Commercial redistribution of analysis outputs
- ❌ Selling insights or recommendations based on this tool

### **Data Disclaimer**
- **Accuracy**: Analysis quality depends on input data accuracy
- **Responsibility**: Users responsible for verifying team names and fixtures
- **Performance**: Past performance does not guarantee future results
- **Decisions**: All FPL decisions remain at user's discretion

### **Technical Disclaimer**
- **Dependencies**: Requires specific Python package versions
- **Compatibility**: Tested on Windows/macOS with Python 3.8+
- **Updates**: Code may require updates for new FPL seasons
- **Support**: Community-driven support through GitHub issues

---

## 📞 **Support & Contact**

### **Documentation**
- **README**: This comprehensive guide
- **Code Comments**: Detailed inline documentation
- **Function Docstrings**: Parameter and return value descriptions

### **Community**
- **Issues**: Report bugs and request features via GitHub
- **Discussions**: Share strategies and improvements  
- **Contributions**: Submit pull requests for enhancements

### **Version Information**
- **Current Version**: 1.0.0
- **Last Updated**: September 2025
- **Python Compatibility**: 3.8+
- **Tested Environments**: Jupyter Notebook, VS Code

---

**🎉 Happy FPL Analysis!**

*Transform your Fantasy Premier League strategy with data-driven insights and make informed decisions that could be the difference between a green arrow and a red one!*