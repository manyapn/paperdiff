import { describe, expect, it } from "vitest";

import {
  normalizeDoi,
  normalizeText,
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

  // --- Added: identity/version coverage ---

  it("blocks a title mismatch even when DOI is not provided", () => {
    const result = validateProvenance(
      candidate({ expectedDoi: null, fetchedDoi: null, fetchedTitle: "A Different Study Entirely" }),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.identity_match).toBe(false);
    expect(result.failure_reasons).toContain(
      "Fetched paper identity does not match the extracted paper.",
    );
  });

  it("passes identity when expectedDoi is null and titles match (no DOI to check against)", () => {
    // Matches the implementation's `expectedDoi === null || expectedDoi === fetchedDoi` logic --
    // a paper with no known DOI shouldn't be blocked solely for that reason.
    const result = validateProvenance(candidate({ expectedDoi: null }));
    expect(result.checks.identity_match).toBe(true);
  });

  it("blocks a DOI version/format mismatch that survives normalization", () => {
    // Genuinely different DOI, not just a formatting difference -- normalizeDoi should NOT
    // paper over an actual identity mismatch.
    const result = validateProvenance(candidate({ fetchedDoi: "10.1000/widgets-v2" }));
    expect(result.passed).toBe(false);
    expect(result.checks.identity_match).toBe(false);
  });

  // --- Added: span specificity beyond just "missing" ---

  it("blocks a span_specific check when the quote is too short, even with a span id present", () => {
    const result = validateProvenance(
      candidate({ quote: "no effect found", fetchedText: "Results showed no effect found here." }),
    );
    expect(result.checks.span_specific).toBe(false);
    expect(result.passed).toBe(false);
  });

  it("accepts a four-word quote as span-specific (the implementation's exact threshold)", () => {
    const result = validateProvenance(
      candidate({ quote: "no significant effect found", fetchedText: "Results showed no significant effect found overall." }),
    );
    expect(result.checks.span_specific).toBe(true);
  });

  // --- Added: multiple simultaneous failures should all be reported ---

  it("reports every failed check when several checks fail at once", () => {
    const result = validateProvenance(
      candidate({
        sourceOrigin: "unknown",
        fetched: false,
        quote: "This never appeared anywhere in the text.",
        evidenceSpanId: null,
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.failure_reasons.length).toBeGreaterThanOrEqual(4);
    expect(result.checks.source_origin).toBe(false);
    expect(result.checks.fetched).toBe(false);
    expect(result.checks.passage_match).toBe(false);
    expect(result.checks.span_specific).toBe(false);
  });

  // --- Added: normalizeText / normalizeDoi unit coverage ---
  // These are exported and doing real work (soft hyphens, whitespace collapse,
  // DOI prefix stripping) -- worth testing directly, not just through
  // validateProvenance's pass/fail outcome.

  describe("normalizeText", () => {
    it("collapses internal whitespace and lowercases", () => {
      expect(normalizeText("  Twenty   Four   Months  ")).toBe("twenty four months");
    });

    it("strips soft hyphens introduced by PDF text extraction", () => {
      expect(normalizeText("re\u00adported find\u00adings")).toBe("reported findings");
    });
  });

  describe("normalizeDoi", () => {
    it("strips the doi.org URL prefix and lowercases", () => {
      expect(normalizeDoi("https://doi.org/10.1000/Widgets")).toBe("10.1000/widgets");
    });

    it("strips a bare doi: prefix", () => {
      expect(normalizeDoi("doi:10.1000/Widgets")).toBe("10.1000/widgets");
    });

    it("returns null for null input without throwing", () => {
      expect(normalizeDoi(null)).toBeNull();
    });
  });
});