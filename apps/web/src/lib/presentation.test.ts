import { describe, expect, it } from "vitest";

import { demoComparison } from "./demoComparison";
import { initiallyExpanded, statusLabel } from "./presentation";

describe("presentation helpers", () => {
  it("expands only the first three verdict-driving rows", () => {
    expect([...initiallyExpanded(demoComparison.dimensions)]).toEqual([
      "research_question",
      "population",
      "exposure",
    ]);
  });

  it("turns API enum values into labels", () => {
    expect(statusLabel("needs_review")).toBe("Needs review");
  });
});

