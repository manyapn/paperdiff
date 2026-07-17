from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

from paperdiff_api.models import ProvenanceCheck, ProvenanceResult

ALLOWED_SOURCE_ORIGINS = {"user", "linkup", "demo"}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("\u00ad", "")
    return re.sub(r"\s+", " ", value).strip().casefold()


def normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().casefold()
    for prefix in ("https://doi.org/", "http://doi.org/", "doi:"):
        if normalized.startswith(prefix):
            normalized = normalized.removeprefix(prefix)
    return normalized.strip()


@dataclass(frozen=True)
class ProvenanceCandidate:
    source_origin: Literal["user", "linkup", "demo"] | str
    fetched: bool
    expected_title: str
    fetched_title: str
    expected_doi: str | None
    fetched_doi: str | None
    quote: str
    fetched_text: str
    evidence_span_id: str | None


class ProvenanceValidator:
    """Runs only deterministic checks; it never decides semantic support."""

    def validate(self, candidate: ProvenanceCandidate) -> ProvenanceResult:
        source_origin = candidate.source_origin in ALLOWED_SOURCE_ORIGINS
        title_match = normalize_text(candidate.expected_title) == normalize_text(
            candidate.fetched_title
        )
        expected_doi = normalize_doi(candidate.expected_doi)
        fetched_doi = normalize_doi(candidate.fetched_doi)
        doi_match = expected_doi is None or expected_doi == fetched_doi
        identity_match = title_match and doi_match
        quote = normalize_text(candidate.quote)
        passage_match = bool(quote) and quote in normalize_text(candidate.fetched_text)
        span_specific = bool(candidate.evidence_span_id and quote and len(quote.split()) >= 4)

        checks = ProvenanceCheck(
            source_origin=source_origin,
            fetched=candidate.fetched,
            identity_match=identity_match,
            passage_match=passage_match,
            span_specific=span_specific,
        )
        labels = {
            "source_origin": "Source did not originate from the user, Linkup, or demo fixture.",
            "fetched": "Source fetch did not complete successfully.",
            "identity_match": "Fetched paper identity does not match the extracted paper.",
            "passage_match": "Quoted passage was not found in normalized fetched text.",
            "span_specific": "Evidence is not linked to a specific passage span.",
        }
        failures = [message for key, message in labels.items() if not getattr(checks, key)]
        return ProvenanceResult(passed=not failures, checks=checks, failure_reasons=failures)
