from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar

from paperdiff_api.integrations.base import IntegrationNotConfigured

T = TypeVar("T")


class RocketRideRunner:
    """Execution seam for RocketRide Cloud and trace inspection."""

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    async def run_parallel(self, *jobs: Callable[[], Awaitable[T]]) -> list[T]:
        raise IntegrationNotConfigured(
            "RocketRide",
            (
                "Install the VS Code extension and confirm current nodes/config before wiring "
                "this seam."
            ),
        )
