# Handoff TODO (2026-07-17)

The local Compare implementation, classifier boundary, Linkup integration,
contracts, and frontend adapter are aligned. The remaining work is operational.
See `docs/pipeline-handoff.md` for the full current state and
`docs/pipeline-worklog.md` for the append-only history.

1. Classifier owner: create the durable Docker Hugging Face Space described in
   `ml/serving/README.md`, verify `/health` and `/score_batch`, and give the
   pipeline owner the HTTPS origin. The public model
   `o0meerkat0o/paperdiff-verifier-v1` and a temporary local tunnel were reported
   as working, but no durable endpoint is configured.
2. Pipeline owner: set `ROCKETRIDE_CLASSIFIER_URL`, run
   `pipelines/compare.pipe` from the RocketRide extension with full tracing, and
   require two live Linkup branches, provenance before classifier, an ordered
   classifier response, the final Python builder, and
   `validateCompareResponse(...).valid === true`.
3. Pipeline owner: deploy that exact canonical graph manually and locate its
   durable webhook URL/public authorization in the Project Log. Do not use the
   earlier project `9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41` as the demo endpoint.
4. Frontend owner: only after the Cloud gate passes, set `compareEndpoint`,
   confirm CORS/envelope behavior, and rehearse one golden comparison plus one
   fail-closed fallback.
5. Challenge remains stretch work until Compare is deployed and stable.
