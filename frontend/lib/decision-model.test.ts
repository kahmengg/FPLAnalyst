import { describe, expect, it } from "vitest"

import { boundedInteger, formatRating, oneOf, scoreForRole, scoreLabel } from "@/lib/decision-model"
import type { PlayerRoleInsight } from "@/lib/player-role-insights"

const player = (position: PlayerRoleInsight["position"]): PlayerRoleInsight => ({
  position,
  attackScore: 71,
  defensiveFloorScore: 62,
  hybridScore: 66,
  completeScore: 74,
  goalkeeperScore: 81,
} as PlayerRoleInsight)

describe("weekly decision model", () => {
  it("selects the role-relative score without mixing fixture context", () => {
    expect(scoreForRole(player("Forward"))).toBe(71)
    expect(scoreForRole(player("Midfielder"))).toBe(66)
    expect(scoreForRole(player("Defender"))).toBe(74)
    expect(scoreForRole(player("Goalkeeper"))).toBe(81)
  })

  it("uses explicit complete labels for balanced roles", () => {
    expect(scoreLabel("Midfielder")).toBe("Complete score")
    expect(scoreLabel("Defender")).toBe("Complete score")
    expect(scoreLabel("Forward")).toBe("Attack score")
  })

  it("formats normalized fixture ratings as ratings, not probabilities", () => {
    expect(formatRating(67.6)).toBe("68 / 100")
  })

  it("bounds and validates URL values", () => {
    expect(boundedInteger("15", 3, 1, 10)).toBe(10)
    expect(boundedInteger("bad", 3, 1, 10)).toBe(3)
    expect(oneOf("attack", ["attack", "defense"] as const, "defense")).toBe("attack")
    expect(oneOf("bad", ["attack", "defense"] as const, "defense")).toBe("defense")
  })
})
