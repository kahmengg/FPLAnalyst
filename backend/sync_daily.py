#!/usr/bin/env python3
"""Refresh FPL statistics and the full fixture schedule, then run the ETL."""

import argparse
import base64
import csv
import io
import json
import os
import sys
import urllib.request
from collections import Counter
from datetime import datetime

# Windows terminals may default to CP-1252; force UTF-8 before emitting status symbols.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from config.config import Config

FPL_DASH_URL = "https://www.fpl-data.co.uk/_dash-update-component"
FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/"
DEFAULT_SEASON = os.getenv("FPL_DATA_SEASON", "2026_27")

# Match the team names used by fpl-data.co.uk and the ETL's short-code map.
TEAM_NAME_OVERRIDES = {
    "Coventry City": "Coventry",
    "Hull City": "Hull",
    "Ipswich Town": "Ipswich",
}

STATS_REQUIRED_COLUMNS = {
    "id", "element_type", "web_name", "team_name",
    "opponent_team_name", "was_home", "gameweek",
}
FIXTURE_COLUMNS = ["gameweek", "home_team", "away_team"]


def fetch_stats_csv(season: str) -> str:
    """Download player/gameweek statistics from the project's existing source."""
    print(f"📥 Fetching statistics for season {season}...")
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
            "Accept": "application/json",
            "User-Agent": "FPLAnalyst/1.0",
            "Origin": "https://www.fpl-data.co.uk",
            "Referer": "https://www.fpl-data.co.uk/statistics",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))

    download = data["response"]["download-dataframe-csv"]["data"]
    content = download["content"]
    if download.get("base64"):
        content = base64.b64decode(content).decode("utf-8")
    return content


