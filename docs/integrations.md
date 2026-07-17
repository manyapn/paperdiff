# Integration checklist

## Linkup

The connected RocketRide Cloud catalog exposes a generic `mcp_client` provider even though it has no Linkup-specific native node. PaperDiff connects that provider to Linkup's hosted Streamable HTTP MCP endpoint, `https://mcp.linkup.so/mcp`, with the server-side `ROCKETRIDE_LINKUP_KEY` bearer secret. The current Cloud profile requires `endpoint`, `bearer`, `headers`, and `transport` under `config.streamable_http`, not at the top level.

The Compare workflow must:

- Run independent left/right Linkup search or fetch calls in one RocketRide wave.
- Fetch supplied paper URLs and search-then-fetch unresolved claims or DOI inputs.
- Prefer DOI/publisher, PubMed/PMC, arXiv, and official correction pages.
- Preserve complete Linkup results in RocketRide run memory and full traces, outside Git.
- Retain an HTTPS URL and exact fetched span for every factual value surfaced to the UI.

The Challenge workflow must resolve and fetch its source, issue contradiction, replication, and reassessment searches in one parallel wave, and fetch the three distinct selections in the next parallel wave. Search snippets alone never enter a successful response. Each relationship and fit field retains exact source/candidate passages and HTTPS URLs.

If the hosted MCP interface becomes unavailable, `tool_http_request` is the supported fallback for calling Linkup directly. Restrict its URL allowlist to Linkup and keep the API key server-side.

## Classifier

RocketRide's restricted `tool_python` cannot load the trained torch/transformers artifact. The latest model lane therefore exposes the classifier through the FastAPI service in `ml/serving/`; see `ml/serving/README.md` and `ml/7_load_model_from_huggingface.py`.

The canonical Compare graph already contains the restricted classifier tool. When the service has a stable HTTPS URL:

- Set `ROCKETRIDE_CLASSIFIER_URL` to the service origin without a trailing slash.
- Keep the tool allowlist restricted to that origin's `/score_batch` path and POST method.
- Send batches matching `/score_batch` and preserve model version, confidence, abstention, and label.
- Keep deterministic source/passage provenance ahead of the classifier.
- Permit `Grounded` only for non-abstained classifier `supports` at the contract threshold; prompted verification remains capped at `Qualified`.

Challenge does not call the classifier and does not emit `Grounded`, a final contradiction verdict, or synthesis.

## RocketRide

Verified against the live Cloud account, the official `rocketride` 1.3.0 SDK/extension, and the connected service catalog on 2026-07-17:

- Use `ROCKETRIDE_URI=https://api.rocketride.ai` and `ROCKETRIDE_APIKEY`. `cloud.rocketride.ai` is the dashboard, not the SDK WebSocket host.
- `client.deploy.add(pipeline, schedule="manual")` persists a Cloud deployment. Ephemeral `client.use(...)` runs are the pre-deployment trace/contract gate.
- `pipelineTraceLevel: "full"` captures component/tool flow needed to demonstrate Linkup calls, concurrency, Python validation, and raw-response preservation.
- The separate Cloud `validate` call currently returns an SDK/API mismatch for these graphs, so a successful ephemeral `use` run plus response-contract validation is the authoritative deployment gate.

The current graph providers are:

| Role | Provider | Important configuration |
| --- | --- | --- |
| HTTP entry | `webhook` | Raw `text/plain` JSON request |
| Request conversion | `question` | `text` in, `questions` out |
| Orchestration | `agent_rocketride` | Instructions, waves, one LLM and one memory control |
| Run memory | `memory_internal` | Run-scoped raw tool-result storage |
| Linkup | `mcp_client` | `profile: streamable_http` with nested endpoint/bearer config |
| Deterministic checks | `tool_python` | Agent control tool; every invocation requires non-empty `code` |
| Classifier | `tool_http_request` | Compare-only once the hosted model URL exists |
| Result | `response_answers` | Standard RocketRide answer envelope |

Never add guessed SDK imports or configuration keys just to make the integration appear complete.

The live catalog has no deterministic Python/schema component with an `answers -> answers` lane. The strongest available gate is a required final `python.execute` call that recomputes contract invariants and JSON-serializes the returned object, followed by full-trace verification that the response matches that result.

## Earlier deployed graph and canonical source

An earlier single-agent pipeline was deployed to RocketRide Cloud (`project_id`
`9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`) using `client.deploy.add()`. Its basic
webhook/question/agent/tool wiring was invoked successfully, which confirmed
the shape below:

```
webhook (source, lane: text) -> question (adapter) -> agent_rocketride (questions lane)
                                                            |- control: llm
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

That deployed predecessor is not the release graph: it used a temporary
Cloudflare classifier URL, trusted provenance-unaware `product_state`, omitted
the strict cited response contract, and used a different model/tool setup.
`pipelines/compare.pipe` is now the sole canonical deployment source; contract
tests reject `.pipe` files under legacy `deploy/` or `pipeline/` directories.
The older deployment should not be connected to the frontend or described as
the working prototype. Deploy the canonical graph only after its classifier URL
is durable and one full trace passes the checked-in response validator.

## Frontend handoff

`apps/web/src/api.ts` sends requests as `text/plain`, accepts direct JSON, and safely unwraps parsed or JSON-string `answers[0]` responses. Challenge rejects candidates without both source and candidate HTTPS citations, exposes visible evidence links, and hands the resolved source URL into Compare.

After both graphs pass live trace and contract validation, deploy them and set `compareEndpoint` and `challengeEndpoint` in `apps/web/public/config.json`. Confirm Cloud CORS and public webhook authorization without placing Linkup, model-provider, classifier, or private RocketRide credentials in browser code.

`compareEndpoint` remains unset. Do not connect the earlier deployed graph;
first deploy the canonical classifier-backed Compare graph, obtain its durable
webhook URL, and verify a real response against `contracts/compare.md`.
