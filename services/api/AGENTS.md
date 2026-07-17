# API, pipeline, and verification instructions

Keep the endpoint layer thin. `models.py` owns the runtime schema, `pipeline/` owns orchestration and alignment, `integrations/` owns external APIs, and `verification/` owns trust policy.

- Do not special-case paper A vs. paper B; both must use the same extraction path.
- Retrieval adapters must preserve raw output and source origin.
- External-integration failures must remain distinguishable from reasoning failures.
- Provenance failures are terminal for `Grounded` status.
- Add a test for each failure state before changing its UI-facing behavior.
- Never add fabricated citations or passages to the live path.

