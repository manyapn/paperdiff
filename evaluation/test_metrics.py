from metrics import Prediction, classification_metrics


def test_metrics_include_product_safety_rate() -> None:
    result = classification_metrics(
        [
            Prediction("supports", "supports", 0.9),
            Prediction("contradicts", "supports", 0.8),
            Prediction("insufficient", "insufficient", 0.7),
        ]
    )
    assert result["accuracy"] == 2 / 3
    assert result["unsupported_claims_allowed_through_rate"] == 1 / 3

