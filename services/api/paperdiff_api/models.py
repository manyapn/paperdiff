from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class InputKind(StrEnum):
    URL = "url"
    DOI = "doi"
    CLAIM = "claim"
    DEMO = "demo"


class PaperInput(APIModel):
    kind: InputKind
    value: str = Field(min_length=1, max_length=4_000)


class ComparisonRequest(APIModel):
    left: PaperInput
    right: PaperInput


class ProvenanceCheck(APIModel):
    source_origin: bool
    fetched: bool
    identity_match: bool
    passage_match: bool
    span_specific: bool


class ProvenanceResult(APIModel):
    passed: bool
    checks: ProvenanceCheck
    failure_reasons: list[str] = Field(default_factory=list)


class RelationshipLabel(StrEnum):
    SUPPORTS = "supports"
    PARTIAL = "partial"
    INSUFFICIENT = "insufficient"
    CONTRADICTS = "contradicts"


class ReviewStatus(StrEnum):
    GROUNDED = "grounded"
    QUALIFIED = "qualified"
    NEEDS_REVIEW = "needs_review"
    BLOCKED = "blocked"


class RelationshipResult(APIModel):
    label: RelationshipLabel
    confidence: float = Field(ge=0, le=1)
    status: ReviewStatus
    rationale: str


class EvidenceSpan(APIModel):
    id: str
    paper_id: str
    source_url: HttpUrl
    source_title: str
    source_doi: str | None = None
    source_origin: Literal["user", "linkup", "demo"]
    quote: str
    section: str | None = None
    provenance: ProvenanceResult
    relationship: RelationshipResult


class PaperSummary(APIModel):
    id: str
    label: str
    title: str
    authors: list[str]
    year: int | None = None
    doi: str | None = None
    source_url: HttpUrl
    public_claim: str
    paper_conclusion: str
    evidence: list[EvidenceSpan]


class DiffClassification(StrEnum):
    EQUIVALENT = "equivalent"
    DIFFERENT = "different"
    INCOMPATIBLE = "incompatible"


class DimensionDiff(APIModel):
    key: str
    label: str
    left_value: str
    right_value: str
    classification: DiffClassification
    drives_verdict: bool
    rationale: str
    left_evidence_ids: list[str]
    right_evidence_ids: list[str]


class VerdictKind(StrEnum):
    APPARENT = "apparent_contradiction"
    GENUINE = "genuine_unresolved_conflict"
    INSUFFICIENT = "insufficient_evidence"


class Verdict(APIModel):
    kind: VerdictKind
    headline: str
    explanation: str
    material_difference_count: int = Field(ge=0)


class TraceEvent(APIModel):
    stage: str
    status: Literal["complete", "blocked", "skipped"]
    duration_ms: int = Field(ge=0)
    detail: str


class ComparisonResponse(APIModel):
    id: str
    generated_at: datetime
    mode: Literal["compare"] = "compare"
    is_demo: bool = False
    left: PaperSummary
    right: PaperSummary
    dimensions: list[DimensionDiff]
    verdict: Verdict
    synthesis: str
    trace: list[TraceEvent]


class HealthResponse(APIModel):
    status: Literal["ok"] = "ok"
    service: Literal["paperdiff-api"] = "paperdiff-api"


class ErrorResponse(APIModel):
    code: str
    message: str
    next_step: str | None = None
