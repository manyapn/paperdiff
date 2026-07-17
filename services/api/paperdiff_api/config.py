import os
from dataclasses import dataclass


def _as_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    environment: str
    demo_mode: bool
    cors_origins: tuple[str, ...]
    linkup_api_key: str | None
    rocketride_api_key: str | None


def get_settings() -> Settings:
    origins = os.getenv("PAPERDIFF_CORS_ORIGINS", "http://localhost:5173")
    return Settings(
        environment=os.getenv("PAPERDIFF_ENV", "development"),
        demo_mode=_as_bool(os.getenv("PAPERDIFF_DEMO_MODE"), default=True),
        cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
        linkup_api_key=os.getenv("LINKUP_API_KEY") or None,
        rocketride_api_key=os.getenv("ROCKETRIDE_APIKEY") or None,
    )
