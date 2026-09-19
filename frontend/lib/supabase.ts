import { createClient } from '@supabase/supabase-js'
import { buildRoleInsightFallback, mapStoredRoleInsight, type PlayerRoleInsight } from '@/lib/player-role-insights'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  || ''

export const supabase = supabaseUrl && supabasePublicKey ? createClient(supabaseUrl, supabasePublicKey) : null

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), then redeploy.'
    )
  }
  return supabase
}

const DEFAULT_SEASON = '2026_27'
const CONFIGURED_SEASON = process.env.NEXT_PUBLIC_FPL_SEASON_KEY?.trim() || ''
const USE_PRECOMPUTED_ROLE_INSIGHTS = process.env.NEXT_PUBLIC_PLAYER_ROLE_INSIGHTS_PRECOMPUTED?.trim().toLowerCase() === 'true'
let cachedSeason: string | null = null
let seasonPromise: Promise<string> | null = null
let cachedPlayers: any[] | null = null
let cachedSeasonStats: { season: string; rows: any[] } | null = null
let seasonStatsPromise: Promise<any[]> | null = null
let cachedFixtureBase: { season: string; fixtures: any[]; teams: any[]; ranks: any[] } | null = null
let fixtureBasePromise: Promise<{ season: string; fixtures: any[]; teams: any[]; ranks: any[] }> | null = null
let cachedTeamRankings: { season: string; rows: any[] } | null = null
let teamRankingsPromise: Promise<any[]> | null = null
let cachedRoleInsights: { season: string; rows: PlayerRoleInsight[] } | null = null
let roleInsightsPromise: Promise<PlayerRoleInsight[]> | null = null

function safeNumber(value: any, fallback = 0) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function safeInt(value: any, fallback = 0) {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function normalizePosition(position: any) {
  const map: Record<string, { label: string; short: string }> = {
    '1': { label: 'Goalkeeper', short: 'GK' },
    '2': { label: 'Defender', short: 'DEF' },
    '3': { label: 'Midfielder', short: 'MID' },
    '4': { label: 'Forward', short: 'FWD' },
    Goalkeeper: { label: 'Goalkeeper', short: 'GK' },
    Defender: { label: 'Defender', short: 'DEF' },
    Midfielder: { label: 'Midfielder', short: 'MID' },
    Forward: { label: 'Forward', short: 'FWD' },
    GK: { label: 'Goalkeeper', short: 'GK' },
    DEF: { label: 'Defender', short: 'DEF' },
    MID: { label: 'Midfielder', short: 'MID' },
    FWD: { label: 'Forward', short: 'FWD' },
  }

  const key = String(position ?? '')
  return map[key] || { label: key, short: key }
}

function normalizeTeam(row: any) {
  const teamRecord = row?.teams && typeof row.teams === 'object' ? row.teams : row?.team && typeof row.team === 'object' ? row.team : {}
  const teamName = firstString(row?.team_name, row?.team, teamRecord?.name, row?.name)
  const teamShort = firstString(row?.team_short, teamRecord?.short_name, row?.short_name)

  return {
    team: teamName || teamShort,
    team_name: teamName || teamShort,
    team_short: teamShort,
  }
}

function mergeTeamJoin(row: any) {
  const team = normalizeTeam(row)
  return {
    ...row,
    ...team,
  }
}

function normalizePlayerRow(row: any) {
  const team = normalizeTeam(row)
  const webName = firstString(row?.web_name, row?.name, row?.player_name)
  const playerName = firstString(row?.player_name, webName)
  const position = safeInt(row?.position, 0)

  return {
    ...row,
    ...team,
    id: row?.id,
    fpl_id: row?.fpl_id ?? null,
    player_name: playerName,
    web_name: webName,
    name: webName || playerName,
    position,
    position_name: normalizePosition(position).label,
    position_short: normalizePosition(position).short,
    cost: safeNumber(row?.cost ?? row?.now_cost, 0),
    ownership: safeNumber(row?.ownership ?? row?.selected_by_percent, 0),
  }
}

async function getSeason() {
  // A configured season avoids an extra network round trip on every fresh page load.
  if (CONFIGURED_SEASON) {
    return CONFIGURED_SEASON
  }

  if (cachedSeason) {
    return cachedSeason
  }

  // Several page queries start together, so share one season lookup between them.
  if (!seasonPromise) {
    seasonPromise = (async () => {
      requireSupabase()

      const sources = ['team_rankings', 'fixtures', 'player_season_stats', 'player_gameweeks']
      for (const table of sources) {
        const { data } = await requireSupabase().from(table).select('season_key').order('season_key', { ascending: false }).limit(1)
        const season = data?.[0]?.season_key
        if (season) return season
      }

      return DEFAULT_SEASON
    })()
  }

  try {
    cachedSeason = await seasonPromise
    return cachedSeason
  } finally {
    seasonPromise = null
  }
}

async function getAllPlayersCached(limit = 1000) {
  if (cachedPlayers && cachedPlayers.length >= limit) {
    return cachedPlayers.slice(0, limit)
  }

  const rows = await getAllPlayers(limit)
  cachedPlayers = rows
  return rows
}

async function getTeamMap() {
  requireSupabase()

  const { data, error } = await requireSupabase().from('teams').select('id, name, short_name')
  if (error) {
    console.error('Error fetching teams:', error)
    return new Map<string, any>()
  }

  return new Map((data || []).map((team: any) => [team.id, team]))
}

function normalizeSeasonStatsRow(row: any) {
  const playerObj = Array.isArray(row?.players) ? row.players[0] : row?.players || {}
  const teamObj = Array.isArray(playerObj?.teams) ? playerObj.teams[0] : playerObj?.teams || {}
  const team = normalizeTeam({ team_name: teamObj?.name, team_short: teamObj?.short_name, team: teamObj?.name })
  const pos = normalizePosition(playerObj?.position)
  const games = Math.max(safeNumber(row?.gameweeks_played, 0), 1)
  const points = safeNumber(row?.total_points, 0)
  const goals = safeNumber(row?.goals, 0)
  const assists = safeNumber(row?.assists, 0)
  const xg = safeNumber(row?.xg, 0)
  const xa = safeNumber(row?.xa, 0)
  const form = safeNumber(row?.form, 0)
  const ownership = safeNumber(playerObj?.ownership, 0)
  const cost = safeNumber(playerObj?.cost, 0)
  const pointsPerGame = points / games
  const goalsPerGame = goals / games
  const assistsPerGame = assists / games
  const cleanSheets = safeNumber(row?.clean_sheets, 0)
  const cleanSheetRate = cleanSheets / games
  const defensiveContribution = safeNumber(row?.defensive_contribution, 0)
  const pvsxpTotal = safeNumber(row?.pvsxp_total, 0)
  const overPerfPer90 = safeNumber(row?.total_minutes, 0) > 0 ? (pvsxpTotal / (safeNumber(row?.total_minutes, 0) / 90)) : pvsxpTotal
  const attackerScore = goalsPerGame * 2 + assistsPerGame * 1.5 + pointsPerGame * 0.4 + form * 0.2
  const defenderScore = cleanSheetRate * 4 + defensiveContribution * 0.05 + pointsPerGame * 0.35 + form * 0.2
  const sustainableGap = Math.abs(goals - xg)
  const sustainable = goals > 0 && sustainableGap <= Math.max(2, goals * 0.35)
  const potentialScore = pointsPerGame * 0.6 + safeNumber(row?.xgi_per90, 0) * 12 + Math.max(0, 20 - ownership) * 0.2

  return {
    season_key: row?.season_key,
    player: firstString(playerObj?.web_name, playerObj?.player_name),
    player_name: firstString(playerObj?.player_name, playerObj?.web_name),
    web_name: firstString(playerObj?.web_name, playerObj?.player_name),
    team: team.team,
    team_name: team.team_name,
    team_short: team.team_short,
    position: pos.label,
    position_name: pos.label,
    points,
    totalPoints: points,
    ppg: pointsPerGame,
    points_per_game: pointsPerGame,
    goals,
    goalsPerGame: goalsPerGame,
    goals_per_game: goalsPerGame,
    assists,
    assistsPerGame: assistsPerGame,
    assists_per_game: assistsPerGame,
    xG: xg,
    xg,
    xA: xa,
    xa,
    xCS: cleanSheets,
    cleanSheets,
    clean_sheet_rate: cleanSheetRate,
    csRate: cleanSheetRate,
    tackles: safeNumber(row?.tackles, 0),
    dfc: defensiveContribution,
    defensiveContributions: defensiveContribution,
    defensive_contribution: defensiveContribution,
    price: cost,
    cost,
    ownership,
    selected_by_percent: ownership,
    pointsPerMillion: safeNumber(row?.points_per_million, cost > 0 ? points / cost : 0),
    points_per_million: safeNumber(row?.points_per_million, cost > 0 ? points / cost : 0),
    overperformance: pvsxpTotal,
    overperformance_per_90: overPerfPer90,
    sustainable,
    potentialScore,
    form,
    attacker_score: attackerScore,
    defender_score: defenderScore,
  }
}

function rankRows(rows: any[], key: string, desc = true) {
  const sorted = [...rows].sort((a, b) => {
    const delta = safeNumber(a?.[key], 0) - safeNumber(b?.[key], 0)
    return desc ? -delta : delta
  })

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }))
}

