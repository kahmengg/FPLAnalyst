"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Sparkles } from "lucide-react";

import { ErrorState, PageSkeleton } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";
import { TeamBadge } from "@/components/team-badge";
import TeamPicksModal from "@/components/team-picks-modal";
import { Button } from "@/components/ui/button";
import { getQuickPicks, getTeamFixtureSummary } from "@/lib/supabase";
import { boundedInteger, formatRating } from "@/lib/decision-model";
import { currentUrlParams, updateUrlParams } from "@/lib/url-state";

type UpcomingFixture = {
  gw: number;
  opponent: string;
  opponentShort: string;
  isHome: boolean;
  difficulty: number;
  favorability: number;
};

type TeamSummary = {
  team: string;
  team_short: string;
  att: number;
  def: number;
  overall: number;
  fixtures: number;
  nearTermHomeFixtures: number;
  nearTermRating: number;
  upcomingFixtures: UpcomingFixture[];
};

type PickPlayer = {
  id?: string;
  web_name: string;
  position_name: string;
  now_cost: number;
  goals_per_game?: number;
  assists_per_game?: number;
  points_per_game?: number;
  selected_by_percent?: number;
  role_score?: number;
  score_label?: string;
  minute_security?: number;
  points_per_90?: number;
  defensive_contribution_per_90?: number;
  clean_sheet_rate?: number;
};

type PickTeam = { team: string; players?: PickPlayer[] };

type ModalPlayer = {
  id?: string;
  name: string;
  position: string;
  position_name: string;
  price: number;
  goals_pg?: number;
  assists_pg?: number;
  points_pg?: number;
  points_per_game?: number;
  ownership?: number;
  selected_by_percent?: number;
  role_score?: number;
  score_label?: string;
  minute_security?: number;
  points_per_90?: number;
  defensive_contribution_per_90?: number;
  cs_rate?: number;
  clean_sheet_rate?: number;
};

