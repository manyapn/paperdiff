import type { ComparisonResponse, EvidenceSpan } from "../types";

const checks = {
  source_origin: true,
  fetched: true,
  identity_match: true,
  passage_match: true,
  span_specific: true,
};

const makeEvidence = (
  id: string,
  paperId: string,
  title: string,
  quote: string,
): EvidenceSpan => ({
  id,
  paper_id: paperId,
  source_url: `https://example.org/paperdiff/${paperId}`,
  source_title: title,
  source_doi: null,
  source_origin: "demo",
  quote,
  section: "Methods and results",
  provenance: { passed: true, checks, failure_reasons: [] },
  relationship: {
    label: "supports",
    confidence: 0.96,
    abstained: false,
    model_version: "synthetic-demo-classifier-v1",
    status: "grounded",
    rationale: "The synthetic source passage directly states the displayed method and result.",
  },
});

const leftTitle = "Synthetic Study A: Passive Feed Browsing and Adolescent Mood";
const rightTitle = "Synthetic Study B: Total Screen Time and Adult Well-being";
const leftEvidence = makeEvidence(
  "ev-a-methods",
  "paper-a",
  leftTitle,
  "Participants aged 14 to 18 recorded passive photo-feed browsing for fourteen days; higher browsing was associated with a higher same-day symptom score.",
);
const rightEvidence = makeEvidence(
  "ev-b-methods",
  "paper-b",
  rightTitle,
  "Adults aged 18 to 64 reported total weekly screen time and showed no increase in clinician-recorded depression diagnoses over twenty-four months.",
);

const sharedEvidence = {
  left_evidence_ids: [leftEvidence.id],
  right_evidence_ids: [rightEvidence.id],
};

export const demoComparison: ComparisonResponse = {
  id: "demo-comparison-v1",
  generated_at: "2026-07-17T18:00:00Z",
  mode: "compare",
  is_demo: true,
  left: {
    id: "paper-a",
    label: "Paper A",
    title: leftTitle,
    authors: ["PaperDiff demo fixture"],
    year: 2024,
    doi: null,
    source_url: "https://example.org/paperdiff/paper-a",
    public_claim: "Social media use increases depression.",
    paper_conclusion: "Passive photo-feed browsing tracked with same-day symptoms in adolescents.",
    evidence: [leftEvidence],
  },
  right: {
    id: "paper-b",
    label: "Paper B",
    title: rightTitle,
    authors: ["PaperDiff demo fixture"],
    year: 2025,
    doi: null,
    source_url: "https://example.org/paperdiff/paper-b",
    public_claim: "Screen time does not increase depression.",
    paper_conclusion: "Total self-reported screen time did not predict clinical diagnoses in adults.",
    evidence: [rightEvidence],
  },
  dimensions: [
    {
      key: "research_question",
      label: "Research question",
      left_value: "Short-term association between passive browsing and mood symptoms",
      right_value: "Long-term prediction of clinical depression from total screen time",
      classification: "incompatible",
      drives_verdict: true,
      rationale: "The studies ask related but non-equivalent causal and temporal questions.",
      ...sharedEvidence,
    },
    {
      key: "population",
      label: "Population",
      left_value: "Adolescents aged 14-18",
      right_value: "Adults aged 18-64",
      classification: "incompatible",
      drives_verdict: true,
      rationale: "The cohorts do not cover the same developmental population.",
      ...sharedEvidence,
    },
    {
      key: "exposure",
      label: "Exposure definition",
      left_value: "Passively browsing a photo-based social feed",
      right_value: "Total self-reported screen time across devices",
      classification: "incompatible",
      drives_verdict: true,
      rationale: "The same headline term hides different operational definitions.",
      ...sharedEvidence,
    },
    {
      key: "outcome",
      label: "Outcome",
      left_value: "Same-day self-reported symptom score",
      right_value: "Clinician-recorded depression diagnosis",
      classification: "different",
      drives_verdict: true,
      rationale: "Both concern depression, but measure different endpoints.",
      ...sharedEvidence,
    },
    {
      key: "time_horizon",
      label: "Time horizon",
      left_value: "14 days",
      right_value: "24 months",
      classification: "incompatible",
      drives_verdict: true,
      rationale: "Immediate symptom fluctuation and long-term diagnosis are not interchangeable.",
      ...sharedEvidence,
    },
    {
      key: "design",
      label: "Study design",
      left_value: "Prospective observational diary",
      right_value: "Prospective observational cohort",
      classification: "different",
      drives_verdict: false,
      rationale: "Both are observational, with different measurement cadence.",
      ...sharedEvidence,
    },
    {
      key: "direction",
      label: "Reported direction",
      left_value: "Positive association",
      right_value: "No detected increase",
      classification: "incompatible",
      drives_verdict: false,
      rationale: "The surface conclusions differ, but only after unlike measurements.",
      ...sharedEvidence,
    },
    {
      key: "causal_scope",
      label: "Causal scope",
      left_value: "Association only",
      right_value: "Association only",
      classification: "equivalent",
      drives_verdict: false,
      rationale: "Neither synthetic study supports a causal claim.",
      ...sharedEvidence,
    },
  ],
  verdict: {
    kind: "apparent_contradiction",
    headline:
      "Apparent contradiction. 5 material scope differences. No unresolved conflict remains after alignment.",
    explanation:
      "The claims use similar everyday language, but the studies differ in population, exposure, outcome, and time horizon.",
    material_difference_count: 5,
  },
  synthesis:
    "These synthetic examples jointly show that results about short-term adolescent mood during passive feed use do not directly determine whether broad adult screen time predicts long-term clinical depression.",
  trace: [
    {
      stage: "extract_a + extract_b",
      status: "complete",
      duration_ms: 18,
      detail: "Symmetric demo extractors completed concurrently.",
    },
    {
      stage: "dimension_alignment",
      status: "complete",
      duration_ms: 7,
      detail: "Eight shared dimensions classified.",
    },
    {
      stage: "provenance_validation",
      status: "complete",
      duration_ms: 3,
      detail: "Origin, fetch, identity, passage, and span checks passed.",
    },
    {
      stage: "relationship_verifier",
      status: "complete",
      duration_ms: 4,
      detail: "Demo verifier policy mapped direct support to Grounded.",
    },
  ],
};
