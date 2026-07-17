# PaperDiff agent guide

## Mission

Ship Compare mode first: two grounded claims in, methodological alignment and an evidence-backed verdict out. Challenge mode is stretch work only after Compare is stable.

## First read

1. `README.md`
2. `docs/architecture.md`
3. `docs/team-playbook.md`
4. The component-specific `AGENTS.md` nearest the files you will edit

## Non-negotiable product rules

- Never display `Grounded` unless deterministic provenance validation passes.
- Keep provenance validation separate from semantic support judgment.
- Preserve raw retrieval responses and exact evidence spans.
- Use the same extractor/schema for both sides of Compare.
- Classifications are backend decisions; the frontend only renders them.
- Fail closed on retrieval, paper identity, or passage mismatch.
- Keep the synthetic fixture visibly labeled. Never present it as a real study.

## Shared boundaries

- The API models in `services/api/paperdiff_api/models.py` are the runtime source of truth.
- `apps/web/src/lib/demoComparison.ts` is the cross-team response fixture. Update it with model changes.
- Changes to shared contracts need review from at least one other component owner.
- Do not commit secrets, raw licensed corpora, model weights, or fetched paywalled text.
- Run `make check` before handoff when dependencies are installed.

## Parallel ownership

- Frontend agent: edit `apps/web/**`; avoid API internals.
- Pipeline agent: edit `pipeline/**` and `integrations/**`; avoid UI and verifier policy.
- Verification agent: edit `verification/**`, `evaluation/**`, and `data/**`; avoid UI.
- Thin endpoint wiring in `main.py`, models, and contracts are shared integration zones.

Create small commits scoped to one component. Put interface proposals in the PR description before changing shared models.
