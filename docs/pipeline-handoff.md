# Pipeline implementation handoff

Updated: 2026-07-17

## Demo status

Compare is the only critical path. The canonical graph is deployed and active on RocketRide Cloud under project ID `d9358490-8651-4194-96aa-3b74999f03d0`, and its real classifier is reachable through a temporary HTTPS tunnel. It has not yet produced one validator-clean end-to-end Cloud response because RocketRide's WebSocket repeatedly disconnects after accepting the task. Do not configure the frontend endpoint or claim a fully working Cloud prototype until that release gate passes.

Challenge is implemented locally and has independent frontend-owner approval, but it is stretch work. Freeze it unless Compare is deployed with time remaining.

## Canonical files

- `pipelines/compare.pipe` is the sole Compare deployment source.
- `pipelines/challenge.pipe` is the optional discovery workflow.
- `contracts/schemas/` and `contracts/src/` define executable response gates.
- `docs/pipeline-worklog.md` is append-only and records attempted live runs.

The pulled `deploy/paperdiff-compare.pipe` was removed because it was a synthetic Chat/OpenAI placeholder with no Linkup, provenance, citations, or current contract. It is recoverable from Git history but must never be deployed.

## Implemented locally

### Compare

- Webhook/question input, RocketRide Wave, internal memory, Linkup hosted MCP through this tenant's `mcp_client`, restricted Python, Gemini 3.1 Flash-Lite Preview, and `response_answers`.
- Parallel left/right live retrieval, fixed symmetric eight-field extraction, exact passages, provenance-before-semantics, diff/verdict/synthesis, and full trace requirements.
- The model now maintains a compact intermediate evidence draft. A required final `python.execute` builder constructs the large public contract, derives citations/provenance/status fields, rejects `Grounded`, validates trace/linkage invariants, and JSON-serializes the response.
- A restricted POST-only classifier tool calls `${ROCKETRIDE_CLASSIFIER_URL}/score_batch` only after deterministic provenance. It preserves fixed dimension order, validates the exact result count and narrow classifier fields, and discards service-side product states or probabilities.
- `Grounded` requires classifier `supports`, confidence at least 0.85, no abstention, and both provenance gates. Endpoint unavailability may use prompted verification capped at `Qualified`; malformed successful classifier responses become `Needs review`.
- The stale duplicate deployment graph is prevented by an anti-drift contract test.

### Challenge

- Live source resolution, three scout searches in one wave, three selected-page fetches in the next wave, exact relationship passages, fixed seven-field fit, deterministic scoring, and cited candidates.
- Uses the Cloud-supported `mcp_client` nested `streamable_http` config and the same Gemini 3.1 profile as Compare.
- Emits no classifier result, `Grounded`, final contradiction verdict, or synthesis; selection returns to Compare.

### Frontend integration

- Sends RocketRide requests as `text/plain` and safely unwraps direct JSON or `answers[0]` envelopes.
- Challenge requires source and candidate HTTPS citations, displays evidence links, and passes the resolved source URL into Compare.
- The independent frontend owner reviewed and approved the shared Challenge boundary. Release condition: a full trace must show the final successful Python builder and a structurally equivalent returned response.

## Live findings

- Cloud auth and the default team work; Linkup and Gemini secrets are present locally and remain ignored.
- The live tenant exposes `mcp_client`, with endpoint/bearer/transport nested under `config.streamable_http`.
- A prior Compare run made real parallel Linkup calls and preserved large raw responses in full FLOW traces. Its answer was a Python-like object rather than JSON, and an earlier Python call omitted required `code`; it was correctly rejected and not deployed.
- Subsequent Compare/Challenge attempts were interrupted by RocketRide SDK/WebSocket process exits after task creation. Ephemeral tasks were cleaned up or left to short TTLs. The canonical Compare deployment now exists and reports active, but it has not returned a validator-clean response.
- A teammate later reported an earlier single-agent Compare deployment under project ID `9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`, plus successful basic webhook, Linkup HTTP, and temporary-tunnel classifier calls. That graph is not the canonical release graph and must not be connected to the frontend: it trusted provenance-unaware service product state, used a nondurable tunnel URL, and did not pass the cited response contract.
- The separate Cloud validation API returns an SDK/API mismatch for these graphs, so an actual ephemeral `use` run plus checked-in response validation is the authoritative pre-deployment gate.
- The live catalog has no deterministic Python/schema `answers -> answers` node. The mandatory final agent-invoked Python builder plus full-trace/result-equivalence inspection is the strongest available RocketRide-native enforcement.

## Classifier handoff

The local serving and pipeline boundaries are now aligned. `ml/serving/score_batch` returns ordered results containing only label, confidence, abstained, and model version. It validates the artifact-defined label mapping rather than assuming numeric class order. Compare adds `kind: classifier` and applies provenance and product-state policy itself.

The public model repository is `https://huggingface.co/o0meerkat0o/paperdiff-verifier-v1`; use `o0meerkat0o/paperdiff-verifier-v1` as `HF_REPO_ID`. The real artifact has been downloaded and verified locally through `ml/serving/`: `/health` and `/score_batch` both returned HTTP 200, and the score response passed the narrow boundary. A Cloudflare Quick Tunnel now exposes that local service over HTTPS and the public preflight passes; the tunnel must stay running during the demo and has no uptime guarantee. Replace it with the Docker Space described in `ml/serving/README.md` when available.

## One-hour critical path

1. Keep the local classifier and Cloudflare tunnel running; replace it with the Hugging Face Space when available.
2. Run the active `pipelines/compare.pipe` deployment with full trace on the red-meat/WHO pair.
3. Require parseable JSON, `validateCompareResponse(...).valid === true`, two real Linkup branches, provenance before classifier, an ordered `/score_batch` result, and a successful final Python builder.
4. Deploy that exact graph manually from the RocketRide extension and record the deployment/reference.
5. Confirm webhook URL, public auth, CORS, envelope behavior, and one browser Compare round trip.
6. Rehearse the golden pair and one fallback; capture one cited output and one trace screenshot/reference for submission. Attempt Challenge only if Compare passes.

## Publishing blocker

PR #5 was squash-merged into `main` at `f370225`. `pipelines/compare.pipe` remains the sole canonical Compare deployment source.

Never write a credential, fetched paper, raw Linkup response, or classifier token into Git or browser configuration.
