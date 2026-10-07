"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useGuestTeam } from "@/components/guest-team-provider";
import { TeamImport } from "@/components/team-import";
import { SquadReviewPanel } from "@/components/squad-review-panel";
import {
  fixturesQuery,
  summaryQuery,
  rolesQuery,
} from "@/lib/research-queries";
import { getAllPlayers } from "@/lib/supabase";
import { DATA_SEASON } from "@/lib/season";

export default function MyTeamPage() {
  const { entry, choose, squad } = useGuestTeam();
  const [tab, setTab] = useState("squad");

  const pool = useQuery({
    queryKey: ["player-identities", DATA_SEASON.key],
    queryFn: () => getAllPlayers(5000),
    enabled: !!entry,
  });
  const roles = useQuery({ ...rolesQuery, enabled: !!entry });
  const fixtures = useQuery({ ...fixturesQuery, enabled: !!entry });
  const summary = useQuery(summaryQuery);
  const team = squad.data;
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Your weekly review"
          title="My Team"
          description="Bring your public FPL squad into the research. Review concerns, then investigate alternatives using the same model as the public pages."
        />
        <TeamImport />
        {entry && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Selected team {entry}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={squad.isFetching}
                onClick={() => void squad.refetch()}
              >
                Refresh squad
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  choose(null);
                }}
              >
                Forget this team
              </Button>
            </div>
          </div>
        )}
        {entry && squad.isFetching && (
          <p role="status" className="mb-4">
            Loading squad…
          </p>
        )}
        {squad.error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm"
          >
            {squad.error.message}
          </p>
        )}
        {team && (
          <>
            <div className="mb-5 rounded-xl border border-border bg-secondary/30 p-4">
              <h2 className="text-xl">{team.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Public squad from GW {team.gameweek} · Fetched{" "}
                {new Date(team.fetchedAt).toLocaleString("en-GB")}. Refresh may
                use a public cache up to five minutes old.
              </p>
              <p className="mt-2 text-sm">
                Transfers made since that deadline may not appear. These are
                research suggestions: confirm your current squad, bank and
                selling prices before making a move on FPL.
              </p>
            </div>
            <div
              className="mb-4 flex gap-2"
              role="group"
              aria-label="Squad review view"
            >
              {["squad", "recommendations"].map((value) => (
                <Button
                  key={value}
                  variant={tab === value ? "default" : "outline"}
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {value === "squad" ? "Squad" : "Recommendations"}
                </Button>
              ))}
            </div>
            {pool.error || roles.error || fixtures.error ? (
              <p role="alert" className="mb-4 text-sm">
                Your squad loaded, but model analysis is unavailable. Public
                squad information remains visible; try refreshing the page.
              </p>
            ) : null}
            <SquadReviewPanel
              key={team.entry}
              team={team}
              identities={pool.data ?? []}
              roles={roles.data ?? []}
              fixtures={fixtures.data ?? []}
              start={
                summary.data?.current_gameweek ??
                Math.min(38, team.gameweek + 1)
              }
              loading={
                pool.isPending ||
                roles.isPending ||
                fixtures.isPending ||
                summary.isPending
              }
              recommendations={tab === "recommendations"}
            />
          </>
        )}
      </div>
    </div>
  );
}
