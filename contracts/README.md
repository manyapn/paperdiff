# Shared contracts

PaperDiff has two intentionally separate contracts:

1. Compare workflow: `examples/compare-request.json` in; a stable response schema still needs to be extracted from the supplied UI's embedded demo data before live wiring.
2. Claim-evidence classifier: the input/output in `packages/core/src/types.ts` and `ml/export-contract.md`.

`apps/web/index.html` currently contains the complete interactive demo and its embedded data. Before connecting RocketRide, move only the shared request/response shape into `contracts/` and test the workflow output against it. Do not create a second frontend implementation.

The trained classifier does not choose comparison dimensions or the final contradiction verdict. It only checks whether one exact passage supports, contradicts, or is insufficient for one claim.
