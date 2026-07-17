import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runPreflight, validateEnvironment, validateScoreResponse } from "./preflight.mjs";

const env = {
  ROCKETRIDE_URI: "https://api.rocketride.ai",
  ROCKETRIDE_APIKEY: "hidden",
  ROCKETRIDE_LINKUP_KEY: "hidden",
  ROCKETRIDE_GEMINI_KEY: "hidden",
  ROCKETRIDE_CLASSIFIER_URL: "https://paperdiff-classifier.example.org",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("environment validation requires integrations and rejects a model page", () => {
  assert.deepEqual(validateEnvironment(env), []);
  assert.deepEqual(validateEnvironment({ ...env, ROCKETRIDE_CLASSIFIER_URL: "http://localhost:8000" }), []);
  assert.deepEqual(validateEnvironment({ ...env, ROCKETRIDE_CLASSIFIER_URL: "http://127.0.0.1:8000" }), []);
  assert.deepEqual(validateEnvironment({ ...env, ROCKETRIDE_CLASSIFIER_URL: "http://[::1]:8000" }), []);
  assert.match(
    validateEnvironment({ ...env, ROCKETRIDE_CLASSIFIER_URL: "http://classifier.example.org" }).join("\n"),
    /must use HTTPS, except for an HTTP loopback service/,
  );
  const errors = validateEnvironment({
    ...env,
    ROCKETRIDE_APIKEY: "",
    ROCKETRIDE_CLASSIFIER_URL: "https://huggingface.co/example/model",
  });
  assert.match(errors.join("\n"), /ROCKETRIDE_APIKEY or ROCKETRIDE_AUTH/);
  assert.match(errors.join("\n"), /service origin with no path/);
  assert.match(errors.join("\n"), /not a Hugging Face model page/);
});

test("score validation accepts only the narrow classifier boundary", () => {
  assert.deepEqual(
    validateScoreResponse({
      results: [{ label: "supports", confidence: 0.91, abstained: false, model_version: "v1" }],
    }),
    [],
  );
  const errors = validateScoreResponse({
    results: [{
      label: "supports",
      confidence: 1.2,
      abstained: false,
      model_version: "v1",
      product_state: "Grounded",
    }],
  });
  assert.match(errors.join("\n"), /must contain only/);
  assert.match(errors.join("\n"), /finite number from 0 to 1/);
});

test("preflight probes health then scores only the supplied pair", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/health")) {
      return jsonResponse({ status: "ok", model_loaded: false, device: "cpu" });
    }
    return jsonResponse({
      results: [{ label: "insufficient", confidence: 0.7, abstained: false, model_version: "v1" }],
    });
  };

  const result = await runPreflight({
    env,
    claim: "A user-supplied claim",
    evidence: "A user-supplied exact evidence passage",
    fetchImpl,
  });
  assert.equal(result.valid, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    pairs: [{ claim: "A user-supplied claim", evidence: "A user-supplied exact evidence passage" }],
  });
});

test("optional saved Compare response is validated with the canonical validator", async () => {
  const directory = await mkdtemp(join(tmpdir(), "paperdiff-preflight-"));
  const responsePath = join(directory, "compare.json");
  await writeFile(responsePath, JSON.stringify({ trace_id: "incomplete" }));
  const fetchImpl = async (url) => url.endsWith("/health")
    ? jsonResponse({ status: "ok", model_loaded: true, device: "cpu" })
    : jsonResponse({
      results: [{ label: "supports", confidence: 0.9, abstained: false, model_version: "v1" }],
    });

  const result = await runPreflight({
    env,
    claim: "Claim",
    evidence: "Evidence passage",
    compareResponsePath: responsePath,
    fetchImpl,
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Compare response: response\.pipeline_version is required/);
});
