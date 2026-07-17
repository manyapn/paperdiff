# Processed verifier data

The Colab notebook expects three generated JSONL files:

```text
train.jsonl
validation.jsonl
test.jsonl
```

Each line follows this shape:

```json
{
  "id": "stable-example-id",
  "claim": "Paper B studies diagnosed depression over two years.",
  "evidence": "Participants were followed for 24 months, and diagnoses came from clinical records.",
  "label": "supports",
  "source_dataset": "scifact",
  "source_id": "source-specific-id"
}
```

Allowed labels are `supports`, `contradicts`, and `insufficient`.

These generated files are ignored by Git. The 8-12 curated PaperDiff comparison pairs must remain outside these training/validation/test files and are used only for final product-transfer evaluation.

