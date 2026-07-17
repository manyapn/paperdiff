export type EndpointName = "compareEndpoint" | "challengeEndpoint";

export interface PaperDiffConfig {
  compareEndpoint: string;
  challengeEndpoint: string;
}

export interface PaperDiffApi {
  post(endpointName: EndpointName, payload: unknown): Promise<unknown>;
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
        headers: { "content-type": "application/json" },
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

      return data;
    },
  };
}
