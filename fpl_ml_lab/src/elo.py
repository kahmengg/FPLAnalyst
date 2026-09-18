from __future__ import annotations

from dataclasses import dataclass
import logging
import math

import numpy as np
import pandas as pd

LOGGER = logging.getLogger(__name__)
RESULTS = ["H", "D", "A"]
RESULT_LABELS = {"H": "Home Win", "D": "Draw", "A": "Away Win"}


@dataclass(frozen=True)
class EloConfig:
    k_factor: float = 20.0
    home_advantage: float = 60.0
    points_scale: float = 4.0
    equal_team_draw_prob: float = 0.27
    promoted_position: int = 17
    margin_of_victory: bool = False


def initialise_ratings(
    active_teams: set[str], prior_table: pd.DataFrame, config: EloConfig, *, log: bool = True
) -> tuple[dict[str, float], list[str], list[str]]:
    prior = prior_table.set_index("team")
    prior_mean = float(prior_table["points"].mean())
    returning = sorted(active_teams & set(prior.index))
    promoted = sorted(active_teams - set(prior.index))
    relegated = sorted(set(prior.index) - active_teams)
    if len(returning) + len(promoted) != len(active_teams):
        raise ValueError("Could not classify all active teams for Elo initialization")
    if not returning:
        raise ValueError("No active teams occur in the previous-season table")

    ratings = {
        team: 1500.0 + config.points_scale * (float(prior.loc[team, "points"]) - prior_mean)
        for team in returning
    }
    promoted_row = prior_table[prior_table["position"] == config.promoted_position]
    if promoted_row.empty:
        raise ValueError(
            f"Previous table has no position {config.promoted_position} for promoted prior"
        )
    promoted_points = float(promoted_row.iloc[0]["points"])
    promoted_rating = 1500.0 + config.points_scale * (promoted_points - prior_mean)
    ratings.update({team: promoted_rating for team in promoted})

    # Recenter the active league while preserving every relative gap.
    shift = 1500.0 - float(np.mean(list(ratings.values())))
    ratings = {team: rating + shift for team, rating in ratings.items()}
    if log:
        LOGGER.info(
            "Elo initialised: range=%.1f-%.1f promoted=%s relegated=%s promoted_rating=%.1f",
            min(ratings.values()), max(ratings.values()), promoted or "none",
            relegated or "none", promoted_rating + shift,
        )
    return ratings, promoted, relegated


def davidson_probabilities(
    home_rating: float, away_rating: float, config: EloConfig
) -> np.ndarray:
    """Draw-aware Bradley-Terry/Davidson H-D-A probabilities."""
    home_strength = 10.0 ** ((home_rating + config.home_advantage) / 400.0)
    away_strength = 10.0 ** (away_rating / 400.0)
    draw_nu = config.equal_team_draw_prob / (1.0 - config.equal_team_draw_prob)
    draw_term = 2.0 * draw_nu * math.sqrt(home_strength * away_strength)
    denominator = home_strength + away_strength + draw_term
    probs = np.array(
        [home_strength / denominator, draw_term / denominator, away_strength / denominator],
        dtype=float,
    )
    return probs / probs.sum()


def _result_score(result: str) -> float:
    return {"H": 1.0, "D": 0.5, "A": 0.0}[result]


def _mov_multiplier(row: pd.Series, home_rating: float, away_rating: float) -> float:
    margin = abs(float(row["home_goals"]) - float(row["away_goals"]))
    if margin <= 1:
        return 1.0
    winner_gap = home_rating - away_rating
    if row["actual_result"] == "A":
        winner_gap = -winner_gap
    multiplier = math.log(margin + 1.0) * (2.2 / (2.2 + 0.001 * winner_gap))
    return float(np.clip(multiplier, 0.5, 2.0))


