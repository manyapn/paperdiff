# Core verification rules

This package contains pure, deployment-neutral trust logic for the RocketRide pipeline and its contract tests.

- The deterministic provenance gate runs before the trained classifier.
- The classifier accepts only `(claim, evidence passage)` text pairs.
- It returns `supports`, `contradicts`, or `insufficient` plus confidence and abstention.
- `contradicts` flags an extracted field for correction; `insufficient` becomes Needs review.
- No classifier confidence may override failed provenance.
- Do not add HTTP servers, retrieval SDKs, training code, or UI logic here.
