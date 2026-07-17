#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { validateCompareResponse } from "../contracts/src/validate-compare.mjs";

const LABELS = new Set(["supports", "contradicts", "insufficient"]);
const RESULT_FIELDS = ["abstained", "confidence", "label", "model_version"];
const DEFAULT_TIMEOUT_MS = 90_000;

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLoopback(hostname) {
  return new Set(["localhost", "127.0.0.1", "[::1]"]).has(hostname.toLowerCase());
}

export function validateEnvironment(env) {
  const errors = [];
  for (const name of [
    "ROCKETRIDE_URI",
    "ROCKETRIDE_LINKUP_KEY",
    "ROCKETRIDE_GEMINI_KEY",
    "ROCKETRIDE_CLASSIFIER_URL",
  ]) {
    if (!nonEmpty(env[name])) errors.push(`${name} is not set.`);
  }
  if (!nonEmpty(env.ROCKETRIDE_APIKEY) && !nonEmpty(env.ROCKETRIDE_AUTH)) {
    errors.push("Set ROCKETRIDE_APIKEY or ROCKETRIDE_AUTH.");
  }

  if (nonEmpty(env.ROCKETRIDE_CLASSIFIER_URL)) {
    try {
      const url = new URL(env.ROCKETRIDE_CLASSIFIER_URL.trim());
      if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) {
        errors.push("ROCKETRIDE_CLASSIFIER_URL must use HTTPS, except for an HTTP loopback service.");
      }
      if (url.pathname !== "/" || url.search || url.hash) {
        errors.push("ROCKETRIDE_CLASSIFIER_URL must be a service origin with no path, query, or fragment.");
      }
      if (url.hostname === "huggingface.co") {
        errors.push("ROCKETRIDE_CLASSIFIER_URL must be a hosted service origin, not a Hugging Face model page.");
      }
    } catch {
      errors.push("ROCKETRIDE_CLASSIFIER_URL must be a valid URL.");
    }
  }
  return errors;
}

function validateHealth(body) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["/health must return a JSON object."];
  }
  if (body.status !== "ok") errors.push('/health status must be "ok".');
  if (typeof body.model_loaded !== "boolean") errors.push("/health model_loaded must be a boolean.");
  if (!nonEmpty(body.device)) errors.push("/health device must be a non-empty string.");
  return errors;
}

export function validateScoreResponse(body) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["/score_batch must return a JSON object."];
  }
  if (!Array.isArray(body.results) || body.results.length !== 1) {
    return ["/score_batch results must contain exactly one result for the one supplied pair."];
  }

  const result = body.results[0];
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return ["/score_batch results[0] must be an object."];
  }
  const fields = Object.keys(result).sort();
  if (fields.length !== RESULT_FIELDS.length || fields.some((field, index) => field !== RESULT_FIELDS[index])) {
    errors.push(`/score_batch results[0] must contain only: ${RESULT_FIELDS.join(", ")}.`);
  }
  if (!LABELS.has(result.label)) errors.push("/score_batch results[0].label is invalid.");
  if (
    typeof result.confidence !== "number" ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    errors.push("/score_batch results[0].confidence must be a finite number from 0 to 1.");
  }
  if (typeof result.abstained !== "boolean") {
    errors.push("/score_batch results[0].abstained must be a boolean.");
  }
  if (!nonEmpty(result.model_version)) {
    errors.push("/score_batch results[0].model_version must be a non-empty string.");
  }
  return errors;
}

async function requestJson(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${new URL(url).pathname} returned non-JSON content (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(`${new URL(url).pathname} returned HTTP ${response.status}.`);
    }
    return body;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${new URL(url).pathname} timed out after ${timeoutMs} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function runPreflight({
  env = process.env,
  claim,
  evidence,
  compareResponsePath,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const checks = [];
  const environmentErrors = validateEnvironment(env);
  if (environmentErrors.length) return { valid: false, checks, errors: environmentErrors };
  checks.push("environment variables are present (values hidden)");

  if (!nonEmpty(claim) || !nonEmpty(evidence)) {
    return {
      valid: false,
      checks,
      errors: ["Supply a non-empty claim and evidence using CLI arguments or preflight environment variables."],
    };
  }

  const origin = env.ROCKETRIDE_CLASSIFIER_URL.trim().replace(/\/$/, "");
  try {
    const health = await requestJson(fetchImpl, `${origin}/health`, { method: "GET" }, timeoutMs);
    const healthErrors = validateHealth(health);
    if (healthErrors.length) return { valid: false, checks, errors: healthErrors };
    checks.push("classifier /health response shape is valid");

    const score = await requestJson(
      fetchImpl,
      `${origin}/score_batch`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pairs: [{ claim: claim.trim(), evidence: evidence.trim() }] }),
      },
      timeoutMs,
    );
    const scoreErrors = validateScoreResponse(score);
    if (scoreErrors.length) return { valid: false, checks, errors: scoreErrors };
    checks.push("classifier /score_batch response shape is valid for one supplied pair");
  } catch (error) {
    return { valid: false, checks, errors: [`Classifier request failed: ${error.message}`] };
  }

  if (compareResponsePath) {
    try {
      const response = JSON.parse(await readFile(compareResponsePath, "utf8"));
      const validation = validateCompareResponse(response);
      if (!validation.valid) {
        return {
          valid: false,
          checks,
          errors: validation.errors.map((error) => `Compare response: ${error}`),
        };
      }
      checks.push("saved Compare response passes validateCompareResponse");
    } catch (error) {
      return { valid: false, checks, errors: [`Could not validate Compare response: ${error.message}`] };
    }
  }

  return { valid: true, checks, errors: [] };
}

function usage() {
  return `Usage:
  node pipelines/preflight.mjs --claim <text> --evidence <exact passage> [--compare-response <file>]

The claim and evidence may instead be set as PAPERDIFF_PREFLIGHT_CLAIM and
PAPERDIFF_PREFLIGHT_EVIDENCE. PAPERDIFF_COMPARE_RESPONSE may provide the
optional saved response path. Environment values and supplied text are never printed.`;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    const [flag, inlineValue] = argument.split(/=(.*)/s, 2);
    if (!new Set(["--claim", "--evidence", "--compare-response", "--timeout-ms"]).has(flag)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = inlineValue ?? argv[++index];
    if (value === undefined) throw new Error(`${flag} requires a value.`);
    values[flag.slice(2)] = value;
  }
  return values;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(usage());
    return;
  }
  const timeoutMs = args["timeout-ms"] === undefined ? DEFAULT_TIMEOUT_MS : Number(args["timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    console.error("--timeout-ms must be a positive integer.");
    process.exitCode = 2;
    return;
  }

  const result = await runPreflight({
    claim: args.claim ?? process.env.PAPERDIFF_PREFLIGHT_CLAIM,
    evidence: args.evidence ?? process.env.PAPERDIFF_PREFLIGHT_EVIDENCE,
    compareResponsePath: args["compare-response"] ?? process.env.PAPERDIFF_COMPARE_RESPONSE,
    timeoutMs,
  });
  for (const check of result.checks) console.log(`PASS: ${check}`);
  if (result.valid) {
    console.log("Preflight passed.");
    return;
  }
  for (const error of result.errors) console.error(`FAIL: ${error}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
