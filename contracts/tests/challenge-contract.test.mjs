import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  validateChallengeRequest,
  validateChallengeResponse,
} from "../src/validate-challenge.mjs";

const sourceUrl = "https://example.org/papers/source";

const relationships = [
  ["closest contradictory result", "contradiction", "https://example.org/papers/contradiction"],
  ["direct replication", "replication", "https://example.org/papers/replication"],
  ["best later reassessment", "reassessment", "https://example.org/papers/reassessment"],
];

const dimensionKeys = [
  "population",
  "intervention_or_exposure",
  "comparator",
  "outcome",
  "time_horizon",
  "design",
  "analysis",
];

const presentation = {
  match: { points: 1, icon: "=", color: "#1746B7" },
  partial: { points: 0.5, icon: "≈", color: "#A65F00" },
  mismatch: { points: 0, icon: "≠", color: "#A93F35" },
  review: { points: 0, icon: "?", color: "#566173" },
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
    failure_reasons: passed ? [] : ["The exact span was not found in fetched text."],
  };
}

function passage(url, id) {
  return {
    source_url: url,
    span_id: id,
    pre: "Context immediately before.",
    span: "An exact cited passage containing enough words.",
    post: "Context immediately after.",
  };
}

function dimension(key, candidateUrl, fit) {
  return {
    key,
    label: key.replaceAll("_", " "),
    fit,
    ...presentation[fit],
    source_value: "Resolved source method",
    candidate_value: "Resolved candidate method",
    rationale: "The two exact passages support this methodological fit assessment.",
    source_passage: passage(sourceUrl, `source-${key}`),
    candidate_passage: passage(candidateUrl, `candidate-${key}`),
    source_provenance: provenance(),
    candidate_provenance: provenance(),
  };
}

function candidate(index) {
  const [relationship, , url] = relationships[index];
  const fits = index === 0
    ? Array(7).fill("match")
    : index === 1
      ? ["match", "match", "match", "match", "mismatch", "mismatch", "mismatch"]
      : Array(7).fill("mismatch");
  const dimensions = dimensionKeys.map((key, dimensionIndex) => dimension(key, url, fits[dimensionIndex]));
  return {
    title: `Candidate ${index + 1}`,
    authors: ["Researcher One"],
    venue: "Example Journal",
    year: 2025,
    url,
    relationship_type: relationship,
    comparison_fit: index === 0 ? "high" : index === 1 ? "medium" : "review",
    fit_score: index === 0 ? 7 : index === 1 ? 4 : 0,
    explanation: "The cited source and candidate passages make this a suitable discovery candidate.",
    citations: [sourceUrl, url],
    relationship_source_passage: passage(sourceUrl, `relationship-source-${index}`),
    relationship_candidate_passage: passage(url, `relationship-candidate-${index}`),
    source_provenance: provenance(),
    candidate_provenance: provenance(),
    dimensions,
  };
}

function validResponse() {
  return {
    trace_id: "challenge-contract-test",
    pipeline_version: "paperdiff-challenge-v1",
    source: {
      title: "Resolved source paper",
      authors: ["Source Author"],
      venue: "Source Journal",
      year: 2024,
      source_url: sourceUrl,
      passages: 22,
      identity_passage: passage(sourceUrl, "source-identity"),
      provenance: provenance(),
    },
    candidates: [candidate(0), candidate(1), candidate(2)],
    trace: [
      {
        stage: "retrieve-source",
        status: "complete",
        detail: "Fetched the source through Linkup.",
        provider: "linkup",
        latency_ms: 90,
        source_url: sourceUrl,
      },
      ...relationships.flatMap(([, slug, url]) => [
        {
          stage: `scout-${slug}`,
          status: "complete",
          detail: `Searched the live web for ${slug} candidates.`,
          provider: "linkup",
          latency_ms: 100,
          source_url: url,
        },
        {
          stage: `fetch-${slug}`,
          status: "complete",
          detail: `Fetched the selected ${slug} candidate.`,
          provider: "linkup",
          latency_ms: 110,
          source_url: url,
        },
      ]),
      {
        stage: "rank-fit",
        status: "complete",
        detail: "Applied the deterministic seven-dimension fit calculation.",
        provider: "python",
        latency_ms: 5,
      },
    ],
  };
}

test("accepts a non-empty Challenge request", () => {
  assert.deepEqual(validateChallengeRequest({ input: "10.1000/example" }), { valid: true, errors: [] });
});

test("rejects an empty or expanded Challenge request", () => {
  const result = validateChallengeRequest({ input: " ", hidden_fixture: true });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /non-empty/);
  assert.match(result.errors.join("\n"), /unsupported fields/);
});

