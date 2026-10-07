import type { ImportedPlayer } from "./guest-team";
import type { PlayerRoleInsight } from "./player-role-insights";
import { scoreForRole } from "./decision-model";

export function reviewPlayer(
  player: ImportedPlayer,
  insight?: PlayerRoleInsight,
) {
  const score = insight ? scoreForRole(insight) : null;
  // Missing data is an uncertainty, never evidence that a player should be sold.
  if (player.status !== "a")
    return {
      priority: 3,
      label: "Check availability",
      reason:
        player.news ||
        "FPL reports an availability flag. Confirm the latest news before deciding.",
      score,
    };
  if (!insight || score === null || !insight.isEligible)
    return {
      priority: 1,
      label: "More evidence needed",
      reason:
        "The model has insufficient usable data. Do not treat a missing score as a transfer-out signal.",
      score,
    };
  if (insight.minuteSecurity < 0.6)
    return {
      priority: 2,
      label: "Review minutes",
      reason: `Reached 60 minutes in ${insight.sixtyMinuteAppearances} of ${insight.appearances} recent appearances. This measures past starts, not a prediction of the next lineup.`,
      score,
    };
  if (score < 50)
    return {
      priority: 1,
      label: "Compare alternatives",
      reason:
        "Recent role score is below the position average. Compare fixtures and minutes before considering a replacement.",
      score,
    };
  return {
    priority: 0,
    label: "Hold for now",
    reason:
      "No immediate availability or model concern. A transfer is not required just because another player ranks higher.",
    score,
  };
}
