# Evaluation

The evaluator reports pair-level and aggregate outcomes for field extraction agreement, root-dimension recall, evidence coverage, verdict accuracy, unsupported-claim pass-through, latency, calibration, and coverage under abstention.

No results are checked in yet. Add timestamped JSON metrics and confusion matrices to `artifacts/` only after running a reproducible experiment; never add invented hackathon numbers.

Planned five-way verifier comparison:

1. Majority class
2. Frozen scientific embeddings + linear classifier
3. Prompted LLM verifier
4. Fine-tuned scientific cross-encoder
5. Deterministic gate + best verifier + abstention

