from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from paperdiff_api.config import get_settings
from paperdiff_api.integrations.base import IntegrationNotConfigured
from paperdiff_api.integrations.linkup import LinkupRetriever
from paperdiff_api.models import (
    ComparisonRequest,
    ComparisonResponse,
    ErrorResponse,
    HealthResponse,
)
from paperdiff_api.pipeline.compare import CompareService
from paperdiff_api.pipeline.demo import build_demo_comparison

settings = get_settings()
app = FastAPI(
    title="PaperDiff API",
    version="0.1.0",
    description="Verification and methodological alignment after citations.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
compare_service = CompareService(LinkupRetriever(settings.linkup_api_key))


@app.exception_handler(IntegrationNotConfigured)
async def integration_not_configured(
    _request: Request, exc: IntegrationNotConfigured
) -> JSONResponse:
    error = ErrorResponse(
        code="integration_not_configured",
        message=str(exc),
        next_step=exc.next_step,
    )
    return JSONResponse(status_code=503, content=error.model_dump(mode="json"))


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/v1/demo", response_model=ComparisonResponse)
async def demo() -> ComparisonResponse:
    return build_demo_comparison()


@app.post(
    "/api/v1/compare",
    response_model=ComparisonResponse,
    responses={503: {"model": ErrorResponse}},
)
async def compare(request: ComparisonRequest) -> ComparisonResponse:
    return await compare_service.compare(request)
