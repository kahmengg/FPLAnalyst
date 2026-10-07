export type ImportedPlayer = {
  element: number;
  name: string;
  club: string;
  position: number;
  price: number;
  status: string;
  news: string;
  order: number;
  captain: boolean;
  viceCaptain: boolean;
};
export type ImportedTeam = {
  entry: number;
  name: string;
  season: string;
  gameweek: number;
  fetchedAt: string;
  players: ImportedPlayer[];
};

export function parseEntryId(value: string): number | null {
  const text = value.trim();
  let id = text;
  if (!/^\d+$/.test(text)) {
    try {
      const url = new URL(text);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "fantasy.premierleague.com"
      )
        return null;
      id = url.pathname.match(/(?:^|\/)entry\/(\d+)(?:\/|$)/)?.[1] ?? "";
    } catch {
      return null;
    }
  }
  const entry = Number(id);
  return Number.isSafeInteger(entry) && entry > 0 && entry <= 100_000_000
    ? entry
    : null;
}

export async function importTeam(
  entry: number,
  signal?: AbortSignal,
): Promise<ImportedTeam> {
  const response = await fetch(`/api/fpl-team?entry=${entry}`, { signal });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to import this team.");
  return result as ImportedTeam;
}
