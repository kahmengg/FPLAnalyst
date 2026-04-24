import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials are not configured. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Query player insights by type
 */
export async function getPlayerInsights(insightType: string) {
  try {
    const { data, error } = await supabase
      .from('player_insights')
      .select('*')
      .eq('insight_type', insightType)
      .order('rank')

    if (error) {
      console.error(`Error fetching ${insightType}:`, error)
      return []
    }

    return data || []
  } catch (err) {
    console.error(`Error in getPlayerInsights(${insightType}):`, err)
    return []
  }
}

/**
 * Query fixtures
 */
export async function getFixtures(gameweek?: number) {
  try {
    let query = supabase
      .from('fixtures')
       .select('*')
      .order('gameweek')

    if (gameweek) {
      query = query.eq('gameweek', gameweek)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching fixtures:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getFixtures:', err)
    return []
  }
}

/**
 * Query team rankings
 */
export async function getTeamRankings(rankingType: string = 'overall') {
  try {
    const { data, error } = await supabase
      .from('team_rankings')
       .select('*')
      .eq('ranking_type', rankingType)
      .order('overall_rank')

    if (error) {
      console.error(`Error fetching ${rankingType} rankings:`, error)
      return []
    }

    return data || []
  } catch (err) {
    console.error(`Error in getTeamRankings(${rankingType}):`, err)
    return []
  }
}

/**
 * Query team fixture summary
 */
export async function getTeamFixtureSummary() {
  try {
    const { data, error } = await supabase
      .from('team_fixture_summary')
      .select('*')

    if (error) {
      console.error('Error fetching team fixture summary:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getTeamFixtureSummary:', err)
    return []
  }
}

/**
 * Query all players
 */
export async function getAllPlayers(limit = 1000) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('is_active', true)
      .order('player_name')
      .limit(limit)

    if (error) {
      console.error('Error fetching players:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getAllPlayers:', err)
    return []
  }
}

/**
 * Query player gameweek data
 */
export async function getPlayerGameweeks(playerName: string, limitGws?: number) {
  try {
    // Find the player first
    const { data: players, error: playerError } = await supabase
      .from('players')
      .select('id')
      .ilike('player_name', `%${playerName}%`)
      .limit(1)

    if (playerError || !players || players.length === 0) {
      console.error(`Player "${playerName}" not found`)
      return []
    }

    const playerId = players[0].id

    // Get gameweek data
    let query = supabase
      .from('player_gameweeks')
      .select('*')
      .eq('player_id', playerId)
      .order('gameweek')

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching gameweeks for ${playerName}:`, error)
      return []
    }

    let result = data || []

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
 * Get dashboard summary
 */
export async function getDashboardSummary() {
  try {
    // Count players, teams, and fixtures
    const [playersRes, teamsRes, fixturesRes] = await Promise.all([
      supabase.from('players').select('count', { count: 'exact' }).limit(1),
      supabase.from('teams').select('count', { count: 'exact' }).limit(1),
      supabase.from('fixtures').select('gameweek', { count: 'exact' })
    ])

    const playerCount = playersRes.count || 0
    const teamCount = teamsRes.count || 0
    
    // Get max gameweek
    const gameweeks = new Set()
    if (fixturesRes.data) {
      fixturesRes.data.forEach((f: any) => {
        if (f.gameweek) gameweeks.add(f.gameweek)
      })
    }
    const maxGameweek = gameweeks.size > 0 ? Math.max(...Array.from(gameweeks)) : 0

    return {
      total_players: playerCount,
      total_teams: teamCount,
      total_gameweeks: maxGameweek,
      generated_at: new Date().toISOString()
    }
  } catch (err) {
    console.error('Error in getDashboardSummary:', err)
    return {
      total_players: 0,
      total_teams: 0,
      total_gameweeks: 0,
      generated_at: new Date().toISOString()
    }
  }
}
