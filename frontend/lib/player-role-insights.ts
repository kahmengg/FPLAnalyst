export type InsightWindow = "last_5" | "season"
export type RolePosition = "Goalkeeper" | "Defender" | "Midfielder" | "Forward"

export type PlayerRoleInsight = {
  id: string
  playerId: string
  name: string
  team: string
  teamCode: string
  position: RolePosition
  positionCode: "GK" | "DEF" | "MID" | "FWD"
  price: number
  ownership: number
  window: InsightWindow
  windowGameweeks: number
  scoreVersion: string
  isEligible: boolean
  appearances: number
  sixtyMinuteAppearances: number
  minutes: number
  points: number
  goals: number
  assists: number
  cleanSheets: number
  xG: number
  xA: number
  xGI: number
  pointsPer90: number
  goalsPer90: number
  assistsPer90: number
  xGPer90: number
  xAPer90: number
  xGIPer90: number
  shotsInBoxPer90: number
  shotsOnTargetPer90: number
  chancesCreatedPer90: number
  touchesBoxPer90: number
  defensiveContributionPer90: number
  cleanSheetRate: number
  minuteSecurity: number
  dcOpportunities: number
  dcReturns: number
  dcPoints: number
  dcReturnRate: number
  teamDefenseStrength: number
  goalThreatScore: number | null
  creationScore: number | null
  attackScore: number | null
  defensiveFloorScore: number | null
  hybridScore: number | null
  completeScore: number | null
  goalkeeperScore: number | null
}

type SourcePlayer = {
  id: string
  name?: string
  web_name?: string
  player_name?: string
  team?: string
  team_name?: string
  team_short?: string
  position?: number | string
  position_name?: string
  cost?: number
  ownership?: number
}

type SourceGameweek = Record<string, unknown> & { player_id: string; gameweek: number }

const POSITION: Record<string, { name: RolePosition; code: PlayerRoleInsight["positionCode"] }> = {
  "1": { name: "Goalkeeper", code: "GK" },
  "2": { name: "Defender", code: "DEF" },
  "3": { name: "Midfielder", code: "MID" },
  "4": { name: "Forward", code: "FWD" },
  Goalkeeper: { name: "Goalkeeper", code: "GK" },
  Defender: { name: "Defender", code: "DEF" },
  Midfielder: { name: "Midfielder", code: "MID" },
  Forward: { name: "Forward", code: "FWD" },
}

const number = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const text = (...values: unknown[]) => values.find((value) => typeof value === "string" && value.trim()) as string | undefined

function normalize(values: number[]) {
  if (!values.length) return []
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  const deviation = Math.sqrt(variance)
  if (deviation < 1e-9) return values.map(() => 50)
  return values.map((value) => Math.max(0, Math.min(100, 50 + Math.max(-2.5, Math.min(2.5, (value - mean) / deviation)) * 20)))
}

function assignScore(rows: PlayerRoleInsight[], key: keyof PlayerRoleInsight, metrics: Array<[keyof PlayerRoleInsight, number]>) {
  const eligible = rows.filter((row) => row.isEligible)
  if (!eligible.length) return
  const normalized = new Map(metrics.map(([metric]) => [metric, normalize(eligible.map((row) => number(row[metric])))]))
  eligible.forEach((row, index) => {
    const weight = metrics.reduce((sum, [, value]) => sum + value, 0)
    const score = metrics.reduce((sum, [metric, value]) => sum + (normalized.get(metric)?.[index] ?? 50) * value, 0) / weight
    ;(row[key] as number | null) = Math.max(0, Math.min(100, score))
  })
}

/**
 * Temporary compatibility path for deployments where the role-insight table
 * has not been populated yet. It mirrors the ETL formulas from gameweek rows.
 */
