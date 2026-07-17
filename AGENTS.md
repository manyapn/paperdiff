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
- Scientific diff classifications are RocketRide pipeline decisions; the frontend only renders them.
- Fail closed on retrieval, paper identity, or passage mismatch.
- Never add embedded paper, evidence, candidate, verdict, or verification fixtures to the frontend.

## Shared boundaries

- `contracts/` defines the future RocketRide Compare boundary.
- `packages/core/src/types.ts` defines the narrow classifier/provenance boundary.
- `apps/web/index.html` is the supplied self-contained UI, wired only to configured pipeline endpoints.
- Changes to shared contracts need review from at least one other component owner.
- Do not commit secrets, raw licensed corpora, model weights, or fetched paywalled text.
- Run `make check` before handoff when dependencies are installed.

## Parallel ownership

- Frontend agent: edit `apps/web/**`; avoid pipeline and model internals.
- Pipeline agent: own the RocketRide/Linkup workflow and `contracts/**`; avoid UI and model training.
- Model/evaluation agent: edit `notebooks/**`, `ml/**`, `evaluation/**`, `data/**`, and `packages/core/**`.
- Compare response types and contracts are shared integration zones.

Create small commits scoped to one component. Put interface proposals in the PR description before changing shared models.