async function getSeasonStatsBase() {
  requireSupabase()

  const season = await getSeason()
  if (cachedSeasonStats?.season === season) return cachedSeasonStats.rows

  // All insight tabs are derived from the same season rows; fetch them only once.
  if (!seasonStatsPromise) {
    seasonStatsPromise = (async () => {
      const { data, error } = await requireSupabase()
        .from('player_season_stats')
        .select('season_key, player_id, gameweeks_played, total_minutes, total_points, goals, assists, xg, xa, xgi, shots, clean_sheets, defensive_contribution, tackles, points_per_million, pvsxp_total, form, xgi_per90, players!inner(player_name, web_name, position, cost, ownership, teams!left(name, short_name))')
        .eq('season_key', season)

      if (error) {
        throw new Error(`Failed to load player season stats: ${error.message}`)
      }

      return (data || [])
        .map(normalizeSeasonStatsRow)
        .filter((row) => row.player && row.team)
    })()
  }

  try {
    const rows = await seasonStatsPromise
    cachedSeasonStats = { season, rows }
    return rows
  } finally {
    seasonStatsPromise = null
  }
}

async function buildInsightsFallback(insightType: string, limit: number) {
  const base = await getSeasonStatsBase()

  let selected: any[] = []
  switch (insightType) {
    case 'goal_scorers':
      selected = rankRows(base.filter((r) => r.goals > 0), 'goals', true)
      break
    case 'assist_providers':
      selected = rankRows(base.filter((r) => r.assists > 0), 'assists', true)
      break
    case 'defensive_leaders':
      selected = rankRows(base.filter((r) => r.position === 'Goalkeeper' || r.position === 'Defender'), 'defender_score', true)
      break
    case 'value_players':
      selected = rankRows(base.filter((r) => r.pointsPerMillion > 0), 'pointsPerMillion', true)
      break
    case 'hidden_gems':
      selected = rankRows(base.filter((r) => r.ownership <= 20), 'potentialScore', true)
      break
    case 'overperformers':
      selected = rankRows(base.filter((r) => r.overperformance > 0), 'overperformance', true)
      break
    case 'underperformers':
      selected = rankRows(base.filter((r) => r.overperformance < 0), 'overperformance', false)
      break
    case 'sustainable_scorers':
      selected = rankRows(base.filter((r) => r.goals >= 3), 'sustainable', true)
      break
    case 'season_performers':
    default:
      selected = rankRows(base, 'points', true)
      break
  }

  return selected.slice(0, limit)
}

