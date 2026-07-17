import type { ClassifierResult, EvidenceDecision, EvidenceStatus } from "./types.js";

const LABELS = new Set(["supports", "contradicts", "insufficient"]);

export function validateClassifierResult(value: unknown): ClassifierResult {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Classifier result must be an object.");
  }
  const result = value as Record<string, unknown>;
  if (typeof result.label !== "string" || !LABELS.has(result.label)) {
    throw new TypeError("Classifier label must be supports, contradicts, or insufficient.");
  }
  if (
    typeof result.confidence !== "number" ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new TypeError("Classifier confidence must be a finite number from 0 to 1.");
  }
  if (typeof result.abstained !== "boolean") {
    throw new TypeError("Classifier abstained must be a boolean.");
  }
  if (typeof result.model_version !== "string" || !result.model_version.trim()) {
    throw new TypeError("Classifier model_version is required.");
  }
  return result as unknown as ClassifierResult;
}

export interface ClassifierPolicyOptions {
  groundedThreshold?: number;
  qualifiedThreshold?: number;
}

export function applyClassifierPolicy(
  classification: ClassifierResult,
  provenancePassed: boolean,
  rationale: string,
  options: ClassifierPolicyOptions = {},
): EvidenceDecision {
  validateClassifierResult(classification);
  const groundedThreshold = options.groundedThreshold ?? 0.85;
  const qualifiedThreshold = options.qualifiedThreshold ?? 0.6;
  let status: EvidenceStatus;

  if (!provenancePassed) status = "blocked";
  else if (classification.label === "contradicts") status = "flagged_for_correction";
  else if (classification.label === "insufficient" || classification.abstained) status = "needs_review";
  else if (classification.confidence >= groundedThreshold) status = "grounded";
  else if (classification.confidence >= qualifiedThreshold) status = "qualified";
  else status = "needs_review";

  return { ...classification, status, rationale };
}
