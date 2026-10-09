import csv
import io
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.sync_daily import enrich_stats_with_player_metadata


class PlayerMetadataTests(unittest.TestCase):
    def setUp(self):
        self.stats = (
            "id,element_type,web_name,team_name,opponent_team_name,was_home,gameweek\n"
            "101,3,Saka,Arsenal,Chelsea,true,1\n"
            "101,3,Saka,Arsenal,Liverpool,false,2\n"
            "202,2,Unknown,Fulham,Arsenal,true,1\n"
        )

    def parse(self, content):
        return list(csv.DictReader(io.StringIO(content)))

    def test_matching_player_adds_photo_code_to_every_gameweek(self):
        bootstrap = {"elements": [{"id": 101, "code": 154561}]}

        rows = self.parse(enrich_stats_with_player_metadata(self.stats, bootstrap))

        self.assertEqual([row["photo_code"] for row in rows[:2]], ["154561", "154561"])

    def test_missing_or_invalid_codes_are_empty(self):
        bootstrap = {
            "elements": [
                {"id": 101, "code": 0},
                {"id": 202, "code": "not-a-number"},
            ]
        }

        rows = self.parse(enrich_stats_with_player_metadata(self.stats, bootstrap))

        self.assertEqual([row["photo_code"] for row in rows], ["", "", ""])

    def test_preserves_existing_columns_and_row_order(self):
        bootstrap = {"elements": [{"id": 101, "code": 154561}]}

        enriched = enrich_stats_with_player_metadata(self.stats, bootstrap)
        reader = csv.DictReader(io.StringIO(enriched))
        rows = list(reader)

        self.assertEqual(
            reader.fieldnames,
            [
                "id",
                "element_type",
                "web_name",
                "team_name",
                "opponent_team_name",
                "was_home",
                "gameweek",
                "photo_code",
            ],
        )
        self.assertEqual([row["gameweek"] for row in rows], ["1", "2", "1"])


if __name__ == "__main__":
    unittest.main()
