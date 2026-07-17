# Compare endpoint contract

Configure the public RocketRide URL as `compareEndpoint` in `apps/web/public/config.json`. The browser sends JSON with `Content-Type: application/json`.

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
      "evidence_status": "Grounded | Qualified | Needs review",
      "evidence_chain": ["string"],
      "left_passage": { "pre": "string", "span": "string", "post": "string" },
      "right_passage": { "pre": "string", "span": "string", "post": "string" },
      "verifier_rationale": "string",
      "verdict_impact": "string"
    }
  ],
  "verdict": {
    "headline": "string",
    "explanation": "string"
  },
  "synthesis": "string",
  "evidence_summary": "string",
  "trace": [
    { "stage": "string", "status": "string", "detail": "string" }
  ]
}
```

`left`, `right`, `dimensions`, and `verdict` are required. Missing scientific fields remain blank or `Needs review`; the frontend never invents them. Non-2xx responses should return `{ "error": "safe message" }` or `{ "message": "safe message" }`.