async function getFixtureBase() {
  requireSupabase()

  const season = await getSeason()
  if (cachedFixtureBase?.season === season) return cachedFixtureBase

  // Fixture screens need the same three datasets in different shapes. Sharing
  // this request prevents duplicate reads and browser connection starvation.
  if (!fixtureBasePromise) {
    fixtureBasePromise = (async () => {
      const [fixturesRes, teamsRes, ranksRes] = await Promise.all([
        requireSupabase()
          .from('fixtures')
          .select('id, season_key, gameweek, home_team_id, away_team_id, home_attack_fdr, home_defense_fdr, away_attack_fdr, away_defense_fdr, home_attacking_favorability, home_defensive_favorability, away_attacking_favorability, away_defensive_favorability, finished')
          .eq('season_key', season)
          .order('gameweek'),
        requireSupabase().from('teams').select('id, name, short_name'),
        requireSupabase()
          .from('team_rankings')
          .select('team_id, overall_rank, attack_rank, defense_rank, attack_score_5, defense_score_5, home_strength_10, away_strength_10')
          .eq('season_key', season),
      ])

      const error = fixturesRes.error || teamsRes.error || ranksRes.error
      if (error) throw new Error(`Failed to load fixture data: ${error.message}`)

      return {
        season,
        fixtures: fixturesRes.data || [],
        teams: teamsRes.data || [],
        ranks: ranksRes.data || [],
      }
    })()
  }

  try {
    const base = await fixtureBasePromise
    cachedFixtureBase = base
    return base
  } finally {
    fixtureBasePromise = null
  }
}

async function buildTeamFixtureSummaryFallback() {
  requireSupabase()

  const { fixtures: fixtureRows, teams } = await getFixtureBase()
  const teamMap = new Map(teams.map((t: any) => [t.id, t]))
  const byTeam = new Map<string, any[]>()

  // A daily sync can happen midway through a gameweek. Keep every unplayed
  // fixture, including matches later in the current round, in transfer plans.
  const futureRows = fixtureRows.filter((fixture: any) => fixture.finished !== true)
  const summaryRows = futureRows.length > 0 ? futureRows : fixtureRows

  for (const f of summaryRows) {
    // Attach the opponent before grouping so the UI can show the real fixture run,
    // rather than reducing each club to a single schedule score.
    const homeTeam = teamMap.get(f.home_team_id) || { name: '', short_name: '' }
    const awayTeam = teamMap.get(f.away_team_id) || { name: '', short_name: '' }
    const homeEntries = byTeam.get(f.home_team_id) || []
    homeEntries.push({
      gw: safeInt(f.gameweek, 0),
      isHome: true,
      opponent: awayTeam.name,
      opponentShort: awayTeam.short_name,
      attackDiff: safeNumber(f.home_attack_fdr, safeNumber(f.home_attacking_favorability, 0)),
      defenseDiff: safeNumber(f.home_defense_fdr, safeNumber(f.home_defensive_favorability, 0)),
      favorability: (safeNumber(f.home_attacking_favorability, 0) + safeNumber(f.home_defensive_favorability, 0)) / 2,
    })
    byTeam.set(f.home_team_id, homeEntries)

    const awayEntries = byTeam.get(f.away_team_id) || []
    awayEntries.push({
      gw: safeInt(f.gameweek, 0),
      isHome: false,
      opponent: homeTeam.name,
      opponentShort: homeTeam.short_name,
      attackDiff: safeNumber(f.away_attack_fdr, safeNumber(f.away_attacking_favorability, 0)),
      defenseDiff: safeNumber(f.away_defense_fdr, safeNumber(f.away_defensive_favorability, 0)),
      favorability: (safeNumber(f.away_attacking_favorability, 0) + safeNumber(f.away_defensive_favorability, 0)) / 2,
    })
    byTeam.set(f.away_team_id, awayEntries)
  }

  const avg = (rows: any[], key: string) => (rows.length > 0 ? rows.reduce((sum, r) => sum + safeNumber(r[key], 0), 0) / rows.length : 0)

  return Array.from(byTeam.entries()).map(([teamId, fixtures]) => {
    const ordered = [...fixtures].sort((a, b) => a.gw - b.gw)
    const nearTerm = ordered.slice(0, 5)
    const mediumTerm = ordered.slice(5, 10)
    const nearRating = avg(nearTerm, 'favorability')
    const mediumRating = mediumTerm.length > 0 ? avg(mediumTerm, 'favorability') : nearRating
    const fixtureSwing = mediumRating - nearRating
    const teamObj = teamMap.get(teamId) || { name: '', short_name: '' }
    const avgAttack = avg(nearTerm, 'attackDiff')
    const avgDefense = avg(nearTerm, 'defenseDiff')
    const favorableFixtures = nearTerm.filter((f) => (f.attackDiff + f.defenseDiff) / 2 <= 3).length

    return {
      team_id: teamId,
      team: teamObj.name,
      team_name: teamObj.name,
      team_short: teamObj.short_name,
      att: avgAttack,
      def: avgDefense,
      overall: (avgAttack + avgDefense) / 2,
      fixtures: favorableFixtures,
      // Keep the complete remaining run available to the transfer planner. The
      // page can then recalculate its ranking for the user's chosen horizon.
      upcomingFixtures: ordered.map((fixture) => ({
        gw: fixture.gw,
        opponent: fixture.opponent,
        opponentShort: fixture.opponentShort,
        isHome: fixture.isHome,
        difficulty: (fixture.attackDiff + fixture.defenseDiff) / 2,
        favorability: fixture.favorability,
      })),
      nearTermHomeFixtures: nearTerm.filter((f) => f.isHome).length,
      mediumTermHomeFixtures: mediumTerm.filter((f) => f.isHome).length,
      nearTermRating: nearRating,
      mediumTermRating: mediumRating,
      fixtureSwing,
      swingCategory: fixtureSwing > 0.25 ? 'Improving' : fixtureSwing < -0.25 ? 'Declining' : 'Stable',
      swingEmoji: fixtureSwing > 0.25 ? '📈' : fixtureSwing < -0.25 ? '📉' : '➡️',
      formContext: 'Derived from upcoming fixtures',
      avg_attack_difficulty: avgAttack,
      avg_defense_difficulty: avgDefense,
      overall_difficulty: (avgAttack + avgDefense) / 2,
      num_favorable_fixtures: favorableFixtures,
    }
  })
}

