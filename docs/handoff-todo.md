# Handoff TODO (2026-07-17)

Status: real progress on all three external integrations individually (Linkup,
the trained classifier, RocketRide Cloud), but not yet fully connected
end-to-end, and two teammates independently built separate RocketRide
pipeline files that need reconciling. Full technical detail for everything
below is in [`docs/integrations.md`](integrations.md) and
[`deploy/README.md`](../deploy/README.md).

## 1. Whoever has RocketRide VS Code extension / dashboard access

Open the deployed pipeline (`project_id:
9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`) and find its **Project Log**. We need
the permanent public webhook URL for it. Every URL found via the SDK so far
is temporary -- tied to a `client.use()` test session that dies when the
session ends. This is the #1 blocker to actually connecting the frontend.

## 2. Whoever trained the classifier

The model works and is public on Hugging Face
(`o0meerkat0o/paperdiff-verifier-v1`) -- confirmed with real inference
against real examples. It's currently only reachable through a temporary
Cloudflare tunnel on one machine. Please create the actual Hugging Face
Space (steps in [`ml/serving/README.md`](../ml/serving/README.md)) so it has
a permanent URL. Should take about 10 minutes.

## 3. Whoever built `pipeline/compare.pipe`

That pipeline is the more architecturally complete one (multi-agent
extract/align/verify/verdict/finalize chain, matches `docs/architecture.md`
better than the single-agent version in `deploy/paperdiff-compare.pipe`) --
it should probably be the one the team keeps going forward. It has the same
bug the other one had: missing a top-level `"source"` field, which will
fail deploy with `Pipeline does not have a source component defined`. Fix
pattern and full gotcha list are in `docs/integrations.md` under
"RocketRide."

## 4. Whoever picks up either pipeline next

Once it deploys and has a real durable URL, run one real end-to-end test
with two live paper URLs (not the demo/placeholder pair) and check the
output actually matches `contracts/compare.md`'s exact response shape --
that has not been confirmed yet with real (non-placeholder) data.

## 5. Frontend

Once there's a durable URL, set it as `compareEndpoint` in
`apps/web/public/config.json`. The frontend code itself shouldn't need any
changes -- it already sends the correct request shape.

## 2026-07-17 later update: RocketRide's live agent is currently unreliable -- fallback plan started

While trying to get a durable-enough session running to test the frontend
connection today, `client.use()` on `deploy/paperdiff-compare.pipe` hung for
5+ minutes with no response and no error (previous successful runs earlier
today returned in a few seconds). This is on top of the repeated transient
502/503s documented elsewhere in this repo. Given time pressure, started a
fallback that does **not** depend on RocketRide's live agent execution for
the actual demo connection:

- `deploy/adapter.py` (in progress, NOT finished/tested) -- was going to be
  a small FastAPI service the frontend can POST to directly (matching its
  existing `application/json`, no-auth-header request format, so **no
  frontend code changes needed**), which internally either (a) forwards to
  a live RocketRide webhook session's ephemeral token, or (b) if that stays
  unreliable, calls Linkup's `/fetch` and the classifier's `/score_batch`
  directly in plain Python, bypassing RocketRide's agent orchestration
  entirely for the live demo path, while RocketRide Cloud deployment
  remains separately documented/proven (see `docs/integrations.md`) to
  satisfy that requirement.
- This was interrupted mid-implementation. `deploy/adapter.py` as committed
  only implements option (a) (forwarding to a RocketRide session token) and
  has **not been tested end-to-end**. Whoever picks this up next: either
  finish testing (a) if RocketRide is responding again, or extend it to
  implement (b) as a guaranteed-reliable fallback that doesn't depend on
  RocketRide's live execution at all.
- Rationale for even considering bypassing RocketRide for the *live demo
  connection*: Linkup and the classifier have been reliably working all
  day; RocketRide's agent execution has not. The mandatory "deployed to
  RocketRide Cloud" requirement is about the pipeline being deployed and
  real (which is proven and documented), not necessarily about every demo
  click routing through it live if it's actively unreliable under time
  pressure -- use judgment on this tradeoff.

## Known working pieces (verified, not guessed)

- RocketRide Cloud deployment and SDK auth: working (`api.rocketride.ai`,
  not `cloud.rocketride.ai` -- see `docs/integrations.md`).
- Linkup `/fetch` endpoint: working on open-access sources; blocked on
  PMC/NCBI specifically (bot protection, not a wiring issue).
- Classifier: working, public HF model, correct predictions on test
  examples.
- RocketRide Cloud itself is occasionally flaky (transient 502/503) --
  not a wiring bug, just retry.
