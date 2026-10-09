export type TouchGameweek = {
  minutes: number | null
  touches: number | null
  touchesOppBox: number | null
}

export type TouchProfileResult = {
  minutes: number
  touchesPer90: number | null
  boxTouchesPer90: number | null
  boxShare: number | null
  boxTouchesPercentile: number | null
}

const EMPTY_PROFILE: TouchProfileResult = {
  minutes: 0,
  touchesPer90: null,
  boxTouchesPer90: null,
  boxShare: null,
  boxTouchesPercentile: null,
}

function percentileRank(value: number, cohort: number[]) {
  const sorted = cohort.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  if (sorted.length === 1) return 100

  const below = sorted.filter((item) => item < value).length
  const equal = sorted.filter((item) => item === value).length
  // Midrank makes tied values share the same stable percentile.
  return ((below + Math.max(0, equal - 1) / 2) / (sorted.length - 1)) * 100
}

export function buildTouchProfile(
  rows: TouchGameweek[],
  cohortBoxTouchesPer90: number[],
): TouchProfileResult {
  const minutes = rows.reduce((sum, row) => sum + Math.max(0, row.minutes ?? 0), 0)
  if (!rows.length || minutes <= 0) return { ...EMPTY_PROFILE, minutes }

  const hasIncompleteSample = rows.some(
    (row) => (row.minutes ?? 0) > 0 && (row.touches === null || row.touchesOppBox === null),
  )
  if (hasIncompleteSample) return { ...EMPTY_PROFILE, minutes }

  const touches = rows.reduce((sum, row) => sum + Math.max(0, row.touches ?? 0), 0)
  const boxTouches = rows.reduce((sum, row) => sum + Math.max(0, row.touchesOppBox ?? 0), 0)
  const touchesPer90 = (touches * 90) / minutes
  const boxTouchesPer90 = (boxTouches * 90) / minutes

  return {
    minutes,
    touchesPer90,
    boxTouchesPer90,
    boxShare: touches > 0 ? boxTouches / touches : null,
    boxTouchesPercentile: percentileRank(boxTouchesPer90, cohortBoxTouchesPer90),
  }
}
