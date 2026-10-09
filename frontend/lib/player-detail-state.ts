export function readSelectedPlayerId(
  params: URLSearchParams,
  availableIds: Set<string>,
): string | null {
  const selected = params.get("player")?.trim()
  return selected && availableIds.has(selected) ? selected : null
}

export function withoutSelectedPlayer(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  next.delete("player")
  return next
}
