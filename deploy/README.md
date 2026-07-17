# RocketRide deployment

`paperdiff-compare.pipe` is a real, working pipeline deployed to RocketRide
Cloud (`project_id: 9c3f6c2e-3f2b-4b7a-9a2e-1a7b7f6d2c41`). See
`docs/integrations.md`'s RocketRide section for the full verified wiring
notes, gotchas, and the current open blocker (no durable public webhook
URL found yet -- that's the next thing to resolve).

## Redeploying after an edit

```python
import asyncio, json, os
from rocketride import RocketRideClient

async def main():
    with open("deploy/paperdiff-compare.pipe") as f:
        pipeline = json.load(f)
    env = {
        "ROCKETRIDE_OPENAI_KEY": os.environ["ROCKETRIDE_OPENAI_KEY"],
        "ROCKETRIDE_LINKUP_KEY": os.environ["ROCKETRIDE_LINKUP_KEY"],
    }
    client = RocketRideClient(
        uri=os.environ["ROCKETRIDE_URI"],  # https://api.rocketride.ai -- NOT cloud.rocketride.ai
        auth=os.environ["ROCKETRIDE_APIKEY"],
        env=env,
    )
    await client.connect(timeout=15000)
    try:
        await client.deploy.update(pipeline["project_id"], pipeline=pipeline)
    finally:
        await client.disconnect()

asyncio.run(main())
```

Requires `pip install rocketride` and three env vars: `ROCKETRIDE_APIKEY`,
`ROCKETRIDE_OPENAI_KEY`, `ROCKETRIDE_LINKUP_KEY`. Never hardcode these --
the `.pipe` file references them as `${ROCKETRIDE_*}` placeholders, and the
SDK substitutes them from `env=` at deploy/run time.

## Testing a run

`client.deploy.add()`/`update()` persist the pipeline server-side, but to
actually exercise it you currently need `client.use(pipeline=pipeline)`,
which returns a fresh `token`/`publicToken` for that one session -- these
die when the session ends. This is the ephemeral-URL problem noted in
`docs/integrations.md`; a `use()`-based test run is good for confirming the
pipeline logic works, but is not the same as a stable, demo-ready URL.

## Known-working request shape (once you have a valid public URL/token)

```
POST <webhook-url>
Authorization: <publicToken>
Content-Type: text/plain
Body: raw JSON string matching contracts/compare.md's request shape
```

## Status as of 2026-07-17

- Deployed and running: yes
- Linkup wired in (real `/fetch` calls): yes, code is correct; last full
  live-URL end-to-end run was interrupted mid-test by a RocketRide Cloud
  transient outage before finishing -- not yet confirmed successful start
  to finish with two real papers
- Classifier wired in: yes, but pointing at a temporary local Cloudflare
  tunnel URL, not a durable one -- update `urlWhitelist` on the
  `tool_http_classifier` node and the agent's instructions once the real
  HF Space exists (see `ml/serving/README.md`)
- Frontend connected: no -- blocked on finding a durable webhook URL
- Output shape matches `contracts/compare.md` exactly: not yet verified
  with real (non-placeholder) data
