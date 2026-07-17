# Frontend agent instructions

Own only `apps/web/**` unless an explicitly approved response-contract change is necessary.

- Render RocketRide pipeline classifications; do not infer row colors in the browser.
- Preserve a visible synthetic-data badge for checked-in fixtures.
- Keep the first payoff under ten seconds and disagreement-driving rows expanded first.
- All expandable rows and evidence chains must be keyboard accessible.
- Design error states for blocked evidence and unavailable integrations.
- `index.html` is the product UI and embedded demo. Do not maintain a second frontend.
- Keep Vite as a thin static build/deploy wrapper.
- Run `npm run lint`, `npm run test`, and `npm run build` before handoff.
