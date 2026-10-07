import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const bootstrap = {
  events: [{ id: 5, is_current: true, deadline_time: "2026-08-15T10:00:00Z" }],
  teams: [{ id: 1, short_name: "ARS" }],
  elements: Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    web_name: `Player ${i}`,
    now_cost: 50,
    element_type: 3,
    team: 1,
    status: "a",
  })),
};
const picks = {
  picks: Array.from({ length: 15 }, (_, i) => ({
    element: i + 1,
    position: i + 1,
    is_captain: i === 0,
    is_vice_captain: i === 1,
  })),
};
function mockFpl(snapshot: unknown = picks, seasonData = bootstrap) {
  return vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("bootstrap-static/")
        ? seasonData
        : url.includes("/picks/")
          ? snapshot
          : {
              id: 123,
              name: "Test Squad",
              player_first_name: "Private-to-response",
            },
    ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("guest public squad boundary", () => {
  it("rejects invalid entry input before contacting FPL", async () => {
    const fetch = mockFpl();
    vi.stubGlobal("fetch", fetch);
    const response = await GET(
      new NextRequest("http://localhost/api/fpl-team?entry=Arsenal"),
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns a complete public snapshot without forwarding manager details", async () => {
    vi.stubGlobal("fetch", mockFpl());
    const response = await GET(
      new NextRequest("http://localhost/api/fpl-team?entry=123"),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.players).toHaveLength(15);
    expect(data.gameweek).toBe(5);
    expect(data).not.toHaveProperty("player_first_name");
    expect(data.players[0].price).toBe(5);
  });
  it("rejects incomplete and duplicate squads instead of silently dropping players", async () => {
    vi.stubGlobal("fetch", mockFpl({ picks: [picks.picks[0]] }));
    expect(
      (await GET(new NextRequest("http://localhost/api/fpl-team?entry=123")))
        .status,
    ).toBe(502);
    vi.stubGlobal("fetch", mockFpl({ picks: Array(15).fill(picks.picks[0]) }));
    expect(
      (await GET(new NextRequest("http://localhost/api/fpl-team?entry=123")))
        .status,
    ).toBe(502);
  });
  it("blocks cross-season mapping and handles upstream failures", async () => {
    vi.stubGlobal(
      "fetch",
      mockFpl(picks, {
        ...bootstrap,
        events: [
          { ...bootstrap.events[0], deadline_time: "2025-08-15T10:00:00Z" },
        ],
      }),
    );
    expect(
      (await GET(new NextRequest("http://localhost/api/fpl-team?entry=123")))
        .status,
    ).toBe(409);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unavailable", { status: 429 })),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/fpl-team?entry=123"),
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
