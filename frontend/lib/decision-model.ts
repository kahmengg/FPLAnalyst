import type {
  PlayerRoleInsight,
  RolePosition,
} from "@/lib/player-role-insights";

export type PlayerLens = "attack" | "floor" | "complete";

export function scoreForRole(
  player: PlayerRoleInsight,
  lens: PlayerLens = "complete",
) {
  if (player.position === "Goalkeeper") return player.goalkeeperScore;
  if (player.position === "Defender")
    return lens === "attack"
      ? player.attackScore
      : lens === "floor"
        ? player.defensiveFloorScore
        : player.completeScore;
  if (player.position === "Midfielder")
    return lens === "attack"
      ? player.attackScore
      : lens === "floor"
        ? player.defensiveFloorScore
        : player.hybridScore;
  return player.attackScore;
}

export function scoreLabel(
  position: RolePosition,
  lens: PlayerLens = "complete",
) {
  if (position === "Goalkeeper") return "Goalkeeper score";
  if (position === "Defender" && lens === "complete") return "Complete score";
  if (position === "Midfielder" && lens === "complete") return "Complete score";
  if (lens === "floor") return "Defensive floor";
  return "Attack score";
}

export function boundedInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.max(min, Math.min(max, parsed))
    : fallback;
}

export function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function formatRating(value: number) {
  return `${Math.round(Math.max(0, Math.min(100, value)))} / 100`;
}
