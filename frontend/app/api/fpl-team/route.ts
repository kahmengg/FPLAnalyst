import { NextRequest, NextResponse } from "next/server";
import { parseEntryId, type ImportedTeam } from "@/lib/guest-team";
import { DATA_SEASON } from "@/lib/season";

class UpstreamError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function readFpl(path: string) {
  // Only internal path templates reach this fetch; user input cannot change origin.
  const response = await fetch(
    `https://fantasy.premierleague.com/api/${path}`,
    {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    },
  );
  if (!response.ok)
    throw new UpstreamError(
      response.status === 404
        ? "No public team or picks were found. Check the ID or try again after the first deadline."
        : "FPL is temporarily unavailable. Please try again later.",
      response.status === 404 ? 404 : 502,
    );
  return response.json();
}

export async function GET(request: NextRequest) {
  const entry = parseEntryId(request.nextUrl.searchParams.get("entry") ?? "");
  if (!entry)
    return NextResponse.json(
      { error: "Enter a valid FPL team ID or official team link." },
      { status: 400 },
    );
  try {
    const [profile, bootstrap] = await Promise.all([
      readFpl(`entry/${entry}/`),
      readFpl("bootstrap-static/"),
    ]);
    if (
      profile.id !== entry ||
      typeof profile.name !== "string" ||
      !Array.isArray(bootstrap.events) ||
      !Array.isArray(bootstrap.elements) ||
      !Array.isArray(bootstrap.teams)
    )
      throw new Error("Unexpected FPL response");
    // The latest published round is a snapshot, not the manager's unpublished squad.
    const event = [...bootstrap.events]
      .filter(
        (e: { id: number; is_current: boolean; finished: boolean }) =>
          e.is_current || e.finished,
      )
      .sort((a, b) => b.id - a.id)[0];
    if (!event)
      throw new UpstreamError(
        "Your squad is not public yet. Try again after the first gameweek deadline.",
        404,
      );
    const deadline = bootstrap.events[0]?.deadline_time;
    const year = new Date(deadline).getUTCFullYear();
    const season = `${year}_${String(year + 1).slice(-2)}`;
    if (season !== DATA_SEASON.key)
      throw new UpstreamError(
        `Live FPL is ${season.replace("_", "/")}, but this site's model is ${DATA_SEASON.label}. Squad analysis needs the same season.`,
        409,
      );
    const snapshot = await readFpl(`entry/${entry}/event/${event.id}/picks/`);
    if (
      !Array.isArray(snapshot.picks) ||
      snapshot.picks.length !== 15 ||
      new Set(snapshot.picks.map((p: { element: number }) => p.element))
        .size !== 15
    )
      throw new Error("Invalid squad response");
    const players = new Map<number, Record<string, unknown>>(
      bootstrap.elements.map((p: Record<string, unknown>) => [
        p.id as number,
        p,
      ]),
    );
    const clubs = new Map<number, string>(
      bootstrap.teams.map((t: { id: number; short_name: string }) => [
        t.id,
        t.short_name,
      ]),
    );
    const result: ImportedTeam = {
      entry,
      name: profile.name,
      season,
      gameweek: event.id,
      fetchedAt: new Date().toISOString(),
      players: snapshot.picks.map(
        (pick: {
          element: number;
          position: number;
          is_captain: boolean;
          is_vice_captain: boolean;
        }) => {
          const player = players.get(pick.element);
          if (
            !player ||
            typeof player.web_name !== "string" ||
            typeof player.now_cost !== "number" ||
            typeof player.element_type !== "number"
          )
            throw new Error("Unmapped official player");
          return {
            element: pick.element,
            name: player.web_name,
            club: clubs.get(player.team as number) ?? "",
            position: player.element_type,
            price: player.now_cost / 10,
            status: String(player.status ?? ""),
            news: String(player.news ?? ""),
            order: pick.position,
            captain: pick.is_captain,
            viceCaptain: pick.is_vice_captain,
          };
        },
      ),
    };
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 502;
    return NextResponse.json(
      {
        error:
          error instanceof UpstreamError
            ? error.message
            : "Unable to read a complete FPL squad. Please try again later.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
