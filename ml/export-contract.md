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

Required `label_mapping.json`:

```json
{
  "0": "supports",
  "1": "contradicts",
  "2": "insufficient"
}
```

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

## Runtime input

The RocketRide classifier node or model-hosting adapter will call the model with:

```json
{
  "claim": "Paper B studies diagnosed depression over two years.",
  "evidence": "Participants were followed for 24 months..."
}
```

The adapter must return:

```json
{
  "label": "supports",
  "confidence": 0.93,
  "abstained": false,
  "model_version": "paperdiff-verifier-v1"
}
```

This output then passes through `RelationshipPolicy`; it never bypasses deterministic provenance validation.
