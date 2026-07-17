import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(import.meta.dirname, "../index.html"), "utf8");
const opening = '<script type="__bundler/template">';
const start = html.indexOf(opening) + opening.length;
const end = html.lastIndexOf("\n  </script>\n</body>");
const template = JSON.parse(html.slice(start, end).trim()) as string;

describe("PaperDiff frontend bundle", () => {
  it("is the deployed entry point with the product title", () => {
    expect(html).toContain("<title>PaperDiff</title>");
    expect(html).toContain('<html lang="en">');
  });

  it("keeps the supplied self-contained visual bundle browser-safe", () => {
    expect(html).toContain('type="__bundler/manifest"');
    expect(html).toContain('type="__bundler/template"');
    expect(html.slice(start, end)).not.toContain("</script>");
    expect(template.length).toBeGreaterThan(50_000);
  });

  it("submits Compare and Challenge inputs to configured real endpoints", () => {
    expect(html).toContain('src="./config.js"');
    expect(template).toContain("this.post('compareEndpoint'");
    expect(template).toContain("this.post('challengeEndpoint'");
    expect(template).toContain("fetch(endpoint");
    expect(template).toContain("method: 'POST'");
  });

  it("renders comparison, verdict, synthesis, and trace values from the response", () => {
    expect(template).toContain("data.dimensions.map");
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

    for (const value of forbidden) expect(template).not.toContain(value);
    expect(template).toContain("r.ground || 'Needs review'");
    expect(template).not.toContain("r.ground || 'Grounded'");
    expect(template).not.toContain("span: left");
    expect(template).not.toContain("span: right");
  });

  it("fails visibly when an endpoint or response is missing", () => {
    expect(template).toContain("The PaperDiff pipeline is not connected yet.");
    expect(template).toContain("response does not match the PaperDiff contract");
    expect(template).toContain('role="alert"');
  });
});
