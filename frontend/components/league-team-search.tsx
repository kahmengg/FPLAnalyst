"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { parseLeagueId, searchLeague } from "@/lib/league-search";

export function LeagueTeamSearch({
  onSelect,
}: {
  onSelect: (entry: number) => void;
}) {
  const [league, setLeague] = useState("");
  const [name, setName] = useState("");
  const [request, setRequest] = useState<{
    league: number;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const result = useQuery({
    queryKey: ["league-team-search", request],
    queryFn: ({ signal }) =>
      searchLeague(request!.league, request!.name, signal),
    enabled: !!request,
    retry: false,
    staleTime: 300_000,
  });
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">
        Search by your fantasy team name within a Classic league. Open that
        league’s standings on FPL and paste its link. A joining code is
        different from the league ID.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const id = parseLeagueId(league);
          if (!id || name.trim().length < 3 || name.trim().length > 80) {
            setError(
              "Enter a league ID/link and 3–80 characters of your team name.",
            );
            setRequest(null);
            return;
          }
          setError("");
          if (request?.league === id && request.name === name.trim()) void result.refetch();
          else setRequest({ league: id, name: name.trim() });
        }}
      >
        <label className="text-sm font-medium">
          Classic league ID or link
          <input
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Fantasy team name
          <input
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </label>
        <Button
          className="sm:col-span-2 sm:justify-self-start"
          disabled={result.isFetching}
          type="submit"
        >
          Search league
        </Button>
      </form>
      {error || result.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error || result.error?.message}
        </p>
      ) : null}
      {result.isFetching && (
        <p role="status" className="mt-3 text-sm">
          Searching league standings…
        </p>
      )}
      {result.data && !result.isFetching && (
        <div className="mt-4">
          <p role="status" className="text-sm">
            {result.data.league} · {result.data.scanned} teams searched ·{" "}
            {result.data.matches.length} matches
          </p>
          {!result.data.complete && (
            <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">
              Partial coverage: only the first 10 standings pages (up to 500
              teams) were searched. Your team may be further down. Use a smaller
              league or your team ID/link.
            </p>
          )}
          {!result.data.matches.length && (
            <p className="mt-2 text-sm text-muted-foreground">
              No matching name in the standings searched. Check the spelling or
              import by team ID/link.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {result.data.matches.map((team) => (
              <li key={team.entry}>
                <Button
                  variant="outline"
                  className="h-auto min-h-11 w-full justify-between gap-3 whitespace-normal py-3 text-left"
                  onClick={() => onSelect(team.entry)}
                >
                  <span>{team.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Team {team.entry}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
