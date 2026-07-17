# Architecture

## Compare-mode data flow

```text
                          ROCKETRIDE WORKFLOW
Input A -> Linkup -> extract --\
                               +-> align dimensions -> classify diffs -> verdict/synthesis
Input B -> Linkup -> extract --/                              |
                                                              v
                                             deterministic provenance gate
                                                              |
                                                              v
                                   claim-evidence classifier (trained model)
                                                              |
                                                              v
                                            bundled interactive HTML interface
```

RocketRide is the only application backend. The frontend is a static site, and model training happens separately in Google Colab.

## Classifier boundary

The trained model receives exactly two strings: a claim and one candidate evidence passage. It returns one of:

- `supports`
- `contradicts`
- `insufficient`

It also returns confidence, abstention state, and model version. It does not retrieve papers, extract dimensions, classify methodological differences, or decide whether two papers genuinely conflict.

## Trust boundary

PaperDiff asks two separate questions in order:

1. **Is this evidence real and traceable?** Deterministic checks validate source origin, successful fetch, paper identity, exact passage existence, and span-level linkage.
2. **Does this passage support this claim?** The trained classifier returns `supports`, `contradicts`, or `insufficient`.

The second stage may never override a failure in the first stage.

| Result | Product state |
| --- | --- |
| Provenance failed | Blocked |
| High-confidence supports | Grounded |
| Lower-confidence supports | Qualified |
| Contradicts | Flag extracted field for correction |
| Insufficient or abstained | Needs review |

## Core entities

- `ComparisonRequest`: two paper/claim inputs.
- `PaperExtraction`: normalized paper identity, dimensions, and exact evidence spans.
- `DimensionDiff`: both values, comparability classification, rationale, and evidence IDs.
- `ClassifierResult`: label, confidence, abstention, and model version for one claim/passage pair.
- `ComparisonResponse`: papers, diffs, evidence states, verdict, synthesis, and RocketRide trace.

## Challenge mode

Challenge adds three discovery scouts and comparison-fit ranking before the exact same Compare pipeline. It remains a stretch goal until Compare is stable.
