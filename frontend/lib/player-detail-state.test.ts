import { describe, expect, it } from "vitest"

import { readSelectedPlayerId, withoutSelectedPlayer } from "@/lib/player-detail-state"

describe("player detail URL state", () => {
  const ids = new Set(["player-a", "player-b"])

  it("returns only valid available player IDs", () => {
    expect(readSelectedPlayerId(new URLSearchParams("player=player-a"), ids)).toBe("player-a")
    expect(readSelectedPlayerId(new URLSearchParams("player="), ids)).toBeNull()
    expect(readSelectedPlayerId(new URLSearchParams("player=stale"), ids)).toBeNull()
    expect(readSelectedPlayerId(new URLSearchParams(), ids)).toBeNull()
  })

  it("removes only the player parameter when closing", () => {
    const current = new URLSearchParams("position=3&lens=hybrid&player=player-a&horizon=5&club=ARS")

    expect(withoutSelectedPlayer(current).toString()).toBe("position=3&lens=hybrid&horizon=5&club=ARS")
  })
})
