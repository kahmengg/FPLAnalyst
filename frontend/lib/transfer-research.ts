import type { PlayerRoleInsight, RolePosition } from "./player-role-insights";
import type { ClubSchedule } from "./fixture-model";
import { scoreForRole } from "./decision-model";

export function rankCandidates(
  roles: PlayerRoleInsight[],
  schedules: ClubSchedule[],
  position: RolePosition,
  owned: Set<string>,
  maxPrice: number,
) {
  const clubs = new Map(schedules.map((club) => [club.code, club]));
  return roles
    .filter(
      (player) =>
        player.window === "last_5" &&
        player.position === position &&
        player.isEligible &&
        !owned.has(player.playerId) &&
        player.price <= maxPrice,
    )
    .flatMap((player) => {
      const role = scoreForRole(player);
      const schedule = clubs.get(player.teamCode);
      if (role === null || !schedule?.fixtures.length) return [];
      // A research ordering within one role, never expected points or hit value.
      return [
        {
          player,
          role,
          schedule,
          researchScore: role * 0.7 + schedule.average * 0.3,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.researchScore - a.researchScore ||
        a.player.name.localeCompare(b.player.name),
    );
}
