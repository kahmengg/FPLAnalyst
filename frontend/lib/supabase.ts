import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const DEFAULT_SEASON = '2025_26'
let cachedSeason: string | null = null
let cachedPlayers: any[] | null = null

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

function normalizeInsightRow(row: any) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  const team = normalizeTeam({ ...row, ...payload })
  const position = firstString(row?.position, payload?.position, payload?.position_name)
  const playerName = firstString(row?.player_name, row?.web_name, payload?.player, payload?.name)
  const webName = firstString(row?.web_name, payload?.web_name, playerName)

  return {
    ...payload,
    ...row,
    ...team,
    player: firstString(row?.player, payload?.player, playerName, webName),
    player_name: playerName || webName,
    web_name: webName || playerName,
    name: webName || playerName,
    position,
    position_name: firstString(payload?.position_name, row?.position_name, position),
    price: safeNumber(row?.price ?? payload?.price ?? row?.cost, 0),
    ownership: safeNumber(row?.ownership ?? payload?.ownership ?? row?.selected_by_percent, 0),
    points_per_game: safeNumber(payload?.points_per_game ?? row?.points_per_game, 0),
    goals_per_game: safeNumber(payload?.goals_per_game ?? row?.goals_per_game, 0),
    assists_per_game: safeNumber(payload?.assists_per_game ?? row?.assists_per_game, 0),
    clean_sheet_rate: safeNumber(payload?.clean_sheet_rate ?? row?.clean_sheet_rate, 0),
    selected_by_percent: safeNumber(payload?.selected_by_percent ?? row?.selected_by_percent ?? row?.ownership, 0),
    form: safeNumber(payload?.form ?? row?.form, 0),
    attacker_score: safeNumber(payload?.attacker_score ?? row?.attacker_score, 0),
    defender_score: safeNumber(payload?.defender_score ?? row?.defender_score, 0),
    points: safeNumber(row?.points ?? payload?.points, 0),
    team: team.team,
    team_name: team.team_name,
    team_short: team.team_short,
  }
}

function dedupeInsights(rows: any[]) {
  const seen = new Map<string, any>()

  for (const row of rows) {
    const key = [row.insight_type || '', row.player_name || row.web_name || row.player || '', row.team_short || row.team || ''].join('|')
    const existing = seen.get(key)

    if (!existing) {
      seen.set(key, row)
      continue
    }

    const existingCreated = String(existing.created_at || '')
    const candidateCreated = String(row.created_at || '')
    if (candidateCreated >= existingCreated) {
      seen.set(key, row)
    }
  }

  return Array.from(seen.values())
}

async function getSeason() {
  if (cachedSeason) {
    return cachedSeason
  }

  if (!supabase) {
    cachedSeason = DEFAULT_SEASON
    return cachedSeason
  }

  const sources = ['team_rankings', 'fixtures', 'player_season_stats', 'player_gameweeks', 'player_insights']
  for (const table of sources) {
    const { data } = await supabase.from(table).select('season_key').order('season_key', { ascending: false }).limit(1)
    const season = data?.[0]?.season_key
    if (season) {
      cachedSeason = season
      return season
    }
  }

  cachedSeason = DEFAULT_SEASON
  return cachedSeason
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
  if (!supabase) return new Map<string, any>()

  const { data, error } = await supabase.from('teams').select('id, name, short_name')
  if (error) {
    console.error('Error fetching teams:', error)
    return new Map<string, any>()
  }

  return new Map((data || []).map((team: any) => [team.id, team]))
}

