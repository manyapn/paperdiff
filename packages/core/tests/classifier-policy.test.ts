import { describe, expect, it } from "vitest";

import { applyClassifierPolicy, validateClassifierResult } from "../src/classifier-policy.js";
import type { ClassifierResult } from "../src/types.js";

const result = (label: ClassifierResult["label"], confidence: number): ClassifierResult => ({
  label,
  confidence,
  abstained: false,
  model_version: "test-model",
});

describe("claim-evidence classifier policy", () => {
  it("maps supports by confidence", () => {
    expect(applyClassifierPolicy(result("supports", 0.92), true, "test").status).toBe("grounded");
    expect(applyClassifierPolicy(result("supports", 0.7), true, "test").status).toBe("qualified");
    expect(applyClassifierPolicy(result("supports", 0.4), true, "test").status).toBe(
      "needs_review",
    );
  });

  it("distinguishes contradiction from insufficient evidence", () => {
    expect(applyClassifierPolicy(result("contradicts", 0.9), true, "test").status).toBe(
      "flagged_for_correction",
    );
    expect(applyClassifierPolicy(result("insufficient", 0.9), true, "test").status).toBe(
      "needs_review",
    );
  });

  it("never lets model confidence override failed provenance", () => {
    expect(applyClassifierPolicy(result("supports", 0.99), false, "test").status).toBe("blocked");
  });

  it("maps model abstention to Needs review", () => {
    expect(
      applyClassifierPolicy(
        { ...result("supports", 0.99), abstained: true },
        true,
        "test",
      ).status,
    ).toBe("needs_review");
  });

  it("rejects malformed model output", () => {
    expect(() => validateClassifierResult({ ...result("supports", 1.1) })).toThrow(
      /confidence/,
    );
    expect(() =>
      validateClassifierResult({ ...result("supports", 0.9), label: "maybe" }),
    ).toThrow(/label/);
    expect(() => validateClassifierResult(null)).toThrow(/object/);
  });
});