test("accepts exactly three cited and ranked scout candidates", () => {
  assert.deepEqual(validateChallengeResponse(validResponse()), { valid: true, errors: [] });
});

test("requires exactly one result from each scout", () => {
  const response = validResponse();
  response.candidates[2].relationship_type = "direct replication";
  const result = validateChallengeResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /exactly one result from each/);
});

test("recomputes fit instead of trusting the model score", () => {
  const response = validResponse();
  response.candidates[0].fit_score = 6.5;
  const result = validateChallengeResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /fit_score must equal the sum/);
});

test("forces review when a dimension passage fails provenance", () => {
  const response = validResponse();
  response.candidates[0].dimensions[0].candidate_provenance = provenance(false);
  const result = validateChallengeResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /fit must be review/);
});

test("requires live Linkup search and fetch evidence for all scouts", () => {
  const response = validResponse();
  response.trace = response.trace.filter((stage) => stage.stage !== "scout-replication");
  const result = validateChallengeResponse(response);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /scout-replication/);
});

test("the RocketRide Challenge graph is parallel-scouted, cited, and secret-safe", async () => {
  const pipelineUrl = new URL("../../pipelines/challenge.pipe", import.meta.url);
  const pipelineText = await readFile(pipelineUrl, "utf8");
  const pipeline = JSON.parse(pipelineText);
  const providers = new Set(pipeline.components.map((component) => component.provider));

  assert.equal(Object.keys(pipeline)[0], "components");
  assert.equal(pipeline.source, "challenge_webhook");
  assert.match(pipeline.project_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(pipeline.viewport, { x: 0, y: 0, zoom: 1 });
  assert.ok(providers.has("agent_rocketride"));
  assert.ok(providers.has("mcp_client"));
  assert.ok(providers.has("tool_python"));
  assert.ok(providers.has("memory_internal"));
  assert.ok(providers.has("response_answers"));
  assert.equal(providers.has("tool_http_request"), false);

  const linkup = pipeline.components.find((component) => component.id === "challenge_linkup");
  assert.equal(linkup.config.streamable_http.endpoint, "https://mcp.linkup.so/mcp");
  assert.equal(linkup.config.streamable_http.bearer, "${ROCKETRIDE_LINKUP_KEY}");
  assert.equal(linkup.config.streamable_http.transport, "streamable-http");

  const llm = pipeline.components.find((component) => component.id === "challenge_llm");
  assert.equal(llm.provider, "llm_gemini");
  assert.equal(llm.config.profile, "gemini-3_1-flash-lite-preview");
  assert.equal(llm.config["gemini-3_1-flash-lite-preview"].apikey, "${ROCKETRIDE_GEMINI_KEY}");

  const agent = pipeline.components.find((component) => component.id === "challenge_agent");
  const instructions = agent.config.instructions.join("\n");
  assert.match(instructions, /three independent Linkup search calls in the same RocketRide tool wave/i);
  assert.match(instructions, /all three Linkup fetch calls in the same next tool wave/i);
  assert.match(instructions, /exactly seven unique rubric dimensions/i);
  assert.match(instructions, /must never emit Grounded/i);
  assert.match(instructions, /does not decide the final scientific contradiction verdict/i);
  assert.match(instructions, /every python\.execute invocation MUST include one non-empty code string/i);
  assert.match(instructions, /COMPACT DRAFT ONLY/i);
  assert.match(instructions, /LITERAL RESPONSE CONTRACT/i);
  assert.match(instructions, /The top-level key is trace, an array; never return traces/i);
  assert.match(instructions, /Use the exact scout labels closest contradictory result/i);
  assert.match(instructions, /FINAL SERIALIZATION GATE/i);
  assert.doesNotMatch(pipelineText, /sk-[A-Za-z0-9]/);
});

test("the Challenge JSON Schemas fix the three-scout and seven-dimension boundary", async () => {
  const requestSchema = JSON.parse(
    await readFile(new URL("../schemas/challenge-request.schema.json", import.meta.url), "utf8"),
  );
  const responseSchema = JSON.parse(
    await readFile(new URL("../schemas/challenge-response.schema.json", import.meta.url), "utf8"),
  );

  assert.deepEqual(requestSchema.required, ["input"]);
  assert.equal(responseSchema.properties.candidates.minItems, 3);
  assert.equal(responseSchema.properties.candidates.maxItems, 3);
  assert.equal(responseSchema.$defs.candidate.properties.dimensions.minItems, 7);
  assert.equal(responseSchema.$defs.candidate.properties.dimensions.maxItems, 7);
  assert.equal(responseSchema.$defs.dimension.properties.key.enum.length, 7);
  assert.equal(responseSchema.$defs.passage.required.includes("source_url"), true);
});
