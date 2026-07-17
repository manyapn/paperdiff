# Integrations

Reference notes for the three external services PaperDiff depends on: Linkup
(retrieval), the hosted claim-evidence classifier, and RocketRide Cloud
(orchestration and deployment).

## Linkup

RocketRide Cloud has no Linkup-specific node, so the pipelines connect the
generic `mcp_client` provider to Linkup's hosted Streamable HTTP MCP endpoint,
`https://mcp.linkup.so/mcp`, authenticated with the server-side
`ROCKETRIDE_LINKUP_KEY` bearer secret. The Cloud profile expects `endpoint`,
`bearer`, `headers`, and `transport` nested under `config.streamable_http`,
not at the top level.

The Compare workflow runs the left and right Linkup calls in a single wave. It
fetches supplied paper URLs directly and search-then-fetches unresolved claims
or DOI inputs, preferring DOI/publisher pages, PubMed/PMC, arXiv, and official
correction pages. Complete Linkup results stay in RocketRide run memory and
full traces — never in Git — and every factual value surfaced to the UI keeps
an HTTPS URL and the exact fetched span.

The Challenge workflow resolves its source, issues the contradiction,
replication, and reassessment searches in one parallel wave, and fetches the
three selected candidates in the next. Search snippets alone never enter a
successful response.

If the hosted MCP interface is unavailable, `tool_http_request` can call
Linkup directly; keep its URL allowlist restricted to Linkup and the API key
server-side.

Two practical findings from testing:

- For a known URL, use `POST https://api.linkup.so/v1/fetch` with
  `{"url": ..., "outputFormat": "markdown", "renderJS": true}`. `/v1/search`
  is topic search and the wrong tool for "fetch this page."
- PMC/NCBI (`pmc.ncbi.nlm.nih.gov`) blocks Linkup's fetcher with a
  browser-check page even with `renderJS` enabled. Prefer DOI/publisher
  landing pages, WHO/IARC, and other non-NCBI open sources; PMC links need a
  different retrieval path.

## Classifier

RocketRide's restricted `tool_python` cannot load the trained
torch/transformers artifact, so the classifier is served over HTTP by the
FastAPI app in `ml/serving/` (see `ml/serving/README.md`). The trained model
is published on the Hugging Face Hub; the serving app reads the repo id from
`HF_REPO_ID`.

The Compare graph already contains the restricted classifier tool. When the
service has a stable HTTPS URL:

- Set `ROCKETRIDE_CLASSIFIER_URL` to the service origin without a trailing
  slash, and keep the tool allowlist restricted to that origin's
  `/score_batch` path and the POST method.
- Send batches matching `/score_batch` and preserve model version,
  confidence, abstention, and label.
- Keep deterministic source/passage provenance ahead of the classifier.
- Permit `Grounded` only for a non-abstained classifier `supports` at the
  contract threshold; prompted verification remains capped at `Qualified`.

The intended durable host is a Docker-based Hugging Face Space (free CPU tier)
as described in `ml/serving/README.md`. Running the service locally behind a
temporary tunnel works for testing but is not a deployment: the URL dies with
the process, so nothing should be pointed at it.

Challenge does not call the classifier and does not emit `Grounded`, a final
contradiction verdict, or synthesis.

## RocketRide

Verified against RocketRide Cloud with the official `rocketride` 1.3.0
SDK/extension:

- Use `ROCKETRIDE_URI=https://api.rocketride.ai` with `ROCKETRIDE_APIKEY`.
  `cloud.rocketride.ai` is the dashboard, not the SDK WebSocket host.
- `client.deploy.add(pipeline, schedule="manual")` persists a Cloud
  deployment. Ephemeral `client.use(...)` runs are the pre-deployment
  trace/contract gate.
- Set `pipelineTraceLevel: "full"` to capture the component/tool flow needed
  to demonstrate Linkup calls, concurrency, Python validation, and
  raw-response preservation.
- The separate Cloud `validate` call returns an SDK/API mismatch for these
  graphs, so a successful ephemeral `use` run plus response-contract
  validation is the authoritative deployment gate.
- The API occasionally returns transient 502/503s or connection timeouts
  unrelated to request content; retrying after a short wait resolves them.
  Budget for retries when testing or demoing live.

The graph providers:

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

Never add guessed SDK imports or configuration keys just to make an
integration appear complete. The live catalog has no deterministic
Python/schema component with an `answers -> answers` lane, so the strongest
available gate is a required final `python.execute` call that recomputes
contract invariants and JSON-serializes the returned object, followed by
full-trace verification that the response matches that result.

