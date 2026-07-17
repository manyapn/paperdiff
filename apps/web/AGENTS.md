# Frontend agent instructions

Own only `apps/web/**` unless an explicitly approved response-contract change is necessary.

- Render RocketRide pipeline classifications; do not infer row colors in the browser.
- Preserve a visible synthetic-data badge for checked-in fixtures.
- Keep the first payoff under ten seconds and disagreement-driving rows expanded first.
- All expandable rows and evidence chains must be keyboard accessible.
- Design error states for blocked evidence and unavailable integrations.
- Work from `src/lib/demoComparison.ts` while the RocketRide workflow is moving.
- Run `npm run lint`, `npm run test`, and `npm run build` before handoff.
