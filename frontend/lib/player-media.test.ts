import { describe, expect, it } from "vitest"

import { getPlayerPortraitUrl } from "@/lib/player-media"

describe("getPlayerPortraitUrl", () => {
  it("builds official Premier League image URLs", () => {
    expect(getPlayerPortraitUrl(154561)).toContain("/110x140/p154561.png")
    expect(getPlayerPortraitUrl(154561, 250)).toContain("/250x250/p154561.png")
  })

  it("rejects missing or invalid codes", () => {
    expect(getPlayerPortraitUrl(null)).toBeNull()
    expect(getPlayerPortraitUrl(0)).toBeNull()
    expect(getPlayerPortraitUrl(-1)).toBeNull()
    expect(getPlayerPortraitUrl(Number.NaN)).toBeNull()
  })
})