async function getTeamRankMap() {
  if (!supabase) return new Map<string, any>()

  const season = await getSeason()
  const { data, error } = await supabase
    .from('team_rankings')
    .select('team_id, overall_rank, attack_rank, defense_rank, overall_strength, attack_strength, defense_strength, goals_per_game, xg_per_game, goals_conceded_per_game, clean_sheet_rate, home_goals_per_game, away_goals_per_game, home_clean_sheet_rate, away_clean_sheet_rate, season_key')
    .eq('season_key', season)

  if (error) {
    console.error('Error fetching team rankings for map:', error)
    return new Map<string, any>()
  }

  return new Map((data || []).map((row: any) => [row.team_id, row]))
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

async function buildInsightsFallback(insightType: string, limit: number) {
  if (!supabase) return []

  const season = await getSeason()
  const { data, error } = await supabase
    .from('player_season_stats')
    .select('season_key, player_id, gameweeks_played, total_minutes, total_points, goals, assists, xg, xa, xgi, shots, clean_sheets, defensive_contribution, tackles, points_per_million, pvsxp_total, form, xgi_per90, players!inner(player_name, web_name, position, cost, ownership, teams!left(name, short_name))')
    .eq('season_key', season)

  if (error) {
    console.error(`Fallback insight query failed (${insightType}):`, error)
    return []
  }

  const base = (data || [])
    .map(normalizeSeasonStatsRow)
    .filter((row) => row.player && row.team)

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

async function buildTeamFixtureSummaryFallback() {
  if (!supabase) return []

  const season = await getSeason()
  const [fixturesRes, teamsRes] = await Promise.all([
    supabase
      .from('fixtures')
      .select('season_key, gameweek, home_team_id, away_team_id, home_attack_fdr, home_defense_fdr, away_attack_fdr, away_defense_fdr, home_attacking_favorability, home_defensive_favorability, away_attacking_favorability, away_defensive_favorability')
      .eq('season_key', season)
      .order('gameweek'),
    supabase.from('teams').select('id, name, short_name'),
  ])

  if (fixturesRes.error) {
    console.error('Fallback fixture summary query failed:', fixturesRes.error)
    return []
  }

  const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t]))
  const byTeam = new Map<string, any[]>()

  for (const f of fixturesRes.data || []) {
    const homeEntries = byTeam.get(f.home_team_id) || []
    homeEntries.push({
      gw: safeInt(f.gameweek, 0),
      isHome: true,
      attackDiff: safeNumber(f.home_attack_fdr, safeNumber(f.home_attacking_favorability, 0)),
      defenseDiff: safeNumber(f.home_defense_fdr, safeNumber(f.home_defensive_favorability, 0)),
      favorability: (safeNumber(f.home_attacking_favorability, 0) + safeNumber(f.home_defensive_favorability, 0)) / 2,
    })
    byTeam.set(f.home_team_id, homeEntries)

    const awayEntries = byTeam.get(f.away_team_id) || []
    awayEntries.push({
      gw: safeInt(f.gameweek, 0),
      isHome: false,
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
    const avgAttack = avg(ordered, 'attackDiff')
    const avgDefense = avg(ordered, 'defenseDiff')

    return {
      team_id: teamId,
      team: teamObj.name,
      team_name: teamObj.name,
      team_short: teamObj.short_name,
      att: avgAttack,
      def: avgDefense,
      overall: (avgAttack + avgDefense) / 2,
      fixtures: ordered.filter((f) => (f.attackDiff + f.defenseDiff) / 2 <= 3).length,
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
      num_favorable_fixtures: ordered.filter((f) => (f.attackDiff + f.defenseDiff) / 2 <= 3).length,
    }
  })
}

/**
 * Query player insights by type.
 */
export async function getPlayerInsights(insightType: string, limit = 100) {
  try {
    if (!supabase) return []

    const season = await getSeason()
    const { data, error } = await supabase
      .from('player_insights')
      .select('*')
      .eq('season_key', season)
      .eq('insight_type', insightType)
      .order('rank')
      .limit(Math.max(limit * 5, limit))

    if (error) {
      if (String(error.message || '').toLowerCase().includes('could not find the table')) {
        return await buildInsightsFallback(insightType, limit)
      }

      console.error(`Error fetching ${insightType}:`, error)
      return []
    }

    if (!data || data.length === 0) {
      return await buildInsightsFallback(insightType, limit)
    }

    const normalized = (data || []).map(normalizeInsightRow)
    const deduped = dedupeInsights(normalized)
    deduped.sort((a, b) => safeInt(a.rank, 9999) - safeInt(b.rank, 9999) || safeNumber(b.points, 0) - safeNumber(a.points, 0))
    return deduped.slice(0, limit)
  } catch (err) {
    console.error(`Error in getPlayerInsights(${insightType}):`, err)
    return []
  }
}

