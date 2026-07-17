import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(import.meta.dirname, "../index.html"), "utf8");

describe("supplied PaperDiff frontend bundle", () => {
  it("is the deployed entry point with the correct product title", () => {
    expect(html).toContain("<title>PaperDiff</title>");
    expect(html).toContain('<html lang="en">');
  });

  it("contains the self-contained asset manifest and template", () => {
    expect(html).toContain('type="__bundler/manifest"');
    expect(html).toContain('type="__bundler/template"');
    expect(html.length).toBeGreaterThan(500_000);
  });

  it("contains both Compare and Challenge interactions", () => {
    expect(html).toContain("runAnalysis()");
    expect(html).toContain("runChallenge()");
    expect(html).toContain("loadDemo:");
    expect(html).toContain("loadChDemo:");
  });

  it("contains provenance and evidence-state copy", () => {
    expect(html).toContain("Grounded");
    expect(html).toContain("Qualified");
    expect(html).toContain("Needs review");
    expect(html).toContain("Exact passage");
  });
});

