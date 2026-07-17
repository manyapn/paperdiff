import type { ProvenanceChecks, ProvenanceResult } from "./types.js";

const ALLOWED_SOURCE_ORIGINS = new Set(["user", "linkup", "demo"]);

export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replaceAll("\u00ad", "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function normalizeDoi(value: string | null): string | null {
  if (!value) return null;
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/^(https?:\/\/doi\.org\/|doi:)/, "")
    .trim();
}

export interface ProvenanceCandidate {
  sourceOrigin: string;
  fetched: boolean;
  expectedTitle: string;
  fetchedTitle: string;
  expectedDoi: string | null;
  fetchedDoi: string | null;
  quote: string;
  fetchedText: string;
  evidenceSpanId: string | null;
}

export function validateProvenance(candidate: ProvenanceCandidate): ProvenanceResult {
  const expectedDoi = normalizeDoi(candidate.expectedDoi);
  const fetchedDoi = normalizeDoi(candidate.fetchedDoi);
  const quote = normalizeText(candidate.quote);
  const checks: ProvenanceChecks = {
    source_origin: ALLOWED_SOURCE_ORIGINS.has(candidate.sourceOrigin),
    fetched: candidate.fetched,
    identity_match:
      normalizeText(candidate.expectedTitle) === normalizeText(candidate.fetchedTitle) &&
      (expectedDoi === null || expectedDoi === fetchedDoi),
    passage_match: quote.length > 0 && normalizeText(candidate.fetchedText).includes(quote),
    span_specific: Boolean(candidate.evidenceSpanId && quote.split(" ").length >= 4),
  };
  const messages: Record<keyof ProvenanceChecks, string> = {
    source_origin: "Source did not originate from the user, Linkup, or demo fixture.",
    fetched: "Source fetch did not complete successfully.",
    identity_match: "Fetched paper identity does not match the extracted paper.",
    passage_match: "Quoted passage was not found in normalized fetched text.",
    span_specific: "Evidence is not linked to a specific passage span.",
  };
  const failureReasons = (Object.keys(checks) as Array<keyof ProvenanceChecks>)
    .filter((key) => !checks[key])
    .map((key) => messages[key]);
  return { passed: failureReasons.length === 0, checks, failure_reasons: failureReasons };
}

