#!/usr/bin/env python3
"""Daily FPL data sync.

This script:
1. Calls the FPL Data Dash callback that generates the CSV export.
2. Saves the CSV to the project root.
3. Re-runs the notebook ETL to refresh derived analytics.
4. Loads raw CSV rows and derived JSON outputs into Supabase.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime

from config.config import Config
from migrate_to_supabase import main as migrate_supabase_data

FPL_DASH_URL = "https://www.fpl-data.co.uk/_dash-update-component"
DEFAULT_SEASON_VALUE = os.getenv("FPL_DATA_SEASON", "2025_26")


def fetch_csv_from_dash(season_value: str = DEFAULT_SEASON_VALUE) -> str:
    """Fetch the CSV export from the Dash callback endpoint."""
    payload = {
        "output": "download-dataframe-csv.data",
        "outputs": {"id": "download-dataframe-csv", "property": "data"},
        "inputs": [{"id": "btn_csv", "property": "n_clicks", "value": 1}],
        "changedPropIds": ["btn_csv.n_clicks"],
        "parsedChangedPropsIds": ["btn_csv.n_clicks"],
        "state": [{"id": "input-year", "property": "value", "value": season_value}],
    }

    request = urllib.request.Request(
        FPL_DASH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://www.fpl-data.co.uk",
            "Referer": "https://www.fpl-data.co.uk/statistics",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read().decode("utf-8")

    data = json.loads(body)
    download_payload = data["response"]["download-dataframe-csv"]["data"]
    csv_content = download_payload["content"]

    if download_payload.get("base64"):
        csv_content = base64.b64decode(csv_content).decode("utf-8")

    return csv_content


def save_csv(csv_content: str) -> None:
    """Persist the CSV to the canonical project location."""
    with open(Config.FPL_DATA_CSV, "w", encoding="utf-8", newline="") as file_handle:
        file_handle.write(csv_content)


def run_notebook() -> None:
    """Execute the notebook so JSON analytics are refreshed before migration."""
    notebook_path = os.path.join(Config.PROJECT_ROOT, "fpl.ipynb")
    if not os.path.exists(notebook_path):
        raise FileNotFoundError(f"Notebook not found at {notebook_path}")

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "jupyter",
            "nbconvert",
            "--to",
            "notebook",
            "--execute",
            "--inplace",
            notebook_path,
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr or "Notebook execution failed")


def sync_daily_data(season_value: str = DEFAULT_SEASON_VALUE) -> None:
    """Download the latest CSV, refresh analytics, and push to Supabase."""
    print(f"[{datetime.now().isoformat()}] Starting daily FPL sync...")
    print(f"Fetching CSV for season value: {season_value}")

    csv_content = fetch_csv_from_dash(season_value=season_value)
    save_csv(csv_content)
    print(f"Saved CSV to {Config.FPL_DATA_CSV}")

    print("Running notebook ETL...")
    run_notebook()
    print("Notebook ETL complete")

    print("Migrating CSV + analytics data to Supabase...")
    migrate_supabase_data()
    print("Daily sync complete")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync FPL Data into Supabase")
    parser.add_argument(
        "--season",
        default=DEFAULT_SEASON_VALUE,
        help="Dash season value used by the FPL Data site (default: 2025_26)",
    )
    args = parser.parse_args()
    sync_daily_data(season_value=args.season)


if __name__ == "__main__":
    main()
