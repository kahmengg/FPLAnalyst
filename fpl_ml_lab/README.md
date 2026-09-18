# FPL Elo Forecasting Lab

This is an isolated CSV-only experiment. It does not use Supabase or modify the
working backend/frontend.

## Inputs

```text
data/
├── historical/
│   ├── 2024_25/final_table.csv
│   └── 2025_26/
│       ├── fpl-data-stats.csv
│       └── fixture_template.csv
└── current/2026_27/
    ├── fpl-data-stats.csv
    └── fixture_template.csv
```

The 2024/25 prior is sourced from the official Premier League final standings:
https://www.premierleague.com/en/tables/premier-league/2024-25

The pipeline derives the 2025/26 final table from its 380 completed fixtures and
uses those points to initialize 2026/27.

## Run

From the repository root:

```powershell
.\venv\Scripts\python.exe .\fpl_ml_lab\run_ml_pipeline.py
```

## Method

- Previous-season points initialize ratings around a league mean of 1500.
- Promoted teams receive the mapped prior of the previous 17th-place team.
- Davidson Elo produces home/draw/away probabilities.
- Default settings are K=20, home advantage=60, and four Elo points per league point.
- Every fixture in GW N is predicted from one frozen pre-GW state.
- Elo changes are batch-applied only after all GW N predictions are stored.
- Performance is compared with always-home and expanding league-frequency baselines.
- GWs 20-38 remain the locked headline evaluation window.

## Outputs

```text
outputs/
├── backtests/
│   ├── elo_predictions.csv
│   ├── baseline_predictions.csv
│   ├── gameweek_accuracy.csv
│   ├── model_metrics.csv
│   ├── improvement_summary.csv
│   └── confusion_matrix.csv
├── models/
│   └── elo_config.json
└── predictions/
    └── next_gameweek_predictions.csv
```

`elo_predictions.csv` contains the predicted result, actual result, correctness,
three probabilities, pre-match ratings, and Elo difference for every historical
fixture.
