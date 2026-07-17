# Classifier inference service

RocketRide's `tool_python` node runs code in a RestrictedPython sandbox with no
filesystem or network access by default, so the trained classifier cannot run
inside a RocketRide pipeline directly. Instead this small FastAPI service hosts
`paperdiff-verifier-v1` and RocketRide calls it over HTTP via `tool_http_request`.

## Deploy to a free Hugging Face Space

1. Create a new Space at huggingface.co/new-space, SDK = **Docker**, hardware =
   free CPU basic.
2. Push this `ml/serving/` directory's contents (`app.py`, `requirements.txt`,
   `Dockerfile`) to the Space's git repo.
3. Upload the exported `paperdiff-verifier-v1/` artifact directory (produced by
   the Colab export cell, per `ml/export-contract.md`) into the same directory
   as `app.py` before the image builds -- it is not committed to this repo,
   since it's a binary model artifact (see `.gitignore`/`data/README.md`
   conventions for why large binaries stay out of git history).
4. Wait for the Space to build. Note the Space's public URL, e.g.
   `https://<your-username>-paperdiff-verifier.hf.space`.

## Smoke test

```bash
curl https://<space-url>/health

curl -X POST https://<space-url>/score_batch \
  -H 'content-type: application/json' \
  -d '{"pairs":[{"claim":"Paper B studies diagnosed depression over two years.","evidence":"Participants were followed for 24 months, and depression diagnoses were obtained from linked clinical records."}]}'
```

## Cold starts

Free Spaces sleep after inactivity and take roughly 30-60s to wake on the next
request. Hit `/health` a few minutes before a live demo to warm it up.

## Calling it from RocketRide

Once the Space URL is live, configure a `tool_http_request` node in the
RocketRide pipeline with `urlWhitelist` scoped to that Space's domain, and have
the orchestrating step call:

```
POST https://<space-url>/score_batch
body_json: {"pairs": [{"claim": "...", "evidence": "..."}]}
```

The response's `product_state` field already applies the same
grounded/qualified/flag_for_correction/needs_review mapping as
`packages/core/src/classifier-policy.ts` -- keep both in sync if the policy
threshold changes.
