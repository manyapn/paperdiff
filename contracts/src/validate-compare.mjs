const CLASSIFICATIONS = new Set(["equivalent", "different", "incompatible", "review"]);
const EVIDENCE_STATUSES = new Set([
  "Grounded",
  "Qualified",
  "Flagged for correction",
  "Needs review",
  "Blocked",
]);
const PROVENANCE_CHECKS = [
  "source_origin",
  "fetched",
  "identity_match",
  "passage_match",
  "span_specific",
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function requireRecord(value, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }
  return value;
}

function validateInput(value, path, errors) {
  const input = requireRecord(value, path, errors);
  if (!input) return;
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const claim = typeof input.claim === "string" ? input.claim.trim() : "";
  if (!url && !claim) errors.push(`${path} must include a non-empty url or claim.`);
  if (typeof input.use_detected_conclusion !== "boolean") {
    errors.push(`${path}.use_detected_conclusion must be a boolean.`);
  }
}

export function validateCompareRequest(value) {
  const errors = [];
  const request = requireRecord(value, "request", errors);
  if (request) {
    validateInput(request.left, "request.left", errors);
    validateInput(request.right, "request.right", errors);
  }
  return { valid: errors.length === 0, errors };
}

function validatePaper(value, path, errors) {
  const paper = requireRecord(value, path, errors);
  if (!paper) return;
  if (typeof paper.title !== "string" || !paper.title.trim()) {
    errors.push(`${path}.title is required.`);
  }
  if (!Array.isArray(paper.authors)) errors.push(`${path}.authors must be an array.`);
  if (!isHttpsUrl(paper.source_url)) errors.push(`${path}.source_url must be an HTTPS URL.`);
  if (!Number.isInteger(paper.passages) || paper.passages < 1) {
    errors.push(`${path}.passages must be at least 1.`);
  }
}

function validatePassage(value, path, errors) {
  if (value === null) return false;
  const passage = requireRecord(value, path, errors);
  if (!passage) return false;
  if (!isHttpsUrl(passage.source_url)) errors.push(`${path}.source_url must be an HTTPS URL.`);
  if (typeof passage.span_id !== "string" || !passage.span_id.trim()) {
    errors.push(`${path}.span_id is required.`);
  }
  if (typeof passage.span !== "string" || passage.span.trim().split(/\s+/).length < 4) {
    errors.push(`${path}.span must contain an exact passage of at least four words.`);
  }
  return true;
}

function validateProvenance(value, path, errors) {
  const provenance = requireRecord(value, path, errors);
  if (!provenance) return false;
  const checks = requireRecord(provenance.checks, `${path}.checks`, errors);
  if (!checks) return false;
  for (const name of PROVENANCE_CHECKS) {
    if (typeof checks[name] !== "boolean") errors.push(`${path}.checks.${name} must be a boolean.`);
  }
  const allPassed = PROVENANCE_CHECKS.every((name) => checks[name] === true);
  if (provenance.passed !== allPassed) {
    errors.push(`${path}.passed must equal the conjunction of its deterministic checks.`);
  }
  if (!Array.isArray(provenance.failure_reasons)) {
    errors.push(`${path}.failure_reasons must be an array.`);
  } else if (allPassed && provenance.failure_reasons.length > 0) {
    errors.push(`${path}.failure_reasons must be empty when provenance passes.`);
  } else if (!allPassed && provenance.failure_reasons.length === 0) {
    errors.push(`${path}.failure_reasons must explain a failed provenance check.`);
  }
  return allPassed;
}

function validateVerifier(value, path, errors) {
  const verifier = requireRecord(value, path, errors);
  if (!verifier) return null;
  if (!new Set(["classifier", "prompted_llm"]).has(verifier.kind)) {
    errors.push(`${path}.kind is invalid.`);
  }
  if (!new Set(["supports", "contradicts", "insufficient"]).has(verifier.label)) {
    errors.push(`${path}.label is invalid.`);
  }
  if (
    typeof verifier.confidence !== "number" ||
    !Number.isFinite(verifier.confidence) ||
    verifier.confidence < 0 ||
    verifier.confidence > 1
  ) {
    errors.push(`${path}.confidence must be a finite number from 0 to 1.`);
  }
  if (typeof verifier.abstained !== "boolean") errors.push(`${path}.abstained must be a boolean.`);
  if (typeof verifier.model_version !== "string" || !verifier.model_version.trim()) {
    errors.push(`${path}.model_version is required.`);
  }
  return verifier;
}

