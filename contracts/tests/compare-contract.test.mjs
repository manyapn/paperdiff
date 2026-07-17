import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateCompareRequest,
  validateCompareResponse,
} from "../src/validate-compare.mjs";

const sourceUrls = {
  left: "https://example.org/papers/left",
  right: "https://example.org/papers/right",
};

function provenance(passed = true) {
  return {
    passed,
    checks: {
      source_origin: true,
      fetched: true,
      identity_match: true,
      passage_match: passed,
      span_specific: passed,
    },
    failure_reasons: passed ? [] : ["Exact passage was not found in fetched text."],
  };
}

function passage(side, index) {
  return {
    source_url: sourceUrls[side],
    span_id: `${side}-span-${index}`,
    pre: "Context before.",
    span: "An exact source passage with enough words.",
    post: "Context after.",
  };
}

function dimension(index) {
  return {
    key: `dimension-${index}`,
    label: `Dimension ${index}`,
    classification: index < 2 ? "different" : "equivalent",
    left_value: "Left extracted value",
    right_value: "Right extracted value",
    rationale: "The exact passages justify this methodological classification.",
    drives_verdict: index < 2,
    evidence_status: "Qualified",
    evidence_chain: ["Public claim", "Paper conclusion", "Exact passage"],
    left_passage: passage("left", index),
    right_passage: passage("right", index),
    left_provenance: provenance(),
    right_provenance: provenance(),
    verifier: {
      kind: "prompted_llm",
      label: "supports",
      confidence: 0.9,
      abstained: false,
      model_version: "rocketride-prompted-verifier-v1",
    },
    verifier_rationale: "The passages address the extracted values.",
    verdict_impact: "This dimension contributes to the scope distinction.",
  };
}

function validResponse() {
  return {
    trace_id: "trace-contract-test",
    pipeline_version: "paperdiff-compare-v1",
    left: {
      title: "Left source",
      authors: ["Researcher A"],
      venue: "Journal A",
      year: 2024,
      source_url: sourceUrls.left,
      passages: 8,
    },
    right: {
      title: "Right source",
      authors: ["Researcher B"],
      venue: "Journal B",
      year: 2025,
      source_url: sourceUrls.right,
      passages: 8,
    },
    dimensions: Array.from({ length: 8 }, (_, index) => dimension(index)),
    verdict: {
      headline: "The apparent disagreement is driven by scope.",
      explanation: "The cited methods differ on verdict-driving dimensions.",
      citations: [sourceUrls.left, sourceUrls.right],
    },
    synthesis: "Within their respective scopes, both cited findings can hold.",
    synthesis_citations: [sourceUrls.left, sourceUrls.right],
    evidence_summary: "Sixteen exact passages were checked across eight dimensions.",
    trace: [
      {
        stage: "retrieve-left",
        status: "complete",
        detail: "Fetched the left primary source through Linkup.",
        provider: "linkup",
        latency_ms: 100,
        source_url: sourceUrls.left,
      },
      {
        stage: "retrieve-right",
        status: "complete",
        detail: "Fetched the right primary source through Linkup.",
        provider: "linkup",
        latency_ms: 110,
        source_url: sourceUrls.right,
      },
    ],
  };
}

