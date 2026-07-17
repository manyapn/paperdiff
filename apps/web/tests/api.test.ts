import { describe, expect, it, vi } from "vitest";

import { createPaperDiffApi } from "../src/api";

describe("PaperDiff API client", () => {
  it("refuses to invent a response when an endpoint is not configured", async () => {
    const api = createPaperDiffApi({ compareEndpoint: "", challengeEndpoint: "" });

    await expect(api.post("compareEndpoint", {})).rejects.toThrow(
      "Configure compareEndpoint in /config.json",
    );
  });

  it("posts JSON payload text to the configured RocketRide webhook", async () => {
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
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ left: "claim" }),
    });
  });

  it("unwraps a parsed answer from the standard RocketRide envelope", async () => {
    const answer = { source: { title: "Resolved source" }, candidates: [] };
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ answers: [answer], result_types: { answers: "answers" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = createPaperDiffApi(
      { compareEndpoint: "", challengeEndpoint: "https://pipeline.example/challenge" },
      request,
    );

    await expect(api.post("challengeEndpoint", { input: "paper" })).resolves.toEqual(answer);
  });

  it("parses a JSON-string answer from a RocketRide envelope", async () => {
    const answer = { left: { title: "A" }, right: { title: "B" } };
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ answers: [JSON.stringify(answer)] }), { status: 200 }),
    );
    const api = createPaperDiffApi(
      { compareEndpoint: "https://pipeline.example/compare", challengeEndpoint: "" },
      request,
    );

    await expect(api.post("compareEndpoint", {})).resolves.toEqual(answer);
  });

  it("fails visibly when a RocketRide envelope has no answer", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ answers: [] }), { status: 200 }),
    );
    const api = createPaperDiffApi(
      { compareEndpoint: "https://pipeline.example/compare", challengeEndpoint: "" },
      request,
    );

    await expect(api.post("compareEndpoint", {})).rejects.toThrow("returned no answer");
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