function validateDimension(value, index, errors) {
  const path = `response.dimensions[${index}]`;
  const dimension = requireRecord(value, path, errors);
  if (!dimension) return;
  if (typeof dimension.key !== "string" || !dimension.key.trim()) errors.push(`${path}.key is required.`);
  if (!CLASSIFICATIONS.has(dimension.classification)) errors.push(`${path}.classification is invalid.`);
  if (!EVIDENCE_STATUSES.has(dimension.evidence_status)) errors.push(`${path}.evidence_status is invalid.`);
  const hasLeftPassage = validatePassage(dimension.left_passage, `${path}.left_passage`, errors);
  const hasRightPassage = validatePassage(dimension.right_passage, `${path}.right_passage`, errors);
  const leftPassed = validateProvenance(dimension.left_provenance, `${path}.left_provenance`, errors);
  const rightPassed = validateProvenance(dimension.right_provenance, `${path}.right_provenance`, errors);
  const verifier = validateVerifier(dimension.verifier, `${path}.verifier`, errors);

  if (dimension.evidence_status === "Grounded") {
    if (!hasLeftPassage || !hasRightPassage) errors.push(`${path} cannot be Grounded without two exact passages.`);
    if (!leftPassed || !rightPassed) errors.push(`${path} cannot be Grounded when provenance fails.`);
    if (
      !verifier ||
      verifier.kind !== "classifier" ||
      verifier.label !== "supports" ||
      verifier.abstained ||
      verifier.confidence < 0.85
    ) {
      errors.push(`${path} can be Grounded only with a high-confidence, non-abstained classifier support result.`);
    }
  }

  if (
    new Set(["Grounded", "Qualified", "Flagged for correction"]).has(dimension.evidence_status) &&
    (!hasLeftPassage || !hasRightPassage)
  ) {
    errors.push(`${path} requires two exact passages for its evidence status.`);
  }

  if ((!leftPassed || !rightPassed) && dimension.evidence_status !== "Blocked") {
    errors.push(`${path} must be Blocked when either provenance gate fails.`);
  }
  if (
    leftPassed &&
    rightPassed &&
    verifier?.label === "contradicts" &&
    dimension.evidence_status !== "Flagged for correction"
  ) {
    errors.push(`${path} must be Flagged for correction when the verifier contradicts the extracted claim.`);
  }
  if ((verifier?.label === "insufficient" || verifier?.abstained) && dimension.evidence_status === "Grounded") {
    errors.push(`${path} cannot be Grounded when verification is insufficient or abstained.`);
  }
}

export function validateCompareResponse(value) {
  const errors = [];
  const response = requireRecord(value, "response", errors);
  if (!response) return { valid: false, errors };

  if (typeof response.trace_id !== "string" || !response.trace_id.trim()) {
    errors.push("response.trace_id is required.");
  }
  if (typeof response.pipeline_version !== "string" || !response.pipeline_version.trim()) {
    errors.push("response.pipeline_version is required.");
  }
  validatePaper(response.left, "response.left", errors);
  validatePaper(response.right, "response.right", errors);

  if (!Array.isArray(response.dimensions) || response.dimensions.length < 8 || response.dimensions.length > 10) {
    errors.push("response.dimensions must contain 8 to 10 dimensions.");
  } else {
    response.dimensions.forEach((dimension, index) => validateDimension(dimension, index, errors));
    const keys = response.dimensions.map((dimension) => dimension?.key).filter(Boolean);
    if (new Set(keys).size !== keys.length) errors.push("response.dimensions keys must be unique.");
  }

  const verdict = requireRecord(response.verdict, "response.verdict", errors);
  if (verdict) {
    if (typeof verdict.headline !== "string" || !verdict.headline.trim()) {
      errors.push("response.verdict.headline is required.");
    }
    if (!Array.isArray(verdict.citations) || verdict.citations.length < 2 || verdict.citations.some((url) => !isHttpsUrl(url))) {
      errors.push("response.verdict.citations must contain at least two HTTPS source URLs.");
    }
  }
  if (
    !Array.isArray(response.synthesis_citations) ||
    response.synthesis_citations.length < 2 ||
    response.synthesis_citations.some((url) => !isHttpsUrl(url))
  ) {
    errors.push("response.synthesis_citations must contain at least two HTTPS source URLs.");
  }

  if (!Array.isArray(response.trace) || response.trace.length === 0) {
    errors.push("response.trace must contain observable pipeline stages.");
  } else {
    const linkupSides = new Set();
    for (const [index, stage] of response.trace.entries()) {
      if (!isRecord(stage)) {
        errors.push(`response.trace[${index}] must be an object.`);
        continue;
      }
      if (stage.provider === "linkup" && stage.status === "complete" && isHttpsUrl(stage.source_url)) {
        if (String(stage.stage).includes("left")) linkupSides.add("left");
        if (String(stage.stage).includes("right")) linkupSides.add("right");
      }
    }
    if (!linkupSides.has("left") || !linkupSides.has("right")) {
      errors.push("response.trace must prove completed Linkup retrieval for both left and right inputs.");
    }
  }

  return { valid: errors.length === 0, errors };
}
