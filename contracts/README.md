# Shared API contract

The Pydantic models in `services/api/paperdiff_api/models.py` are the runtime source of truth. FastAPI exposes their generated OpenAPI schema at `/openapi.json` and interactive docs at `/docs`.

Frontend interfaces live in `apps/web/src/types.ts`; the checked-in cross-team response fixture is `apps/web/src/lib/demoComparison.ts`. A shared model change is complete only when all three agree and both API and frontend tests pass.

The compare endpoint accepts `examples/compare-request.json`. Inputs may be `url`, `doi`, `claim`, or `demo`. Demo is fixture-only; live values pass through the fail-closed retrieval path.

