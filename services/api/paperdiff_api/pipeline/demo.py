from __future__ import annotations

from datetime import UTC, datetime

from paperdiff_api.models import (
    ComparisonResponse,
    DiffClassification,
    DimensionDiff,
    EvidenceSpan,
    PaperSummary,
    RelationshipLabel,
    TraceEvent,
    Verdict,
    VerdictKind,
)
from paperdiff_api.verification.provenance import ProvenanceCandidate, ProvenanceValidator
from paperdiff_api.verification.relationship import RelationshipPolicy


def _evidence(
    *,
    evidence_id: str,
    paper_id: str,
    title: str,
    quote: str,
    fetched_text: str,
) -> EvidenceSpan:
    provenance = ProvenanceValidator().validate(
        ProvenanceCandidate(
            source_origin="demo",
            fetched=True,
            expected_title=title,
            fetched_title=title,
            expected_doi=None,
            fetched_doi=None,
            quote=quote,
            fetched_text=fetched_text,
            evidence_span_id=evidence_id,
        )
    )
    relationship = RelationshipPolicy().apply(
        label=RelationshipLabel.SUPPORTS,
        confidence=0.96,
        provenance_passed=provenance.passed,
        rationale="The synthetic source passage directly states the displayed method and result.",
    )
    return EvidenceSpan(
        id=evidence_id,
        paper_id=paper_id,
        source_url=f"https://example.org/paperdiff/{paper_id}",
        source_title=title,
        source_origin="demo",
        quote=quote,
        section="Methods and results",
        provenance=provenance,
        relationship=relationship,
    )


