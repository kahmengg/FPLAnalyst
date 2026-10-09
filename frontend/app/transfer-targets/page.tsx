"use client";
import Link from "@/components/research-link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/team-badge";
import { PlayerPortrait } from "@/components/player-portrait";
import { PlayerDetailDrawer } from "@/components/player-detail-drawer";
import { ErrorState, PageSkeleton } from "@/components/data-state";
import { useGuestTeam } from "@/components/guest-team-provider";
import {
  fixturesQuery,
  rolesQuery,
  summaryQuery,
} from "@/lib/research-queries";
import { buildSchedules, gameweekWindow } from "@/lib/fixture-model";
import { boundedInteger, formatRating, oneOf } from "@/lib/decision-model";
import { rankCandidates } from "@/lib/transfer-research";
import { currentUrlParams, updateUrlParams } from "@/lib/url-state";
import { getAllPlayers } from "@/lib/supabase";
import { DATA_SEASON } from "@/lib/season";
import type { RolePosition } from "@/lib/player-role-insights";

const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"] as const;
export default function TransferTargetsPage() {
  const fixtureResult = useQuery(fixturesQuery);
  const roleResult = useQuery(rolesQuery);
  const summary = useQuery(summaryQuery);
  const guest = useGuestTeam();
  const identities = useQuery({
    queryKey: ["player-identities", DATA_SEASON.key],
    queryFn: () => getAllPlayers(5000),
    enabled: !!guest.entry,
  });
  const [position, setPosition] = useState<RolePosition>("Midfielder");
  const [horizon, setHorizon] = useState(3);
  const [start, setStart] = useState(1);
  const [club, setClub] = useState("");
  const [out, setOut] = useState("");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(20);
  const [showAll, setShowAll] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  useEffect(() => {
    const restore = () => {
      const params = currentUrlParams();
      setPosition(oneOf(params.get("position"), positions, "Midfielder"));
      setHorizon(boundedInteger(params.get("horizon"), 3, 1, 10));
      setStart(
        boundedInteger(
          params.get("gw"),
          summary.data?.current_gameweek ?? 1,
          1,
          38,
        ),
      );
      setClub(params.get("team") || params.get("club") || "");
      setOut(params.get("out") || "");
      setQuery(params.get("search") || "");
      setSelectedPlayerId(params.get("player") || "");
      const price = Number(params.get("maxPrice") || 20);
      setMaxPrice(
        Number.isFinite(price) && price >= 0 && price <= 20 ? price : 20,
      );
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [summary.data]);
  const schedules = useMemo(
    () =>
      buildSchedules(
        fixtureResult.data ?? [],
        start,
        horizon,
        position === "Goalkeeper" || position === "Defender"
          ? "defense"
          : "attack",
      ),
    [fixtureResult.data, start, horizon, position],
  );
  const owned = useMemo(
    () =>
      new Set<string>(
        (identities.data ?? [])
          .filter((row: { fpl_id?: number }) =>
            guest.squad.data?.players.some((p) => p.element === row.fpl_id),
          )
          .map((row: { id: string }) => row.id),
      ),
    [identities.data, guest.squad.data],
  );
  const outgoing = roleResult.data?.find(
    (p) => p.playerId === out && p.window === "last_5",
  );
  const selectedPlayer = roleResult.data?.find(
    (player) => player.playerId === selectedPlayerId && player.window === "last_5",
  ) ?? null;
  const openPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const url = new URL(window.location.href);
    url.searchParams.set("player", playerId);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
  };
  const closePlayer = () => {
    setSelectedPlayerId("");
    updateUrlParams({ player: null });
  };
  const candidates = useMemo(
    () =>
      rankCandidates(
        roleResult.data ?? [],
        schedules,
        position,
        owned,
        maxPrice,
      ).filter(
        ({ player }) =>
          (!club ||
            player.teamCode.toLowerCase() === club.toLowerCase() ||
            player.team.toLowerCase() === club.toLowerCase()) &&
          player.name.toLowerCase().includes(query.toLowerCase()) &&
          player.playerId !== out,
      ),
    [roleResult.data, schedules, position, owned, maxPrice, club, query, out],
  );
  const loading =
    fixtureResult.isPending || roleResult.isPending || summary.isPending;
  const error = fixtureResult.error || roleResult.error || summary.error;
  if (loading) return <PageSkeleton label="Loading transfer research" />;
  if (error)
    return (
      <ErrorState
        title="Transfer research unavailable"
        description={error.message}
        onAction={() => {
          void fixtureResult.refetch();
          void roleResult.refetch();
          void summary.refetch();
        }}
      />
    );
  const weeks = gameweekWindow(start, horizon);
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Transfer planner"
          title="Turn a shortlist into a better decision."
          description="Research same-role candidates using player quality and the upcoming schedule. Compare a possible replacement before committing to a move."
          actions={
            <Button asChild variant="outline">
              <Link
                href={`/fixture-analysis?view=difficulty&gw=${start}&horizon=${horizon}&mode=${position === "Defender" || position === "Goalkeeper" ? "defense" : "attack"}`}
              >
                Explore full schedule
              </Link>
            </Button>
          }
        />
        <section
          className="mb-5 rounded-xl border border-border bg-card p-4"
          aria-label="Transfer research controls"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium">
              Position
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value as RolePosition);
                  setOut("");
                  updateUrlParams({ position: e.target.value, out: null });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              >
                {positions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Start gameweek
              <input
                type="number"
                min={1}
                max={38}
                value={start}
                onChange={(e) => {
                  const value = boundedInteger(e.target.value, 1, 1, 38);
                  setStart(value);
                  updateUrlParams({ gw: value });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              />
            </label>
            <label htmlFor="fixture-horizon" className="text-sm font-medium">
              Gameweek horizon
              <input
                id="fixture-horizon"
                type="number"
                min={1}
                max={10}
                value={horizon}
                onChange={(e) => {
                  const value = boundedInteger(e.target.value, 3, 1, 10);
                  setHorizon(value);
                  updateUrlParams({ horizon: value });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Candidate price ceiling (£m)
              <input
                type="number"
                min={0}
                max={20}
                step={0.1}
                value={maxPrice}
                onChange={(e) => {
                  const value = Math.max(
                    0,
                    Math.min(20, Number(e.target.value) || 0),
                  );
                  setMaxPrice(value);
                  updateUrlParams({ maxPrice: value });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            GW {weeks[0]}–{weeks.at(-1)} · Calendar gameweeks, including blanks
            and doubles. Fixture ratings use{" "}
            {position === "Defender" || position === "Goalkeeper"
              ? "defensive"
              : "attacking"}{" "}
            opportunity. A price ceiling is a research filter, not your transfer
            budget.
          </p>
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <label className="text-sm">
              Search candidates
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  updateUrlParams({ search: e.target.value });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Club
              <select
                value={club}
                onChange={(e) => {
                  setClub(e.target.value);
                  updateUrlParams({ team: e.target.value, club: null });
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3"
              >
                <option value="">All clubs</option>
                {schedules.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.team}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="mb-5 rounded-xl border border-border bg-secondary/30 p-4">
          <h2 className="font-sans text-base font-semibold">
            {outgoing
              ? `Considering a replacement for ${outgoing.name}`
              : guest.entry
                ? "Research with your imported squad"
                : "Explore targets"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {guest.squad.data
              ? `Players in ${guest.squad.data.name}'s public GW ${guest.squad.data.gameweek} snapshot are excluded once their model identities load.`
              : "Import a public squad to start from one of your players and exclude already-owned candidates."}{" "}
            Confirm current squad, selling prices, bank and club limits on FPL
            before making any transfer. Holding is always an option.
          </p>
          {guest.squad.error && (
            <p role="alert" className="mt-2 text-sm">
              Squad import unavailable: {guest.squad.error.message}. Showing
              public research.
            </p>
          )}
          {identities.error && (
            <p role="alert" className="mt-2 text-sm">
              Squad mapping unavailable; owned-player exclusions could not be
              applied.
            </p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/my-team">
              {guest.entry ? "Review my squad" : "Import my team"}
            </Link>
          </Button>
        </section>
        <div className="mb-4">
          <h2 className="text-2xl">{position} candidates</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Research order blends role score (70%) and fixture opportunity
            (30%), within this position only. It is not a forecast of points
            gained. {candidates.length} matching players.
          </p>
        </div>
        {!candidates.length && (
          <p role="status" className="rounded-xl border border-border p-5">
            No candidates in this window. Widen your filters or check later
            gameweeks; completed fixtures are never reused as upcoming matches.
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {(showAll ? candidates : candidates.slice(0, 12)).map(
            ({ player, role, schedule }) => (
              <article
                key={player.playerId}
                className="rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <PlayerPortrait name={player.name} photoCode={player.photoCode} teamCode={player.teamCode} size="md" />
                    <div className="min-w-0">
                      <h3 className="truncate font-sans text-base font-semibold">
                        {player.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {player.team} · £{player.price.toFixed(1)}m ·{" "}
                        {player.ownership.toFixed(1)}% owned
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm">
                    {formatRating(role)}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  Role score {Math.round(role)} · Minutes reliability{" "}
                  {Math.round(player.minuteSecurity * 100)}% · Fixture
                  opportunity {Math.round(schedule.average)} / 100
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {schedule.fixtures
                    .map(
                      (f) =>
                        `GW ${f.gw}: ${f.opponentCode} (${f.home ? "H" : "A"})`,
                    )
                    .join(" · ")}
                  {schedule.blankGameweeks.length
                    ? ` · No remaining match in GW ${schedule.blankGameweeks.join(", ")}`
                    : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => openPlayer(player.playerId)}>
                    View player details
                  </Button>
                  <Button asChild size="sm">
                    <Link
                      href={`/player-trends?position=${encodeURIComponent(position)}&players=${[outgoing?.playerId, player.playerId].filter(Boolean).join(",")}&gw=${start}&horizon=${horizon}`}
                    >
                      {outgoing ? "Compare replacement" : "Compare player"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/top-performers?position=${encodeURIComponent(position)}&club=${player.teamCode}&window=last_5&gw=${start}&horizon=${horizon}`}
                    >
                      Explore scoring profile
                    </Link>
                  </Button>
                </div>
              </article>
            ),
          )}
        </div>
        {candidates.length > 12 && (
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show top 12"
              : `Show all ${candidates.length} candidates`}
          </Button>
        )}
        <PlayerDetailDrawer
          player={selectedPlayer}
          cohort={(roleResult.data ?? []).filter((player) => player.position === position && player.window === "last_5")}
          open={Boolean(selectedPlayer)}
          onOpenChange={(open) => { if (!open) closePlayer(); }}
        />
      </div>
    </div>
  );
}
