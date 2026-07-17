# Shared contracts

PaperDiff has two intentionally separate contracts:

1. Compare workflow: `examples/compare-request.json` in; the shape in `apps/web/src/types.ts` out.
2. Claim-evidence classifier: the input/output in `packages/core/src/types.ts` and `ml/export-contract.md`.

`apps/web/src/lib/demoComparison.ts` is the stable Compare response fixture used while RocketRide is under development. A shared contract change is complete only after the fixture, consumer types, pipeline output, and tests agree.

The trained classifier does not choose comparison dimensions or the final contradiction verdict. It only checks whether one exact passage supports, contradicts, or is insufficient for one claim.

