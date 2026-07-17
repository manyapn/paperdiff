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
                                              static Vite frontend
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

Challenge resolves one source through Linkup, launches contradiction, replication, and later-reassessment searches in one RocketRide tool wave, and fetches the three selected candidates in the next parallel wave. It validates exact source/candidate passages before applying the same seven-field comparison-fit rubric to every candidate.

Challenge is discovery, not adjudication. Its relationship labels are cited hypotheses and its fit score measures methodological comparability. Selecting a candidate sends the original source and candidate URL through the exact same Compare pipeline; Challenge emits no classifier result, `Grounded` state, final verdict, or synthesis.
