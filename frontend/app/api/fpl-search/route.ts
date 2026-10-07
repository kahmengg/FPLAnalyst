import { NextRequest, NextResponse } from "next/server";
import { parseLeagueId } from "@/lib/league-search";

export async function GET(request: NextRequest) {
  const league = parseLeagueId(
    request.nextUrl.searchParams.get("league") ?? "",
  );
  const query = (request.nextUrl.searchParams.get("name") ?? "")
    .trim()
    .toLocaleLowerCase("en-GB");
  if (!league || query.length < 3 || query.length > 80)
    return NextResponse.json(
      {
        error:
          "Enter a league ID/link and at least three characters of your team name.",
      },
      { status: 400 },
    );
  const entries = new Map<number, string>();
  let leagueName = "";
  let complete = false;
  // Bound upstream work; large leagues have explicit partial coverage, never a global-search claim.
  const signal = AbortSignal.timeout(18_000);
  try {
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${league}/standings/?page_standings=${page}`,
        { next: { revalidate: 300 }, signal, redirect: "error" },
      );
      if (!response.ok)
        return NextResponse.json(
          {
            error:
              response.status === 404
                ? "League not found or not publicly available. Use a Classic league standings link."
                : "FPL league search is temporarily unavailable. Try again or import by team ID.",
          },
          {
            status: response.status === 404 ? 404 : 502,
            headers: { "Cache-Control": "no-store" },
          },
        );
      const data = await response.json();
      if (
        !Array.isArray(data.standings?.results) ||
        typeof data.standings.has_next !== "boolean" ||
        data.standings.results.length > 50
      )
        throw new Error("Invalid standings");
      leagueName =
        typeof data.league?.name === "string"
          ? data.league.name
          : `League ${league}`;
      for (const row of data.standings.results) {
        if (
          !Number.isSafeInteger(row.entry) ||
          row.entry <= 0 ||
          typeof row.entry_name !== "string"
        )
          throw new Error("Invalid entry");
        entries.set(row.entry, row.entry_name);
      }
      if (!data.standings.has_next) {
        complete = true;
        break;
      }
    }
    const matches = [...entries]
      .filter(([, name]) => name.toLocaleLowerCase("en-GB").includes(query))
      .map(([entry, name]) => ({ entry, name }));
    return NextResponse.json(
      { league: leagueName, scanned: entries.size, complete, matches },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to finish league search. Try again or use your team ID/link.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
