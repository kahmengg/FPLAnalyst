"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGuestTeam } from "./guest-team-provider";
import { fixturesQuery, summaryQuery } from "@/lib/research-queries";
import { buildSchedules } from "@/lib/fixture-model";
import { Button } from "./ui/button";

export function WeeklyBriefing() {
  const summary = useQuery(summaryQuery);
  const fixtures = useQuery(fixturesQuery);
  const guest = useGuestTeam();
  const start = summary.data?.current_gameweek ?? 1;
  const clubs = buildSchedules(fixtures.data ?? [], start, 3)
    .filter((row) => row.fixtures.length)
    .slice(0, 3);
  const concerns =
    guest.squad.data?.players.filter((p) => p.status !== "a").length ?? 0;
  return (
    <section
      aria-labelledby="weekly-focus-title"
      className="mb-6 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="grid md:grid-cols-2">
        <div className="bg-football-soft/55 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            This week's focus
          </p>
          <h2 id="weekly-focus-title" className="mt-2 text-2xl">
            Start with the opportunity.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {fixtures.error
              ? "Schedule research is currently unavailable."
              : fixtures.isPending
                ? "Checking the next three gameweeks…"
                : clubs.length
                  ? `The strongest remaining schedule opportunities in the next three gameweeks: ${clubs.map((row) => row.team).join(", ")}. Check the attack or defence lens before choosing a player.`
                  : "No remaining schedule opportunities. Explore the completed season through the research pages."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link
              href={`/fixture-analysis?view=difficulty&gw=${start}&horizon=3`}
            >
              Research these fixtures
            </Link>
          </Button>
        </div>
        <div className="border-t border-border bg-brand-soft/55 p-5 sm:p-6 md:border-l md:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your squad
          </p>
          <h2 className="mt-2 text-2xl">
            {guest.squad.data?.name ?? "Bring your team into the decision."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {guest.squad.data
              ? `Public GW ${guest.squad.data.gameweek} snapshot · ${concerns ? `${concerns} availability flags to review.` : "No current official availability flags."} Review your players' model profiles before considering a move.`
              : "Enter your FPL team ID or points-page link. Review your public squad and explore replacements without an account."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/my-team">
              {guest.entry ? "Review my team" : "Find my FPL team"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
