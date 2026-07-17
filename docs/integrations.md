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

Never add guessed SDK imports or configuration keys just to make the integration appear complete.

## Working `.pipe` reference (`deploy/paperdiff-compare.pipe`)

A real pipeline is deployed to RocketRide Cloud (`project_id`
`9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`) using `client.deploy.add()`. The
`.pipe` JSON shape below is confirmed working (deployed and invoked
successfully via the SDK on 2026-07-17), not guessed:

```
webhook (source, lane: text) -> question (adapter) -> agent_rocketride (questions lane)
                                                            |- control: llm_openai
                                                            |- control: memory_internal (required -- "wave agent requires a memory node")
                                                            |- control: tool_http_request (Linkup)
                                                            |- control: tool_http_request (classifier)
                                                            v
                                                     response_answers (answers lane)
```

Hard-won, verified gotchas (each cost a real failed deploy to learn):

- Top-level pipeline JSON needs `"source": "<source-component-id>"`, or
  `use()`/`deploy.add()` fails with `Pipeline does not have a source
  component defined`.
- `tool_http_request` and `tool_python` are `control`-wired to an agent
  (`{"classType": "tool", "from": "<agent-id>"}`), never data-lane wired.
  Confirmed from `examples/agent-workflow.pipe` in the RocketRide repo.
- `agent_rocketride` requires a `memory_internal` node control-wired to it
  (`classType: "memory"`) or the deploy fails with `wave agent requires a
  memory node to be connected`.
