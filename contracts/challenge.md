# Challenge endpoint contract

Challenge is optional until Compare is stable. Configure its RocketRide URL as `challengeEndpoint` in `apps/web/public/config.js`.

## Request

```json
{ "input": "paper URL, DOI, abstract, or claim supplied by the user" }
```

## Successful response

```json
{
  "source": {
    "title": "string",
    "authors": ["string"],
    "venue": "string",
    "year": 2026,
    "source_url": "https://…"
  },
  "candidates": [
    {
      "title": "string",
      "authors": ["string"],
      "venue": "string",
      "year": 2026,
      "url": "https://…",
      "relationship_type": "closest contradictory result | direct replication | best later reassessment",
      "comparison_fit": "high | medium | review",
      "explanation": "string",
      "dimensions": []
    }
  ]
}
```

`candidates` is required. Every candidate must originate from live retrieval and include a traceable source URL. Selecting a candidate populates Compare input; it does not bypass the Compare validation pipeline.
