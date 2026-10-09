import { describe, expect, it } from "vitest";

import { fetchAllPages } from "./pagination";

describe("Supabase pagination", () => {
  it("returns every row when the result exceeds the API page limit", async () => {
    const source = Array.from({ length: 1334 }, (_, index) => index + 1);

    const rows = await fetchAllPages((from, to) =>
      Promise.resolve(source.slice(from, to + 1)),
    );

    expect(rows).toHaveLength(1334);
    expect(rows[0]).toBe(1);
    expect(rows.at(-1)).toBe(1334);
  });
});
