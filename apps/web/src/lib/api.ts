import type { APIError, ComparisonResponse } from "../types";

export class PaperDiffAPIError extends Error {
  nextStep?: string;

  constructor(payload: APIError) {
    super(payload.message);
    this.name = "PaperDiffAPIError";
    this.nextStep = payload.next_step;
  }
}

async function parseResponse(response: Response): Promise<ComparisonResponse> {
  if (!response.ok) {
    const payload = (await response.json()) as APIError;
    throw new PaperDiffAPIError(payload);
  }
  return (await response.json()) as ComparisonResponse;
}

export async function loadDemo(signal?: AbortSignal): Promise<ComparisonResponse> {
  return parseResponse(await fetch("/api/v1/demo", { signal }));
}

export async function compareClaims(
  left: string,
  right: string,
  signal?: AbortSignal,
): Promise<ComparisonResponse> {
  return parseResponse(
    await fetch("/api/v1/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        left: { kind: "claim", value: left },
        right: { kind: "claim", value: right },
      }),
      signal,
    }),
  );
}

