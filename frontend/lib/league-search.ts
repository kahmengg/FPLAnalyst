export type LeagueSearchResult = {
  league: string;
  scanned: number;
  complete: boolean;
  matches: Array<{ entry: number; name: string }>;
};

export function parseLeagueId(value: string): number | null {
  let id = value.trim();
  if (!/^\d+$/.test(id)) {
    try {
      const url = new URL(id);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "fantasy.premierleague.com"
      )
        return null;
      id = url.pathname.match(/\/leagues\/(\d+)\/standings(?:\/|$)/)?.[1] ?? "";
    } catch {
      return null;
    }
  }
  const number = Number(id);
  return Number.isSafeInteger(number) && number > 0 && number <= 100_000_000
    ? number
    : null;
}

export async function searchLeague(
  league: number,
  name: string,
  signal?: AbortSignal,
): Promise<LeagueSearchResult> {
  const response = await fetch(
    `/api/fpl-search?league=${league}&name=${encodeURIComponent(name)}`,
    { signal },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Unable to search this league.");
  return data;
}
