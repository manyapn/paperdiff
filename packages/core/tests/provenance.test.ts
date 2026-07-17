import { describe, expect, it } from "vitest";

import {
  type ProvenanceCandidate,
  validateProvenance,
} from "../src/provenance.js";

function candidate(overrides: Partial<ProvenanceCandidate> = {}): ProvenanceCandidate {
  return {
    sourceOrigin: "linkup",
    fetched: true,
    expectedTitle: "A Study of Widgets",
    fetchedTitle: "A Study of Widgets",
    expectedDoi: "doi:10.1000/widgets",
    fetchedDoi: "https://doi.org/10.1000/WIDGETS",
    quote: "Participants were followed for twenty four months.",
    fetchedText: "Methods\nParticipants were followed for twenty  four months. Results followed.",
    evidenceSpanId: "span-1",
    ...overrides,
  };
}

describe("deterministic provenance validator", () => {
  it("passes normalized exact passages and DOI identities", () => {
    const result = validateProvenance(candidate());
    expect(result.passed).toBe(true);
    expect(result.failure_reasons).toEqual([]);
  });

  it("blocks passage and identity mismatches", () => {
    expect(validateProvenance(candidate({ quote: "This never appeared." })).passed).toBe(false);
    expect(validateProvenance(candidate({ fetchedDoi: "10.1000/other" })).passed).toBe(false);
  });

  it.each([
    ["untrusted source", { sourceOrigin: "unknown" }, "source_origin"],
    ["failed fetch", { fetched: false }, "fetched"],
    ["missing span", { evidenceSpanId: null }, "span_specific"],
  ] as const)("blocks %s", (_name, override, failedCheck) => {
    const result = validateProvenance(candidate(override));
    expect(result.passed).toBe(false);
    expect(result.checks[failedCheck]).toBe(false);
  });
});
