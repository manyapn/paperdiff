# PaperDiff claim-evidence verifier — model card draft

## Intended use

Assess whether an exact cited passage supports, contradicts, or is insufficient for a structured comparison claim. The result follows a deterministic provenance gate and supports abstention.

## Out of scope

- Establishing scientific truth or consensus
- Replacing expert review in high-stakes decisions
- Validating paper identity, source origin, or quote existence
- Inferring evidence from inaccessible tables or figures without explicit extraction support

## Required reporting before release

- Training data version, license, checksum, split, and fixed seed
- Macro-F1 and per-class recall
- Calibration and accuracy at coverage/abstention thresholds
- Unsupported-claims-allowed-through rate
- Latency and cost against prompted LLM baseline
- Transfer performance on fully held-out PaperDiff pairs
- Errors by qualifier loss, causal overstatement, negation/hedging, numeric/CI error, table/figure evidence, identity/version mismatch, and retrieval vs. reasoning failure

## Current status

No trained model or performance numbers are included in the scaffold.