export function buildRoleInsightFallback(
  players: SourcePlayer[],
  gameweeks: SourceGameweek[],
  teamDefense: Map<string, number>,
  season: string,
): PlayerRoleInsight[] {
  const playerMap = new Map(players.map((player) => [player.id, player]))
  const allGameweeks = [...new Set(gameweeks.map((row) => number(row.gameweek)))].sort((a, b) => a - b)
  const windows: Record<InsightWindow, number[]> = { season: allGameweeks, last_5: allGameweeks.slice(-5) }
  const output: PlayerRoleInsight[] = []

  for (const [window, includedGameweeks] of Object.entries(windows) as Array<[InsightWindow, number[]]>) {
    const minimumMinutes = Math.min(450, Math.max(90, 60 * includedGameweeks.length))
    const included = new Set(includedGameweeks)
    const byPlayer = new Map<string, SourceGameweek[]>()
    for (const row of gameweeks) {
      if (!included.has(number(row.gameweek))) continue
      const current = byPlayer.get(row.player_id) ?? []
      current.push(row)
      byPlayer.set(row.player_id, current)
    }

    for (const [playerId, rows] of byPlayer) {
      const player = playerMap.get(playerId)
      if (!player) continue
      const role = POSITION[String(player.position_name ?? player.position ?? "")]
      if (!role) continue
      const minutes = rows.reduce((sum, row) => sum + number(row.minutes), 0)
      const per90 = Math.max(minutes / 90, 1e-9)
      const appearances = rows.filter((row) => number(row.minutes) > 0).length
      const sixtyRows = rows.filter((row) => number(row.minutes) >= 60)
      const threshold = role.code === "DEF" ? 10 : role.code === "GK" ? null : 12
      const dcReturns = threshold ? sixtyRows.filter((row) => number(row.defensive_contribution) >= threshold).length : 0
      const cleanSheets = rows.filter((row) => Boolean(row.clean_sheet)).length
      const teamCode = text(player.team_short, player.team)?.toUpperCase() ?? "FPL"
      const sum = (key: string) => rows.reduce((total, row) => total + number(row[key]), 0)

      output.push({
        id: `${playerId}-${window}`,
        playerId,
        name: text(player.web_name, player.name, player.player_name) ?? "Unknown player",
        team: text(player.team, player.team_name, player.team_short) ?? "Unknown club",
        teamCode,
        position: role.name,
        positionCode: role.code,
        price: number(player.cost),
        ownership: number(player.ownership),
        window,
        windowGameweeks: includedGameweeks.length,
        scoreVersion: "role-v1-fallback",
        isEligible: minutes >= minimumMinutes,
        appearances,
        sixtyMinuteAppearances: sixtyRows.length,
        minutes,
        points: sum("total_points"),
        goals: sum("goals"),
        assists: sum("assists"),
        cleanSheets,
        xG: sum("xg"),
        xA: sum("xa"),
        xGI: sum("xgi"),
        pointsPer90: sum("total_points") / per90,
        goalsPer90: sum("goals") / per90,
        assistsPer90: sum("assists") / per90,
        xGPer90: sum("xg") / per90,
        xAPer90: sum("xa") / per90,
        xGIPer90: sum("xgi") / per90,
        shotsInBoxPer90: sum("shots_in_box") / per90,
        shotsOnTargetPer90: sum("shots_on_target") / per90,
        chancesCreatedPer90: sum("chances_created") / per90,
        touchesBoxPer90: sum("touches_opp_box") / per90,
        defensiveContributionPer90: sum("defensive_contribution") / per90,
        cleanSheetRate: cleanSheets / Math.max(sixtyRows.length, 1),
        minuteSecurity: sixtyRows.length / Math.max(appearances, 1),
        dcOpportunities: threshold ? sixtyRows.length : 0,
        dcReturns,
        dcPoints: threshold ? rows.filter((row) => number(row.defensive_contribution) >= threshold).length * 2 : 0,
        dcReturnRate: threshold ? dcReturns / Math.max(sixtyRows.length, 1) : 0,
        teamDefenseStrength: teamDefense.get(teamCode) ?? 50,
        goalThreatScore: null,
        creationScore: null,
        attackScore: null,
        defensiveFloorScore: null,
        hybridScore: null,
        completeScore: null,
        goalkeeperScore: null,
      })
    }
  }

  for (const window of ["last_5", "season"] as InsightWindow[]) {
    for (const position of ["Goalkeeper", "Defender", "Midfielder", "Forward"] as RolePosition[]) {
      const rows = output.filter((row) => row.window === window && row.position === position)
      if (position === "Goalkeeper") {
        assignScore(rows, "goalkeeperScore", [["teamDefenseStrength", 0.5], ["cleanSheetRate", 0.25], ["pointsPer90", 0.25]])
        continue
      }
      assignScore(rows, "goalThreatScore", [["xGPer90", 0.4], ["shotsInBoxPer90", 0.25], ["shotsOnTargetPer90", 0.2], ["touchesBoxPer90", 0.15]])
      assignScore(rows, "creationScore", [["xAPer90", 0.5], ["chancesCreatedPer90", 0.3], ["assistsPer90", 0.2]])
      const attackWeights = position === "Forward" ? [0.7, 0.3] : position === "Midfielder" ? [0.5, 0.5] : [0.45, 0.55]
      rows.filter((row) => row.isEligible).forEach((row) => {
        row.attackScore = number(row.goalThreatScore) * attackWeights[0] + number(row.creationScore) * attackWeights[1]
      })
      assignScore(rows, "defensiveFloorScore", [["dcReturnRate", 0.6], ["defensiveContributionPer90", 0.25], ["minuteSecurity", 0.15]])
      rows.filter((row) => row.isEligible).forEach((row) => {
        if (position === "Midfielder") {
          const total = number(row.attackScore) + number(row.defensiveFloorScore)
          row.hybridScore = total ? 2 * number(row.attackScore) * number(row.defensiveFloorScore) / total : 0
        }
        if (position === "Defender") {
          row.completeScore = number(row.attackScore) * 0.4 + number(row.defensiveFloorScore) * 0.35 + row.teamDefenseStrength * 0.25
        }
      })
    }
  }

  return output
}

