import { describe, expect, it, vi } from "vitest";

import { createPaperDiffApi } from "../src/api";

describe("PaperDiff API client", () => {
  it("refuses to invent a response when an endpoint is not configured", async () => {
    const api = createPaperDiffApi({ compareEndpoint: "", challengeEndpoint: "" });

    await expect(api.post("compareEndpoint", {})).rejects.toThrow(
      "Configure compareEndpoint in /config.json",
    );
  });

  it("posts JSON to the configured workflow", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ dimensions: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = createPaperDiffApi(
      { compareEndpoint: "https://pipeline.example/compare", challengeEndpoint: "" },
      request,
    );

    await expect(api.post("compareEndpoint", { left: "claim" })).resolves.toEqual({
      dimensions: [],
    });
    expect(request).toHaveBeenCalledWith("https://pipeline.example/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ left: "claim" }),
    });
  });

  it("surfaces a safe backend error", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "Source could not be fetched." }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = createPaperDiffApi(
      { compareEndpoint: "https://pipeline.example/compare", challengeEndpoint: "" },
      request,
    );

    await expect(api.post("compareEndpoint", {})).rejects.toThrow(
      "Source could not be fetched.",
    );
  });
});
