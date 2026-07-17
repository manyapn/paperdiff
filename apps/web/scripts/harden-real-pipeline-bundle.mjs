import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const entryPath = resolve(import.meta.dirname, "../index.html");
let html = readFileSync(entryPath, "utf8");
const opening = '<script type="__bundler/template">';
const templateStart = html.indexOf(opening);
const templateEnd = html.lastIndexOf("\n  </script>\n</body>");

if (templateStart < 0 || templateEnd < 0) {
  throw new Error("Could not locate the complete bundled PaperDiff template.");
}

const jsonStart = templateStart + opening.length;
let template = JSON.parse(html.slice(jsonStart, templateEnd).trim());

template = template.replace(
  /    const startScreen = this\.props\.startScreen \?\? null;\n    if \(startScreen && !this\.appliedStart\) \{[\s\S]*?    \}\n    const mode =/,
  "    const mode =",
);

template = template.replace(
  "    const g = this.groundStyle(r.ground || 'Grounded');",
  "    const g = this.groundStyle(r.ground || 'Needs review');",
);
template = template.replaceAll(
  "ground: r.ground || 'Grounded'",
  "ground: r.ground || 'Needs review'",
);

template = template.replace(
  /        chain: \(drawerRow\.chain \|\| \[[\s\S]*?          bg: i === 2 \? '#E9F0FF' : '#FFFFFF', color: i === 2 \? '#1746B7' : '#566173', border: i === 2 \? '#2357D9' : '#DCE3EC' \}\)\),/,
  "        chain: (drawerRow.chain || []).map((text, i, arr) => ({\n" +
    "          n: i + 1, label: ['Public claim', 'Paper conclusion', 'Exact passage', 'Definition'][i] || 'Evidence', text, line: i < arr.length - 1,\n" +
    "          bg: i === 2 ? '#E9F0FF' : '#FFFFFF', color: i === 2 ? '#1746B7' : '#566173', border: i === 2 ? '#2357D9' : '#DCE3EC' })),",
);
template = template.replace(
  "        passA: drawerRow.passA || { pre: '…', span: d.a, post: '…' },",
  "        passA: drawerRow.passA || { pre: '', span: '', post: '' },",
);
template = template.replace(
  "        passB: drawerRow.passB || { pre: '…', span: d.b, post: '…' },",
  "        passB: drawerRow.passB || { pre: '', span: '', post: '' },",
);
template = template.replace(
  "      passA: dimension.left_passage || { pre: '', span: left, post: '' },",
  "      passA: dimension.left_passage || { pre: '', span: '', post: '' },",
);
template = template.replace(
  "      passB: dimension.right_passage || { pre: '', span: right, post: '' },",
  "      passB: dimension.right_passage || { pre: '', span: '', post: '' },",
);
template = template.replace(
  "        verifier: drawerRow.verifier || 'High confidence: both passages state this dimension explicitly.',",
  "        verifier: drawerRow.verifier || '',",
);
template = template.replace(
  "        whyVerdict: drawerRow.whyVerdict || 'This dimension is materially equivalent and did not affect the verdict.' };",
  "        whyVerdict: drawerRow.whyVerdict || '' };",
);

template = template.replace(
  /\n\s*<details style="border-top:1px solid #DCE3EC;padding-top:14px">[\s\S]*?entailment: pass[\s\S]*?<\/details>/,
  "",
);

template = template.replace(
  / data-props="\{&quot;startScreen&quot;:[^"]*"/,
  ' data-props="{}"',
);

const forbidden = [
  "Public claim as circulated.",
  "entailment: pass",
  "claim-evidence v2",
  "this.demoA",
  "this.demoB",
  "startScreen === 'result'",
];
for (const value of forbidden) {
  if (template.includes(value)) {
    throw new Error(`Unverified fallback remains in the bundle: ${value}`);
  }
}

const encoded = JSON.stringify(template).replaceAll("<", "\\u003c");
html = `${html.slice(0, jsonStart)}\n${encoded}${html.slice(templateEnd)}`;
writeFileSync(entryPath, html);
console.log("Hardened the real-pipeline bundle and removed unverified fallbacks.");
