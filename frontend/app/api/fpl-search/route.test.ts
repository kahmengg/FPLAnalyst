import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());
it("validates league/name before making upstream requests", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await GET(
        new NextRequest("http://localhost/api/fpl-search?league=bad&name=abc"),
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it("finds partial names across pages, keeps duplicate names by ID and omits manager details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json({
        league: { name: "Friends" },
        standings: {
          has_next: url.endsWith("=1"),
          results: [
            {
              entry: url.endsWith("=1") ? 123 : 456,
              entry_name: "Dream Team",
              player_name: "Not forwarded",
            },
          ],
        },
      }),
    ),
  );
  const response = await GET(
    new NextRequest("http://localhost/api/fpl-search?league=42&name=dream"),
  );
  expect(await response.json()).toEqual({
    league: "Friends",
    scanned: 2,
    complete: true,
    matches: [
      { entry: 123, name: "Dream Team" },
      { entry: 456, name: "Dream Team" },
    ],
  });
});
it("caps upstream pagination and labels incomplete coverage", async () => {
  const fetch = vi.fn(async (url: string) =>
    Response.json({
      standings: {
        has_next: true,
        results: [{ entry: Number(url.split("=")[1]), entry_name: "Other" }],
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await (
    await GET(
      new NextRequest("http://localhost/api/fpl-search?league=42&name=dream"),
    )
  ).json();
  expect(fetch).toHaveBeenCalledTimes(10);
  expect(result.complete).toBe(false);
  expect(result.scanned).toBe(10);
  expect(result.matches).toEqual([]);
});
it("returns actionable errors for unavailable or malformed standings", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("missing", { status: 404 })),
  );
  expect(
    (
      await GET(
        new NextRequest("http://localhost/api/fpl-search?league=42&name=dream"),
      )
    ).status,
  ).toBe(404);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ standings: {} })),
  );
  expect(
    (
      await GET(
        new NextRequest("http://localhost/api/fpl-search?league=42&name=dream"),
      )
    ).status,
  ).toBe(502);
});
