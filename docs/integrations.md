# Integration checklist

## Linkup

Linkup runs inside the RocketRide workflow. Before implementing live calls:

- Confirm the current official SDK and response shape.
- Search separately for fetch, replication, contradiction, and reassessment use cases.
- Prefer DOI/publisher, PubMed/PMC, arXiv, and official correction pages.
- Preserve the complete raw response for provenance checks, outside Git.
- Pass source origin and fetched normalized text into the validator.

## RocketRide

No RocketRide VS Code extension was detected during initial scaffolding. Install it and confirm current node names, config fields, deployment command, tracing API, and public invocation URL from the installed version before building the workflow.

Expected responsibilities:

- Run both extractors concurrently.
- Later, run the three Challenge scouts concurrently.
- Enforce a shared schema between stages.
- Route retrieval, insufficient-evidence, and verifier failures separately.
- Trace every branch for demo inspection.

Never add guessed SDK imports or configuration keys just to make the integration appear complete.

## Frontend handoff

Deploy one public Compare endpoint from RocketRide, then provide it to the static frontend as `VITE_ROCKETRIDE_PIPELINE_URL`. Service keys stay in RocketRide; the browser receives only the public workflow URL.
