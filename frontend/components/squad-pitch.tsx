"use client";
import { Shirt } from "lucide-react";
import { getTeamBrand } from "@/lib/team-branding";
import type { ImportedPlayer } from "@/lib/guest-team";
import { cn } from "@/lib/utils";

export function SquadPitch({
  players,
  selected,
  onSelect,
}: {
  players: ImportedPlayer[];
  selected: number;
  onSelect: (element: number) => void;
}) {
  const starters = players.filter((p) => p.order <= 11);
  const bench = players
    .filter((p) => p.order > 11)
    .sort((a, b) => a.order - b.order);
  const marker = (player: ImportedPlayer) => {
    const brand = getTeamBrand(player.club);
    return (
      <button
        key={player.element}
        aria-label={`View ${player.name}${player.captain ? ", captain" : player.viceCaptain ? ", vice captain" : ""}`}
        aria-pressed={selected === player.element}
        onClick={() => onSelect(player.element)}
        className={cn(
          "group flex min-w-0 max-w-24 flex-1 flex-col items-center rounded-lg px-0.5 py-2 outline-none transition-colors hover:bg-card/40 focus-visible:ring-2 focus-visible:ring-ring",
          selected === player.element && "bg-card/70 ring-2 ring-brand",
        )}
      >
        <span className="relative">
          <Shirt
            aria-hidden="true"
            className="h-10 w-10 sm:h-12 sm:w-12"
            strokeWidth={1.5}
            style={{ fill: brand.background, color: brand.border }}
          />
          <span
            className="absolute inset-x-0 top-4 text-center text-[9px] font-bold"
            style={{ color: brand.foreground }}
          >
            {player.club}
          </span>
          {(player.captain || player.viceCaptain) && (
            <span className="absolute -right-2 -top-1 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {player.captain ? "C" : "VC"}
            </span>
          )}
        </span>
        <span className="mt-1 w-full break-words text-center text-[11px] font-semibold leading-tight sm:text-sm">
          {player.name}
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
          £{player.price.toFixed(1)}m{player.status !== "a" ? " · !" : ""}
        </span>
      </button>
    );
  };
  return (
    <section aria-label="Squad pitch" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">Starting XI</h2>
        <p className="text-xs text-muted-foreground">
          {[2, 3, 4]
            .map(
              (position) =>
                starters.filter((p) => p.position === position).length,
            )
            .join("–")}{" "}
          · Select a player for details
        </p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand-soft px-2 py-6 sm:px-5">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-brand/25"
          preserveAspectRatio="none"
          viewBox="0 0 600 700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="15" y="15" width="570" height="670" />
          <path d="M15 350h570" />
          <circle cx="300" cy="350" r="65" />
          <path d="M175 15v100h250V15M175 685V585h250v100M245 15v40h110V15M245 685v-40h110v40" />
        </svg>
        <div className="relative space-y-5 sm:space-y-8">
          {[1, 2, 3, 4].map((position) => (
            <div
              key={position}
              role="group"
              aria-label={
                ["", "Goalkeeper", "Defenders", "Midfielders", "Forwards"][
                  position
                ]
              }
              className="mx-auto flex max-w-xl justify-center gap-1 sm:gap-3"
            >
              {starters
                .filter((player) => player.position === position)
                .sort((a, b) => a.order - b.order)
                .map(marker)}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
        <h2 className="mb-2 text-base">Bench · Imported order</h2>
        <div role="group" aria-label="Bench" className="flex gap-2">
          {bench.map(marker)}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This is the published lineup, not an optimised XI. C = captain · VC =
        vice captain · ! = availability flag.
      </p>
    </section>
  );
}
