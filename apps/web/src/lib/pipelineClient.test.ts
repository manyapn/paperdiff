import { describe, expect, it, vi } from "vitest";

import { demoComparison } from "./demoComparison";
import { PaperDiffPipelineError, runComparison } from "./pipelineClient";

describe("RocketRide pipeline client", () => {
  it("returns the local demo without a network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await runComparison("left", "right", { isDemoPair: true, fetcher });
    expect(result).toBe(demoComparison);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails clearly when live Compare is not deployed", async () => {
    await expect(runComparison("left", "right", { isDemoPair: false })).rejects.toEqual(
      expect.objectContaining<Partial<PaperDiffPipelineError>>({
        name: "PaperDiffPipelineError",
        message: "Live Compare is not connected yet.",
      }),
    );
  });

  it("posts the stable request contract to RocketRide", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(demoComparison), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await runComparison("claim a", "claim b", {
      isDemoPair: false,
      endpoint: "https://pipeline.example/compare",
      fetcher,
    });
    expect(result.id).toBe(demoComparison.id);
    expect(fetcher).toHaveBeenCalledWith(
      "https://pipeline.example/compare",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      left: { kind: "claim", value: "claim a" },
      right: { kind: "claim", value: "claim b" },
    });
  });
});

