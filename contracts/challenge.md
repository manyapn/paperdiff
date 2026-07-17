# Challenge endpoint contract

Challenge is a cited discovery stage. It resolves one source, runs three independent live-web scouts, and ranks one candidate from each scout by methodological comparison fit. Selecting a candidate populates Compare; Challenge never bypasses Compare provenance, verification, or verdict construction.

Configure the deployed RocketRide URL as `challengeEndpoint` in `apps/web/public/config.json` only after validating the Cloud request and response-envelope behavior.

## Request

```json
{ "input": "paper URL, DOI, abstract, or claim supplied by the user" }
```

The input must be non-empty. The successful path always resolves and fetches the source through Linkup; it does not treat model memory or an unfetched search snippet as evidence.

## Successful response

The authoritative shapes are `schemas/challenge-request.schema.json` and `schemas/challenge-response.schema.json`. A successful response contains:

- `trace_id` and `pipeline_version: "paperdiff-challenge-v1"`;
- one provenance-validated, live-fetched `source`;
- exactly three distinct candidates, sorted by non-increasing `fit_score`;
- exactly one `closest contradictory result`, one `direct replication`, and one `best later reassessment`;
- both source and candidate URLs, exact relationship passages, and deterministic provenance for every candidate;
- exactly seven fit dimensions for every candidate; and
- observable Linkup search and fetch stages for the source and all three scouts.

The response intentionally has no classifier result, `Grounded` state, Compare classification, final contradiction verdict, or synthesis.

## Fixed seven-dimension fit rubric

Every candidate uses the same keys:

1. `population`
2. `intervention_or_exposure`
3. `comparator`
4. `outcome`
5. `time_horizon`
6. `design`
7. `analysis`

Each dimension includes the source and candidate value, an explanation, an exact passage and provenance object for both sides, and one deterministic fit value:

| Fit | Points | UI icon | UI color |
| --- | ---: | --- | --- |
| `match` | 1 | `=` | `#1746B7` |
| `partial` | 0.5 | `≈` | `#A65F00` |
| `mismatch` | 0 | `≠` | `#A93F35` |
| `review` | 0 | `?` | `#566173` |

`fit_score` is the exact sum across the seven fields. `comparison_fit` is `review` if any dimension needs review or the score is below 3.5; otherwise it is `high` at 5.5 or above and `medium` from 3.5 through 5.0. A missing passage or failed provenance check forces that dimension to `review`. Fit measures methodological comparability, not text similarity, study quality, or which paper is true.

## Fail-closed behavior

The successful contract requires all three scouts. If the source cannot be resolved, a candidate page cannot be fetched, paper identity is ambiguous, a relationship lacks two exact validated passages, or one scout has no defensible result, the workflow must take an error/blocked path rather than fabricate or silently omit a candidate.

Complete Linkup responses remain in RocketRide memory and full traces. Only cited spans and URLs cross the browser boundary.
