from dataclasses import dataclass

from paperdiff_api.models import (
    RelationshipLabel,
    RelationshipResult,
    ReviewStatus,
)


@dataclass(frozen=True)
class RelationshipPolicy:
    grounded_threshold: float = 0.85
    qualified_threshold: float = 0.60

    def apply(
        self,
        *,
        label: RelationshipLabel,
        confidence: float,
        provenance_passed: bool,
        rationale: str,
    ) -> RelationshipResult:
        if not provenance_passed:
            status = ReviewStatus.BLOCKED
        elif label is RelationshipLabel.SUPPORTS and confidence >= self.grounded_threshold:
            status = ReviewStatus.GROUNDED
        elif label in {RelationshipLabel.SUPPORTS, RelationshipLabel.PARTIAL} and (
            confidence >= self.qualified_threshold
        ):
            status = ReviewStatus.QUALIFIED
        else:
            status = ReviewStatus.NEEDS_REVIEW
        return RelationshipResult(
            label=label,
            confidence=confidence,
            status=status,
            rationale=rationale,
        )
