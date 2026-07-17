from paperdiff_api.verification.provenance import ProvenanceCandidate, ProvenanceValidator


def candidate(**overrides: object) -> ProvenanceCandidate:
    values: dict[str, object] = {
        "source_origin": "linkup",
        "fetched": True,
        "expected_title": "A Study of Widgets",
        "fetched_title": "A Study of Widgets",
        "expected_doi": "doi:10.1000/widgets",
        "fetched_doi": "https://doi.org/10.1000/WIDGETS",
        "quote": "Participants were followed for twenty four months.",
        "fetched_text": (
            "Methods\nParticipants were followed for twenty  four months. Results followed."
        ),
        "evidence_span_id": "span-1",
    }
    values.update(overrides)
    return ProvenanceCandidate(**values)  # type: ignore[arg-type]


def test_normalized_exact_passage_and_doi_pass() -> None:
    result = ProvenanceValidator().validate(candidate())
    assert result.passed is True
    assert result.failure_reasons == []


def test_passage_mismatch_blocks_provenance() -> None:
    result = ProvenanceValidator().validate(candidate(quote="This sentence never appeared."))
    assert result.passed is False
    assert result.checks.passage_match is False


def test_identity_mismatch_blocks_provenance() -> None:
    result = ProvenanceValidator().validate(candidate(fetched_doi="10.1000/other"))
    assert result.passed is False
    assert result.checks.identity_match is False
