# Architecture

## Compare-mode data flow

```text
Input A -> retrieve -> extract --\
                                +-> align dimensions -> classify rows -> verdict/synthesis
Input B -> retrieve -> extract --/                      |
                                                       v
                                      provenance gate -> relationship verifier
```

The two extraction branches are symmetric and safe to run concurrently. The frontend consumes only the final comparison response.

## Trust boundary

PaperDiff asks two separate questions:

1. **Is this evidence real and traceable?** Deterministic checks validate source origin, successful fetch, paper identity, exact passage existence, and span-level linkage.
2. **Does it support the interpretation?** A semantic verifier labels `supports`, `partial`, `insufficient`, or `contradicts` with confidence and review status.

The semantic stage may not override a provenance failure. A blocked evidence span never becomes an evidence-backed UI claim.

## Core entities

- `ComparisonRequest`: two user inputs plus optional tracing metadata.
- `PaperExtraction`: normalized claim, paper identity, dimensions, and evidence spans.
- `DimensionDiff`: values from each paper, classification, rationale, and evidence IDs.
- `EvidenceSpan`: source identity, exact quote, provenance result, and relationship result.
- `ComparisonResponse`: both papers, diffs, verdict, synthesis, and trace metadata.

## Extension points

- `PaperRetriever`: Linkup-backed fetch or a local test double.
- `PaperExtractor`: one shared prompt/model used for both papers.
- `RelationshipVerifier`: prompted LLM for demo; later scientific cross-encoder.
- `TraceSink`: local no-op/test trace; later RocketRide execution and observability.

## Challenge mode

Challenge adds three parallel discovery scouts and a seven-dimension comparison-fit ranker before the existing Compare pipeline. It must hand one candidate into the exact same request contract; it is not a second analysis stack.

