"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { summaryQuery } from "@/lib/research-queries";
import { currentUrlParams } from "@/lib/url-state";
import { researchHref } from "@/lib/research-navigation";

const steps = [
  ["/my-team", "My squad"],
  ["/team-rankings", "Club strength"],
  ["/fixture-analysis", "Schedule"],
  ["/top-performers", "Find players"],
  ["/player-trends", "Compare"],
  ["/transfer-targets", "Plan a move"],
];
export function ResearchGuide() {
  const pathname = usePathname();
  const { data, error } = useQuery(summaryQuery);
  const [context, setContext] = useState("");
  useEffect(() => {
    const restore = () => setContext(currentUrlParams().toString());
    restore();
    window.addEventListener("research-context", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("research-context", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [pathname]);
  const href = (route: string) => {
    return researchHref(route, new URLSearchParams(context));
  };
  return (
    <div className="border-b border-border bg-card/65 px-3 py-1.5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Weekly research workflow"
          className="flex max-h-[52px] flex-nowrap gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {steps.map(([route, label]) => (
            <Link
              key={route}
              href={href(route)}
              aria-current={pathname === route ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pathname === route ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="hidden pt-1.5 text-xs text-muted-foreground sm:block">
          {error
            ? "Model freshness unavailable"
            : data
              ? `Model through GW ${data.latest_data_gameweek} · Synced ${data.last_synced_at ? new Date(data.last_synced_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "unknown"}`
              : "Checking model freshness…"}{" "}
          · Role scores compare players in the same position; they are not
          predicted points.
        </p>
      </div>
    </div>
  );
}
