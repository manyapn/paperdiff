from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from paperdiff_api.integrations.linkup import LinkupRetriever, RetrievedPaper
from paperdiff_api.models import ComparisonRequest, ComparisonResponse, InputKind, PaperInput
from paperdiff_api.pipeline.demo import build_demo_comparison

T = TypeVar("T")


async def run_parallel(*jobs: Callable[[], Awaitable[T]]) -> list[T]:
    """Local execution default; replace the runner, not pipeline semantics, in RocketRide."""
    return list(await asyncio.gather(*(job() for job in jobs)))


class CompareService:
    def __init__(self, retriever: LinkupRetriever) -> None:
        self.retriever = retriever

    async def compare(self, request: ComparisonRequest) -> ComparisonResponse:
        if request.left.kind is InputKind.DEMO and request.right.kind is InputKind.DEMO:
            return build_demo_comparison()

        await run_parallel(
            lambda: self._retrieve(request.left),
            lambda: self._retrieve(request.right),
        )
        # Retrieval is intentionally the first fail-closed live seam. Extraction and alignment
        # should be implemented only with recorded Linkup response fixtures and contract tests.
        raise RuntimeError("Live extraction is not implemented yet.")

    async def _retrieve(self, paper_input: PaperInput) -> RetrievedPaper:
        return await self.retriever.fetch(paper_input)
