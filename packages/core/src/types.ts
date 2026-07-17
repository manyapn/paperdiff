export type ClassifierLabel = "supports" | "contradicts" | "insufficient";
export type EvidenceStatus =
  | "grounded"
  | "qualified"
  | "flagged_for_correction"
  | "needs_review"
  | "blocked";

export interface ClaimEvidenceInput {
  claim: string;
  evidence: string;
}

export interface ClassifierResult {
  label: ClassifierLabel;
  confidence: number;
  abstained: boolean;
  model_version: string;
}

export interface EvidenceDecision extends ClassifierResult {
  status: EvidenceStatus;
  rationale: string;
}

export interface ProvenanceChecks {
  source_origin: boolean;
  fetched: boolean;
  identity_match: boolean;
  passage_match: boolean;
  span_specific: boolean;
}

export interface ProvenanceResult {
  passed: boolean;
  checks: ProvenanceChecks;
  failure_reasons: string[];
}

