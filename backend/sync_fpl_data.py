#!/usr/bin/env python3
"""
Simplified Daily FPL Data Sync

NEW SIMPLIFIED PIPELINE (2 stages):
1. Fetch CSV from FPL Data Dash API
2. Run simplified ETL: CSV → Direct Supabase (no intermediate JSON files)

REPLACED:
- Removed: Jupyter notebook execution (was stage 3 of 4)
- Removed: Python migration script (was stage 4 of 4)
- Result: Faster, simpler, fewer error points
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from datetime import datetime

from config.config import Config
from etl.process_fpl_data import main as run_etl

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


def sync_daily_data(season_value: str = DEFAULT_SEASON_VALUE) -> None:
    """
    Download the latest CSV and run simplified ETL.
    
    Pipeline:
    1. Fetch CSV from FPL Data Dash API
    2. Run ETL: CSV → Supabase (direct, no intermediate files)
    """
    print(f"[{datetime.now().isoformat()}] Starting daily FPL sync...")
    print(f"Season: {season_value}\n")

    # Step 1: Fetch and save CSV
    try:
        print("📥 Fetching CSV from FPL Data Dash API...")
        csv_content = fetch_csv_from_dash(season_value=season_value)
        save_csv(csv_content)
        print(f"✅ Saved CSV to {Config.FPL_DATA_CSV}\n")
    except Exception as e:
        print(f"❌ Error fetching/saving CSV: {e}")
        sys.exit(1)

    # Step 2: Run simplified ETL (CSV → Supabase directly)
    try:
        print("⚡ Running simplified ETL pipeline...")
        success = run_etl(season_value)
        if success:
            print(f"\n✅ Daily sync completed successfully!")
        else:
            print(f"\n❌ ETL pipeline failed")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error running ETL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main() -> None:
    """Entry point for the sync script."""
    parser = argparse.ArgumentParser(
        description="Sync FPL Data from Dash API to Supabase (Simplified Pipeline)"
    )
    parser.add_argument(
        "--season",
        default=DEFAULT_SEASON_VALUE,
        help="Dash season value used by the FPL Data site (default: 2025_26)",
    )
    args = parser.parse_args()
    sync_daily_data(season_value=args.season)


if __name__ == "__main__":
    main()
