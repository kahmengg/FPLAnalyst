"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  GitCompareArrows,
  Repeat2,
  Scale,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { ErrorState, PageSkeleton } from "@/components/data-state";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/supabase";

type DashboardSummary = {
  total_players: number;
  total_teams: number;
  total_gameweeks: number;
  latest_data_gameweek: number;
  last_synced_at: string | null;
};

const modules = [
  {
    index: "01",
    title: "Top players",
    description:
      "Find role-specific attacking upside and dependable defensive floors.",
    href: "/top-performers",
    icon: Users,
  },
  {
    index: "02",
    title: "Team rankings",
    description: "Separate genuine team strength from short-term results.",
    href: "/team-rankings",
    icon: Trophy,
  },
  {
    index: "03",
    title: "Fixtures",
    description: "Read the next round and scan longer fixture runs.",
    href: "/fixture-analysis",
    icon: CalendarDays,
  },
  {
    index: "04",
    title: "Compare players",
    description: "Put same-position options side by side before committing.",
    href: "/player-trends",
    icon: GitCompareArrows,
  },
  {
    index: "05",
    title: "Transfer planner",
    description:
      "Choose a planning window, compare clubs and open player picks.",
    href: "/transfer-targets",
    icon: Repeat2,
    featured: true,
  },
];

const modelNotes = [
  {
    title: "Compared by role",
    description:
      "Every eligible player is measured against players in the same position and time window. A score of 50 is roughly role average.",
    icon: Scale,
  },
  {
    title: "Process before points",
    description:
      "Attack scores combine xG, xA, box activity, shooting and chance creation. They describe underlying involvement—not predicted FPL points.",
    icon: Target,
  },
  {
    title: "A repeatable floor",
    description:
      "Defensive-floor scores combine contribution returns, actions per 90 and minute security to identify more dependable routes to points.",
    icon: ShieldCheck,
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

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <section
          className="relative mb-10 overflow-hidden rounded-3xl border border-primary bg-primary text-primary-foreground shadow-[0_22px_60px_-42px_rgba(32,34,31,0.8)]"
          aria-labelledby="dashboard-title"
        >
          <div className="grid lg:grid-cols-[1.45fr_0.55fr]">
            <div className="p-6 sm:p-9 lg:p-12">
              <div className="mb-8 flex items-center gap-3">
                <span
                  className="h-px w-10 bg-brand-soft/70"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-soft">
                  Gameweek decision room
                </p>
              </div>
              <h1
                id="dashboard-title"
                className="max-w-3xl text-4xl font-medium leading-[0.98] text-primary-foreground sm:text-5xl lg:text-6xl"
              >
                Build a smarter
                <br className="hidden sm:block" /> gameweek.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/70 sm:text-lg">
                Move from signal to decision with role-aware player scores, team
                strength and the fixture window that matters to you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-card text-card-foreground shadow-none hover:bg-card/90"
                >
                  <Link href="/transfer-targets">
                    Plan transfers
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-primary-foreground/25 bg-transparent text-primary-foreground shadow-none hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link href="/fixture-analysis">View fixtures</Link>
                </Button>
              </div>
            </div>

            <div className="flex min-h-64 flex-col justify-between border-t border-primary-foreground/15 bg-brand p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-foreground/70">
                  Round focus
                </p>
                <p className="mt-3 font-mono text-6xl font-semibold tracking-[-0.08em] text-brand-foreground sm:text-7xl">
                  GW {summary?.total_gameweeks ?? 0}
                </p>
              </div>
              <div className="mt-8 border-t border-brand-foreground/20 pt-5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-brand-foreground/70">Model data</span>
                  <span className="font-mono font-semibold tabular-nums text-brand-foreground">
                    through GW {summary?.latest_data_gameweek ?? 0}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                  <span className="text-brand-foreground/70">Last synced</span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-brand-foreground">
                    {formatLastSynced(summary?.last_synced_at ?? null)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid border-t border-primary-foreground/15 sm:grid-cols-3">
            <div className="flex items-center gap-3 px-6 py-4 sm:px-9">
              <Users className="h-4 w-4 text-brand-soft" aria-hidden="true" />
              <span className="font-mono text-lg font-semibold tabular-nums">
                {summary?.total_players.toLocaleString() ?? 0}
              </span>
              <span className="text-xs uppercase tracking-[0.12em] text-primary-foreground/55">
                players tracked
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-primary-foreground/15 px-6 py-4 sm:border-l sm:border-t-0 sm:px-9">
              <Trophy className="h-4 w-4 text-brand-soft" aria-hidden="true" />
              <span className="font-mono text-lg font-semibold tabular-nums">
                {summary?.total_teams ?? 0}
              </span>
              <span className="text-xs uppercase tracking-[0.12em] text-primary-foreground/55">
                league teams
              </span>
            </div>
            <div className="flex items-center gap-3 border-t border-primary-foreground/15 px-6 py-4 sm:border-l sm:border-t-0 sm:px-9">
              <Clock3 className="h-4 w-4 text-brand-soft" aria-hidden="true" />
              <span className="text-xs uppercase tracking-[0.12em] text-primary-foreground/55">
                daily data refresh
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr]">
          <section aria-labelledby="model-title">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  Model guide
                </p>
                <h2 id="model-title" className="mt-1 text-3xl font-medium">
                  Read the score correctly
                </h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/top-performers">
                  Explore scores
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_-44px_rgba(32,34,31,0.7)]">
              <div className="border-b border-border p-5 sm:p-7">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Scores are position-relative signals, not predicted FPL
                  points. They explain a player&apos;s route to returns so you
                  can combine underlying quality with the fixture.
                </p>
                <div
                  className="mt-6"
                  aria-label="Model score scale from developing to exceptional"
                >
                  <div className="grid grid-cols-4 gap-1">
                    <div className="h-2 rounded-l-full bg-secondary" />
                    <div className="h-2 bg-[#c9c8b8]" />
                    <div className="h-2 bg-brand-soft" />
                    <div className="h-2 rounded-r-full bg-brand" />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <span>0 · Developing</span>
                    <span>50 · Role avg</span>
                    <span>100 · Elite</span>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {modelNotes.map((note, index) => (
                  <div key={note.title} className="flex gap-4 p-5 sm:p-6">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <note.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                        0{index + 1}
                      </p>
                      <h3 className="mt-0.5 font-sans text-sm font-semibold text-foreground">
                        {note.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {note.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="modules-title">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Analysis modules
              </p>
              <h2 id="modules-title" className="mt-1 text-3xl font-medium">
                Choose your next move
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className={`group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 focus-visible:-translate-y-0.5 ${module.featured ? "border-brand bg-brand text-brand-foreground sm:col-span-2" : "border-border bg-card text-card-foreground hover:border-brand/40 hover:shadow-[0_18px_40px_-34px_rgba(32,34,31,0.8)]"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`font-mono text-[10px] font-semibold tracking-[0.14em] ${module.featured ? "text-brand-foreground/65" : "text-muted-foreground"}`}
                    >
                      {module.index}
                    </span>
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl ${module.featured ? "bg-brand-foreground/12 text-brand-foreground" : "bg-brand-soft text-brand"}`}
                    >
                      <module.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-8 flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans text-base font-semibold">
                        {module.title}
                      </h3>
                      <p
                        className={`mt-1 text-sm leading-5 ${module.featured ? "text-brand-foreground/70" : "text-muted-foreground"}`}
                      >
                        {module.description}
                      </p>
                    </div>
                    <ArrowRight
                      className={`mb-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 ${module.featured ? "text-brand-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
