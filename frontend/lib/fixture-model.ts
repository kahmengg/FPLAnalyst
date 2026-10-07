export type FixtureMode = "overall" | "attack" | "defense";
export type ModelFixture = {
  gw: number;
  finished: boolean;
  home_team: {
    name: string;
    short_name: string;
    fdr: Record<FixtureMode, number>;
  };
  away_team: {
    name: string;
    short_name: string;
    fdr: Record<FixtureMode, number>;
  };
};
export type ClubSchedule = {
  team: string;
  code: string;
  average: number;
  blankGameweeks: number[];
  fixtures: Array<{
    gw: number;
    opponent: string;
    opponentCode: string;
    home: boolean;
    rating: number;
  }>;
};

export function gameweekWindow(start: number, horizon: number) {
  const first = Math.max(1, Math.min(38, Math.trunc(start) || 1));
  const count = Math.max(1, Math.min(10, Math.trunc(horizon) || 3));
  return Array.from(
    { length: Math.min(count, 39 - first) },
    (_, index) => first + index,
  );
}

export function buildSchedules(
  fixtures: ModelFixture[],
  start: number,
  horizon: number,
  mode: FixtureMode = "overall",
): ClubSchedule[] {
  const window = gameweekWindow(start, horizon);
  const clubs = new Map<string, ClubSchedule>();
  for (const fixture of fixtures) {
    for (const home of [true, false]) {
      const team = home ? fixture.home_team : fixture.away_team;
      const opponent = home ? fixture.away_team : fixture.home_team;
      const row = clubs.get(team.short_name) ?? {
        team: team.name,
        code: team.short_name,
        average: 0,
        fixtures: [],
        blankGameweeks: [],
      };
      // All pages use the same unplayed matches and canonical opportunity score.
      if (!fixture.finished && window.includes(fixture.gw))
        row.fixtures.push({
          gw: fixture.gw,
          opponent: opponent.name,
          opponentCode: opponent.short_name,
          home,
          rating: team.fdr[mode],
        });
      clubs.set(team.short_name, row);
    }
  }
  return [...clubs.values()]
    .map((row) => ({
      ...row,
      fixtures: row.fixtures.sort((a, b) => a.gw - b.gw),
      blankGameweeks: window.filter(
        (gw) => !row.fixtures.some((f) => f.gw === gw),
      ),
      average: row.fixtures.length
        ? row.fixtures.reduce((sum, f) => sum + f.rating, 0) /
          row.fixtures.length
        : 0,
    }))
    .sort((a, b) => b.average - a.average || a.team.localeCompare(b.team));
}
