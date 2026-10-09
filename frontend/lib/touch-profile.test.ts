import { describe, expect, it } from "vitest"

import { buildTouchProfile } from "@/lib/touch-profile"

describe("buildTouchProfile", () => {
  it("weights touch volume by total minutes", () => {
    const profile = buildTouchProfile(
      [
        { minutes: 90, touches: 60, touchesOppBox: 12 },
        { minutes: 30, touches: 10, touchesOppBox: 2 },
      ],
      [5, 10, 15, 20],
    )

    expect(profile.minutes).toBe(120)
    expect(profile.touchesPer90).toBeCloseTo(52.5)
    expect(profile.boxTouchesPer90).toBeCloseTo(10.5)
    expect(profile.boxShare).toBeCloseTo(0.2)
    expect(profile.boxTouchesPercentile).toBeCloseTo(66.7, 1)
  })

  it("uses midpoint rank for tied cohort values", () => {
    const profile = buildTouchProfile(
      [{ minutes: 90, touches: 40, touchesOppBox: 4 }],
      [1, 4, 4, 8],
    )

    expect(profile.boxTouchesPercentile).toBe(50)
  })

  it("returns unavailable metrics for empty or incomplete samples", () => {
    expect(buildTouchProfile([], [])).toEqual({
      minutes: 0,
      touchesPer90: null,
      boxTouchesPer90: null,
      boxShare: null,
      boxTouchesPercentile: null,
    })
    expect(
      buildTouchProfile(
        [{ minutes: 45, touches: null, touchesOppBox: 3 }],
        [2, 3],
      ).touchesPer90,
    ).toBeNull()
    expect(
      buildTouchProfile(
        [{ minutes: 0, touches: 0, touchesOppBox: 0 }],
        [0],
      ).boxTouchesPer90,
    ).toBeNull()
  })
})
