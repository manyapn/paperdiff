# Compare endpoint contract

Configure the public RocketRide URL as `compareEndpoint` in `apps/web/public/config.json`. The browser serializes the JSON request as raw `text/plain` so RocketRide's webhook can pass it through the `question` adapter.

## Request

```json
{
  "left": {
    "url": "https://… or null",
    "claim": "user text or null",
    "use_detected_conclusion": true
  },
  "right": {
    "url": "https://… or null",
    "claim": "user text or null",
    "use_detected_conclusion": true
  }
}
```

Each side must contain a non-empty `url` or `claim`. URL inputs may also be DOI strings if the pipeline accepts them.

## Successful response

```json
{
  "left": {
    "title": "string",
    "authors": ["string"],
    "venue": "string",
    "year": 2025,
    "source_url": "https://…",
    "passages": 4
  },
  "right": {
    "title": "string",
    "authors": ["string"],
    "venue": "string",
    "year": 2026,
    "source_url": "https://…",
    "passages": 5
  },
  "dimensions": [
    {
      "key": "population",
      "label": "Population",
      "classification": "equivalent | different | incompatible | review",
      "left_value": "string",
      "right_value": "string",
      "rationale": "string",
      "drives_verdict": true,
      "evidence_status": "Grounded | Qualified | Flagged for correction | Needs review | Blocked",
      "evidence_chain": ["string"],
      "left_passage": {
        "source_url": "https://…",
        "span_id": "string",
        "pre": "string",
        "span": "exact source text",
        "post": "string"
      },
      "right_passage": {
        "source_url": "https://…",
        "span_id": "string",
        "pre": "string",
        "span": "exact source text",
        "post": "string"
      },
      "left_provenance": {
        "passed": true,
        "checks": {
          "source_origin": true,
          "fetched": true,
          "identity_match": true,
          "passage_match": true,
          "span_specific": true
        },
        "failure_reasons": []
      },
      "right_provenance": {
        "passed": true,
        "checks": {
          "source_origin": true,
          "fetched": true,
          "identity_match": true,
          "passage_match": true,
          "span_specific": true
        },
        "failure_reasons": []
      },
      "verifier": {
        "kind": "classifier | prompted_llm",
        "label": "supports | contradicts | insufficient",
        "confidence": 0.93,
        "abstained": false,
        "model_version": "string"
      },
      "verifier_rationale": "string",
      "verdict_impact": "string"
    }
  ],
  "verdict": {
    "headline": "string",
    "explanation": "string",
    "citations": ["https://…", "https://…"]
  },
  "synthesis": "string",
  "synthesis_citations": ["https://…", "https://…"],
  "evidence_summary": "string",
  "trace": [
    {
      "stage": "retrieve-left",
      "status": "complete | blocked | review",
      "detail": "string",
      "provider": "linkup",
      "latency_ms": 123,
      "source_url": "https://…"
    }
  ],
  "trace_id": "string",
  "pipeline_version": "paperdiff-compare-v1"
}
```

The authoritative schemas are `schemas/compare-request.schema.json` and `schemas/compare-response.schema.json`. Successful responses contain 8-10 unique dimensions and completed Linkup retrieval trace entries for both sides.

`Grounded` is valid only when both deterministic provenance objects pass and a non-abstained trained classifier returns `supports` at confidence 0.85 or higher. Prompted-LLM fallback support is capped at `Qualified`. If either provenance gate fails, the row is `Blocked` regardless of verifier confidence. A contradicted extraction is `Flagged for correction`; insufficient or abstained verification is `Needs review`.

Missing scientific fields remain blank. When no exact passage exists, the corresponding passage is `null`, passage checks fail, and the row is `Blocked`; the frontend never invents values or evidence. Non-2xx responses should return `{ "error": "safe message" }` or `{ "message": "safe message" }`.
