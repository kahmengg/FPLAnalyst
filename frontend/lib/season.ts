const seasonKey = process.env.NEXT_PUBLIC_FPL_SEASON_KEY?.trim() || "2026_27"
const isComplete = process.env.NEXT_PUBLIC_FPL_SEASON_COMPLETE === "true"

// Keep season messaging consistent across the banner and navigation chrome.
export const DATA_SEASON = {
  key: seasonKey,
  label: seasonKey.replace("_", "/"),
  isComplete,
} as const
