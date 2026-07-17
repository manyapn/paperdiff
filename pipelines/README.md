# RocketRide pipelines

`compare.pipe` is the version-controlled adjudication workflow. `challenge.pipe` is the cited discovery workflow that runs before Compare when the user starts from one source. Both graphs use current RocketRide providers, the same server-side Linkup connection, restricted deterministic Python checks, run-scoped memory, and parsed JSON responses.

## Compare graph

```text
Webhook -> JSON-as-text question -> RocketRide Wave agent -> JSON response
                                      |       |       |       |
                                      |       |       |       +-> Gemini 3.1 Flash-Lite
                                      |       |       +----------> deterministic Python provenance
                                      |       +------------------> restricted /score_batch classifier
                                      +--------------------------> Linkup search/fetch over hosted MCP
```

Compare sends independent left/right Linkup calls in the same wave, applies one extraction schema to both sources, validates exact passages before semantic support, aligns exactly eight dimensions, and returns the checked-in Compare contract. Only after deterministic provenance, the agent sends the provenance-valid dimensions to `${ROCKETRIDE_CLASSIFIER_URL}/score_batch` in fixed key order. It accepts only an exact-length ordered result array with valid label, confidence, abstention, and model-version fields; extra service fields are discarded. `Grounded` requires classifier `supports`, confidence at least 0.85, no abstention, and both provenance gates. Endpoint unavailability may use prompted verification capped at `Qualified`; malformed successful classifier responses become `Needs review`.

## Challenge graph

```text
Webhook -> question -> RocketRide Wave agent -> JSON response
                         |       |       |
                         |       |       +-> Gemini 3.1 Flash-Lite Preview
                         |       +----------> deterministic provenance + fit
                         +------------------> Linkup source/search/fetch tools
                                             ├─ contradiction scout ─> fetch
                                             ├─ replication scout ───> fetch
                                             └─ reassessment scout ──> fetch
```

Challenge resolves the input source live, launches all three scout searches in one tool wave, and launches all three selected-page fetches in the next wave. It returns one distinct, cited candidate per scout, applies the same seven methodological fields to every candidate, and ranks deterministic fit scores. It emits no classifier state, Compare verdict, or synthesis; candidate selection returns to Compare.

Complete Linkup responses remain in RocketRide run memory and full traces rather than Git or the browser. Successful responses expose only exact spans and HTTPS source URLs.

## Required secrets

Configure these in the local RocketRide connection and again in RocketRide Cloud:

- `ROCKETRIDE_LINKUP_KEY` — Linkup API key; RocketRide substitutes only `ROCKETRIDE_*` variables.
- `ROCKETRIDE_GEMINI_KEY` — Google AI Developer API key.
- `ROCKETRIDE_CLASSIFIER_URL` — HTTPS classifier origin without a trailing slash. The Compare HTTP tool permits only its `/score_batch` path and only POST.
- `ROCKETRIDE_AUTH` or `ROCKETRIDE_APIKEY` — RocketRide Cloud connection credential.

## Validate locally

Run the pipeline preflight after exporting the values from your local `.env`. It checks required configuration without printing values, probes the classifier using only the claim and exact evidence you supply, and optionally validates a saved Compare response with the canonical contract validator:

```bash
set -a
source .env
set +a
npm run pipeline:preflight -- \
  --claim "A claim chosen for this preflight" \
  --evidence "An exact evidence passage chosen for this preflight" \
  --compare-response /tmp/paperdiff-compare-response.json
```

Omit `--compare-response` until you have saved a real RocketRide answer. You may use `PAPERDIFF_PREFLIGHT_CLAIM`, `PAPERDIFF_PREFLIGHT_EVIDENCE`, and `PAPERDIFF_COMPARE_RESPONSE` instead of CLI arguments. Do not paste secrets into arguments; the script reads integration credentials only from the environment and reports their names, never their values.

For the local classifier fallback, start the serving app and point preflight at its loopback origin:

```bash
ROCKETRIDE_CLASSIFIER_URL=http://127.0.0.1:8000 \
  npm run pipeline:preflight -- \
  --claim "A claim chosen for this preflight" \
  --evidence "An exact evidence passage chosen for this preflight"
```

Plain HTTP is accepted only for `localhost`, `127.0.0.1`, and `::1`. Every remote classifier origin must use HTTPS.

1. Open the chosen `.pipe` in VS Code with the RocketRide extension.
2. Configure a local development connection, the provider secrets, and the classifier URL.
3. Set trace level to `full` so tool calls, parallel branch timing, and exact outputs remain inspectable.
4. Run the pipeline and use the webhook URL/public authorization value printed in the project log.
5. Send the JSON request as raw `text/plain` so the webhook routes it to the Question node.

Compare example:

```bash
curl -X POST "$PAPERDIFF_COMPARE_WEBHOOK" \
  -H "Authorization: Bearer $PAPERDIFF_PUBLIC_AUTH" \
  -H "Content-Type: text/plain" \
  --data-binary @contracts/examples/compare-request.json
```

Challenge example with a non-sensitive placeholder:

```bash
curl -X POST "$PAPERDIFF_CHALLENGE_WEBHOOK" \
  -H "Authorization: Bearer $PAPERDIFF_PUBLIC_AUTH" \
  -H "Content-Type: text/plain" \
  --data-binary '{"input":"https://example.org/open-paper"}'
```

Copy `.env.example` to `.env` for local development and replace placeholders locally. Never put a real secret in a committed shell script, `.pipe`, frontend config, example file, or documentation.

## Deploy and connect the frontend

Use **RocketRide: Deploy Pipeline** from the extension for each graph and select the Cloud connection. Keep a record of both Cloud deployment IDs and one successful full-trace reference per workflow outside Git, alongside the other run artifacts.

The standard RocketRide webhook currently returns an envelope around the parsed answer. Confirm the deployed Cloud response shape, auth, and CORS behavior before setting `compareEndpoint` or `challengeEndpoint` in `apps/web/public/config.json`. If the envelope remains, coordinate one small frontend API adapter that sends `text/plain`, supplies the approved public webhook authorization, and unwraps the first parsed `answers` value. Never expose the Linkup key, model-provider key, or private RocketRide token in browser code.
