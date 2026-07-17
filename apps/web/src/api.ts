export type EndpointName = "compareEndpoint" | "challengeEndpoint";

export interface PaperDiffConfig {
  compareEndpoint: string;
  challengeEndpoint: string;
}

export interface PaperDiffApi {
  post(endpointName: EndpointName, payload: unknown): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRocketRideAnswer(answer: unknown): unknown {
  if (typeof answer !== "string") return answer;

  try {
    return JSON.parse(answer) as unknown;
  } catch {
    throw new Error("The PaperDiff pipeline returned an invalid JSON answer.");
  }
}

export function unwrapRocketRideResponse(data: unknown): unknown {
  if (!isRecord(data) || !("answers" in data)) return data;

  if (!Array.isArray(data.answers) || data.answers.length === 0) {
    throw new Error("The PaperDiff pipeline returned no answer.");
  }

  return parseRocketRideAnswer(data.answers[0]);
}

export function createPaperDiffApi(
  config: PaperDiffConfig,
  request: typeof fetch = fetch,
): PaperDiffApi {
  return {
    async post(endpointName, payload) {
      const endpoint = config[endpointName];
      if (!endpoint) {
        throw new Error(
          `The PaperDiff pipeline is not connected yet. Configure ${endpointName} in /config.json.`,
        );
      }

      const response = await request(endpoint, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify(payload),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // The status-specific error below is safer than exposing an HTML response.
      }

      if (!response.ok) {
        const errorBody = data as { message?: string; error?: string } | null;
        throw new Error(
          errorBody?.message || errorBody?.error || "The PaperDiff pipeline request failed.",
        );
      }

      return unwrapRocketRideResponse(data);
    },
  };
}