def build_demo_comparison() -> ComparisonResponse:
    left_title = "Synthetic Study A: Passive Feed Browsing and Adolescent Mood"
    right_title = "Synthetic Study B: Total Screen Time and Adult Well-being"
    left_quote = (
        "Participants aged 14 to 18 recorded passive photo-feed browsing for fourteen days; "
        "higher browsing was associated with a higher same-day symptom score."
    )
    right_quote = (
        "Adults aged 18 to 64 reported total weekly screen time and showed no increase in "
        "clinician-recorded depression diagnoses over twenty-four months."
    )
    left_evidence = _evidence(
        evidence_id="ev-a-methods",
        paper_id="paper-a",
        title=left_title,
        quote=left_quote,
        fetched_text=(
            f"Methods. {left_quote} Conclusion. This association does not establish causation."
        ),
    )
    right_evidence = _evidence(
        evidence_id="ev-b-methods",
        paper_id="paper-b",
        title=right_title,
        quote=right_quote,
        fetched_text=(
            f"Methods. {right_quote} Conclusion. The confidence interval included small effects."
        ),
    )

    left = PaperSummary(
        id="paper-a",
        label="Paper A",
        title=left_title,
        authors=["PaperDiff demo fixture"],
        year=2024,
        source_url="https://example.org/paperdiff/paper-a",
        public_claim="Social media use increases depression.",
        paper_conclusion=(
            "Passive photo-feed browsing tracked with same-day symptoms in adolescents."
        ),
        evidence=[left_evidence],
    )
    right = PaperSummary(
        id="paper-b",
        label="Paper B",
        title=right_title,
        authors=["PaperDiff demo fixture"],
        year=2025,
        source_url="https://example.org/paperdiff/paper-b",
        public_claim="Screen time does not increase depression.",
        paper_conclusion=(
            "Total self-reported screen time did not predict clinical diagnoses in adults."
        ),
        evidence=[right_evidence],
    )

    shared = {
        "left_evidence_ids": [left_evidence.id],
        "right_evidence_ids": [right_evidence.id],
    }
    dimensions = [
        DimensionDiff(
            key="research_question",
            label="Research question",
            left_value="Short-term association between passive browsing and mood symptoms",
            right_value="Long-term prediction of clinical depression from total screen time",
            classification=DiffClassification.INCOMPATIBLE,
            drives_verdict=True,
            rationale="The studies ask related but non-equivalent causal and temporal questions.",
            **shared,
        ),
        DimensionDiff(
            key="population",
            label="Population",
            left_value="Adolescents aged 14-18",
            right_value="Adults aged 18-64",
            classification=DiffClassification.INCOMPATIBLE,
            drives_verdict=True,
            rationale="The cohorts do not cover the same developmental population.",
            **shared,
        ),
        DimensionDiff(
            key="exposure",
            label="Exposure definition",
            left_value="Passively browsing a photo-based social feed",
            right_value="Total self-reported screen time across devices",
            classification=DiffClassification.INCOMPATIBLE,
            drives_verdict=True,
            rationale="The same headline term hides different operational definitions.",
            **shared,
        ),
        DimensionDiff(
            key="outcome",
            label="Outcome",
            left_value="Same-day self-reported symptom score",
            right_value="Clinician-recorded depression diagnosis",
            classification=DiffClassification.DIFFERENT,
            drives_verdict=True,
            rationale="Both concern depression, but measure different endpoints.",
            **shared,
        ),
        DimensionDiff(
            key="time_horizon",
            label="Time horizon",
            left_value="14 days",
            right_value="24 months",
            classification=DiffClassification.INCOMPATIBLE,
            drives_verdict=True,
            rationale=(
                "Immediate symptom fluctuation and long-term diagnosis are not interchangeable."
            ),
            **shared,
        ),
        DimensionDiff(
            key="design",
            label="Study design",
            left_value="Prospective observational diary",
            right_value="Prospective observational cohort",
            classification=DiffClassification.DIFFERENT,
            drives_verdict=False,
            rationale="Both are observational, with different measurement cadence.",
            **shared,
        ),
        DimensionDiff(
            key="direction",
            label="Reported direction",
            left_value="Positive association",
            right_value="No detected increase",
            classification=DiffClassification.INCOMPATIBLE,
            drives_verdict=False,
            rationale="The surface conclusions differ, but only after unlike measurements.",
            **shared,
        ),
        DimensionDiff(
            key="causal_scope",
            label="Causal scope",
            left_value="Association only",
            right_value="Association only",
            classification=DiffClassification.EQUIVALENT,
            drives_verdict=False,
            rationale="Neither synthetic study supports a causal claim.",
            **shared,
        ),
    ]

    material_count = sum(dimension.drives_verdict for dimension in dimensions)
    return ComparisonResponse(
        id="demo-comparison-v1",
        generated_at=datetime.now(UTC),
        is_demo=True,
        left=left,
        right=right,
        dimensions=dimensions,
        verdict=Verdict(
            kind=VerdictKind.APPARENT,
            headline=(
                f"Apparent contradiction. {material_count} material scope differences. "
                "No unresolved conflict remains after alignment."
            ),
            explanation=(
                "The claims use similar everyday language, but the studies differ in population, "
                "exposure, outcome, and time horizon."
            ),
            material_difference_count=material_count,
        ),
        synthesis=(
            "These synthetic examples jointly show that results about short-term adolescent mood "
            "during passive feed use do not directly determine whether broad adult screen time "
            "predicts long-term clinical depression."
        ),
        trace=[
            TraceEvent(
                stage="extract_a + extract_b",
                status="complete",
                duration_ms=18,
                detail="Symmetric demo extractors completed concurrently.",
            ),
            TraceEvent(
                stage="dimension_alignment",
                status="complete",
                duration_ms=7,
                detail="Eight shared dimensions classified.",
            ),
            TraceEvent(
                stage="provenance_validation",
                status="complete",
                duration_ms=3,
                detail="Origin, fetch, identity, passage, and span checks passed.",
            ),
            TraceEvent(
                stage="relationship_verifier",
                status="complete",
                duration_ms=4,
                detail="Demo verifier policy mapped direct support to Grounded.",
            ),
        ],
    )