function score(value: number) {
  return Number(value || 0)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function nextFixtureLabel(count: number) {
  return count === 1 ? "next fixture" : `next ${count} fixtures`;
}

function FixtureSequence({
  fixtures,
  horizon,
}: {
  fixtures: UpcomingFixture[];
  horizon: number;
}) {
  if (fixtures.length === 0)
    return (
      <p className="text-xs text-muted-foreground">No upcoming fixtures</p>
    );

  return (
    <ol
      className="flex flex-wrap gap-1.5"
      aria-label={nextFixtureLabel(horizon)}
    >
      {fixtures.map((fixture, index) => {
        const venue = fixture.isHome ? "H" : "A";
        const opponent = fixture.opponentShort || fixture.opponent || "TBC";
        return (
          <li
            key={`${fixture.gw}-${opponent}-${venue}-${index}`}
            className="min-w-[4.25rem] rounded-md border border-border bg-background px-2 py-1.5 text-center"
            title={`Gameweek ${fixture.gw}: ${fixture.opponent || opponent} (${fixture.isHome ? "home" : "away"})`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              GW {fixture.gw}
            </span>
            <span className="mt-0.5 block font-mono text-xs font-semibold tabular-nums">
              {opponent}{" "}
              <span className="font-normal text-muted-foreground">
                ({venue})
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function FixtureHorizonControl({
  value,
  maximum,
  onChange,
}: {
  value: number;
  maximum: number;
  onChange: (value: number) => void;
}) {
  const update = (nextValue: number) =>
    onChange(Math.min(maximum, Math.max(1, nextValue)));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:px-5">
      <div>
        <p className="text-sm font-semibold">Fixture horizon</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose how many upcoming matches shape the rankings.
        </p>
      </div>
      <div
        className="flex items-center gap-1 rounded-lg border border-border bg-background p-1"
        role="group"
        aria-label="Fixture horizon"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => update(value - 1)}
          disabled={value <= 1}
          aria-label="Show one fewer fixture"
        >
          <Minus aria-hidden="true" />
        </Button>
        <label
          className="flex items-center gap-2 px-1 text-sm font-medium"
          htmlFor="fixture-horizon"
        >
          Next
          <input
            id="fixture-horizon"
            type="number"
            min={1}
            max={maximum}
            value={value}
            onChange={(event) => update(Number(event.target.value) || 1)}
            className="h-8 w-14 rounded-md border border-input bg-card px-2 text-center font-mono text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-describedby="fixture-horizon-help"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => update(value + 1)}
          disabled={value >= maximum}
          aria-label="Show one more fixture"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <span id="fixture-horizon-help" className="sr-only">
        Choose between 1 and {maximum} upcoming fixtures.
      </span>
    </div>
  );
}

export default function TransferTargetsPage() {
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null);
  const [fixtureHorizon, setFixtureHorizon] = useState(3);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const {
    data,
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transfer-planner"],
    queryFn: async () => {
      const [teams, attackingPicks, defensivePicks] = await Promise.all([
        getTeamFixtureSummary(),
        getQuickPicks("attacking"),
        getQuickPicks("defensive"),
      ]);
      return {
        teams: teams as TeamSummary[],
        attackingPicks: attackingPicks as PickTeam[],
        defensivePicks: defensivePicks as PickTeam[],
      };
    },
  });
  const teams = data?.teams ?? [];
  const attackingPicks = data?.attackingPicks ?? [];
  const defensivePicks = data?.defensivePicks ?? [];

  useEffect(() => {
    if (!teams.length) return;
    const params = currentUrlParams();
    setFixtureHorizon(
      boundedInteger(
        params.get("horizon"),
        3,
        1,
        Math.max(1, ...teams.map((team) => team.upcomingFixtures.length)),
      ),
    );
    const highlighted = params.get("team");
    if (highlighted)
      setSelectedTeam(
        teams.find(
          (team) =>
            team.team_short === highlighted || team.team === highlighted,
        ) ?? null,
      );
  }, [teams]);

  const maximumFixtureHorizon = useMemo(
    () => Math.max(1, ...teams.map((team) => team.upcomingFixtures.length)),
    [teams],
  );

  const rankedTeams = useMemo(
    () =>
      teams
        .map((team) => {
          // Every summary metric must use the same user-selected fixture window.
          const fixtures = team.upcomingFixtures.slice(0, fixtureHorizon);
          const averageRating =
            fixtures.length > 0
              ? fixtures.reduce(
                  (total, fixture) =>
                    total +
                    Math.max(
                      0,
                      Math.min(100, 100 - (fixture.difficulty - 1) * 20),
                    ),
                  0,
                ) / fixtures.length
              : 0;

          return {
            ...team,
            upcomingFixtures: fixtures,
            nearTermRating: averageRating,
            nearTermHomeFixtures: fixtures.filter((fixture) => fixture.isHome)
              .length,
            fixtures: fixtures.filter((fixture) => fixture.difficulty <= 3)
              .length,
          };
        })
        .sort((a, b) => b.nearTermRating - a.nearTermRating),
    [fixtureHorizon, teams],
  );
  const visibleTeams = showAllTeams ? rankedTeams : rankedTeams.slice(0, 10);

  const modalPlayers = (
    teamName: string,
  ): { attackingPlayers: ModalPlayer[]; defensivePlayers: ModalPlayer[] } => {
    const normalized = teamName.trim().toLowerCase();
    const attacking = attackingPicks.find(
      (team) => team.team.trim().toLowerCase() === normalized,
    );
    const defensive = defensivePicks.find(
      (team) => team.team.trim().toLowerCase() === normalized,
    );
    const mapBase = (player: PickPlayer) => ({
      name: player.web_name,
      position: player.position_name,
      position_name: player.position_name,
      price: player.now_cost,
      points_pg: player.points_per_game,
      points_per_game: player.points_per_game,
      ownership: player.selected_by_percent,
      selected_by_percent: player.selected_by_percent,
      id: player.id,
      role_score: player.role_score,
      score_label: player.score_label,
      minute_security: player.minute_security,
      points_per_90: player.points_per_90,
      defensive_contribution_per_90: player.defensive_contribution_per_90,
    });
    return {
      attackingPlayers: (attacking?.players ?? []).map((player) => ({
        ...mapBase(player),
        goals_pg: player.goals_per_game ?? 0,
        assists_pg: player.assists_per_game ?? 0,
        clean_sheet_rate: 0,
      })),
      defensivePlayers: (defensive?.players ?? []).map((player) => ({
        ...mapBase(player),
        cs_rate: player.clean_sheet_rate ?? 0,
        clean_sheet_rate: player.clean_sheet_rate ?? 0,
      })),
    };
  };

  if (loading) return <PageSkeleton label="Loading transfer planner" />;
  if (error)
    return (
      <ErrorState
        title="Transfer planner unavailable"
        description={
          error instanceof Error
            ? error.message
            : "Unable to load transfer planning data"
        }
        onAction={() => void refetch()}
      />
    );

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Transfer planner"
          title="Plan your fixture window."
          description="Choose a planning window, scan the easiest schedules, then open player picks for a club that interests you."
        />

        <div className="mb-5">
          <FixtureHorizonControl
            value={fixtureHorizon}
            maximum={maximumFixtureHorizon}
            onChange={(value) => {
              setFixtureHorizon(value);
              updateUrlParams({ horizon: value });
            }}
          />
        </div>

        <section aria-labelledby="schedule-title">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Club comparison
            </p>
            <h2 id="schedule-title" className="mt-1 text-3xl font-medium">
              Next-{fixtureHorizon} schedule
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Higher ratings mean an easier run. H and A indicate home and
              away; the ten best schedules are shown first.
            </p>
          </div>
          <div className="hidden max-w-full overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-secondary px-4 py-4 text-left">Club</th>
                  <th className="px-4 py-4 text-left">Upcoming fixtures</th>
                  <th className="px-4 py-4 text-right">Model rating</th>
                  <th className="sticky right-0 z-10 bg-secondary px-4 py-4 text-right">
                    <span className="sr-only">Player picks</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleTeams.map((team, index) => (
                  <tr key={team.team} className="hover:bg-secondary/25">
                    <th scope="row" className="sticky left-0 bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TeamBadge code={team.team_short || team.team} />
                        <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                        <span>{team.team}</span>
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      <FixtureSequence
                        fixtures={team.upcomingFixtures ?? []}
                        horizon={fixtureHorizon}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatRating(team.nearTermRating)}
                    </td>
                    <td className="sticky right-0 bg-card px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team);
                          updateUrlParams({
                            team: team.team_short || team.team,
                          });
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Picks
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleTeams.map((team, index) => (
              <article
                key={team.team}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TeamBadge code={team.team_short || team.team} />
                    <div>
                      <h3 className="font-semibold">{team.team}</h3>
                      <p className="text-xs text-muted-foreground">
                        Schedule rank #{index + 1}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {formatRating(team.nearTermRating)}
                  </span>
                </div>
                <div className="mt-4">
                  <FixtureSequence
                    fixtures={team.upcomingFixtures}
                    horizon={fixtureHorizon}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    {team.nearTermHomeFixtures} home · {team.fixtures}{" "}
                    favourable
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTeam(team);
                      updateUrlParams({ team: team.team_short || team.team });
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Picks
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {rankedTeams.length > 10 ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setShowAllTeams((value) => !value)}>
                {showAllTeams ? "Show top 10" : `Show all ${rankedTeams.length} clubs`}
              </Button>
            </div>
          ) : null}
        </section>

        {selectedTeam ? (
          <TeamPicksModal
            isOpen={Boolean(selectedTeam)}
            onClose={() => {
              setSelectedTeam(null);
              updateUrlParams({ team: null });
            }}
            teamName={selectedTeam.team}
            teamCode={selectedTeam.team_short || selectedTeam.team}
            fixtureContext={selectedTeam.upcomingFixtures}
            fixtureOutlook={selectedTeam.nearTermRating}
            horizon={fixtureHorizon}
            {...modalPlayers(selectedTeam.team)}
          />
        ) : null}
      </div>
    </div>
  );
}
