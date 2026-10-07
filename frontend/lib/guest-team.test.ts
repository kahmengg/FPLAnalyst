import { describe, expect, it } from "vitest";
import { parseEntryId } from "./guest-team";
describe("public FPL entry input", () => {
  it("accepts an ID and official points/history links", () => {
    expect(parseEntryId(" 895045 ")).toBe(895045);
    expect(
      parseEntryId("https://fantasy.premierleague.com/en/entry/895045/event/5"),
    ).toBe(895045);
  });
  it("rejects foreign origins, credentials tricks, non-integers and oversized IDs", () => {
    for (const value of [
      "Arsenal",
      "0",
      "1.5",
      "-1",
      "99999999999999999",
      "https://example.com/entry/5",
      "https://fantasy.premierleague.com@evil.test/entry/5",
    ])
      expect(parseEntryId(value)).toBeNull();
  });
});
