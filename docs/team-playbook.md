# Three-person team playbook

## Lane 1: frontend

Own `apps/web/`. Deliver the ten-second hook, responsive diff interface, loading/error states, keyboard-accessible expansion, and trace drawer. Work against the checked-in example response so pipeline work cannot block UI progress.

## Lane 2: pipeline and integrations

Own `pipeline/` and `integrations/`. Deliver symmetric extraction, Linkup retrieval, concurrency, failure routing, RocketRide traces, and stable response construction. Preserve raw Linkup responses outside Git.

## Lane 3: verification and evaluation

Own `verification/`, `evaluation/`, and `data/`. Deliver deterministic provenance, relationship-verifier policy, curated-pair annotations, evaluation metrics, and golden-pair validation.

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
- Row colors come from backend classifications.
- Verdict distinguishes apparent from genuine conflict.
- One jointly supportable synthesis sentence is returned with citations.
- Retrieval/identity/passage failures show blocked states, not confidence scores.
- Demo works with the network path disabled.

