import sys
import unittest
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.etl.process_fpl_data import build_player_role_insights


def player_rows(player_id: int, position: int, dc_values: list[int], minutes: int = 90):
    """Create a small, deterministic set of player/gameweek source rows."""
    return [
        {
            "id": player_id,
            "element_type": position,
            "web_name": f"Player {player_id}",
            "team_name": "Arsenal" if player_id % 2 else "Chelsea",
            "gameweek": gameweek,
            "minutes": minutes,
            "total_points": 4 + player_id % 3,
            "goals": int(gameweek == 1 and position in (3, 4)),
            "assists": int(gameweek == 2 and position in (2, 3, 4)),
            "clean_sheet": int(gameweek != 2),
            "expected_goals": 0.1 * player_id,
            "expected_assists": 0.05 * player_id,
            "expected_goal_involvements": 0.15 * player_id,
            "total_shots": player_id,
            "shots_in_box": max(1, player_id - 1),
            "shots_on_target": max(1, player_id // 2),
            "chances_created": player_id + 1,
            "touches_opp_box": player_id + 2,
            "defensive_contribution": dc,
            "expected_goals_conceded": 0.8,
        }
        for gameweek, dc in enumerate(dc_values, start=1)
    ]


class PlayerRoleInsightTests(unittest.TestCase):
    def setUp(self):
        rows = []
        rows += player_rows(1, 2, [10, 9, 12])
        rows += player_rows(2, 2, [4, 5, 6])
        rows += player_rows(3, 3, [12, 11, 13])
        rows += player_rows(4, 3, [4, 5, 6])
        rows += player_rows(5, 4, [12, 8, 12])
        rows += player_rows(6, 4, [2, 3, 4])
        rows += player_rows(7, 1, [0, 0, 0])
        rows += player_rows(8, 1, [0, 0, 0])
        rows += player_rows(9, 3, [12, 12, 12], minutes=30)
        self.frame = pd.DataFrame(rows)
        self.player_map = {player_id: f"player-{player_id}" for player_id in range(1, 10)}
        self.rows = build_player_role_insights(
            self.frame,
            self.player_map,
            "2026_27",
            {"ARS": 75.0, "CHE": 55.0},
        )

    def insight(self, player_id: int, window: str = "season"):
        return next(
            row for row in self.rows
            if row["player_id"] == f"player-{player_id}" and row["window_key"] == window
        )

    def test_position_specific_dc_thresholds_and_cap(self):
        defender = self.insight(1)
        midfielder = self.insight(3)

        self.assertEqual(defender["dc_returns"], 2)
        self.assertEqual(defender["dc_points"], 4)
        self.assertAlmostEqual(defender["dc_return_rate"], 2 / 3)
        self.assertEqual(midfielder["dc_returns"], 2)
        self.assertEqual(midfielder["dc_points"], 4)

    def test_low_minute_players_are_not_scored(self):
        low_sample = self.insight(9)

        self.assertFalse(low_sample["is_eligible"])
        self.assertIsNone(low_sample["attack_score"])
        self.assertIsNone(low_sample["defensive_floor_score"])

    def test_scores_are_versioned_and_bounded(self):
        scored = [
            value
            for row in self.rows
            for key, value in row.items()
            if key.endswith("_score") and value is not None
        ]

        self.assertTrue(scored)
        self.assertTrue(all(0 <= value <= 100 for value in scored))
        self.assertTrue(all(row["score_version"] == "role-v1" for row in self.rows))
        self.assertEqual({row["window_key"] for row in self.rows}, {"season", "last_5"})

    def test_recent_window_uses_only_latest_five_gameweeks(self):
        rows = player_rows(10, 4, [0, 0, 0, 0, 0, 0])
        rows += player_rows(11, 4, [0, 0, 0, 0, 0, 0])
        rows[0]["expected_goals"] = 9.0
        for row in rows[1:6]:
            row["expected_goals"] = 1.0
        insights = build_player_role_insights(
            pd.DataFrame(rows),
            {10: "player-10", 11: "player-11"},
            "2026_27",
        )
        season = next(row for row in insights if row["player_id"] == "player-10" and row["window_key"] == "season")
        recent = next(row for row in insights if row["player_id"] == "player-10" and row["window_key"] == "last_5")

        self.assertEqual(season["window_gameweeks"], 6)
        self.assertEqual(recent["window_gameweeks"], 5)
        self.assertAlmostEqual(season["xg"], 14.0)
        self.assertAlmostEqual(recent["xg"], 5.0)


if __name__ == "__main__":
    unittest.main()
