const seasonKey = process.env.NEXT_PUBLIC_FPL_SEASON_KEY?.trim() || "2025_26"

// Keep season messaging consistent across the banner and navigation chrome.
export const DATA_SEASON = {
  key: seasonKey,
  label: seasonKey.replace("_", "/"),
  isComplete: true,
} as const
