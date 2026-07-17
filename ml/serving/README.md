# Classifier inference service

RocketRide's `tool_python` node runs code in a RestrictedPython sandbox with no
filesystem or network access by default, so the trained classifier cannot run
inside a RocketRide pipeline directly. Instead this small FastAPI service hosts
`paperdiff-verifier-v1` and RocketRide calls it over HTTP via `tool_http_request`.

Weights are not stored in this repo or baked into the Docker image -- they load
at startup from the private HF Hub repo `ml/6_upload_weights_hf.py` pushes to
(`o0meerkat0o/paperdiff-verifier-v1` by default), using the same loading logic
as `ml/7_load_model_from_huggingface.py`.

## Deploy to a free Hugging Face Space

1. Run `ml/6_upload_weights_hf.py` first (from Colab, after
   `5_export_model.py`) so the model repo exists on the Hub.
2. Create a new Space at huggingface.co/new-space, SDK = **Docker**, hardware =
   free CPU basic.
3. Push this `ml/serving/` directory's runtime files (`app.py`, `boundary.py`,
   `requirements.txt`, and `Dockerfile`) to the Space's git repo.
4. In the Space's **Settings > Repository secrets**, add `HF_TOKEN` -- a
   **read-scoped** token (https://huggingface.co/settings/tokens), not the
   write token used to upload weights. If the model repo ID differs from the
   default, also set `HF_REPO_ID`.
5. Wait for the Space to build. Note the Space's public URL, e.g.
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

The response contains one narrow classifier result per input pair, in the same
order:

```json
{
  "results": [
    {
      "label": "supports",
      "confidence": 0.93,
      "abstained": false,
      "model_version": "paperdiff-verifier-v1"
    }
  ]
}
```

The service does not return product states, evidence states, thresholds, or
provenance decisions. The RocketRide adapter adds `kind: "classifier"` to the
Compare verifier object and applies the product policy only after deterministic
provenance passes. It must also verify that the result count matches the input
pair count before associating results by position.

The service reads the numeric ID-to-label assignment from the exported
`label_mapping.json`; callers must never assume a fixed logit order.

## Boundary tests

The boundary tests use plain probability rows and do not load or download the
model:

```bash
python -m unittest discover -s ml/serving -p 'test_*.py'
```
