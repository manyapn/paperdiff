from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Iterable


LABELS = ("supports", "contradicts", "insufficient")


@dataclass(frozen=True)
class Prediction:
    expected: str
    predicted: str
    confidence: float
    provenance_passed: bool = True


def confusion_matrix(rows: Iterable[Prediction]) -> dict[str, dict[str, int]]:
    matrix = {expected: {predicted: 0 for predicted in LABELS} for expected in LABELS}
    for row in rows:
        matrix[row.expected][row.predicted] += 1
    return matrix


def classification_metrics(rows: Iterable[Prediction]) -> dict[str, object]:
    samples = list(rows)
    if not samples:
        raise ValueError("At least one prediction is required.")
    matrix = confusion_matrix(samples)
    recalls: dict[str, float] = {}
    f1s: dict[str, float] = {}
    for label in LABELS:
        true_positive = matrix[label][label]
        false_negative = sum(matrix[label].values()) - true_positive
        false_positive = sum(matrix[other][label] for other in LABELS) - true_positive
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
        recalls[label] = recall
        f1s[label] = f1

    unsupported_allowed = sum(
        row.provenance_passed
        and row.predicted == "supports"
        and row.expected in {"contradicts", "insufficient"}
        for row in samples
    )
    return {
        "count": len(samples),
        "class_counts": dict(Counter(row.expected for row in samples)),
        "accuracy": sum(row.expected == row.predicted for row in samples) / len(samples),
        "macro_f1": sum(f1s.values()) / len(LABELS),
        "per_class_recall": recalls,
        "unsupported_claims_allowed_through_rate": unsupported_allowed / len(samples),
        "confusion_matrix": matrix,
    }

