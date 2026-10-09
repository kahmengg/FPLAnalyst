"use client";
import { useState } from "react";
import Link from "@/components/research-link";
import { Button } from "@/components/ui/button";
import { SquadPitch } from "@/components/squad-pitch";
import { PlayerPortrait } from "@/components/player-portrait";
import { reviewPlayer } from "@/lib/squad-review";
import { buildSchedules, type ModelFixture } from "@/lib/fixture-model";
import { rankCandidates } from "@/lib/transfer-research";
import type { ImportedTeam } from "@/lib/guest-team";
import type {
  PlayerRoleInsight,
  RolePosition,
} from "@/lib/player-role-insights";

const positions = ["", "Goalkeeper", "Defender", "Midfielder", "Forward"];
export function SquadReviewPanel({
  team,
  identities,
  roles,
  fixtures,
  start,
  loading,
  recommendations,
}: {
  team: ImportedTeam;
  identities: Array<{ id: string; fpl_id?: number }>;
  roles: PlayerRoleInsight[];
  fixtures: ModelFixture[];
  start: number;
  loading: boolean;
  recommendations: boolean;
}) {
  const [selected, setSelected] = useState(team.players[0]?.element);
  const owned = new Set(
    identities
      .filter((row) => team.players.some((p) => p.element === row.fpl_id))
      .map((row) => row.id),
  );
  const reviewed = team.players.map((player) => {
    const identity = identities.find((row) => row.fpl_id === player.element);
    const insight = roles.find(
      (row) =>
        row.playerId === identity?.id &&
        row.window === "last_5" &&
        row.position === positions[player.position],
    );
    const review = reviewPlayer(player, insight);
    const schedules = buildSchedules(
      fixtures,
      start,
      3,
      player.position <= 2 ? "defense" : "attack",
    );
    const schedule = schedules.find((row) => row.code === player.club);
    const baseline =
      review.score !== null && schedule?.fixtures.length
        ? review.score * 0.7 + schedule.average * 0.3
        : null;
    // Suggest research only when both role evidence and the combined ordering improve.
    const alternative =
      review.priority > 0 && insight?.isEligible && baseline !== null
        ? rankCandidates(
            roles,
            schedules,
            positions[player.position] as RolePosition,
            owned,
            player.price,
          ).find(
            (candidate) =>
              candidate.player.minuteSecurity >= 0.6 &&
              candidate.role >= review.score! &&
              candidate.researchScore >= baseline + 3,
          )
        : undefined;
    return { player, identity, insight, review, schedule, alternative };
  });
  const active =
    reviewed.find((row) => row.player.element === selected) ?? reviewed[0];
  const details = (row: typeof active, suggestion = false) => (
    <article
      key={row.player.element}
      className="rounded-xl border border-border bg-card p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {positions[row.player.position]} · {row.player.club} ·{" "}
        {row.player.order <= 11 ? "Starting XI" : "Bench"}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <PlayerPortrait
          name={row.player.name}
          photoCode={row.insight?.photoCode}
          teamCode={row.player.club}
          size="md"
        />
        <h3 className="text-2xl">{row.player.name}</h3>
      </div>
      <p className="mt-3 text-sm font-semibold">
        {loading ? "Checking model evidence…" : row.review.label}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {loading
          ? "Your public lineup is available while the analysis loads."
          : row.review.reason}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Recent role score</dt>
          <dd className="mt-1 font-mono">
            {row.review.score === null
              ? "Unavailable"
              : `${Math.round(row.review.score)} / 100`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">60+ minute appearances</dt>
          <dd className="mt-1 font-mono">
            {row.insight
              ? `${row.insight.sixtyMinuteAppearances} / ${row.insight.appearances}`
              : "Unavailable"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        {row.schedule?.fixtures.length
          ? row.schedule.fixtures
              .map(
                (f) => `GW ${f.gw} ${f.opponentCode} (${f.home ? "H" : "A"})`,
              )
              .join(" · ")
          : "No remaining fixture evidence in this window."}
      </p>
      {suggestion && !loading && row.alternative && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-semibold">
            Worth comparing: {row.alternative.player.name}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Role {Math.round(row.alternative.role)} / 100 · Fixture opportunity{" "}
            {Math.round(row.alternative.schedule.average)} / 100 · £
            {row.alternative.player.price.toFixed(1)}m. Unowned, same position,
            at or below this player’s current price, with at least 60% recent
            60-minute appearances. Confirm availability and actual selling
            value.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link
              href={`/player-trends?position=${encodeURIComponent(positions[row.player.position])}&players=${[row.identity?.id, row.alternative.player.playerId].filter(Boolean).join(",")}&gw=${start}&horizon=3`}
            >
              Compare with {row.alternative.player.name}
            </Link>
          </Button>
        </div>
      )}
      {suggestion && !loading && !row.alternative && (
        <p className="mt-4 text-xs text-muted-foreground">
          No clear alternative meets this review’s evidence and price filters.
          Review your player rather than force a transfer.
        </p>
      )}
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link
          href={`/transfer-targets?position=${encodeURIComponent(positions[row.player.position])}${row.identity ? `&out=${row.identity.id}` : ""}&gw=${start}&horizon=3`}
        >
          Research replacements
        </Link>
      </Button>
      {row.insight && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last-five-gameweek evidence · {row.insight.scoreVersion}
          {!row.insight.isEligible ? " · Provisional" : ""}
        </p>
      )}
    </article>
  );
  if (recommendations) {
    const concerns = reviewed
      .filter((row) => row.review.priority > 0)
      .sort(
        (a, b) =>
          b.review.priority - a.review.priority ||
          a.player.order - b.player.order,
      );
    return (
      <section aria-label="Squad recommendations">
        <h2 className="text-2xl">Your review priorities</h2>
        <p className="mt-2 mb-5 text-sm text-muted-foreground">
          Availability first, then minutes and model evidence. Comparing the
          next three gameweeks from GW {start}.{" "}
          {reviewed.length - concerns.length} players have no immediate model
          concern. These rules are research guidance and have not been
          calibrated as points forecasts.
        </p>
        {loading ? (
          <p role="status">Loading squad analysis…</p>
        ) : concerns.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {concerns.map((row) => details(row, true))}
          </div>
        ) : (
          <p className="rounded-xl border border-border p-5">
            No immediate concern was identified. Holding your squad is a valid
            option.
          </p>
        )}
      </section>
    );
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <SquadPitch
        players={team.players}
        selected={active.player.element}
        onSelect={setSelected}
      />
      <div aria-label="Selected player analysis" aria-live="polite">
        {details(active)}
      </div>
    </div>
  );
}
