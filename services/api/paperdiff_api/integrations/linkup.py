from __future__ import annotations

from dataclasses import dataclass

from paperdiff_api.integrations.base import IntegrationNotConfigured
from paperdiff_api.models import PaperInput


@dataclass(frozen=True)
class RetrievedPaper:
    requested_input: PaperInput
    source_url: str
    source_origin: str
    title: str
    doi: str | None
    normalized_text: str
    raw_response_ref: str


class LinkupRetriever:
    """Fail-closed boundary for the current Linkup SDK.

    Implement this only after confirming the official installed SDK response shape.
    Raw responses must be stored durably and referenced by `raw_response_ref`.
    """

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    async def fetch(self, paper_input: PaperInput) -> RetrievedPaper:
        if not self.api_key:
            raise IntegrationNotConfigured(
                "Linkup",
                (
                    "Set LINKUP_API_KEY and implement the confirmed SDK call in "
                    "integrations/linkup.py."
                ),
            )
        raise IntegrationNotConfigured(
            "Linkup live adapter",
            "Confirm the current Linkup SDK response schema, then replace this fail-closed seam.",
        )