/**
 * Query player insights by type.
 */
export async function getPlayerInsights(insightType: string, limit = 100) {
  try {
    requireSupabase()

    // player_insights is not part of supabase_schema.sql; derive insights from
    // player_season_stats instead of waiting for a guaranteed 404 first.
    return await buildInsightsFallback(insightType, limit)
  } catch (err) {
    console.error(`Error in getPlayerInsights(${insightType}):`, err)
    throw err
  }
}

/**
 * Load the role-based player intelligence dataset in one request. During the
 * schema rollout, derive the same model from existing gameweek rows so the page
 * remains usable before the precomputed table is populated.
 */
export async function getPlayerRoleInsights(): Promise<PlayerRoleInsight[]> {
  requireSupabase()
  const season = await getSeason()
  if (cachedRoleInsights?.season === season) return cachedRoleInsights.rows

  if (!roleInsightsPromise) {
    roleInsightsPromise = (async () => {
      const teamRows = await getTeamRankingsBase()
      const defenseByTeam = new Map<string, number>()
      for (const team of teamRows) {
        const strength = safeNumber(team.defense_strength, 50)
        if (team.team_short) defenseByTeam.set(String(team.team_short).toUpperCase(), strength)
        if (team.team) defenseByTeam.set(String(team.team).toUpperCase(), strength)
      }

      if (USE_PRECOMPUTED_ROLE_INSIGHTS) {
        const stored = await requireSupabase()
          .from('player_role_insights')
          .select('*, players!inner(id, player_name, web_name, position, cost, ownership, is_active, teams!left(name, short_name))')
          .eq('season_key', season)
        if (stored.error) {
          throw new Error(`Failed to load precomputed player role insights: ${stored.error.message}`)
        }
        if (stored.data?.length) return stored.data
          .filter((row: any) => {
            const player = Array.isArray(row.players) ? row.players[0] : row.players
            return player?.is_active !== false
          })
          .map((row: any) => mapStoredRoleInsight(row, defenseByTeam))
      }

      const [players, gameweeks] = await Promise.all([
        getAllPlayersCached(5000),
        getAllRoleGameweeks(season),
      ])
      return buildRoleInsightFallback(players, gameweeks, defenseByTeam, season)
    })()
  }

  try {
    const rows = await roleInsightsPromise
    cachedRoleInsights = { season, rows }
    return rows
  } finally {
    roleInsightsPromise = null
  }
}