def run_elo_walk_forward(
    fixtures: pd.DataFrame,
    prior_table: pd.DataFrame,
    config: EloConfig,
    *,
    model_name: str = "elo",
    log_initialisation: bool = True,
) -> tuple[pd.DataFrame, dict[str, float]]:
    """Predict a full season, applying all rating changes only after each GW."""
    active = set(fixtures["home_team"]) | set(fixtures["away_team"])
    ratings, _, _ = initialise_ratings(
        active, prior_table, config, log=log_initialisation
    )
    output: list[dict[str, object]] = []

    for gw, gameweek in fixtures.sort_values(
        ["gameweek", "home_team", "away_team"]
    ).groupby("gameweek", sort=True):
        frozen = ratings.copy()
        deltas = {team: 0.0 for team in ratings}
        for _, row in gameweek.iterrows():
            home = row["home_team"]
            away = row["away_team"]
            home_elo = frozen[home]
            away_elo = frozen[away]
            probs = davidson_probabilities(home_elo, away_elo, config)
            prediction = RESULTS[int(np.argmax(probs))]
            actual = str(row["actual_result"])
            output.append({
                "model": model_name, "gameweek": int(gw),
                "home_team": home, "away_team": away,
                "prob_home": probs[0], "prob_draw": probs[1], "prob_away": probs[2],
                "predicted_result": prediction, "actual_result": actual,
                "predicted_label": RESULT_LABELS[prediction],
                "actual_label": RESULT_LABELS[actual],
                "correct": prediction == actual,
                "home_elo": home_elo, "away_elo": away_elo,
                "elo_difference": home_elo + config.home_advantage - away_elo,
                "home_goals": int(row["home_goals"]),
                "away_goals": int(row["away_goals"]),
            })
            expected_home = probs[0] + 0.5 * probs[1]
            multiplier = _mov_multiplier(row, home_elo, away_elo) if config.margin_of_victory else 1.0
            change = config.k_factor * multiplier * (_result_score(actual) - expected_home)
            deltas[home] += change
            deltas[away] -= change

        # One batch update prevents same-GW and double-GW leakage/order effects.
        ratings = {team: frozen[team] + deltas[team] for team in frozen}

    predictions = pd.DataFrame(output)
    validate_probabilities(predictions)
    return predictions, ratings


def predict_fixtures_from_ratings(
    fixtures: pd.DataFrame,
    ratings: dict[str, float],
    config: EloConfig,
    *,
    model_name: str = "elo",
) -> pd.DataFrame:
    rows = []
    for fixture in fixtures.itertuples(index=False):
        if fixture.home_team not in ratings or fixture.away_team not in ratings:
            raise ValueError(f"Missing Elo rating for {fixture.home_team} or {fixture.away_team}")
        probs = davidson_probabilities(
            ratings[fixture.home_team], ratings[fixture.away_team], config
        )
        rows.append({
            "model": model_name, "gameweek": int(fixture.gameweek),
            "home_team": fixture.home_team, "away_team": fixture.away_team,
            "prob_home": probs[0], "prob_draw": probs[1], "prob_away": probs[2],
            "predicted_result": RESULTS[int(np.argmax(probs))],
            "home_elo": ratings[fixture.home_team],
            "away_elo": ratings[fixture.away_team],
            "elo_difference": ratings[fixture.home_team] + config.home_advantage
            - ratings[fixture.away_team],
        })
        rows[-1]["predicted_label"] = RESULT_LABELS[rows[-1]["predicted_result"]]
    result = pd.DataFrame(rows)
    validate_probabilities(result)
    return result


def validate_probabilities(predictions: pd.DataFrame) -> None:
    columns = ["prob_home", "prob_draw", "prob_away"]
    values = predictions[columns].to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Predictions contain NaN or infinite probabilities")
    if (values < 0).any() or (values > 1).any():
        raise ValueError("Prediction probabilities must be between zero and one")
    if not np.allclose(values.sum(axis=1), 1.0, atol=1e-9):
        raise ValueError("Home/draw/away probabilities do not sum to one")
