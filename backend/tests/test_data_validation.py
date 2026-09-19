import unittest
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
# Support test discovery from either the repository root or backend directory.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.sync_daily import validate_fixture_csv, validate_stats_csv


class DataValidationTests(unittest.TestCase):
    def test_checked_in_fixture_schedule_is_complete(self):
        content = (PROJECT_ROOT / "fixture_template.csv").read_text(encoding="utf-8-sig")

        summary = validate_fixture_csv(content)

        self.assertEqual(summary, {"rows": 380, "teams": 20, "gameweeks": 38})

    def test_checked_in_statistics_have_required_shape(self):
        content = (PROJECT_ROOT / "fpl-data-stats.csv").read_text(encoding="utf-8-sig")

        summary = validate_stats_csv(content)

        self.assertGreater(summary["rows"], 0)
        self.assertGreaterEqual(summary["latest_gameweek"], 1)

    def test_fixture_validator_rejects_an_incomplete_schedule(self):
        content = (PROJECT_ROOT / "fixture_template.csv").read_text(encoding="utf-8-sig")
        incomplete = "\n".join(content.splitlines()[:-1]) + "\n"

        with self.assertRaisesRegex(ValueError, "Expected 380 fixtures"):
            validate_fixture_csv(incomplete)

    def test_fixture_validator_rejects_an_unbalanced_gameweek(self):
        content = (PROJECT_ROOT / "fixture_template.csv").read_text(encoding="utf-8-sig")
        lines = content.splitlines()
        fields = lines[1].split(",")
        fields[0] = "2" if fields[0] == "1" else "1"
        lines[1] = ",".join(fields)

        with self.assertRaisesRegex(ValueError, "Each gameweek must contain 10 fixtures"):
            validate_fixture_csv("\n".join(lines) + "\n")

    def test_fixture_validator_accepts_complete_or_future_results(self):
        content = (PROJECT_ROOT / "fixture_template.csv").read_text(encoding="utf-8-sig")
        lines = content.splitlines()
        expanded = ["gameweek,home_team,away_team,home_score,away_score,finished"]
        for index, line in enumerate(lines[1:]):
            suffix = ",2,1,true" if index == 0 else ",,,false"
            schedule = ",".join(line.split(",")[:3])
            expanded.append(f"{schedule}{suffix}")

        summary = validate_fixture_csv("\n".join(expanded) + "\n")

        self.assertEqual(summary, {"rows": 380, "teams": 20, "gameweeks": 38})

    def test_fixture_validator_rejects_a_partial_score(self):
        content = (PROJECT_ROOT / "fixture_template.csv").read_text(encoding="utf-8-sig")
        lines = content.splitlines()
        expanded = ["gameweek,home_team,away_team,home_score,away_score,finished"]
        expanded.append(f"{','.join(lines[1].split(',')[:3])},2,,true")
        expanded.extend(f"{','.join(line.split(',')[:3])},,,false" for line in lines[2:])

        with self.assertRaisesRegex(ValueError, "both home and away scores"):
            validate_fixture_csv("\n".join(expanded) + "\n")


if __name__ == "__main__":
    unittest.main()
