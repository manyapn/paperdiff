# Data and annotation contract

## Sources and licenses

- SciFact is intended for verifier training and validation. Source: AI2's official release, downloaded directly from `https://scifact.s3-us-west-2.amazonaws.com/release/latest/data.tar.gz` (the HF `datasets` script loader for `allenai/scifact` no longer works -- `datasets` v3 removed script-based loading -- so this project pulls the tarball directly instead). License: CC BY-NC 2.0.
  - Download checksum: **TODO** -- run `!sha256sum scifact_data/data.tar.gz` in the Colab session that downloaded it and paste the hash here. Not filled in yet because this repo edit was made without a live copy of the tarball.
  - Files used: `corpus.jsonl` (5183 docs), `claims_train.jsonl` (1261 claims), `claims_dev.jsonl` (450 claims, used as validation). `claims_test.jsonl` exists but is unlabeled and unused.
  - Triples built via `ml/1_data_prep.py`: one row per (claim, evidence) rationale for SUPPORT/CONTRADICT claims (a claim can produce multiple triples if it has multiple annotated rationales), one row per NOINFO claim paired with a cited-but-unevidenced abstract as distractor context.
  - Observed label distribution: train `{insufficient: 304, supports: 616, contradicts: 341}` (1261 triples total), val `{insufficient: 112, supports: 216, contradicts: 122}` (450 triples total). Recorded from an actual run -- rerun `1_data_prep.py` and update this if the AI2 release changes.
- The curated 8-12 comparison pairs are product-specific, held-out evaluation data. They must never enter training or prompt selection.
- Store only redistributable text. For restricted sources, keep identifiers and short compliant spans rather than full paper text.
- Raw Linkup responses and fetched papers belong in untracked storage, with stable references in annotations.

## Directory policy

```text
data/
  annotations/        # reviewed pair-level labels safe to commit
  raw/                # gitignored local downloads
  processed/          # reproducible generated features, normally gitignored
  README.md
```

## Pair annotation schema

Each JSONL record contains:

- stable `pair_id` and source identities;
- headline claims;
- population, exposure/intervention, outcome, time horizon, and design for both papers;
- per-dimension classification: `equivalent`, `different`, or `incompatible`;
- root dimensions that drive the verdict;
- final verdict: `apparent_contradiction`, `genuine_unresolved_conflict`, or `insufficient_evidence`;
- evidence spans with section and source reference;
- annotator, reviewer, timestamp, and adjudication notes.

`annotations/example-pair.jsonl` is synthetic and exists only to validate tooling.

## Split contract

- SciFact training and validation: model development only.
- Curated PaperDiff pairs: final domain-transfer evaluation only.
- Golden demo pair and two fallbacks: may be drawn from the curated set, but report this separately from unbiased aggregate results.
- Fixed seeds and exact split hashes belong in every experiment artifact.
- This project's fixed training seed: `42` (see `TrainingArguments(seed=...)` in `ml/2_train.py`).