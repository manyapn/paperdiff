# Frontend agent instructions

Own only `apps/web/**` unless an explicitly approved response-contract change is necessary.

- Render RocketRide pipeline classifications; do not infer row colors in the browser.
- Do not add checked-in scientific fixtures or fallback results. Missing data must stay blank or Needs review.
- Keep the first payoff under ten seconds and disagreement-driving rows expanded first.
- All expandable rows and evidence chains must be keyboard accessible.
- Design error states for blocked evidence and unavailable integrations.
- `index.html` is a small Vite shell. Edit the product in `src/`; keep generated runtime payloads isolated in `public/vendor/`.
- Keep Vite as a thin static build/deploy wrapper.
- Run `npm run lint`, `npm run test`, and `npm run build` before handoff.
