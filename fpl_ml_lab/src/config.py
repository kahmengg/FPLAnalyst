from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

@dataclass(frozen=True)
class SeasonFiles:
    season: str
    stats_csv: Path
    fixtures_csv: Path

HISTORICAL = SeasonFiles(
    season="2025_26",
    stats_csv=ROOT / "data" / "historical" / "2025_26" / "fpl-data-stats.csv",
    fixtures_csv=ROOT / "data" / "historical" / "2025_26" / "fixture_template.csv",
)

CURRENT = SeasonFiles(
    season="2026_27",
    stats_csv=ROOT / "data" / "current" / "2026_27" / "fpl-data-stats.csv",
    fixtures_csv=ROOT / "data" / "current" / "2026_27" / "fixture_template.csv",
)

BACKTEST_DIR = ROOT / "outputs" / "backtests"
PREDICTION_DIR = ROOT / "outputs" / "predictions"
MODEL_DIR = ROOT / "outputs" / "models"
PRIOR_TABLE = ROOT / "data" / "historical" / "2024_25" / "final_table.csv"
