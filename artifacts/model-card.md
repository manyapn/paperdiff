# PaperDiff claim-evidence verifier — model card

## Intended use

Assess whether an exact cited passage supports, contradicts, or is insufficient for a structured comparison claim. The result follows a deterministic provenance gate and supports abstention.

## Out of scope

- Establishing scientific truth or consensus
- Replacing expert review in high-stakes decisions
- Validating paper identity, source origin, or quote existence
- Inferring evidence from inaccessible tables or figures without explicit extraction support

## Training

- Base model: `cross-encoder/nli-deberta-v3-base`
- Training data: SciFact (https://scifact.s3-us-west-2.amazonaws.com/release/latest/data.tar.gz), (claim, evidence) triples built via 1_data_prep.py
- Seed: 42

## Results (val set, n=450)

- Macro-F1: **0.8723**
- Per-class recall: {"insufficient": 0.9643, "supports": 0.8472, "contradicts": 0.8197}
- Brier score (multiclass, lower is better): **0.2206**
- Unsupported-claims-allowed-through rate (non-supports claims wrongly passed as high-confidence supports): **0.0855**
- Abstention/coverage sweep: [{"threshold": 0.5, "coverage": 1.0, "accuracy_when_covered": 0.8688888888888889}, {"threshold": 0.6, "coverage": 0.9911111111111112, "accuracy_when_covered": 0.8721973094170403}, {"threshold": 0.7, "coverage": 0.9733333333333334, "accuracy_when_covered": 0.8812785388127854}, {"threshold": 0.8, "coverage": 0.94, "accuracy_when_covered": 0.8912529550827423}, {"threshold": 0.9, "coverage": 0.8955555555555555, "accuracy_when_covered": 0.9032258064516129}]
- Latency: {"batch_size": 50, "total_ms": 83.34887599994545, "per_item_ms": 1.666977519998909}

Compare against baselines (majority-class, frozen-embedding, prompted-LLM) in `3_baselines.py` before treating this model as production-ready.

## Known limitations

- Trained and evaluated only on SciFact; has NOT yet been evaluated on the curated PaperDiff paper-pair set (product-specific transfer performance is not yet measured -- report this once the 8-12 pairs are annotated).
- `insufficient` class is easiest to classify (paired with unrelated full abstracts during data construction); `contradicts` is the weakest class -- see the confusion matrix in the training run for the supports/contradicts confusion pattern.
- Error taxonomy (qualifier loss, causal overstatement, negation/hedging, numeric/CI error, table/figure evidence, identity/version mismatch, retrieval vs. reasoning failure) not yet broken out -- do this once real paper-pair errors are observable.

## Required reporting before release

- [x] Training data version, license — SciFact, CC BY-NC 2.0
- [ ] Download checksum — fill in from `sha256sum scifact_data/data.tar.gz`
- [x] Macro-F1 and per-class recall
- [x] Calibration and accuracy at coverage/abstention thresholds
- [x] Unsupported-claims-allowed-through rate
- [ ] Latency and cost against prompted LLM baseline — latency measured here; cost/LLM comparison needs `3_baselines.py`'s prompted-LLM stub wired up
- [ ] Transfer performance on fully held-out PaperDiff pairs — blocked on annotation
- [ ] Errors by category — blocked on annotation
