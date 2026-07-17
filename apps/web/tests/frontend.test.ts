import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(webRoot, path), "utf8");
const index = read("index.html");
const main = read("src/main.ts");
const api = read("src/api.ts");
const component = read("src/component.js");
const template = read("src/paperdiff.template.html");
const config = JSON.parse(read("public/config.json")) as Record<string, string>;
const productSource = [main, api, component, template, read("src/styles.css")].join("\n");

describe("PaperDiff frontend", () => {
  it("uses a small Vite entry point instead of a monolithic HTML export", () => {
    expect(index).toContain("<title>PaperDiff</title>");
    expect(index).toContain('src="/src/main.ts"');
    expect(index).not.toContain("__bundler/manifest");
    expect(index.length).toBeLessThan(5_000);
  });

  it("keeps editable UI, styles, and behavior in separate source files", () => {
    expect(template).toContain("PAPERDIFF_COMPONENT");
    expect(template).toContain("PAPERDIFF_STYLES");
    expect(component).toContain("class Component extends DCLogic");
    expect(main).toContain('import componentSource from "./component.js?raw"');
  });

  it("submits Compare and Challenge inputs to configured real endpoints", () => {
    expect(component).toContain("this.post('compareEndpoint'");
    expect(component).toContain("this.post('challengeEndpoint'");
    expect(component).toContain("window.PaperDiffAPI.post");
    expect(api).toContain("request(endpoint");
    expect(api).toContain('method: "POST"');
    expect(api).toContain('"content-type": "text/plain"');
    expect(api).toContain("unwrapRocketRideResponse");
    expect(main).toContain('fetchJson<PaperDiffConfig>("./config.json")');
  });

  it("ships with no endpoint pretending to be a working backend", () => {
    expect(config.compareEndpoint).toBe("/api/compare");
    expect(config.challengeEndpoint).toBe("");
    expect(api).toContain("The PaperDiff pipeline is not connected yet.");
  });

  it("renders scientific output only from pipeline response values", () => {
    expect(component).toContain("data.dimensions.map");
    expect(template).toContain("{{ verdictHeadline }}");
    expect(template).toContain("{{ synthesisText }}");
    expect(template).toContain("{{ traceRows }}");
  });

  it("contains no embedded study, result, candidate, or verification fixtures", () => {
    const forbidden = [
      "Load demo pair",
      "Use demo paper",
      "Hartley",
      "Moreau",
      "Sato, Berglund",
      "10.1016/j.lanchi",
      "10.1017/S003329",
      "passive Instagram browsing",
      "RADAR panel",
      "Public claim as circulated.",
      "entailment: pass",
      "claim-evidence v2",
      "startScreen === 'result'",
    ];

    for (const value of forbidden) expect(productSource).not.toContain(value);
    expect(component).toContain("r.ground || 'Needs review'");
    expect(component).not.toContain("r.ground || 'Grounded'");
    expect(component).not.toContain("span: left");
    expect(component).not.toContain("span: right");
  });

  it("fails visibly when an endpoint or response is missing", () => {
    expect(component).toContain("response does not match the PaperDiff contract");
    expect(template).toContain('role="alert"');
  });

  it("keeps Challenge claims cited and hands the resolved source to Compare", () => {
    expect(template).toContain("Open cited source");
    expect(template).toContain("CITED EVIDENCE");
    expect(template).toContain('rel="noopener noreferrer"');
    expect(component).toContain("citationLinks");
    expect(component).toContain("citations.includes(sourceUrl)");
    expect(component).toContain("const resolvedSourceUrl = this.safeHttpsUrl(s.chSrc && s.chSrc.sourceUrl)");
    expect(component).toContain("aUrl: resolvedSourceUrl || (originalIsSource ? originalInput : '')");
    expect(component).toContain("aClaim: originalIsSource ? '' : originalInput");
  });
});
