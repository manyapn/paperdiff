# Integration checklist

## Linkup

Linkup runs inside the RocketRide workflow. Before implementing live calls:

- Confirm the current official SDK and response shape.
- Search separately for fetch, replication, contradiction, and reassessment use cases.
- Prefer DOI/publisher, PubMed/PMC, arXiv, and official correction pages.
- Preserve the complete raw response for provenance checks, outside Git.
- Pass source origin and fetched normalized text into the validator.

## RocketRide

Verified against the real `rocketride` PyPI package, docs.rocketride.org, and
the rocketride-org/rocketride-server GitHub source (2026-07-17). Corrections
to the earlier "nothing detected" placeholder:

- **No native Linkup node exists.** The full node catalog (113 nodes) has
  `search_exa`, `tool_exa_search`, `tool_tavily`, `tool_firecrawl` for
  web search, but nothing for Linkup. Call Linkup's own API through the
  generic `tool_http_request` node (agent tool: method/URL/headers/body,
  configurable `urlWhitelist`, auth shortcuts, rate limiting).
- **The trained classifier cannot run inside RocketRide.** `tool_python`
  executes via `RestrictedPython.compile_restricted()` with an import
  allowlist (`math, json, re, collections, datetime, ...`) and no
  filesystem/network/subprocess access by default. There's no path to load
  torch + transformers + a model checkpoint there. Host the classifier as
  its own small HTTP service instead -- see `ml/serving/README.md` -- and
  call it via `tool_http_request`, same as Linkup.
- **Deployment is SDK-drivable, not just extension-driven.**
  `client.deploy.add(pipeline, schedule="manual")` (Python SDK,
  `pip install rocketride`) persists a pipeline server-side on RocketRide
  Cloud, independent of the client staying connected. That's the real path
  to satisfy the hackathon's "deployed to cloud.rocketride.ai" requirement.
- **Env vars**: `ROCKETRIDE_URI` and `ROCKETRIDE_APIKEY` (matches this
  repo's `.env.example`) -- the marketing README on GitHub shows
  `ROCKETRIDE_AUTH` in one quick-connect snippet, but the actual SDK
  constructor, config table, and every code example consistently use
  `ROCKETRIDE_APIKEY`; treat that as authoritative.
- **`ROCKETRIDE_URI` must be `https://api.rocketride.ai`, not
  `https://cloud.rocketride.ai`.** The docs' own quickstart snippet uses
  `cloud.rocketride.ai`, but that domain serves the dashboard web app
  (static React SPA on S3 + CloudFront) and rejects WebSocket upgrades --
  confirmed by testing both directly. The real API/WebSocket host,
  `api.rocketride.ai`, is visible in the VS Code extension's own settings
  under `Rocketride > Development: Host Url`. A live SDK connection test
  against `wss://api.rocketride.ai/task/service` with a real API key
  succeeded (2026-07-17); `cloud.rocketride.ai` did not.
- A `Webhook` source node (`webhook://`) stands up the pipeline's public
  HTTP endpoint automatically on start -- that URL is what becomes
  `VITE_ROCKETRIDE_PIPELINE_URL`.

Expected responsibilities:

- Run both extractors concurrently (via `tool_http_request` calls to Linkup).
- Later, run the three Challenge scouts concurrently.
- Enforce a shared schema between stages.
- Route retrieval, insufficient-evidence, and verifier failures separately.
- Trace every branch for demo inspection.

Not yet verified: the exact `.pipe` JSON shape for wiring an agent to
multiple tools (invoke connections) -- only the minimal source/response
wiring shape is confirmed from docs. Build the actual pipeline visually in
the RocketRide VS Code extension canvas rather than hand-writing untested
JSON for the agent/tool wiring portion.

Never add guessed SDK imports or configuration keys just to make the integration appear complete.

## Frontend handoff

Deploy one public Compare endpoint from RocketRide, then provide it to the static frontend as `VITE_ROCKETRIDE_PIPELINE_URL`. Service keys stay in RocketRide; the browser receives only the public workflow URL.
