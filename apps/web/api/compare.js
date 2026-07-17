export const maxDuration = 300;

const ROCKETRIDE_WEBHOOK_URL = "https://api.rocketride.ai/webhook";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const publicToken = process.env.ROCKETRIDE_PUBLIC_TOKEN;
  if (!publicToken) {
    response.status(503).json({
      error: "The RocketRide comparison pipeline is not configured.",
    });
    return;
  }
  const body = typeof request.body === "string"
    ? request.body
    : JSON.stringify(request.body ?? {});

  try {
    const upstream = await fetch(ROCKETRIDE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        authorization: publicToken,
        "content-type": "text/plain",
      },
      body,
    });
    const payload = await upstream.text();
    response.status(upstream.status);
    response.setHeader(
      "content-type",
      upstream.headers.get("content-type") || "application/json; charset=utf-8",
    );
    response.send(payload);
  } catch {
    response.status(502).json({ error: "The RocketRide comparison pipeline is temporarily unavailable." });
  }
}
