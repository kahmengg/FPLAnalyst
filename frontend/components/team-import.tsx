"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useGuestTeam } from "@/components/guest-team-provider";
import { importTeam, parseEntryId } from "@/lib/guest-team";
import { LeagueTeamSearch } from "@/components/league-team-search";

export function TeamImport() {
  const { entry, ready, choose, storageError } = useGuestTeam();
  const [input, setInput] = useState("");
  const [candidate, setCandidate] = useState<number | null>(null);
  const [remember, setRemember] = useState(false);
  const [inputError, setInputError] = useState("");
  const [method, setMethod] = useState("id");
  const preview = useQuery({
    queryKey: ["team-preview", candidate],
    queryFn: ({ signal }) => importTeam(candidate!, signal),
    enabled: !!candidate,
    retry: false,
  });
  return (
    <section
      aria-label="Select an FPL team"
      className="mb-6 rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-xl">
        {entry ? "Change your team" : "Find your FPL team"}
      </h2>
      <div
        className="mt-4 flex gap-2"
        role="group"
        aria-label="Team lookup method"
      >
        <Button
          variant={method === "id" ? "default" : "outline"}
          aria-pressed={method === "id"}
          onClick={() => setMethod("id")}
        >
          Team ID / link
        </Button>
        <Button
          variant={method === "name" ? "default" : "outline"}
          aria-pressed={method === "name"}
          onClick={() => setMethod("name")}
        >
          Name in a league
        </Button>
      </div>
      {method === "name" && (
        <LeagueTeamSearch
          onSelect={(id) => {
            setCandidate(id);
            setInputError("");
          }}
        />
      )}
      {method === "id" && (
        <>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = parseEntryId(input);
              setInputError(
                parsed
                  ? ""
                  : "Enter a numeric team ID or an official FPL team link.",
              );
              if (parsed && parsed === candidate) void preview.refetch();
              else setCandidate(parsed);
            }}
          >
            <label
              className="min-w-0 flex-1 text-sm font-medium"
              htmlFor="fpl-entry"
            >
              Team ID or FPL team link
              <input
                id="fpl-entry"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="e.g. 895045 or your FPL points link"
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 font-normal"
              />
            </label>
            <Button type="submit" disabled={!ready || preview.isFetching}>
              Preview team
            </Button>
          </form>
          <details className="mt-3 text-sm text-muted-foreground">
            <summary className="cursor-pointer">
              Where do I find my team ID?
            </summary>
            <p className="mt-2">
              On the official FPL website, open Points or Gameweek History and
              copy the page link. Your team ID is the number after /entry/ in
              that link.
            </p>
          </details>
        </>
      )}
      {inputError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {inputError}
        </p>
      )}
      {preview.isFetching && (
        <p role="status" className="mt-3 text-sm">
          Loading public team preview…
        </p>
      )}
      {preview.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {preview.error.message}
        </p>
      )}
      {preview.data && !preview.isFetching && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-semibold">
            {preview.data.name} · Team {preview.data.entry}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            15 players · Public GW {preview.data.gameweek} snapshot
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember on this device
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Other people using this browser profile can see the remembered team.
          </p>
          <Button
            className="mt-3"
            onClick={() => {
              choose(preview.data!.entry, remember);
              setCandidate(null);
              setInput("");
            }}
          >
            Use this team
          </Button>
        </div>
      )}
      {storageError && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Browser storage is unavailable. You can still use this team for this
          visit.
        </p>
      )}
    </section>
  );
}
