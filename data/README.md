# Data and annotation contract

## Sources and licenses

- SciFact is intended for verifier training and validation; record the exact release, license, and download checksum when added.
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

Do not add synthetic paper pairs. Every annotation must name traceable sources and remain `pending-human-review` until checked.

## Split contract

- SciFact training and validation: model development only.
- Curated PaperDiff pairs: final domain-transfer evaluation only.
- Golden demo pair and two fallbacks: may be drawn from the curated set, but report this separately from unbiased aggregate results.
- Fixed seeds and exact split hashes belong in every experiment artifact.
