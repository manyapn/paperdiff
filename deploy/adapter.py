# Stopgap adapter so the existing frontend (which POSTs plain JSON, no auth
# header, per apps/web/src/api.ts) can reach the RocketRide webhook, which
# requires an Authorization header and routes content by MIME type (JSON
# routes to a "json" lane our pipeline doesn't consume -- it needs "text").
#
# This is explicitly a stopgap for demo purposes, not a durable fix: it
# hardcodes a RocketRide session's ephemeral public token, which dies when
# that session ends. See docs/integrations.md's "open problem" note --
# replace this the moment a real durable webhook URL is found.

import os
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

ROCKETRIDE_WEBHOOK_URL = "https://api.rocketride.ai/webhook"
ROCKETRIDE_PUBLIC_TOKEN = os.environ["ROCKETRIDE_PUBLIC_TOKEN"]

app = FastAPI(title="paperdiff-rocketride-adapter")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/compare")
async def compare(request: Request):
    body_bytes = await request.body()
    async with httpx.AsyncClient(timeout=120.0) as client:
        rr_response = await client.post(
            ROCKETRIDE_WEBHOOK_URL,
            headers={
                "Authorization": ROCKETRIDE_PUBLIC_TOKEN,
                "Content-Type": "text/plain",
            },
            content=body_bytes,
        )
    return rr_response.json()


@app.get("/health")
def health():
    return {"status": "ok"}
