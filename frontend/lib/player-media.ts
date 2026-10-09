const PORTRAIT_ROOT =
  "https://resources.premierleague.com/premierleague/photos/players"

export type PlayerPortraitResolution = 110 | 250

export function getPlayerPortraitUrl(
  photoCode: number | null | undefined,
  size: PlayerPortraitResolution = 110,
): string | null {
  if (!Number.isInteger(photoCode) || Number(photoCode) <= 0) return null

  const dimensions = size === 250 ? "250x250" : "110x140"
  return `${PORTRAIT_ROOT}/${dimensions}/p${photoCode}.png`
}
