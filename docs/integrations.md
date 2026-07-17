# Integration checklist

## Linkup

The adapter boundary is `integrations/linkup.py`. Before implementing live calls:

- Confirm the current official SDK and response shape.
- Search separately for fetch, replication, contradiction, and reassessment use cases.
- Prefer DOI/publisher, PubMed/PMC, arXiv, and official correction pages.
- Preserve the complete raw response for provenance checks, outside Git.
- Pass source origin and fetched normalized text into the validator.

## RocketRide

No RocketRide VS Code extension was detected during initial scaffolding. Install it and confirm current node names, config fields, deployment command, and tracing API from the installed version before replacing the fail-closed adapter.

Expected responsibilities:

- Run both extractors concurrently.
- Later, run the three Challenge scouts concurrently.
- Enforce a shared schema between stages.
- Route retrieval, insufficient-evidence, and verifier failures separately.
- Trace every branch for demo inspection.

Never add guessed SDK imports or configuration keys just to make the integration appear complete.

