#!/usr/bin/env python3
"""
FPL Daily Sync
Fetches the latest CSV from fpl-data.co.uk then runs the ETL pipeline.

Usage:
    python -m backend.etl.sync_daily
    python -m backend.etl.sync_daily --season 2025_26
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config.config import Config
from etl.process_fpl_data import main as run_etl

FPL_DASH_URL     = "https://www.fpl-data.co.uk/_dash-update-component"
DEFAULT_SEASON   = os.getenv("FPL_DATA_SEASON", "2025_26")


def fetch_csv(season: str) -> str:
    """Download CSV from the fpl-data.co.uk Dash callback endpoint."""
    print(f"📥 Fetching CSV for season {season}...")

    payload = {
        "output": "download-dataframe-csv.data",
        "outputs": {"id": "download-dataframe-csv", "property": "data"},
        "inputs": [{"id": "btn_csv", "property": "n_clicks", "value": 1}],
        "changedPropIds": ["btn_csv.n_clicks"],
        "parsedChangedPropsIds": ["btn_csv.n_clicks"],
        "state": [{"id": "input-year", "property": "value", "value": season}],
    }

    req = urllib.request.Request(
        FPL_DASH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept":       "application/json",
            "User-Agent":   "Mozilla/5.0",
            "Origin":       "https://www.fpl-data.co.uk",
            "Referer":      "https://www.fpl-data.co.uk/statistics",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")

    data    = json.loads(body)
    dl      = data["response"]["download-dataframe-csv"]["data"]
    content = dl["content"]

    if dl.get("base64"):
        content = base64.b64decode(content).decode("utf-8")

    return content


def save_csv(content: str) -> None:
    with open(Config.FPL_DATA_CSV, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    print(f"✅ Saved CSV → {Config.FPL_DATA_CSV}")


def main() -> None:
    parser = argparse.ArgumentParser(description="FPL daily sync")
    parser.add_argument("--season", default=DEFAULT_SEASON)
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"🔄 FPL DAILY SYNC  [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]")
    print(f"{'='*60}")

    # Step 1: download
    try:
        csv_content = fetch_csv(args.season)
        save_csv(csv_content)
    except Exception as e:
        print(f"❌ Failed to fetch CSV: {e}")
        sys.exit(1)

    # Step 2: ETL (CSV → Supabase)
    try:
        success = run_etl(args.season)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ ETL failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()