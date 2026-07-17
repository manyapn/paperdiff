# Retired deployment source

No `.pipe` file in this directory is a release source. The sole canonical
RocketRide graphs are `pipelines/compare.pipe` and `pipelines/challenge.pipe`.

An earlier single-agent Compare graph was deployed under project ID
`9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`. It confirmed basic Cloud deployment,
webhook, Linkup HTTP, and classifier HTTP wiring, but it is not demo-safe: it
used a temporary classifier tunnel, trusted service-side product state, and did
not satisfy the checked-in cited response contract. Do not connect it to the
frontend or redeploy it from Git history.

Deploy `pipelines/compare.pipe` from the RocketRide VS Code extension after a
durable classifier URL is configured and one full-trace run passes
`validateCompareResponse`. Record the deployment ID, public webhook URL, and
trace reference in `docs/pipeline-handoff.md`, then append the event to
`docs/pipeline-worklog.md`.
