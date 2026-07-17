from fastapi.testclient import TestClient

from paperdiff_api.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "paperdiff-api"}


def test_demo_has_eight_dimensions_and_grounded_evidence() -> None:
    response = client.get("/api/v1/demo")
    assert response.status_code == 200
    payload = response.json()
    assert payload["is_demo"] is True
    assert len(payload["dimensions"]) == 8
    assert payload["verdict"]["kind"] == "apparent_contradiction"
    for side in ("left", "right"):
        evidence = payload[side]["evidence"][0]
        assert evidence["provenance"]["passed"] is True
        assert evidence["relationship"]["status"] == "grounded"


def test_compare_demo_inputs_uses_same_response_contract() -> None:
    response = client.post(
        "/api/v1/compare",
        json={
            "left": {"kind": "demo", "value": "paper-a"},
            "right": {"kind": "demo", "value": "paper-b"},
        },
    )
    assert response.status_code == 200
    assert response.json()["id"] == "demo-comparison-v1"


def test_live_input_fails_closed_without_linkup() -> None:
    response = client.post(
        "/api/v1/compare",
        json={
            "left": {"kind": "url", "value": "https://example.org/a"},
            "right": {"kind": "doi", "value": "10.1000/example"},
        },
    )
    assert response.status_code == 503
    assert response.json()["code"] == "integration_not_configured"
