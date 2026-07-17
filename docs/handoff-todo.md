# Handoff TODO (2026-07-17)

The canonical Compare/Challenge graphs, classifier boundary, Linkup integration,
contracts, frontend transport, and deployment preflight are implemented. See
`docs/pipeline-handoff.md` and the append-only `docs/pipeline-worklog.md`.

## Immediate demo path

1. Keep the verified local classifier and its temporary Cloudflare Quick Tunnel
   running. Set that HTTPS origin as `ROCKETRIDE_CLASSIFIER_URL`; replace it with
   the Docker Hugging Face Space URL when available.
2. Run `pipelines/compare.pipe` in RocketRide Cloud with full tracing. Require
   two Linkup branches, provenance before `/score_batch`, and a response passing
   `validateCompareResponse` before connecting the browser.
3. Deploy that exact canonical graph and obtain its durable webhook/public
   authorization from the RocketRide Project Log.
4. Set `compareEndpoint`, verify CORS/envelope/auth behavior, and rehearse one
   golden comparison plus one fail-closed result.
5. Use Challenge only as a backup until Compare passes.

## Stopgap adapter

`deploy/adapter.py` was added on `main` as an untested forwarding adapter for a
RocketRide session token. It does not replace the canonical pipeline, does not
make an ephemeral token durable, and must not bypass RocketRide or call Linkup
and the classifier directly for the submitted product. Use it only if its
forwarding path is tested against a live RocketRide webhook and the response
still passes the checked-in contract.

An earlier single-agent deployment under project ID
`9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41` proved basic Cloud wiring but is not the
release graph. Do not connect it to the frontend.