- The `webhook` source's `json`/`text` lanes are **not** directly
  consumable by `agent_rocketride` -- it only accepts a `questions` lane.
  A `question` provider node (`classType` filter, "encapsulates input text
  as a Question object") is the adapter: `webhook (text lane) -> question ->
  agent (questions lane)`. The `json` lane doesn't work as input to
  `question` either -- use `text`.
- `${ROCKETRIDE_*}` placeholders in the committed `.pipe` (e.g.
  `${ROCKETRIDE_OPENAI_KEY}`, `${ROCKETRIDE_LINKUP_KEY}`) get substituted
  from the SDK client's `env={...}` dict at `use()`/`deploy` time -- never
  hardcode real keys into this file.
- `client.validate()` and `client.deploy.add()`/`status()`/`list()`
  responses echo back the fully-substituted config, **including real
  secrets** -- never print/log these responses anywhere they might persist
  (chat transcripts, CI logs, etc).

## Calling the webhook (confirmed working, 2026-07-17)

```
POST https://api.rocketride.ai/webhook
Authorization: <publicToken from client.use()'s result, e.g. "pk_...">
Content-Type: text/plain
Body: raw JSON string matching contracts/compare.md's request shape
```

Confirmed: got a real `HTTP 200` from the pipeline with this exact
request shape.

**Open problem, unresolved as of 2026-07-17: no durable public URL found
yet.** `client.use()` returns a fresh `token`/`publicToken` pair per
session that dies when that session's task is terminated or the client
disconnects -- not something a static frontend can point at long-term.
`client.deploy.add()` persists the pipeline config server-side (confirmed:
survives across separate connections, `deploy.status()`/`deploy.list()`
show it as `state: "active"`), but it's still unconfirmed whether a
`deploy`'d webhook pipeline exposes a **stable** public URL/token distinct
from the ephemeral per-`use()` one, and if so, where the SDK surfaces it.
The webhook node's own README says "the Project Log displays the interface
URL" -- that's a VS Code-extension/dashboard UI artifact I don't have
access to from a headless SDK session. **Next step for whoever picks this
up: open this deployed pipeline in the RocketRide VS Code extension or
`cloud.rocketride.ai` dashboard and check its Project Log / deployment
detail page for a persistent webhook URL, rather than one minted per
`use()` call.**

## Linkup: use `/fetch`, not `/search`, for known URLs

`POST https://api.linkup.so/v1/fetch` with body
`{"url": "...", "outputFormat": "markdown", "renderJS": true}` and
`Authorization: Bearer <LINKUP_API_KEY>` -- confirmed working via direct
curl test against a real URL (WHO page fetched cleanly as markdown).
`/v1/search` (topic search) is the wrong tool for "fetch this known page."

**Known limitation**: PMC/NCBI (`pmc.ncbi.nlm.nih.gov`) blocks Linkup's
fetch even with `renderJS: true` -- returns a "checking your browser"
challenge page instead of article content. Confirmed via direct test, not
a wiring bug. Prefer DOI/publisher landing pages, WHO/IARC, Annals of
Internal Medicine (`acpjournals.org`), and other non-NCBI open sources
where possible; PMC links may need a different retrieval path later.

## Classifier hosting status (2026-07-17)

- Model is public on the HF Hub: `o0meerkat0o/paperdiff-verifier-v1`.
  Confirmed real and loadable (ran actual inference against it; correct
  predictions on held-out examples).
- `ml/serving/app.py` (FastAPI wrapper exposing `/score_batch`) was run
  **locally** and exposed via a free, no-signup Cloudflare quick tunnel
  (`cloudflared tunnel --url http://localhost:7860`) for testing. That
  tunnel URL is **not durable** -- it only exists while that local process
  and machine stay up, and was not committed anywhere since it changes
  every time the tunnel restarts.
- **Still needed for a durable deployment**: someone create the actual
  Hugging Face Space (Docker SDK, free CPU tier) per `ml/serving/README.md`
  and get its permanent `https://<user>-<space>.hf.space` URL, then update
  the classifier `tool_http_request` node's `urlWhitelist` and the agent's
  instructions in `deploy/paperdiff-compare.pipe` to point at it instead
  of any tunnel URL.

## RocketRide Cloud stability note

Observed multiple transient `502`/`503`/connection-timeout errors from
`api.rocketride.ai` during testing on 2026-07-17, unrelated to any request
content -- retrying after a short wait consistently resolved them. Not a
wiring bug; budget for retries when testing or demoing live.

## Two parallel pipeline builds exist -- reconcile before relying on either

`deploy/paperdiff-compare.pipe` (this doc's author, hand-written + SDK-deployed,
single agent, OpenAI) and `pipeline/compare.pipe` (a teammate's, likely built
in the VS Code visual canvas, multi-agent extract/align/verify/verdict/finalize
chain, Claude/`llm_anthropic`) were built independently and haven't been
reconciled. Notes for whoever does that:

- `pipeline/compare.pipe` is missing the top-level `"source"` field (same bug
  documented above) -- will fail with `Pipeline does not have a source
  component defined` until fixed the same way.
- `pipeline/compare.pipe` wires its webhook source directly to its agents'
  `questions` lane (`{"lane": "questions", "from": "in"}`) with no adapter
  node in between. `deploy/paperdiff-compare.pipe` instead routes through an
  intermediate `question` provider node because I couldn't get `agent_rocketride`
  to accept a `json`/`text` lane directly -- but the webhook node's own lane
  list includes a native `questions` output lane per its README, so the
  simpler direct-wire approach may well be correct and my adapter node
  unnecessary complexity. Not confirmed either way -- worth testing both.
- `pipeline/compare.pipe`'s multi-agent architecture (separate
  extract/align/verify/verdict/finalize agents, each with Claude + memory) is
  architecturally closer to what `docs/architecture.md` actually describes
  than this doc's single-agent version. If only one pipeline should move
  forward, that one is the more faithful starting point -- it just needs the
  `source` field fix and a real deploy+invoke test pass (the verification
  steps in this doc: `client.deploy.add`/`update`, then `client.use` to test,
  watching for the same category of wave-agent/memory/lane errors documented
  above).

## Frontend handoff

Deploy one public Compare endpoint from RocketRide, then set `compareEndpoint` in `apps/web/public/config.json`. The endpoint must allow POST requests from the deployed GitHub Pages origin. The supplied UI already sends real POST requests and renders only returned data. Service keys stay in RocketRide; the browser receives only the public workflow URL.

**Not yet done**: `compareEndpoint` is still unset, blocked on finding the
durable webhook URL described above. The agent's output has also not yet
been checked against `contracts/compare.md`'s exact response shape with
real (non-placeholder) data flowing through -- do that once the durable
URL is in hand, before wiring the frontend up for a live demo.
