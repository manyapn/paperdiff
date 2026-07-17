"""Pure classifier response-boundary helpers with no model dependencies."""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping, Sequence


CLASSIFIER_LABELS = frozenset({"supports", "contradicts", "insufficient"})
MODEL_VERSION = "paperdiff-verifier-v1"


def validate_label_mapping(mapping: Mapping[int, str], num_labels: int) -> dict[int, str]:
    """Validate the artifact's ID assignment without assuming a fixed order."""

    normalized = {int(key): str(value) for key, value in mapping.items()}
    if set(normalized) != set(range(num_labels)):
        raise ValueError("label_mapping.json must define every model output ID exactly once")
    if set(normalized.values()) != CLASSIFIER_LABELS or num_labels != len(CLASSIFIER_LABELS):
        raise ValueError("label_mapping.json must contain supports, contradicts, and insufficient")
    return normalized


def result_from_probabilities(probabilities: Sequence[float], id2label: Mapping[int, str]) -> dict:
    """Build the narrow public result for one probability row."""

    if len(probabilities) != len(id2label) or not probabilities:
        raise ValueError("probability row does not match the label mapping")
    values = [float(value) for value in probabilities]
    if any(not math.isfinite(value) or value < 0 or value > 1 for value in values):
        raise ValueError("classifier probabilities must be finite values from 0 to 1")

    pred_id = max(range(len(values)), key=values.__getitem__)
    label = id2label[pred_id]
    if label not in CLASSIFIER_LABELS:
        raise ValueError("classifier produced an unsupported label")

    return {
        "label": label,
        "confidence": values[pred_id],
        "abstained": False,
        "model_version": MODEL_VERSION,
    }


def build_results(rows: Iterable[Sequence[float]], id2label: Mapping[int, str]) -> list[dict]:
    """Preserve model batch order while applying the narrow result boundary."""

    return [result_from_probabilities(row, id2label) for row in rows]
