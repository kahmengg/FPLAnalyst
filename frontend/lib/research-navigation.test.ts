import { describe, expect, it } from "vitest";
import { researchHref } from "./research-navigation";
describe("research navigation", () => {
  it("carries the planning window, maps club and position names, and drops incompatible view state", () => {
    expect(
      researchHref(
        "/transfer-targets",
        new URLSearchParams(
          "gw=6&horizon=4&club=ARS&position=2&view=difficulty",
        ),
      ),
    ).toBe("/transfer-targets?gw=6&horizon=4&position=Defender&team=ARS");
  });
  it("explicit destination players override the current comparison", () => {
    expect(
      researchHref(
        "/player-trends?players=new",
        new URLSearchParams("players=old&horizon=4"),
      ),
    ).toBe("/player-trends?players=new&horizon=4");
  });
});
