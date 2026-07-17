# Three-person team playbook

## Lane 1: frontend

Own `apps/web/`. The supplied `index.html` is the only frontend. Deliver the ten-second hook, responsive diff interface, loading/error states, keyboard-accessible expansion, and trace drawer without creating a parallel React implementation.

## Lane 2: RocketRide pipeline and integrations

Own the RocketRide workflow, Linkup nodes, and `contracts/**`. Deliver symmetric extraction, retrieval, concurrency, failure routing, traces, and stable response construction. Preserve raw Linkup responses outside Git.

## Lane 3: classifier and evaluation

Own `notebooks/**`, `ml/**`, `packages/core/**`, `evaluation/**`, and `data/**`. Deliver the three-class claim-evidence classifier, deterministic provenance policy, curated-pair annotations, baseline comparisons, and golden-pair validation.

## Integration rhythm

- Branches: `feat/frontend-*`, `feat/pipeline-*`, `feat/verification-*`.
- Integrate through the request/response examples rather than importing another lane's internals.
- Merge small slices every 60-90 minutes during the hackathon.
- Announce shared-model changes before editing `models.py`.
- Keep one golden demo pair and two fallbacks runnable at all times.

## Definition of done for Compare

- Two URL/claim inputs produce the same typed output schema.
- Every visible evidence-backed claim has a source and exact passage.
- At least eight comparison dimensions are emitted.
- Row colors come from RocketRide pipeline classifications.
- Verdict distinguishes apparent from genuine conflict.
- One jointly supportable synthesis sentence is returned with citations.
- Retrieval/identity/passage failures show blocked states, not confidence scores.
- Demo works with the network path disabled.