async function getAllRoleGameweeks(season: string) {
  const pageSize = 1000
  const rows: any[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await requireSupabase()
      .from('player_gameweeks')
      .select('player_id, gameweek, minutes, total_points, goals, assists, clean_sheet, xg, xa, xgi, shots_in_box, shots_on_target, chances_created, touches_opp_box, defensive_contribution, xgc')
      .eq('season_key', season)
      .order('gameweek')
      .order('player_id')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Failed to load player role insights: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

/**
 * Query players for search and comparison pages.
 */
export async function getAllPlayers(limit = 1000) {
  try {
    requireSupabase()

    const { data, error } = await requireSupabase()
      .from('players')
      .select('id, fpl_id, player_name, web_name, team_id, position, cost, ownership, is_active, teams!left(name, short_name)')
      .eq('is_active', true)
      .order('player_name')
      .limit(limit)

    if (error) {
      throw new Error(`Failed to load players: ${error.message}`)
    }

    const seen = new Set<string>()
    const teams = await getTeamMap()

    return (data || [])
      .map((row: any) => {
        const teamRow = row?.teams && typeof row.teams === 'object' ? row.teams : teams.get(row?.team_id) || {}
        return normalizePlayerRow({ ...row, team: teamRow.name, team_name: teamRow.name, team_short: teamRow.short_name })
      })
      .filter((row: any) => {
        const key = `${row.player_name}|${row.team_short}`
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })
  } catch (err) {
    console.error('Error in getAllPlayers:', err)
    throw err
  }
}

/**
 * Query player gameweek data.
 */
export async function getPlayerGameweeks(playerName: string, limitGws?: number) {
  try {
    requireSupabase()

    const search = playerName.trim()
    if (!search) return []

    const [exactWeb, exactName, fuzzyWeb, fuzzyName] = await Promise.all([
      requireSupabase().from('players').select('id, player_name, web_name').ilike('web_name', search).limit(1),
      requireSupabase().from('players').select('id, player_name, web_name').ilike('player_name', search).limit(1),
      requireSupabase().from('players').select('id, player_name, web_name').ilike('web_name', `%${search}%`).limit(1),
      requireSupabase().from('players').select('id, player_name, web_name').ilike('player_name', `%${search}%`).limit(1),
    ])

    const playerRow = exactWeb.data?.[0] || exactName.data?.[0] || fuzzyWeb.data?.[0] || fuzzyName.data?.[0]
    if (!playerRow?.id) {
      console.error(`Player "${playerName}" not found`)
      return []
    }

    const season = await getSeason()
    const { data, error } = await requireSupabase()
      .from('player_gameweeks')
      .select('*')
      .eq('season_key', season)
      .eq('player_id', playerRow.id)
      .order('gameweek')

    if (error) {
      throw new Error(`Failed to load gameweeks for ${playerName}: ${error.message}`)
    }

    let result = (data || []).map((row: any) => ({
      ...row,
      gameweek: safeInt(row.gameweek, 0),
      total_points: safeNumber(row.total_points, 0),
      minutes: safeNumber(row.minutes, 0),
      goals: safeNumber(row.goals, 0),
      assists: safeNumber(row.assists, 0),
      clean_sheets: row.clean_sheets ?? (row.clean_sheet ? 1 : 0),
      clean_sheet: row.clean_sheet ?? Boolean(row.clean_sheets),
      xG: safeNumber(row.xg, 0),
      xA: safeNumber(row.xa, 0),
      xGI: safeNumber(row.xgi, 0),
      xP: safeNumber(row.xp, 0),
      shots: safeNumber(row.shots, 0),
      shots_on_target: safeNumber(row.shots_on_target, 0),
      key_passes: safeNumber(row.chances_created, 0),
      touches: safeNumber(row.touches, 0),
      penalty_area_touches: safeNumber(row.touches_opp_box, 0),
      // The current schema has no carries-final-third metric; do not mislabel non-penalty goals as carries.
      carries_final_third: 0,
      defensive_contribution: safeNumber(row.defensive_contribution, 0),
      xGC: safeNumber(row.xgc, 0),
      goals_conceded: safeNumber(row.goals_conceded, 0),
    }))

    if (limitGws && result.length > limitGws) {
      result = result.slice(-limitGws)
    }

    return result
  } catch (err) {
    console.error(`Error in getPlayerGameweeks(${playerName}):`, err)
    throw err
  }
}

/**
 * Query player trend data for one or more players.
 */
export async function getPlayerTrends(playerNames: string[], limitGws?: number) {
  try {
    if (playerNames.length === 0) return {}
    requireSupabase()

    const players = await getAllPlayersCached(5000)
    const normalizedPlayers = playerNames
      .map((playerName) => {
        const lower = playerName.trim().toLowerCase()
        return players.find((player) => {
          const candidateNames = [player.player_name, player.web_name, player.name]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
          return candidateNames.includes(lower) || candidateNames.some((value) => value.includes(lower))
        })
      })
      .filter(Boolean)

    if (normalizedPlayers.length === 0) {
      return {}
    }

    const season = await getSeason()
    const playerIds = normalizedPlayers.map((player: any) => player.id)

    const [seasonStatsRes, gameweeksRes, fixturesRes] = await Promise.all([
      requireSupabase().from('player_season_stats').select('*').eq('season_key', season).in('player_id', playerIds),
      requireSupabase().from('player_gameweeks').select('*').eq('season_key', season).in('player_id', playerIds).order('gameweek'),
      // Select all fixture fields so the frontend remains compatible while the
      // additive score-column migration is being rolled out.
      requireSupabase().from('fixtures').select('*').eq('season_key', season).order('gameweek'),
    ])

    if (seasonStatsRes.error) {
      throw new Error(`Failed to load player season stats: ${seasonStatsRes.error.message}`)
    }
    if (gameweeksRes.error) {
      throw new Error(`Failed to load player gameweeks: ${gameweeksRes.error.message}`)
    }
    if (fixturesRes.error) {
      throw new Error(`Failed to load match results: ${fixturesRes.error.message}`)
    }

    const seasonStatsMap = new Map((seasonStatsRes.data || []).map((row: any) => [row.player_id, row]))
    const gameweekMap = new Map<string, any[]>()

    for (const row of gameweeksRes.data || []) {
      const list = gameweekMap.get(row.player_id) || []
      list.push(row)
      gameweekMap.set(row.player_id, list)
    }

    const resultByTeamAndGameweek = new Map<string, { teamScore: number; opponentScore: number }>()
    for (const fixture of fixturesRes.data || []) {
      if (fixture.home_score == null || fixture.away_score == null || fixture.finished === false) continue
      const gameweek = safeInt(fixture.gameweek, 0)
      const homeScore = safeInt(fixture.home_score, 0)
      const awayScore = safeInt(fixture.away_score, 0)
      resultByTeamAndGameweek.set(`${fixture.home_team_id}:${gameweek}`, { teamScore: homeScore, opponentScore: awayScore })
      resultByTeamAndGameweek.set(`${fixture.away_team_id}:${gameweek}`, { teamScore: awayScore, opponentScore: homeScore })
    }

    const result: Record<string, any> = {}

    normalizedPlayers.forEach((player: any) => {
      const seasonStats = seasonStatsMap.get(player.id) || {}
      let gameweeks = (gameweekMap.get(player.id) || []).map((row: any) => {
        const gameweek = safeInt(row.gameweek, 0)
        const matchResult = resultByTeamAndGameweek.get(`${player.team_id}:${gameweek}`)
        return {
          gameweek,
          opponent: row.opponent || '',
          was_home: row.was_home ?? null,
          match_score: matchResult ? `${matchResult.teamScore}-${matchResult.opponentScore}` : null,
          total_points: safeNumber(row.total_points, 0),
          minutes: safeNumber(row.minutes, 0),
          goals: safeNumber(row.goals, 0),
          assists: safeNumber(row.assists, 0),
          clean_sheets: row.clean_sheets ?? (row.clean_sheet ? 1 : 0),
          xG: safeNumber(row.xg, 0),
          xA: safeNumber(row.xa, 0),
          xGI: safeNumber(row.xgi, 0),
          xP: safeNumber(row.xp, 0),
          shots: safeNumber(row.shots, 0),
          shots_on_target: safeNumber(row.shots_on_target, 0),
          key_passes: safeNumber(row.chances_created, 0),
          touches: safeNumber(row.touches, 0),
          penalty_area_touches: safeNumber(row.touches_opp_box, 0),
          // The current schema has no carries-final-third metric; do not mislabel non-penalty goals as carries.
          carries_final_third: 0,
          defensive_contribution: safeNumber(row.defensive_contribution, 0),
          xGC: safeNumber(row.xgc, 0),
          goals_conceded: safeNumber(row.goals_conceded, 0),
        }
      })

      if (limitGws && gameweeks.length > limitGws) {
        gameweeks = gameweeks.slice(-limitGws)
      }

      const gamesPlayed = safeInt(seasonStats.gameweeks_played, gameweeks.length)
      const totalMinutes = safeInt(seasonStats.total_minutes, 0)
      const totalPoints = safeInt(seasonStats.total_points, 0)
      const totalGoals = safeInt(seasonStats.goals, 0)
      const totalAssists = safeInt(seasonStats.assists, 0)
      const totalXG = safeNumber(seasonStats.xg, 0)
      const totalXA = safeNumber(seasonStats.xa, 0)
      const totalXGI = safeNumber(seasonStats.xgi, 0)
      const totalXP = safeNumber(seasonStats.xp_total, 0)
      const totalShots = safeInt(seasonStats.shots, 0)
      const totalKeyPasses = safeInt(seasonStats.chances_created, 0)

      const avgMinutes = gamesPlayed > 0 ? totalMinutes / gamesPlayed : 0
      const avgPoints = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0
      const minutesPer90 = totalMinutes > 0 ? totalMinutes / 90 : 0

      result[player.web_name || player.player_name] = {
        player_name: player.player_name,
        team: player.team,
        team_short: player.team_short,
        position: player.position,
        web_name: player.web_name,
        cost: player.cost,
        ownership: player.ownership,
        form: {
          avg_points: safeNumber(seasonStats.form ?? avgPoints, avgPoints),
          avg_minutes: safeNumber(avgMinutes, avgMinutes),
          games_played: gamesPlayed,
        },
        total_stats: {
          games_played: gamesPlayed,
          total_points: totalPoints,
          total_goals: totalGoals,
          total_assists: totalAssists,
          total_xG: totalXG,
          total_xA: totalXA,
          total_xGI: totalXGI,
          total_xP: totalXP,
          total_minutes: totalMinutes,
          total_shots: totalShots,
          total_key_passes: totalKeyPasses,
        },
        per90_stats: {
          points_per_90: safeNumber(seasonStats.points_per90 ?? seasonStats.points_per_90 ?? (minutesPer90 > 0 ? totalPoints / minutesPer90 : 0), 0),
          goals_per_90: safeNumber(seasonStats.goals_per90 ?? seasonStats.goals_per_90 ?? (minutesPer90 > 0 ? totalGoals / minutesPer90 : 0), 0),
          assists_per_90: safeNumber(seasonStats.assists_per90 ?? seasonStats.assists_per_90 ?? (minutesPer90 > 0 ? totalAssists / minutesPer90 : 0), 0),
          xG_per_90: safeNumber(seasonStats.xg_per90 ?? seasonStats.xg_per_90, 0),
          xA_per_90: safeNumber(seasonStats.xa_per90 ?? seasonStats.xa_per_90, 0),
          xGI_per_90: safeNumber(seasonStats.xgi_per90 ?? seasonStats.xgi_per_90, 0),
          shots_per_90: safeNumber(seasonStats.shots_per90 ?? seasonStats.shots_per_90, 0),
          key_passes_per_90: safeNumber(seasonStats.key_passes_per_90 ?? seasonStats.chances_created_per_90 ?? (minutesPer90 > 0 ? totalKeyPasses / minutesPer90 : 0), 0),
        },
        gameweeks,
      }
    })

    return result
  } catch (err) {
    console.error('Error in getPlayerTrends:', err)
    throw err
  }
}

/**
 * Query fixtures in the grid shape used by the fixture analysis page.
 */
export async function getFixtures(gameweek?: number) {
  try {
    requireSupabase()

    const { fixtures: fixtureRows, teams, ranks } = await getFixtureBase()
    const teamMap = new Map(teams.map((team: any) => [team.id, team]))
    const rankMap = new Map(ranks.map((row: any) => [row.team_id, row]))

    // Calculate min/max of actual strength scores across all teams for normalization
    const allTeamsData = Array.from(rankMap.values())
    const attackScores = allTeamsData.map((r: any) => safeNumber(r.attack_score_5, 0))
    const defenseScores = allTeamsData.map((r: any) => safeNumber(r.defense_score_5, 0))
    
    const minAttack = Math.min(...attackScores, 0)
    const maxAttack = Math.max(...attackScores, 1)
    const minDefense = Math.min(...defenseScores, 0)
    const maxDefense = Math.max(...defenseScores, 1)

    // Utility function to normalize strength scores to 20-100% range
    const normalizeAttack = (score: number) => {
      const normalized = (safeNumber(score, 0) - minAttack) / (maxAttack - minAttack || 1) * 80 + 20
      return Math.max(20, Math.min(100, normalized))
    }
    const normalizeDefense = (score: number) => {
      const normalized = (safeNumber(score, 0) - minDefense) / (maxDefense - minDefense || 1) * 80 + 20
      return Math.max(20, Math.min(100, normalized))
    }

    return fixtureRows
      .filter((row: any) => !gameweek || safeInt(row.gameweek, 0) === gameweek)
      .map((row: any) => {
        const homeTeam = teamMap.get(row.home_team_id) || {}
        const awayTeam = teamMap.get(row.away_team_id) || {}
        
        // Get form-based strength scores and home/away modifiers
        const homeStats = rankMap.get(row.home_team_id) || {}
        const awayStats = rankMap.get(row.away_team_id) || {}
        
        // Normalize actual strength scores to 20-100% range
        const homeAttackPct = normalizeAttack(homeStats.attack_score_5)
        const homeDefensePct = normalizeDefense(homeStats.defense_score_5)
        const awayAttackPct = normalizeAttack(awayStats.attack_score_5)
        const awayDefensePct = normalizeDefense(awayStats.defense_score_5)
        
        // Apply home/away strength modifiers (±50 scale converted to ±10% adjustment)
        const homeStrengthMod = safeNumber(homeStats.home_strength_10, 0) / 5 // -50:50 → -10:10%
        const awayStrengthMod = safeNumber(awayStats.away_strength_10, 0) / 5
        
        // ATTACKING THREAT: Blend own attack strength (50%) with opponent weakness (50%)
        // Opponent weakness = inverse of opponent's defensive strength
        const homeAttackThreat = (homeAttackPct * 0.5 + (100 - awayDefensePct) * 0.5) + homeStrengthMod
        const awayAttackThreat = (awayAttackPct * 0.5 + (100 - homeDefensePct) * 0.5) + awayStrengthMod
        
        // DEFENSIVE ODDS: Blend own defense strength (50%) with opponent weakness (50%).
        // The home/away modifier is goal-scoring based, so applying it here would
        // incorrectly reduce a home team's defensive rating.
        const homeDefensiveOdds = homeDefensePct * 0.5 + (100 - awayAttackPct) * 0.5
        const awayDefensiveOdds = awayDefensePct * 0.5 + (100 - homeAttackPct) * 0.5
        
        // Clamp to 20-100% range
        const homeAttackFinal = Math.max(20, Math.min(100, homeAttackThreat))
        const homeDefenseFinal = Math.max(20, Math.min(100, homeDefensiveOdds))
        const awayAttackFinal = Math.max(20, Math.min(100, awayAttackThreat))
        const awayDefenseFinal = Math.max(20, Math.min(100, awayDefensiveOdds))

        return {
          gw: safeInt(row.gameweek, 0),
          gameweek: safeInt(row.gameweek, 0),
          finished: row.finished === true,
          fixture: `${homeTeam.name || 'Home'} vs ${awayTeam.name || 'Away'}`,
          home_team: {
            name: homeTeam.name || '',
            short_name: homeTeam.short_name || '',
            attacking_fixture_rating: Math.round(homeAttackFinal),
            defensive_fixture_rating: Math.round(homeDefenseFinal),
            rank: rankMap.get(row.home_team_id)?.overall_rank ?? null,
            attack_rank: rankMap.get(row.home_team_id)?.attack_rank ?? null,
            defense_rank: rankMap.get(row.home_team_id)?.defense_rank ?? null,
            fdr: {
              overall: Math.round((homeAttackFinal + homeDefenseFinal) / 2),
              attack: Math.round(homeAttackFinal),
              defense: Math.round(homeDefenseFinal),
            },
          },
          away_team: {
            name: awayTeam.name || '',
            short_name: awayTeam.short_name || '',
            attacking_fixture_rating: Math.round(awayAttackFinal),
            defensive_fixture_rating: Math.round(awayDefenseFinal),
            rank: rankMap.get(row.away_team_id)?.overall_rank ?? null,
            attack_rank: rankMap.get(row.away_team_id)?.attack_rank ?? null,
            defense_rank: rankMap.get(row.away_team_id)?.defense_rank ?? null,
            fdr: {
              overall: Math.round((awayAttackFinal + awayDefenseFinal) / 2),
              attack: Math.round(awayAttackFinal),
              defense: Math.round(awayDefenseFinal),
            },
          },
          favorability: homeAttackFinal - awayDefenseFinal > 5 ? (homeTeam.name || 'Home') : awayAttackFinal - homeDefenseFinal > 5 ? (awayTeam.name || 'Away') : 'Neutral',
          maxOpportunityRating: Math.max(homeAttackFinal, homeDefenseFinal, awayAttackFinal, awayDefenseFinal),
        }
      })
  } catch (err) {
    console.error('Error in getFixtures:', err)
    throw err
  }
}

/**
 * Query team rankings.
 */
async function getTeamRankingsBase() {
  requireSupabase()

  const season = await getSeason()
  if (cachedTeamRankings?.season === season) return cachedTeamRankings.rows

  // Ranking, quick-pick, and modal views all reuse the same team dataset.
  if (!teamRankingsPromise) {
    teamRankingsPromise = (async () => {
      const [rankingsRes, teamsRes] = await Promise.all([
        requireSupabase()
          .from('team_rankings')
          .select('team_id, overall_rank, attack_rank, defense_rank, overall_strength, attack_strength, defense_strength, goals_per_game, xg_per_game, goals_conceded_per_game, clean_sheet_rate, home_goals_per_game, away_goals_per_game, home_clean_sheet_rate, away_clean_sheet_rate')
          .eq('season_key', season),
        requireSupabase().from('teams').select('id, name, short_name'),
      ])

      const error = rankingsRes.error || teamsRes.error
      if (error) throw new Error(`Failed to load team rankings: ${error.message}`)

      const teamMap = new Map((teamsRes.data || []).map((team: any) => [team.id, team]))
      return (rankingsRes.data || [])
        .map((row: any) => {
          const team: any = teamMap.get(row.team_id) || {}
          const normalized = mergeTeamJoin({
            ...row,
            team: team.name || '',
            team_name: team.name || '',
            team_short: team.short_name || '',
          })

          return {
            ...normalized,
            expected_goals_per_game: safeNumber(row.xg_per_game, 0),
            xg_per_game: safeNumber(row.xg_per_game, 0),
            goals_conceded_per_game: safeNumber(row.goals_conceded_per_game, 0),
            clean_sheet_rate: safeNumber(row.clean_sheet_rate, 0),
            overall_rank: safeInt(row.overall_rank, 0),
            attack_rank: safeInt(row.attack_rank, 0),
            defense_rank: safeInt(row.defense_rank, 0),
            overall_strength: safeNumber(row.overall_strength, 0),
            attack_strength: safeNumber(row.attack_strength, 0),
            defense_strength: safeNumber(row.defense_strength, 0),
          }
        })
        .filter((row: any) => row.team)
    })()
  }

  try {
    const rows = await teamRankingsPromise
    cachedTeamRankings = { season, rows }
    return rows
  } finally {
    teamRankingsPromise = null
  }
}

export async function getTeamRankings(rankingType: string = 'overall') {
  try {
    const rows = await getTeamRankingsBase()

    const sortColumn = rankingType === 'attack' ? 'attack_rank' : rankingType === 'defense' ? 'defense_rank' : 'overall_rank'
    return [...rows].sort((a: any, b: any) => safeInt(a[sortColumn], 999) - safeInt(b[sortColumn], 999))
  } catch (err) {
    console.error(`Error in getTeamRankings(${rankingType}):`, err)
    throw err
  }
}

/**
 * Query team fixture summary.
 */
export async function getTeamFixtureSummary() {
  try {
    requireSupabase()

    // team_fixture_summary is also absent from the schema, so build the same
    // presentation model directly from fixtures and teams.
    return await buildTeamFixtureSummaryFallback()
  } catch (err) {
    console.error('Error in getTeamFixtureSummary:', err)
    throw err
  }
}

/**
 * Build attacking and defensive quick-pick groups.
 */
export async function getQuickPicks(kind: 'attacking' | 'defensive') {
  try {
    const [attackingInsights, defensiveInsights, attackRanks, defenseRanks] = await Promise.all([
      getPlayerInsights('goal_scorers', 200),
      getPlayerInsights('defensive_leaders', 200),
      getTeamRankings('attack'),
      getTeamRankings('defense'),
    ])

    const attackRankMap = new Map(attackRanks.map((row: any) => [row.team_short || row.team, row]))
    const defenseRankMap = new Map(defenseRanks.map((row: any) => [row.team_short || row.team, row]))

    const source = kind === 'attacking' ? attackingInsights : defensiveInsights
    const grouped = new Map<string, any>()

    for (const row of source) {
      const teamKey = firstString(row.team_short, row.team_name, row.team)
      if (!teamKey) continue

      const existing = grouped.get(teamKey) || {
        team: row.team || row.team_name || teamKey,
        short_name: row.team_short || teamKey,
        players: [],
      }

      existing.players.push({
        ...row,
        web_name: row.web_name || row.player_name || row.player,
        position_name: row.position_name || normalizePosition(row.position).label,
        now_cost: row.price ?? row.cost ?? 0,
        selected_by_percent: row.selected_by_percent ?? row.ownership ?? 0,
        points_per_game: row.points_per_game ?? row.points_pg ?? 0,
        goals_per_game: row.goals_per_game ?? row.goals_pg ?? 0,
        assists_per_game: row.assists_per_game ?? row.assists_pg ?? 0,
        form: row.form ?? 0,
        attacker_score: kind === 'attacking' ? safeNumber(row.attacker_score, 0) : 0,
        defender_score: kind === 'defensive' ? safeNumber(row.defender_score, 0) : 0,
        clean_sheet_rate: safeNumber(row.clean_sheet_rate, 0),
      })

      grouped.set(teamKey, existing)
    }

    return Array.from(grouped.values())
      .map((team: any) => {
        const rankRow = kind === 'attacking' ? attackRankMap.get(team.short_name) : defenseRankMap.get(team.short_name)
        return {
          ...team,
          attack_rank: kind === 'attacking' ? safeInt(rankRow?.attack_rank, 0) : undefined,
          defense_rank: kind === 'defensive' ? safeInt(rankRow?.defense_rank, 0) : undefined,
          attack_strength: kind === 'attacking' ? safeNumber(rankRow?.attack_strength, 0) : undefined,
          defense_strength: kind === 'defensive' ? safeNumber(rankRow?.defense_strength, 0) : undefined,
        }
      })
      .sort((a: any, b: any) => {
        const aRank = kind === 'attacking' ? safeInt(a.attack_rank, 999) : safeInt(a.defense_rank, 999)
        const bRank = kind === 'attacking' ? safeInt(b.attack_rank, 999) : safeInt(b.defense_rank, 999)
        return aRank - bRank
      })
  } catch (err) {
    console.error(`Error in getQuickPicks(${kind}):`, err)
    throw err
  }
}

/**
 * Get dashboard summary.
 */
export async function getDashboardSummary() {
  try {
    requireSupabase()

    const { data, error } = await requireSupabase()
      .from('dashboard_summary')
      .select('*')
      .limit(1)

    if (error) {
      throw error
    }

    const row = data?.[0] || {}

    return {
      total_players: safeInt(row.total_players, 0),
      total_teams: safeInt(row.total_teams, 0),
      total_gameweeks: safeInt(row.latest_gameweek, 0),
      last_synced_at: row.last_updated || null,
      generated_at: new Date().toISOString(),
    }
  } catch (err) {
    console.error('Error in getDashboardSummary:', err)
    throw err
  }
}


/**
 * Lightweight player pool for the comparison page.
 * Only returns active players who have actually recorded minutes in the current season.
 */
export async function getComparisonPlayers() {
  try {
    const [players, season] = await Promise.all([getAllPlayersCached(5000), getSeason()])
    if (!players.length) return []

    const { data, error } = await requireSupabase()
      .from('player_season_stats')
      .select('player_id, total_minutes, total_points, gameweeks_played, form, xgi_per90, xg_per90, xa_per90, shots_per90')
      .eq('season_key', season)

    // Do not send every active player UUID through a PostgREST `in` filter.
    // The active pool currently contains hundreds of players, which makes the
    // generated GET URL large enough for the API gateway to reject with HTTP 400.
    // Season stats are already scoped to one season and are cheap to join here.

    if (error) {
      throw new Error(`Failed to load comparison player pool: ${error.message}`)
    }

    const statsByPlayer = new Map((data || []).map((row: any) => [row.player_id, row]))

    return players
      .map((player: any) => {
        const stats: any = statsByPlayer.get(player.id) || {}
        return {
          ...player,
          total_minutes: safeInt(stats.total_minutes, 0),
          total_points: safeInt(stats.total_points, 0),
          gameweeks_played: safeInt(stats.gameweeks_played, 0),
          form: safeNumber(stats.form, 0),
          xgi_per90: safeNumber(stats.xgi_per90, 0),
          xg_per90: safeNumber(stats.xg_per90, 0),
          xa_per90: safeNumber(stats.xa_per90, 0),
          shots_per90: safeNumber(stats.shots_per90, 0),
        }
      })
      .filter((player: any) => player.total_minutes > 0)
      .sort((a: any, b: any) => {
        if (b.total_minutes !== a.total_minutes) return b.total_minutes - a.total_minutes
        return b.total_points - a.total_points
      })
  } catch (err) {
    console.error('Error in getComparisonPlayers:', err)
    throw err
  }
}
