# Retired deployment source

No `.pipe` file in this directory is a release source. The sole canonical
RocketRide graphs are `pipelines/compare.pipe` and `pipelines/challenge.pipe`.

An earlier single-agent Compare graph deployed from here confirmed basic Cloud
deployment, webhook, Linkup HTTP, and classifier HTTP wiring, but it is not
demo-safe: it used a temporary classifier tunnel, trusted service-side product
state, and did not satisfy the checked-in cited response contract. Do not
connect it to the frontend or redeploy it from Git history.

Deploy `pipelines/compare.pipe` from the RocketRide VS Code extension after a
durable classifier URL is configured and one full-trace run passes
`validateCompareResponse`. The remaining deployment steps are listed in
`docs/integrations.md`.
