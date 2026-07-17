import { describe, expect, it } from "vitest";

import { demoComparison } from "./demoComparison";

describe("demo Compare contract", () => {
  it("contains the complete eight-dimension comparison", () => {
    expect(demoComparison.is_demo).toBe(true);
    expect(demoComparison.dimensions).toHaveLength(8);
    expect(demoComparison.verdict.material_difference_count).toBeGreaterThan(0);
  });

  it("keeps every displayed evidence span traceable and classified", () => {
    for (const paper of [demoComparison.left, demoComparison.right]) {
      expect(paper.evidence.length).toBeGreaterThan(0);
      for (const evidence of paper.evidence) {
        expect(evidence.provenance.passed).toBe(true);
        expect(evidence.quote.length).toBeGreaterThan(20);
        expect(evidence.relationship.model_version).toBeTruthy();
        expect(evidence.relationship.status).toBe("grounded");
      }
    }
  });

  it("links every diff row to evidence on both papers", () => {
    const leftIds = new Set(demoComparison.left.evidence.map((evidence) => evidence.id));
    const rightIds = new Set(demoComparison.right.evidence.map((evidence) => evidence.id));
    for (const dimension of demoComparison.dimensions) {
      expect(dimension.left_evidence_ids.every((id) => leftIds.has(id))).toBe(true);
      expect(dimension.right_evidence_ids.every((id) => rightIds.has(id))).toBe(true);
    }
  });
});