export function mapStoredRoleInsight(row: Record<string, unknown>, teamDefense: Map<string, number>): PlayerRoleInsight {
  const player = (Array.isArray(row.players) ? row.players[0] : row.players ?? {}) as SourcePlayer & { teams?: { name?: string; short_name?: string } }
  const role = POSITION[String(player.position_name ?? player.position ?? "")] ?? POSITION.Midfielder
  const teamCode = text(player.teams?.short_name, player.team_short)?.toUpperCase() ?? "FPL"
  const nullable = (key: string) => row[key] === null || row[key] === undefined ? null : number(row[key])
  return {
    id: `${row.player_id}-${row.window_key}`,
    playerId: String(row.player_id),
    name: text(player.web_name, player.player_name) ?? "Unknown player",
    team: text(player.teams?.name, player.team_name, player.team_short) ?? "Unknown club",
    teamCode,
    position: role.name,
    positionCode: role.code,
    price: number(player.cost),
    ownership: number(player.ownership),
    window: row.window_key as InsightWindow,
    windowGameweeks: number(row.window_gameweeks),
    scoreVersion: text(row.score_version) ?? "role-v1",
    isEligible: Boolean(row.is_eligible),
    appearances: number(row.appearances),
    sixtyMinuteAppearances: number(row.sixty_minute_appearances),
    minutes: number(row.total_minutes),
    points: number(row.total_points),
    goals: number(row.goals),
    assists: number(row.assists),
    cleanSheets: number(row.clean_sheets),
    xG: number(row.xg), xA: number(row.xa), xGI: number(row.xgi),
    pointsPer90: number(row.points_per90), goalsPer90: number(row.goals_per90), assistsPer90: number(row.assists_per90),
    xGPer90: number(row.xg_per90), xAPer90: number(row.xa_per90), xGIPer90: number(row.xgi_per90),
    shotsInBoxPer90: number(row.shots_in_box_per90), shotsOnTargetPer90: number(row.shots_on_target_per90),
    chancesCreatedPer90: number(row.chances_created_per90), touchesBoxPer90: number(row.touches_opp_box_per90),
    defensiveContributionPer90: number(row.defensive_contribution_per90), cleanSheetRate: number(row.clean_sheet_rate),
    minuteSecurity: number(row.minute_security), dcOpportunities: number(row.dc_opportunities),
    dcReturns: number(row.dc_returns), dcPoints: number(row.dc_points), dcReturnRate: number(row.dc_return_rate),
    teamDefenseStrength: teamDefense.get(teamCode) ?? 50,
    goalThreatScore: nullable("goal_threat_score"), creationScore: nullable("creation_score"),
    attackScore: nullable("attack_score"), defensiveFloorScore: nullable("defensive_floor_score"),
    hybridScore: nullable("hybrid_score"), completeScore: nullable("complete_score"),
    goalkeeperScore: nullable("goalkeeper_score"),
  }
}
