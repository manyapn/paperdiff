# Hackathon backlog

Keep one person in each lane. P0 tasks are ordered to minimize cross-team blocking.

## Frontend lane

### P0

- [ ] Confirm the synthetic demo flow on the presentation laptop.
- [ ] Add URL/DOI/claim input detection and explicit input labels.
- [ ] Add blocked, qualified, and needs-review evidence treatments.
- [ ] Add a compact RocketRide trace drawer against recorded trace data.
- [ ] Run keyboard and narrow-screen passes on the diff expansion flow.

### P1

- [ ] Add the Challenge candidate picker behind a feature flag.
- [ ] Add copy/export for the careful synthesis with citations.

## Pipeline and integrations lane

### P0

- [ ] Install the RocketRide VS Code extension and record current node/config names.
- [ ] Implement Linkup fetch from official SDK docs and save raw responses outside Git.
- [ ] Create recorded retrieval fixtures for one golden pair and two fallbacks.
- [ ] Implement one shared extractor over the stable paper schema.
- [ ] Run both extractors concurrently and record stage latency.
- [ ] Produce eight to ten dimension diffs and the verdict from RocketRide output.
- [ ] Deploy Compare mode to RocketRide Cloud and save the trace URL/reference.

### P1

- [ ] Add three Challenge scouts: contradiction, replication, and reassessment.
- [ ] Add the seven-dimension comparison-fit ranking rubric.

## Verification and evaluation lane

### P0

- [ ] Select one real open-access golden pair and two fallback pairs.
- [ ] Link every extracted field to an exact passage and source identity.
- [ ] Expand provenance tests with identity/version, missing span, and fetch failures.
- [ ] Finish the Colab three-class classifier and export its versioned inference artifact.
- [ ] Wire the trained classifier after the provenance gate, with prompted LLM as fallback.
- [ ] Curate and annotate 8-12 held-out paper pairs using `data/README.md`.
- [ ] Build the throwaway sequential baseline and compare latency with parallel execution.
- [ ] Report pair-level field agreement, root-dimension recall, evidence coverage, verdict accuracy, unsupported pass-through, and latency.

### P1

- [ ] Record the exact SciFact version, license, checksum, and split.
- [ ] Finish `3_baselines.py`: majority, embedding, prompted-LLM, trained classifier, and hybrid comparisons.
- [ ] Add confidence calibration, abstention coverage curves, ablations, and model card results.

## Shared integration checkpoints

- **T+90 minutes:** real golden pair fetches and frontend fixture still works.
- **T+3 hours:** extraction response matches the checked-in contract.
- **T+5 hours:** deterministic provenance blocks a deliberately corrupted quote.
- **T+6.5 hours:** Compare runs end to end on golden and fallback pairs.
- **T+7 hours:** freeze Compare; use remaining time for demo rehearsal or Challenge only if stable.
