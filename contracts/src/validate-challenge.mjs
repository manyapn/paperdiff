const RELATIONSHIPS = [
  "closest contradictory result",
  "direct replication",
  "best later reassessment",
];

const DIMENSION_KEYS = [
  "population",
  "intervention_or_exposure",
  "comparator",
  "outcome",
  "time_horizon",
  "design",
  "analysis",
];

const PROVENANCE_CHECKS = [
  "source_origin",
  "fetched",
  "identity_match",
  "passage_match",
  "span_specific",
];

const FIT_PRESENTATION = {
  match: { points: 1, icon: "=", color: "#1746B7" },
  partial: { points: 0.5, icon: "≈", color: "#A65F00" },
  mismatch: { points: 0, icon: "≠", color: "#A93F35" },
  review: { points: 0, icon: "?", color: "#566173" },
};

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

function validatePassage(value, expectedUrl, path, errors) {
  if (value === null) return false;
  const passage = requireRecord(value, path, errors);
  if (!passage) return false;
  if (!isHttpsUrl(passage.source_url)) {
    errors.push(`${path}.source_url must be an HTTPS URL.`);
  } else if (passage.source_url !== expectedUrl) {
    errors.push(`${path}.source_url must match its resolved paper URL.`);
  }
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
  for (const check of PROVENANCE_CHECKS) {
    if (typeof checks[check] !== "boolean") {
      errors.push(`${path}.checks.${check} must be a boolean.`);
    }
  }
  const allPassed = PROVENANCE_CHECKS.every((check) => checks[check] === true);
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

function expectedComparisonFit(dimensions, score) {
  if (dimensions.some((dimension) => dimension?.fit === "review") || score < 3.5) return "review";
  return score >= 5.5 ? "high" : "medium";
}

function validateDimension(value, index, sourceUrl, candidateUrl, errors) {
  const path = `response.candidates[].dimensions[${index}]`;
  const dimension = requireRecord(value, path, errors);
  if (!dimension) return;

  const presentation = FIT_PRESENTATION[dimension.fit];
  if (!presentation) {
    errors.push(`${path}.fit is invalid.`);
  } else {
    if (dimension.points !== presentation.points) {
      errors.push(`${path}.points must be ${presentation.points} for fit ${dimension.fit}.`);
    }
    if (dimension.icon !== presentation.icon || dimension.color !== presentation.color) {
      errors.push(`${path} presentation must use the deterministic icon and color for ${dimension.fit}.`);
    }
  }

  if (!DIMENSION_KEYS.includes(dimension.key)) errors.push(`${path}.key is invalid.`);
  if (typeof dimension.rationale !== "string" || !dimension.rationale.trim()) {
    errors.push(`${path}.rationale is required.`);
  }

  const hasSourcePassage = validatePassage(
    dimension.source_passage,
    sourceUrl,
    `${path}.source_passage`,
    errors,
  );
  const hasCandidatePassage = validatePassage(
    dimension.candidate_passage,
    candidateUrl,
    `${path}.candidate_passage`,
    errors,
  );
  const sourcePassed = validateProvenance(
    dimension.source_provenance,
    `${path}.source_provenance`,
    errors,
  );
  const candidatePassed = validateProvenance(
    dimension.candidate_provenance,
    `${path}.candidate_provenance`,
    errors,
  );

  if ((!hasSourcePassage || !hasCandidatePassage || !sourcePassed || !candidatePassed) && dimension.fit !== "review") {
    errors.push(`${path}.fit must be review when either exact passage or provenance check fails.`);
  }
}

function validateCandidate(value, index, sourceUrl, errors) {
  const path = `response.candidates[${index}]`;
  const candidate = requireRecord(value, path, errors);
  if (!candidate) return;

  if (typeof candidate.title !== "string" || !candidate.title.trim()) errors.push(`${path}.title is required.`);
  if (!isHttpsUrl(candidate.url)) errors.push(`${path}.url must be an HTTPS URL.`);
  if (!RELATIONSHIPS.includes(candidate.relationship_type)) errors.push(`${path}.relationship_type is invalid.`);
  if (!new Set(["high", "medium", "review"]).has(candidate.comparison_fit)) {
    errors.push(`${path}.comparison_fit is invalid.`);
  }
  if (typeof candidate.explanation !== "string" || !candidate.explanation.trim()) {
    errors.push(`${path}.explanation is required.`);
  }
  if (
    !Array.isArray(candidate.citations) ||
    !candidate.citations.includes(sourceUrl) ||
    !candidate.citations.includes(candidate.url) ||
    candidate.citations.some((url) => !isHttpsUrl(url))
  ) {
    errors.push(`${path}.citations must include both the source and candidate HTTPS URLs.`);
  }

  const hasRelationshipSource = validatePassage(
    candidate.relationship_source_passage,
    sourceUrl,
    `${path}.relationship_source_passage`,
    errors,
  );
  const hasRelationshipCandidate = validatePassage(
    candidate.relationship_candidate_passage,
    candidate.url,
    `${path}.relationship_candidate_passage`,
    errors,
  );
  const sourcePassed = validateProvenance(candidate.source_provenance, `${path}.source_provenance`, errors);
  const candidatePassed = validateProvenance(candidate.candidate_provenance, `${path}.candidate_provenance`, errors);
  if (!hasRelationshipSource || !hasRelationshipCandidate || !sourcePassed || !candidatePassed) {
    errors.push(`${path} cannot surface a relationship without two provenance-validated exact passages.`);
  }

  if (!Array.isArray(candidate.dimensions) || candidate.dimensions.length !== 7) {
    errors.push(`${path}.dimensions must contain exactly seven rubric dimensions.`);
    return;
  }

  candidate.dimensions.forEach((dimension, dimensionIndex) => {
    validateDimension(dimension, dimensionIndex, sourceUrl, candidate.url, errors);
  });
  const keys = candidate.dimensions.map((dimension) => dimension?.key);
  if (new Set(keys).size !== 7 || DIMENSION_KEYS.some((key) => !keys.includes(key))) {
    errors.push(`${path}.dimensions must contain each fixed rubric key exactly once.`);
  }

  const score = candidate.dimensions.reduce((sum, dimension) => sum + (FIT_PRESENTATION[dimension?.fit]?.points ?? 0), 0);
  if (candidate.fit_score !== score) {
    errors.push(`${path}.fit_score must equal the sum of the seven deterministic dimension points.`);
  }
  const expectedFit = expectedComparisonFit(candidate.dimensions, score);
  if (candidate.comparison_fit !== expectedFit) {
    errors.push(`${path}.comparison_fit must be ${expectedFit} for its evidence and fit score.`);
  }
}

export function validateChallengeRequest(value) {
  const errors = [];
  const request = requireRecord(value, "request", errors);
  if (request) {
    if (typeof request.input !== "string" || !request.input.trim()) {
      errors.push("request.input must be a non-empty string.");
    }
    const unexpected = Object.keys(request).filter((key) => key !== "input");
    if (unexpected.length > 0) errors.push("request contains unsupported fields.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateChallengeResponse(value) {
  const errors = [];
  const response = requireRecord(value, "response", errors);
  if (!response) return { valid: false, errors };

  if (typeof response.trace_id !== "string" || !response.trace_id.trim()) {
    errors.push("response.trace_id is required.");
  }
  if (response.pipeline_version !== "paperdiff-challenge-v1") {
    errors.push("response.pipeline_version must be paperdiff-challenge-v1.");
  }

  const source = requireRecord(response.source, "response.source", errors);
  let sourceUrl = "";
  if (source) {
    sourceUrl = source.source_url;
    if (typeof source.title !== "string" || !source.title.trim()) errors.push("response.source.title is required.");
    if (!isHttpsUrl(sourceUrl)) errors.push("response.source.source_url must be an HTTPS URL.");
    if (!Number.isInteger(source.passages) || source.passages < 1) {
      errors.push("response.source.passages must be at least 1.");
    }
    const hasIdentityPassage = validatePassage(
      source.identity_passage,
      sourceUrl,
      "response.source.identity_passage",
      errors,
    );
    const sourcePassed = validateProvenance(source.provenance, "response.source.provenance", errors);
    if (!hasIdentityPassage || !sourcePassed) {
      errors.push("response.source must resolve to a provenance-validated fetched source.");
    }
  }

  if (!Array.isArray(response.candidates) || response.candidates.length !== 3) {
    errors.push("response.candidates must contain exactly three candidates.");
  } else {
    response.candidates.forEach((candidate, index) => validateCandidate(candidate, index, sourceUrl, errors));
    const relationships = response.candidates.map((candidate) => candidate?.relationship_type);
    if (RELATIONSHIPS.some((relationship) => relationships.filter((value) => value === relationship).length !== 1)) {
      errors.push("response.candidates must contain exactly one result from each Challenge scout.");
    }
    const urls = response.candidates.map((candidate) => candidate?.url);
    if (new Set(urls).size !== 3 || urls.includes(sourceUrl)) {
      errors.push("response.candidates must use three unique URLs distinct from the source.");
    }
    const scores = response.candidates.map((candidate) => candidate?.fit_score);
    if (scores.some((score, index) => index > 0 && scores[index - 1] < score)) {
      errors.push("response.candidates must be ranked by non-increasing fit_score.");
    }
  }

  if (!Array.isArray(response.trace) || response.trace.length === 0) {
    errors.push("response.trace must contain observable pipeline stages.");
  } else {
    const completedLinkupStages = new Map();
    for (const stage of response.trace) {
      if (isRecord(stage) && stage.provider === "linkup" && stage.status === "complete") {
        completedLinkupStages.set(stage.stage, stage.source_url);
      }
    }
    if (completedLinkupStages.get("retrieve-source") !== sourceUrl) {
      errors.push("response.trace must prove completed Linkup retrieval for the source.");
    }
    const traceRequirements = [
      ["contradiction", "closest contradictory result"],
      ["replication", "direct replication"],
      ["reassessment", "best later reassessment"],
    ];
    for (const [slug, relationship] of traceRequirements) {
      if (!completedLinkupStages.has(`scout-${slug}`)) {
        errors.push(`response.trace must include the completed Linkup scout-${slug} search.`);
      }
      const candidate = response.candidates?.find((item) => item?.relationship_type === relationship);
      if (!candidate || completedLinkupStages.get(`fetch-${slug}`) !== candidate.url) {
        errors.push(`response.trace must prove completed Linkup fetch-${slug} retrieval for its candidate.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
