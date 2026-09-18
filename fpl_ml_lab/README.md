# FPL ML Lab

This folder is intentionally isolated from the working FPLAnalyst backend/frontend.

It does **not** write to Supabase and does **not** modify your current ETL pipeline.

## 1. Put the files here

Historical season:

```text
fpl_ml_lab/
└── data/
    └── historical/
        └── 2025_26/
            ├── fpl-data-stats.csv
            └── fixture_template.csv
```

Current season (copy, do not move, your working files):

```text
fpl_ml_lab/
└── data/
    └── current/
        └── 2026_27/
            ├── fpl-data-stats.csv
            └── fixture_template.csv
```

If your filenames are different, you do **not** have to rename them.
Run the pipeline with explicit file paths instead.

## 2. Install

From inside `fpl_ml_lab`:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 3. Run everything

```powershell
python run_ml_pipeline.py
```

This will:

1. Load and validate the historical player/GW CSV.
2. Convert player rows into team-match rows.
3. Build leakage-safe pre-match features.
4. Walk-forward backtest several models:
   - simple baseline
   - Poisson regression
   - Ridge regression
   - Random Forest
   - Histogram Gradient Boosting
5. Compare MAE, RMSE and Poisson deviance.
6. Pick the strongest fitted ML model by backtest MAE.
7. Add completed 2026/27 matches to the training pool.
8. Predict all remaining 2026/27 fixtures.
9. Output predicted goals, clean-sheet probabilities and W/D/L probabilities.

## 4. Outputs

```text
outputs/
├── backtests/
│   ├── model_metrics.csv
│   └── walk_forward_predictions.csv
├── models/
│   └── <best-model>.joblib
└── predictions/
    └── current_fixture_predictions.csv
```

## Custom filenames

Example:

```powershell
python run_ml_pipeline.py `
  --historical-stats "data/historical/2025_26/my-old-stats.csv" `
  --historical-fixtures "data/historical/2025_26/my-old-fixtures.csv" `
  --current-stats "C:/path/to/current/fpl-data-stats.csv" `
  --current-fixtures "C:/path/to/current/fixture_template.csv"
```

## Backtesting rule

The model predicting GW N is trained only on rows from earlier gameweeks.
GW N results are never used to construct its own pre-match features.

This is critical: otherwise model performance would be inflated by data leakage.

## Important limitation

One historical season is enough for a useful prototype, but it is still a small
dataset. The framework is designed so additional seasons can be added later.
The next step after validating this prototype is to support multiple historical
seasons and compare stability across seasons.
