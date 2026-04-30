const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000"

type QueryValue = string | number | undefined | null

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(path, API_BASE_URL)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function fetchJson<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export interface HealthResponse {
  status: string
  total_players: number
  total_teams: number
  latest_gameweek: number
  last_updated: string | null
}

export interface Player {
  id: string
  fpl_id: number
  name: string
  team: string
  team_short: string
  position: 1 | 2 | 3 | 4
  cost: number
  ownership: number
  total_points: number
  total_minutes: number
  gameweeks_played: number
  goals: number
  assists: number
  xg: number
  xa: number
  xgi: number
  xgi_per90: number
  xg_per90: number
  shots: number
  clean_sheets: number
  xgc: number
  defensive_contribution: number
  points_per_million: number
  points_per90: number
  pvsxp_total: number
  form: number
  last_gw_points: number
  home_points: number
  away_points: number
  home_xg: number
  away_xg: number
}

export interface PlayerListResponse {
  players: Player[]
  count: number
}

export interface GameweekEntry {
  player_id: string
  gameweek: number
  opponent: string
  was_home: boolean
  total_points: number
  minutes: number
  goals: number
  assists: number
  clean_sheet: boolean
  xg: number
  xa: number
  xgi: number
  shots: number
  shots_on_target: number
  chances_created: number
  xgc: number
  goals_conceded: number
  defensive_contribution: number
  xp: number
  pvsxp: number
  now_cost: number
  selected_by_percent: number
}

export interface Team {
  id: string
  name: string
  short_name: string
  overall_rank: number
  attack_rank: number
  defense_rank: number
  overall_strength: number
  attack_strength: number
  defense_strength: number
  goals_per_game: number
  xg_per_game: number
  shots_per_game: number
  goals_conceded_per_game: number
  xgc_per_game: number
  clean_sheet_rate: number
  home_goals_per_game: number
  away_goals_per_game: number
  home_xg_per_game: number
  away_xg_per_game: number
  home_clean_sheet_rate: number
  away_clean_sheet_rate: number
}

export interface TeamPlayer extends Player {}

export interface FixtureGridCell {
  opponent: string
  home: boolean
  attack_fdr: number
  defense_fdr: number
  attack_fav: number
  defense_fav: number
}

export interface FixtureGridResponse {
  gameweeks: number[]
  teams: Record<string, Record<string, FixtureGridCell>>
}

export interface FixtureListItem {
  gw: number
  gameweek: number
  home_team_short: string
  away_team_short: string
  home_team: string
  away_team: string
  home_attack_fdr: number
  home_defense_fdr: number
  away_attack_fdr: number
  away_defense_fdr: number
  home_attack_fav?: number
  home_defense_fav?: number
  away_attack_fav?: number
  away_defense_fav?: number
}

export async function getHealth() {
  return fetchJson<HealthResponse>("/api/health")
}

export async function getPlayers(params: {
  position?: string
  team?: string
  min_mins?: number
  sort?: string
  order?: string
  limit?: number
  offset?: number
} = {}) {
  return fetchJson<PlayerListResponse>("/api/players", params)
}

export async function getPlayerGameweeks(playerId: string, last = 8) {
  return fetchJson<{ gameweeks: GameweekEntry[] }>(`/api/players/${playerId}/gameweeks`, { last })
}

export async function getTeams(sort = "overall_rank", order = "asc") {
  return fetchJson<{ teams: Team[] }>("/api/teams", { sort, order })
}

export async function getTeamPlayers(teamId: string, params: { position?: string; sort?: string } = {}) {
  return fetchJson<{ players: TeamPlayer[] }>(`/api/teams/${teamId}/players`, params)
}

export async function getFixtures(params: { gw?: number; team?: string } = {}) {
  return fetchJson<{ fixtures: FixtureListItem[] }>("/api/fixtures", params)
}

export async function getFixtureGrid() {
  return fetchJson<FixtureGridResponse>("/api/fixtures/grid")
}

export function formatLastUpdated(value: string | null | undefined) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
}

export function positionLabel(position: 1 | 2 | 3 | 4 | number | string | null | undefined) {
  switch (String(position)) {
    case "1":
      return "GK"
    case "2":
      return "DEF"
    case "3":
      return "MID"
    case "4":
      return "FWD"
    default:
      return String(position ?? "")
  }
}

export function teamBadgeClass(shortName: string) {
  const palette: Record<string, string> = {
    ARS: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    AVL: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    BOU: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
    BRE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    BHA: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    BUR: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    CHE: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    CRY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
    EVE: "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200",
    FUL: "bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200",
    IPS: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
    LEI: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    LEE: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    LIV: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    MCI: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    MUN: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    NEW: "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200",
    NFO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    SOU: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    TOT: "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200",
    WHU: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    WOL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  }

  return palette[shortName] || "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200"
}

export function fdrClass(value: number) {
  if (value <= 2) return "bg-emerald-500 text-white"
  if (value === 3) return "bg-amber-400 text-slate-950"
  if (value === 4) return "bg-orange-500 text-white"
  return "bg-red-600 text-white"
}