test("accepts the configured Compare request shape", () => {
  const result = validateCompareRequest({
    left: { url: null, claim: "A claim", use_detected_conclusion: true },
    right: {
      url: "https://example.org/paper",
      claim: null,
      use_detected_conclusion: true,
    },
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test("rejects a request side without a URL or claim", () => {
  const result = validateCompareRequest({
    left: { url: null, claim: "", use_detected_conclusion: true },
    right: { url: null, claim: "A claim", use_detected_conclusion: true },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /left.*url or claim/);
});

test("accepts a fully cited, two-sided Linkup response", () => {
  assert.deepEqual(validateCompareResponse(validResponse()), { valid: true, errors: [] });
});

test("rejects Grounded when only the prompted verifier ran", () => {
  const response = validResponse();
  response.dimensions[0].evidence_status = "Grounded";

  const result = validateCompareResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Grounded only with.*classifier/);
});

test("accepts Grounded only after provenance-valid classifier support", () => {
  const response = validResponse();
  response.dimensions[0].evidence_status = "Grounded";
  response.dimensions[0].verifier = {
    kind: "classifier",
    label: "supports",
    confidence: 0.85,
    abstained: false,
    model_version: "paperdiff-verifier-v1",
  };

  assert.deepEqual(validateCompareResponse(response), { valid: true, errors: [] });

  response.dimensions[0].right_provenance = provenance(false);
  const failedProvenance = validateCompareResponse(response);
  assert.equal(failedProvenance.valid, false);
  assert.match(failedProvenance.errors.join("\n"), /cannot be Grounded when provenance fails/);
  assert.match(failedProvenance.errors.join("\n"), /must be Blocked/);
});

test("requires Blocked when either deterministic provenance gate fails", () => {
  const response = validResponse();
  response.dimensions[0].right_provenance = provenance(false);

  const result = validateCompareResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must be Blocked/);
});

test("requires observable Linkup retrieval for both inputs", () => {
  const response = validResponse();
  response.trace = response.trace.filter((stage) => stage.stage !== "retrieve-right");

  const result = validateCompareResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Linkup retrieval for both/);
});

test("the RocketRide pipeline is Compare-only, live-grounded, and secret-safe", async () => {
  const pipelineUrl = new URL("../../pipelines/compare.pipe", import.meta.url);
  const pipelineText = await readFile(pipelineUrl, "utf8");
  const pipeline = JSON.parse(pipelineText);
  const providers = new Set(pipeline.components.map((component) => component.provider));

  assert.equal(Object.keys(pipeline)[0], "components");
  assert.equal(pipeline.source, "webhook_1");
  assert.match(pipeline.project_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(pipeline.viewport, { x: 0, y: 0, zoom: 1 });
  assert.ok(providers.has("agent_rocketride"));
  assert.ok(providers.has("mcp_client"));
  assert.ok(providers.has("tool_python"));
  assert.ok(providers.has("tool_http_request"));
  assert.ok(providers.has("memory_internal"));
  assert.ok(providers.has("response_answers"));
  assert.equal(providers.has("llm_openai"), false);

  const llm = pipeline.components.find((component) => component.id === "llm_1");
  assert.equal(llm.provider, "llm_gemini");
  assert.equal(llm.config.profile, "gemini-3_1-flash-lite-preview");
  assert.equal(
    llm.config["gemini-3_1-flash-lite-preview"].apikey,
    "${ROCKETRIDE_GEMINI_KEY}",
  );

  const linkup = pipeline.components.find((component) => component.id === "linkup_1");
  assert.equal(
    linkup.config.streamable_http.endpoint,
    "https://mcp.linkup.so/mcp",
  );
  assert.equal(
    linkup.config.streamable_http.bearer,
    "${ROCKETRIDE_LINKUP_KEY}",
  );
  assert.equal(linkup.config.streamable_http.transport, "streamable-http");

  const classifier = pipeline.components.find(
    (component) => component.id === "classifier_http",
  );
  assert.equal(classifier.provider, "tool_http_request");
  assert.equal(classifier.config.type, "tool_http_request");
  assert.equal(classifier.config.serverName, "classifier");
  assert.equal(classifier.config.allowPOST, true);
  for (const method of [
    "allowGET",
    "allowPUT",
    "allowPATCH",
    "allowDELETE",
    "allowHEAD",
    "allowOPTIONS",
  ]) {
    assert.equal(classifier.config[method], false);
  }
  assert.deepEqual(classifier.config.urlWhitelist, [
    {
      whitelistPattern: "^${ROCKETRIDE_CLASSIFIER_URL}/score_batch$",
    },
  ]);
  assert.equal(classifier.config.rateLimitPerSecond, 1);
  assert.equal(classifier.config.rateLimitPerMinute, 20);
  assert.equal(classifier.config.maxConcurrentRequests, 1);

  const agent = pipeline.components.find((component) => component.id === "compare_agent");
  const instructions = agent.config.instructions.join("\n");
  assert.match(instructions, /left and right Linkup calls in parallel/i);
  assert.match(instructions, /identical schema to both sides/i);
  assert.match(instructions, /fail closed/i);
  assert.match(instructions, /NEVER emit Grounded/i);
  assert.match(instructions, /exactly these eight unique dimensions/i);
  assert.match(instructions, /every python\.execute invocation MUST include one non-empty code string/i);
  assert.match(instructions, /COMPACT INTERMEDIATE ONLY/i);
  assert.match(instructions, /DETERMINISTIC FINAL BUILDER/i);
  assert.match(instructions, /evidence_status.*Blocked when either provenance fails/is);
  assert.match(instructions, /Only after the deterministic provenance Python call succeeds/i);
  assert.match(instructions, /results\.length to equal score_keys\.length/i);
  assert.match(instructions, /bind result index i only to score_keys\[i\]/i);
  assert.match(instructions, /Retain only label, confidence, abstained, and model_version/i);
  assert.match(
    instructions,
    /Grounded only for classifier supports with confidence at least 0\.85/i,
  );
  assert.match(instructions, /Prompted supports is at most Qualified/i);
  assert.match(instructions, /malformed successful classifier response.*Needs review/i);
  assert.match(instructions, /classifier-invalid-response-v1/);
  assert.match(instructions, /RESPONSE CONTRACT/);
  assert.match(instructions, /never return request fields url, claim/i);
  assert.match(instructions, /Prompted verification can NEVER emit Grounded/i);
  const webhook = pipeline.components.find((component) => component.id === "webhook_1");
  assert.equal(webhook.config.type, "webhook");
  assert.equal(webhook.config.mode, "Source");
  assert.doesNotMatch(pipelineText, /sk-[A-Za-z0-9]/);
  assert.doesNotMatch(pipelineText, /ROCKETRIDE_OPENAI_KEY/);
  assert.doesNotMatch(pipelineText, /ROCKETRIDE_CLASSIFIER_TOKEN/);

  const envExample = await readFile(new URL("../../.env.example", import.meta.url), "utf8");
  assert.match(
    envExample,
    /^ROCKETRIDE_CLASSIFIER_URL=https:\/\/classifier\.example\.invalid$/m,
  );
});

test("the canonical Compare graph is the sole deployment source", async () => {
  const legacyDirectories = ["../../deploy/", "../../pipeline/"];
  const legacyDeployPipelines = [];
  for (const directory of legacyDirectories) {
    try {
      const names = await readdir(new URL(directory, import.meta.url));
      legacyDeployPipelines.push(
        ...names.filter((name) => name.endsWith(".pipe")).map((name) => `${directory}${name}`),
      );
    } catch (error) {
      assert.equal(error.code, "ENOENT");
    }
  }

  assert.deepEqual(legacyDeployPipelines, []);

  const canonicalText = await readFile(
    new URL("../../pipelines/compare.pipe", import.meta.url),
    "utf8",
  );
  const canonical = JSON.parse(canonicalText);

  const providers = new Set(canonical.components.map((component) => component.provider));
  assert.ok(providers.has("mcp_client"));
  assert.ok(providers.has("tool_python"));
  assert.ok(providers.has("tool_http_request"));

  const agent = canonical.components.find((component) => component.id === "compare_agent");
  const instructions = agent.config.instructions.join("\n");
  assert.match(instructions, /LIVE GROUNDING IS MANDATORY/);
  assert.match(instructions, /DETERMINISTIC PROVENANCE/);
  assert.doesNotMatch(instructions, /placeholder|synthetic demo|demo pair/i);
});

test("the checked-in JSON Schemas are valid JSON and require citations", async () => {
  const requestSchema = JSON.parse(
    await readFile(new URL("../schemas/compare-request.schema.json", import.meta.url), "utf8"),
  );
  const responseSchema = JSON.parse(
    await readFile(new URL("../schemas/compare-response.schema.json", import.meta.url), "utf8"),
  );

  assert.equal(requestSchema.required.includes("left"), true);
  assert.equal(responseSchema.properties.dimensions.minItems, 8);
  assert.equal(responseSchema.properties.synthesis_citations.minItems, 2);
  assert.equal(responseSchema.$defs.passage.required.includes("source_url"), true);
});
