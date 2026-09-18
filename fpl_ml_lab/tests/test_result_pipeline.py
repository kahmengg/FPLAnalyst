from __future__ import annotations

from pathlib import Path
import sys
import unittest

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data import build_fixture_matches, build_team_matches, load_final_table, load_stats
from src.elo import EloConfig, run_elo_walk_forward


class ResultPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        stats = load_stats(ROOT / "data/historical/2025_26/fpl-data-stats.csv")
        cls.team_matches = build_team_matches(stats)
        cls.fixtures = build_fixture_matches(cls.team_matches)
        cls.prior = load_final_table(ROOT / "data/historical/2024_25/final_table.csv")

    def test_probabilities_are_valid(self):
        predictions, _ = run_elo_walk_forward(self.fixtures, self.prior, EloConfig())
        probabilities = predictions[["prob_home", "prob_draw", "prob_away"]].to_numpy()
        self.assertTrue(np.isfinite(probabilities).all())
        self.assertTrue(((probabilities >= 0) & (probabilities <= 1)).all())
        np.testing.assert_allclose(probabilities.sum(axis=1), 1.0)

    def test_same_gameweek_results_cannot_change_same_gameweek_predictions(self):
        original = self.fixtures[self.fixtures["gameweek"] <= 2].copy()
        mutated = original.copy()
        gw1 = mutated["gameweek"] == 1
        mutated.loc[gw1, "home_goals"] = 9
        mutated.loc[gw1, "away_goals"] = 0
        mutated.loc[gw1, "actual_result"] = "H"
        before, _ = run_elo_walk_forward(original, self.prior, EloConfig())
        after, _ = run_elo_walk_forward(mutated, self.prior, EloConfig())
        columns = ["prob_home", "prob_draw", "prob_away", "home_elo", "away_elo"]
        pd.testing.assert_frame_equal(
            before[before.gameweek == 1][columns].reset_index(drop=True),
            after[after.gameweek == 1][columns].reset_index(drop=True),
        )

    def test_gw20_elo_ignores_gw20_outcomes(self):
        through_gw20 = self.fixtures[self.fixtures.gameweek <= 20].copy()
        mutated = through_gw20.copy()
        mask = mutated.gameweek == 20
        mutated.loc[mask, "home_goals"] = 9
        mutated.loc[mask, "away_goals"] = 0
        mutated.loc[mask, "actual_result"] = "H"
        original_predictions, _ = run_elo_walk_forward(
            through_gw20, self.prior, EloConfig()
        )
        mutated_predictions, _ = run_elo_walk_forward(
            mutated, self.prior, EloConfig()
        )
        columns = ["prob_home", "prob_draw", "prob_away", "home_elo", "away_elo"]
        pd.testing.assert_frame_equal(
            original_predictions[original_predictions.gameweek == 20][columns].reset_index(drop=True),
            mutated_predictions[mutated_predictions.gameweek == 20][columns].reset_index(drop=True),
        )


if __name__ == "__main__":
    unittest.main()
