"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Clock3,
  Users,
} from "lucide-react";

import { ErrorState, PageSkeleton } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/supabase";

type DashboardSummary = {
  total_players: number;
  total_teams: number;
  total_gameweeks: number;
  latest_data_gameweek: number;
  last_synced_at: string | null;
};

function formatLastSynced(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const {
    data: summary,
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const dashboardData = await getDashboardSummary();
      if (!dashboardData.total_players)
        throw new Error("No FPL data was returned for the configured season.");
      return dashboardData as DashboardSummary;
    },
  });

  if (loading) return <PageSkeleton label="Loading dashboard" />;
  if (error)
    return (
      <ErrorState
        title="Dashboard unavailable"
        description={
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data"
        }
        onAction={() => void refetch()}
      />
    );

  const stats = [
    {
      label: "Current gameweek",
      value: `GW ${summary?.total_gameweeks ?? 0}`,
      detail: `Model through GW ${summary?.latest_data_gameweek ?? 0}`,
      icon: Calendar,
    },
    {
      label: "Players tracked",
      value: summary?.total_players.toLocaleString() ?? "0",
      detail: "Across all 20 clubs",
      icon: Users,
    },
    {
      label: "Last synced",
      value: formatLastSynced(summary?.last_synced_at ?? null),
      detail: "Updated daily",
      icon: Clock3,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Decision workspace"
          title="Make the next gameweek count."
          description="Use the model to find strong players, favourable fixtures and better transfer options."
          actions={
            <Button asChild>
              <Link href="/transfer-targets">
                Plan transfers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <section
          aria-label="Dataset overview"
          className="mb-8 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="grid md:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex min-h-28 items-center gap-4 p-5 sm:p-6 ${index ? "border-t border-border md:border-l md:border-t-0" : ""}`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xl font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="model-title"
          className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Model scores
            </p>
            <h2 id="model-title" className="mt-1 text-2xl font-medium">
              A quick way to compare players by role.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Scores run from 0–100 within each position, with 50 around the
              role average. They measure underlying quality and consistency—not
              predicted FPL points.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/top-performers">
              View players
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