def fetch_json(url: str):
    """Fetch JSON from the official FPL API with an explicit timeout."""
    req = urllib.request.Request(url, headers={"User-Agent": "FPLAnalyst/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_fixture_csv() -> str:
    """Build the template's three-column CSV from the official FPL schedule."""
    print("📥 Fetching the official FPL fixture schedule...")
    bootstrap = fetch_json(FPL_BOOTSTRAP_URL)
    fixtures = fetch_json(FPL_FIXTURES_URL)

    team_names = {
        int(team["id"]): TEAM_NAME_OVERRIDES.get(team["name"], team["name"])
        for team in bootstrap.get("teams", [])
    }

    rows = []
    for fixture in fixtures:
        event = fixture.get("event")
        home = team_names.get(int(fixture["team_h"]))
        away = team_names.get(int(fixture["team_a"]))
        if event is None or not home or not away:
            raise ValueError(f"Fixture {fixture.get('id')} is missing a gameweek or team")
        rows.append((int(event), home, away))

    rows.sort(key=lambda row: (row[0], row[1], row[2]))
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(FIXTURE_COLUMNS)
    writer.writerows(rows)
    return output.getvalue()


def validate_stats_csv(content: str) -> dict:
    """Reject empty or structurally incompatible statistics downloads."""
    reader = csv.DictReader(io.StringIO(content))
    columns = set(reader.fieldnames or [])
    missing = sorted(STATS_REQUIRED_COLUMNS - columns)
    if missing:
        raise ValueError(f"Statistics CSV is missing columns: {', '.join(missing)}")

    rows = list(reader)
    if not rows:
        raise ValueError("Statistics CSV contains no rows")
    gameweeks = {int(row["gameweek"]) for row in rows if row.get("gameweek")}
    if not gameweeks:
        raise ValueError("Statistics CSV contains no valid gameweeks")
    return {"rows": len(rows), "latest_gameweek": max(gameweeks)}


def validate_fixture_csv(content: str) -> dict:
    """Validate league coverage while preserving the established CSV schema."""
    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames != FIXTURE_COLUMNS:
        raise ValueError(
            f"Fixture columns must be {FIXTURE_COLUMNS}; got {reader.fieldnames}"
        )

    rows = list(reader)
    if len(rows) != 380:
        raise ValueError(f"Expected 380 fixtures; found {len(rows)}")

    unique_rows = {
        (row["gameweek"], row["home_team"], row["away_team"])
        for row in rows
    }
    if len(unique_rows) != len(rows):
        raise ValueError("Fixture CSV contains duplicate rows")

    home_counts = Counter(row["home_team"] for row in rows)
    away_counts = Counter(row["away_team"] for row in rows)
    teams = set(home_counts) | set(away_counts)
    if len(teams) != 20:
        raise ValueError(f"Expected 20 teams; found {len(teams)}")
    invalid_counts = {
        team: {"home": home_counts[team], "away": away_counts[team]}
        for team in sorted(teams)
        if home_counts[team] != 19 or away_counts[team] != 19
    }
    if invalid_counts:
        raise ValueError(f"Invalid home/away fixture counts: {invalid_counts}")

    gameweeks = [int(row["gameweek"]) for row in rows]
    if min(gameweeks) < 1 or max(gameweeks) > 38:
        raise ValueError("Fixture gameweeks must be between 1 and 38")

    gameweek_counts = Counter(gameweeks)
    invalid_gameweeks = {
        gameweek: gameweek_counts[gameweek]
        for gameweek in range(1, 39)
        if gameweek_counts[gameweek] != 10
    }
    if invalid_gameweeks:
        raise ValueError(f"Each gameweek must contain 10 fixtures: {invalid_gameweeks}")

    # Each club can appear only once in a normal league gameweek.
    appearances = Counter()
    for row in rows:
        gameweek = int(row["gameweek"])
        appearances[(gameweek, row["home_team"])] += 1
        appearances[(gameweek, row["away_team"])] += 1
    repeated = [key for key, count in appearances.items() if count != 1]
    if repeated:
        raise ValueError(f"Teams appear multiple times in a gameweek: {repeated[:5]}")

    return {"rows": len(rows), "teams": len(teams), "gameweeks": len(set(gameweeks))}


def save_text_atomic(path: str, content: str) -> None:
    """Replace a data file only after its complete content is on disk."""
    temp_path = f"{path}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8", newline="") as file:
            file.write(content)
        os.replace(temp_path, path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        return file.read()


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh and validate FPL data")
    parser.add_argument("--season", default=DEFAULT_SEASON)
    parser.add_argument(
        "--fixtures-only",
        action="store_true",
        help="refresh fixture_template.csv without running the database ETL",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="validate the existing CSV inputs without network or database writes",
    )
    args = parser.parse_args()

    print(f"\n{'=' * 60}")
    print(f"🔄 FPL DATA SYNC [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]")
    print(f"{'=' * 60}")

    if args.validate_only:
        stats = validate_stats_csv(read_text(Config.FPL_DATA_CSV))
        fixtures = validate_fixture_csv(read_text(Config.FIXTURE_TEMPLATE_CSV))
        print(f"✅ Statistics valid: {stats}")
        print(f"✅ Fixtures valid: {fixtures}")
        return

    try:
        fixture_content = fetch_fixture_csv()
        fixture_summary = validate_fixture_csv(fixture_content)

        if args.fixtures_only:
            save_text_atomic(Config.FIXTURE_TEMPLATE_CSV, fixture_content)
            print(f"✅ Saved {fixture_summary['rows']} fixtures → {Config.FIXTURE_TEMPLATE_CSV}")
            return

        stats_content = fetch_stats_csv(args.season)
        stats_summary = validate_stats_csv(stats_content)

        # Both downloads are validated before either current input is replaced.
        save_text_atomic(Config.FPL_DATA_CSV, stats_content)
        save_text_atomic(Config.FIXTURE_TEMPLATE_CSV, fixture_content)
        print(f"✅ Saved statistics: {stats_summary}")
        print(f"✅ Saved fixtures: {fixture_summary}")
    except Exception as error:
        print(f"❌ Data refresh failed: {error}")
        sys.exit(1)

    try:
        # Import lazily so --validate-only and --fixtures-only need no DB secrets.
        from etl.process_fpl_data import main as run_etl

        success = run_etl(args.season)
        sys.exit(0 if success else 1)
    except Exception as error:
        print(f"❌ ETL failed: {error}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
