# Lightweight verifier export contract

The Google Colab training run should export one versioned directory:

```text
paperdiff-verifier-v1/
├── config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
├── label_mapping.json
├── paperdiff_metrics.json
└── model-card.md
```

Required `label_mapping.json` example:

```json
{
  "0": "supports",
  "1": "contradicts",
  "2": "insufficient"
}
```

The classifier labels are fixed, but their numeric IDs are assigned by the
trained artifact. The mapping must cover every model output ID exactly once and
contain exactly `supports`, `contradicts`, and `insufficient`. Serving code must
read this file rather than assuming the illustrative order above. The current
exporter records its trained order when it writes the artifact.

Required `paperdiff_metrics.json` fields:

```json
{
  "experiment_name": "paperdiff-lightweight-verifier-v1",
  "seed": 17,
  "base_model": "configured model identifier",
  "training_data": {
    "name": "SciFact",
    "version": "recorded version",
    "split_hashes": {}
  },
  "macro_f1": 0.0,
  "per_class_recall": {},
  "brier_score": 0.0,
  "unsupported_claims_allowed_through_rate": 0.0,
  "abstention": [],
  "latency_ms": {}
}
```

Zeroes above describe the schema, not claimed results. Never publish placeholder numbers as experiment outcomes.

## Runtime input and output

The model boundary is one claim/evidence pair:

```json
{
  "claim": "Paper B studies diagnosed depression over two years.",
  "evidence": "Participants were followed for 24 months..."
}
```

The HTTP serving adapter batches that boundary as:

```json
{
  "pairs": [
    {
      "claim": "Paper B studies diagnosed depression over two years.",
      "evidence": "Participants were followed for 24 months..."
    }
  ]
}
```

It returns one result per pair in the same order:

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

The public classifier response contains no probability distribution or product
state. The RocketRide adapter adds `kind: "classifier"`, verifies batch length,
and passes each result through the product policy only after deterministic
provenance validation.
