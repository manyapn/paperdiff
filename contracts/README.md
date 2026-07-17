# Shared contracts

The static frontend calls two RocketRide endpoints configured in `apps/web/public/config.json`. It has no scientific fixtures or fallback results: all paper identities, passages, candidates, dimensions, evidence states, verdicts, synthesis, and trace entries must come from these responses.

- [Compare contract](compare.md) — the MVP pipeline and UI response.
- [Challenge contract](challenge.md) — optional discovery stage that hands a selected candidate back to Compare.
- `examples/compare-request.json` — structural request example containing placeholders, not a paper or result fixture.
- `schemas/compare-request.schema.json` and `schemas/compare-response.schema.json` — executable Compare boundary.
- `src/validate-compare.mjs` — fail-closed checks that JSON Schema cannot express, including provenance precedence.
- `schemas/challenge-request.schema.json` and `schemas/challenge-response.schema.json` — executable three-scout Challenge boundary.
- `src/validate-challenge.mjs` — exact scout coverage, citation, provenance, seven-field scoring, ranking, and Linkup trace checks.
- `packages/core/src/types.ts` and `ml/export-contract.md` — narrower classifier/provenance boundary.

The classifier does not choose comparison dimensions or the final contradiction verdict. It only checks whether one exact passage supports, contradicts, or is insufficient for one claim.

The response schema is a shared integration zone. Changes require review from another component owner.