/**
 * Query players for search and comparison pages.
 */
export async function getAllPlayers(limit = 1000) {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('players')
      .select('id, fpl_id, player_name, web_name, team_id, position, cost, ownership, is_active, teams!left(name, short_name)')
      .eq('is_active', true)
      .order('player_name')
      .limit(limit)

    if (error) {
      console.error('Error fetching players:', error)
      return []
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
    return []
  }
}

/**
 * Query player gameweek data.
 */
export async function getPlayerGameweeks(playerName: string, limitGws?: number) {
  try {
    if (!supabase) return []

    const search = playerName.trim()
    if (!search) return []

    const [exactWeb, exactName, fuzzyWeb, fuzzyName] = await Promise.all([
      supabase.from('players').select('id, player_name, web_name').ilike('web_name', search).limit(1),
      supabase.from('players').select('id, player_name, web_name').ilike('player_name', search).limit(1),
      supabase.from('players').select('id, player_name, web_name').ilike('web_name', `%${search}%`).limit(1),
      supabase.from('players').select('id, player_name, web_name').ilike('player_name', `%${search}%`).limit(1),
    ])

    const playerRow = exactWeb.data?.[0] || exactName.data?.[0] || fuzzyWeb.data?.[0] || fuzzyName.data?.[0]
    if (!playerRow?.id) {
      console.error(`Player "${playerName}" not found`)
      return []
    }

    const season = await getSeason()
    const { data, error } = await supabase
      .from('player_gameweeks')
      .select('*')
      .eq('season_key', season)
      .eq('player_id', playerRow.id)
      .order('gameweek')

    if (error) {
      console.error(`Error fetching gameweeks for ${playerName}:`, error)
      return []
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
      carries_final_third: safeNumber(row.non_penalty_goals, 0),
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
    return []
  }
}

/**
 * Query player trend data for one or more players.
 */
export async function getPlayerTrends(playerNames: string[], limitGws?: number) {
  try {
    if (!supabase || playerNames.length === 0) return {}

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

    const [seasonStatsRes, gameweeksRes] = await Promise.all([
      supabase.from('player_season_stats').select('*').eq('season_key', season).in('player_id', playerIds),
      supabase.from('player_gameweeks').select('*').eq('season_key', season).in('player_id', playerIds).order('gameweek'),
    ])

    if (seasonStatsRes.error) {
      console.error('Error fetching player season stats:', seasonStatsRes.error)
    }
    if (gameweeksRes.error) {
      console.error('Error fetching player gameweeks:', gameweeksRes.error)
    }

    const seasonStatsMap = new Map((seasonStatsRes.data || []).map((row: any) => [row.player_id, row]))
    const gameweekMap = new Map<string, any[]>()

    for (const row of gameweeksRes.data || []) {
      const list = gameweekMap.get(row.player_id) || []
      list.push(row)
      gameweekMap.set(row.player_id, list)
    }

    const result: Record<string, any> = {}

    normalizedPlayers.forEach((player: any) => {
      const seasonStats = seasonStatsMap.get(player.id) || {}
      let gameweeks = (gameweekMap.get(player.id) || []).map((row: any) => ({
        gameweek: safeInt(row.gameweek, 0),
        opponent: row.opponent || '',
        was_home: row.was_home ?? null,
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
        carries_final_third: safeNumber(row.non_penalty_goals, 0),
        defensive_contribution: safeNumber(row.defensive_contribution, 0),
        xGC: safeNumber(row.xgc, 0),
        goals_conceded: safeNumber(row.goals_conceded, 0),
      }))

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
          key_passes_per_90: safeNumber(seasonStats.key_passes_per_90 ?? seasonStats.chances_created_per_90, 0),
        },
        gameweeks,
      }
    })

    return result
  } catch (err) {
    console.error('Error in getPlayerTrends:', err)
    return {}
  }
}