### Wiring rules that fail deploys when violated

Each of these was confirmed against a real failed deploy:

- The top-level pipeline JSON needs `"source": "<source-component-id>"`, or
  `use()`/`deploy.add()` fails with `Pipeline does not have a source
  component defined`.
- `tool_http_request` and `tool_python` are control-wired to an agent
  (`{"classType": "tool", "from": "<agent-id>"}`), never data-lane wired.
- `agent_rocketride` requires a `memory_internal` node control-wired to it
  (`classType: "memory"`) or the deploy fails with `wave agent requires a
  memory node to be connected`.
- The `webhook` source's `json`/`text` lanes are not directly consumable by
  `agent_rocketride`, which only accepts a `questions` lane. A `question`
  provider node is the adapter: `webhook (text lane) -> question -> agent
  (questions lane)`. The `json` lane does not work as input to `question`
  either — use `text`.
- `${ROCKETRIDE_*}` placeholders in a committed `.pipe` (e.g.
  `${ROCKETRIDE_LINKUP_KEY}`) are substituted from the SDK client's
  `env={...}` dict at `use()`/deploy time. Never hardcode real keys into a
  `.pipe` file.
- `client.validate()` and `client.deploy.add()`/`status()`/`list()`
  responses echo back the fully substituted config, **including real
  secrets**. Never print or log these responses anywhere they might persist
  (chat transcripts, CI logs, and so on).

### Calling the webhook

```
POST https://api.rocketride.ai/webhook
Authorization: <publicToken from the run or deployment>
Content-Type: text/plain
Body: raw JSON string matching contracts/compare.md's request shape
```

`client.use()` mints a fresh `token`/`publicToken` pair per session that dies
when the session ends, so it is not something a static frontend can point at.
A deployed pipeline's persistent webhook URL is surfaced in the RocketRide
Project Log (VS Code extension or dashboard) — record it from there, not from
a `use()` run.

## Deployment status and remaining work

`pipelines/compare.pipe` is the sole canonical Compare deployment source;
contract tests reject `.pipe` files under legacy `deploy/` or `pipeline/`
directories. An earlier prototype deployment proved the basic
webhook/question/agent/tool wiring but used a temporary classifier URL,
trusted provenance-unaware service state, and predates the cited response
contract — it must not be connected to the frontend or described as the
working prototype.

Remaining before the frontend goes live:

1. Stand up the durable classifier host (the Hugging Face Space) and point
   the classifier tool's `urlWhitelist` and the agent instructions in
   `pipelines/compare.pipe` at it.
2. Run the canonical graph in RocketRide Cloud with full tracing and require
   two real Linkup branches, provenance before `/score_batch`, and a response
   that passes `validateCompareResponse`.
3. Deploy that exact graph and record its persistent webhook URL from the
   Project Log.
4. Set `compareEndpoint` in `apps/web/public/config.json`, then verify Cloud
   CORS, public webhook authorization, and envelope behavior without placing
   Linkup, model-provider, classifier, or private RocketRide credentials in
   browser code.

`compareEndpoint` remains unset until all of the above pass.

## Frontend handoff

`apps/web/src/api.ts` sends requests as `text/plain`, accepts direct JSON,
and safely unwraps parsed or JSON-string `answers[0]` envelopes. Challenge
rejects candidates without both source and candidate HTTPS citations, exposes
visible evidence links, and hands the resolved source URL into Compare.

### Vercel proxy

RocketRide's webhook responses carry no CORS origin header, so the deployed
frontend does not call RocketRide directly. `apps/web/api/compare.js` is a
same-origin Vercel serverless function that forwards the raw `text/plain`
JSON body with the public authorization and returns the RocketRide envelope
unchanged for the existing unwrapping logic; `config.json` points
`compareEndpoint` at `/api/compare`.

The proxy requires two sensitive server-side environment variables in Vercel
and fails closed with HTTP 503 until both are configured:

- `ROCKETRIDE_WEBHOOK_URL` — the generated interface URL from the running
  pipeline's Project Log. The generic `https://api.rocketride.ai/webhook`
  path returns HTTP 400; each running pipeline generates its own URL.
- `ROCKETRIDE_PUBLIC_TOKEN` — the public webhook authorization for that run.

No live authorization value is committed to Git. `apps/web/vercel.json` pins
Vercel to the Vite framework, `npm run build`, and the `dist` output so
deployments run a production build instead of the dev server.
