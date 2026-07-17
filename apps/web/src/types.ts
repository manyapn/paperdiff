export type InputKind = "url" | "doi" | "claim" | "demo";
export type DiffClassification = "equivalent" | "different" | "incompatible";
export type ReviewStatus = "grounded" | "qualified" | "needs_review" | "blocked";

export interface ProvenanceResult {
  passed: boolean;
  checks: {
    source_origin: boolean;
    fetched: boolean;
    identity_match: boolean;
    passage_match: boolean;
    span_specific: boolean;
  };
  failure_reasons: string[];
}

export interface EvidenceSpan {
  id: string;
  paper_id: string;
  source_url: string;
  source_title: string;
  source_doi: string | null;
  source_origin: "user" | "linkup" | "demo";
  quote: string;
  section: string | null;
  provenance: ProvenanceResult;
  relationship: {
    label: "supports" | "partial" | "insufficient" | "contradicts";
    confidence: number;
    status: ReviewStatus;
    rationale: string;
  };
}

export interface PaperSummary {
  id: string;
  label: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  source_url: string;
  public_claim: string;
  paper_conclusion: string;
  evidence: EvidenceSpan[];
}

export interface DimensionDiff {
  key: string;
  label: string;
  left_value: string;
  right_value: string;
  classification: DiffClassification;
  drives_verdict: boolean;
  rationale: string;
  left_evidence_ids: string[];
  right_evidence_ids: string[];
}

export interface ComparisonResponse {
  id: string;
  generated_at: string;
  mode: "compare";
  is_demo: boolean;
  left: PaperSummary;
  right: PaperSummary;
  dimensions: DimensionDiff[];
  verdict: {
    kind: "apparent_contradiction" | "genuine_unresolved_conflict" | "insufficient_evidence";
    headline: string;
    explanation: string;
    material_difference_count: number;
  };
  synthesis: string;
  trace: Array<{
    stage: string;
    status: "complete" | "blocked" | "skipped";
    duration_ms: number;
    detail: string;
  }>;
}

export interface APIError {
  code: string;
  message: string;
  next_step?: string;
}

