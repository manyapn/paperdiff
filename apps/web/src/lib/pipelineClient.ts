import type { APIError, ComparisonResponse } from "../types";
import { demoComparison } from "./demoComparison";

export class PaperDiffPipelineError extends Error {
  nextStep?: string;

  constructor(message: string, nextStep?: string) {
    super(message);
    this.name = "PaperDiffPipelineError";
    this.nextStep = nextStep;
  }
}

interface RunOptions {
  isDemoPair: boolean;
  endpoint?: string;
  fetcher?: typeof fetch;
}

export async function runComparison(
  left: string,
  right: string,
  options: RunOptions,
): Promise<ComparisonResponse> {
  if (options.isDemoPair) return demoComparison;

  const endpoint = options.endpoint?.trim();
  if (!endpoint) {
    throw new PaperDiffPipelineError(
      "Live Compare is not connected yet.",
      "Set VITE_ROCKETRIDE_PIPELINE_URL after the RocketRide workflow is deployed.",
    );
  }

  const response = await (options.fetcher ?? fetch)(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      left: { kind: "claim", value: left },
      right: { kind: "claim", value: right },
    }),
  });
  if (!response.ok) {
    const payload = (await response.json()) as APIError;
    throw new PaperDiffPipelineError(payload.message, payload.next_step);
  }
  return (await response.json()) as ComparisonResponse;
}

