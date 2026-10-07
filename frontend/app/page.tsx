"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Clock3,
  Repeat2,
  Trophy,
  Users,
} from "lucide-react";

import { ErrorState, PageSkeleton } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";
import { WeeklyBriefing } from "@/components/weekly-briefing";
import { Button } from "@/components/ui/button";
import { summaryQuery } from "@/lib/research-queries";

type DashboardSummary = {
  total_players: number;
  total_teams: number;
  total_gameweeks: number;
  latest_data_gameweek: number;
  last_synced_at: string | null;
};

const decisionSteps = [
  {
    number: "01",
    title: "Rank teams",
    detail: "Find genuine strength",
    href: "/team-rankings",
    icon: Trophy,
  },
  {
    number: "02",
    title: "Check fixtures",
    detail: "Spot the opportunity",
    href: "/fixture-analysis",
    icon: Calendar,
  },
  {
    number: "03",
    title: "Find players",
    detail: "Match the scoring route",
    href: "/top-performers",
    icon: Users,
  },
  {
    number: "04",
    title: "Plan the move",
    detail: "Choose your transfer",
    href: "/transfer-targets",
    icon: Repeat2,
  },
];

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
  } = useQuery(summaryQuery);

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
          title="Your next gameweek starts here."
          description="Review your squad, spot the opportunity, and follow the evidence into a transfer decision."
          actions={
            <Button asChild>
              <Link href="/transfer-targets">
                Plan transfers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <WeeklyBriefing />

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
          className="mb-8 flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
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

        <section aria-labelledby="workflow-title">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Weekly workflow
            </p>
            <h2 id="workflow-title" className="mt-1 text-2xl font-medium">
              From signal to transfer.
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4">
              {decisionSteps.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className={`group flex min-h-36 flex-col justify-between p-5 transition-colors hover:bg-secondary/35 focus-visible:bg-secondary/35 sm:p-6 ${index ? "border-t border-border sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {step.number}
                    </span>
                    <step.icon
                      className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-sans text-base font-semibold">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.detail}
                      </p>
                    </div>
                    <ArrowRight
                      className="mb-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