/**
 * Query fixtures in the grid shape used by the fixture analysis page.
 */
export async function getFixtures(gameweek?: number) {
  try {
    if (!supabase) return []

    const season = await getSeason()
    const [fixturesRes, teamsRes, ranksRes] = await Promise.all([
      supabase
        .from('fixtures')
        .select('id, season_key, gameweek, home_team_id, away_team_id')
        .eq('season_key', season)
        .order('gameweek'),
      supabase.from('teams').select('id, name, short_name'),
      supabase
        .from('team_rankings')
        .select('team_id, overall_rank, attack_score_5, defense_score_5, home_strength_10, away_strength_10')
        .eq('season_key', season),
    ])

    if (fixturesRes.error) {
      console.error('Error fetching fixtures:', fixturesRes.error)
      return []
    }

    const teamMap = new Map((teamsRes.data || []).map((team: any) => [team.id, team]))
    const rankMap = new Map((ranksRes.data || []).map((row: any) => [row.team_id, row]))

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

    return (fixturesRes.data || [])
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
        
        // DEFENSIVE ODDS: Blend own defense strength (50%) with opponent weakness (50%)
        // Opponent weakness = inverse of opponent's attacking strength
        const homeDefensiveOdds = (homeDefensePct * 0.5 + (100 - awayAttackPct) * 0.5) - homeStrengthMod
        const awayDefensiveOdds = (awayDefensePct * 0.5 + (100 - homeAttackPct) * 0.5) - awayStrengthMod
        
        // Clamp to 20-100% range
        const homeAttackFinal = Math.max(20, Math.min(100, homeAttackThreat))
        const homeDefenseFinal = Math.max(20, Math.min(100, homeDefensiveOdds))
        const awayAttackFinal = Math.max(20, Math.min(100, awayAttackThreat))
        const awayDefenseFinal = Math.max(20, Math.min(100, awayDefensiveOdds))

        return {
          gw: safeInt(row.gameweek, 0),
          gameweek: safeInt(row.gameweek, 0),
          fixture: `${homeTeam.name || 'Home'} vs ${awayTeam.name || 'Away'}`,
          home_team: {
            name: homeTeam.name || '',
            short_name: homeTeam.short_name || '',
            attacking_fixture_rating: Math.round(homeAttackFinal),
            defensive_fixture_rating: Math.round(homeDefenseFinal),
            rank: rankMap.get(row.home_team_id)?.overall_rank ?? null,
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
    return []
  }
}

/**
 * Query team rankings.
 */
export async function getTeamRankings(rankingType: string = 'overall') {
  try {
    if (!supabase) return []

    const season = await getSeason()
    const [rankingsRes, teamsRes] = await Promise.all([
      supabase
        .from('team_rankings')
        .select('team_id, overall_rank, attack_rank, defense_rank, overall_strength, attack_strength, defense_strength, goals_per_game, xg_per_game, goals_conceded_per_game, clean_sheet_rate, home_goals_per_game, away_goals_per_game, home_clean_sheet_rate, away_clean_sheet_rate')
        .eq('season_key', season),
      supabase.from('teams').select('id, name, short_name'),
    ])

    if (rankingsRes.error) {
      console.error(`Error fetching ${rankingType} rankings:`, rankingsRes.error)
      return []
    }

    const teamMap = new Map((teamsRes.data || []).map((team: any) => [team.id, team]))

    const rows = (rankingsRes.data || [])
      .map((row: any) => {
        const team = teamMap.get(row.team_id) || {}
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

    const sortColumn = rankingType === 'attack' ? 'attack_rank' : rankingType === 'defense' ? 'defense_rank' : 'overall_rank'
    return rows.sort((a: any, b: any) => safeInt(a[sortColumn], 999) - safeInt(b[sortColumn], 999))
  } catch (err) {
    console.error(`Error in getTeamRankings(${rankingType}):`, err)
    return []
  }
}

/**
 * Query team fixture summary.
 */
export async function getTeamFixtureSummary() {
  try {
    if (!supabase) return []

    const season = await getSeason()
    const [summaryRes, teamsRes] = await Promise.all([
      supabase.from('team_fixture_summary').select('*').eq('season_key', season),
      supabase.from('teams').select('id, name, short_name'),
    ])

    if (summaryRes.error) {
      if (String(summaryRes.error.message || '').toLowerCase().includes('could not find the table')) {
        return await buildTeamFixtureSummaryFallback()
      }

      console.error('Error fetching team fixture summary:', summaryRes.error)
      return []
    }

    if (!summaryRes.data || summaryRes.data.length === 0) {
      return await buildTeamFixtureSummaryFallback()
    }

    const teamMap = new Map((teamsRes.data || []).map((team: any) => [team.id, team]))

    return (summaryRes.data || []).map((row: any) => {
      const team = teamMap.get(row.team_id) || {}
      const normalized = mergeTeamJoin({
        ...row,
        team: row.team || team.name || '',
        team_name: row.team_name || team.name || '',
        team_short: row.team_short || team.short_name || '',
      })

      return {
        ...normalized,
        att: safeNumber(row.avg_attack_difficulty ?? row.att ?? row.attack_avg ?? 0, 0),
        def: safeNumber(row.avg_defense_difficulty ?? row.def ?? row.defense_avg ?? 0, 0),
        overall: safeNumber(row.overall_difficulty ?? row.overall ?? 0, 0),
        fixtures: safeNumber(row.num_favorable_fixtures ?? row.fixtures ?? 0, 0),
        nearTermHomeFixtures: safeInt(row.near_term_home_fixtures ?? row.nearTermHomeFixtures, 0),
        mediumTermHomeFixtures: safeInt(row.medium_term_home_fixtures ?? row.mediumTermHomeFixtures, 0),
        nearTermRating: safeNumber(row.near_term_rating ?? row.nearTermRating ?? 0, 0),
        mediumTermRating: safeNumber(row.medium_term_rating ?? row.mediumTermRating ?? 0, 0),
        fixtureSwing: safeNumber(row.fixture_swing ?? row.fixtureSwing ?? 0, 0),
        swingCategory: firstString(row.swing_category, row.swingCategory),
        swingEmoji: firstString(row.swing_emoji, row.swingEmoji),
        formContext: firstString(row.form_context, row.formContext),
        avg_attack_difficulty: safeNumber(row.avg_attack_difficulty ?? row.att ?? 0, 0),
        avg_defense_difficulty: safeNumber(row.avg_defense_difficulty ?? row.def ?? 0, 0),
        overall_difficulty: safeNumber(row.overall_difficulty ?? row.overall ?? 0, 0),
        num_favorable_fixtures: safeNumber(row.num_favorable_fixtures ?? row.fixtures ?? 0, 0),
      }
    })
  } catch (err) {
    console.error('Error in getTeamFixtureSummary:', err)
    return []
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
    return []
  }
}

/**
 * Get dashboard summary.
 */
export async function getDashboardSummary() {
  try {
    if (!supabase) {
      return {
        total_players: 0,
        total_teams: 0,
        total_gameweeks: 0,
        last_synced_at: null,
        generated_at: new Date().toISOString(),
      }
    }

    const { data, error } = await supabase
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
    return {
      total_players: 0,
      total_teams: 0,
      total_gameweeks: 0,
      last_synced_at: null,
      generated_at: new Date().toISOString(),
    }
  }
}
