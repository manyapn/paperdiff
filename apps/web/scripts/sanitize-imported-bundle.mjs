import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const entryPath = resolve(import.meta.dirname, "../index.html");
let html = readFileSync(entryPath, "utf8");

if (html.includes("data-paperdiff-real-pipeline")) {
  console.log("PaperDiff bundle is already wired for real pipeline data.");
  process.exit(0);
}

const templatePattern = /(<script type="__bundler\/template">\s*)([\s\S]*?)(\s*<\/script>)/;
const match = html.match(templatePattern);
if (!match) throw new Error("Could not find the bundled PaperDiff template.");

let template = JSON.parse(match[2]);

function replaceRequired(pattern, replacement, label) {
  if (!pattern.test(template)) throw new Error(`Could not patch ${label}.`);
  template = template.replace(pattern, replacement);
}

replaceRequired(
  /    steps: \[0,0,0,0,0\], \/\/ 0 pending, 1 active, 2 done\n/,
  "    steps: [0,0,0,0,0], // 0 pending, 1 active, 2 done\n" +
    "    result: null, error: null,\n",
  "component state",
);

replaceRequired(
  /\n  demoA = [\s\S]*?\n\n  stepLabels =/,
  "\n\n  stepLabels =",
  "mock paper records",
);

const realMethods = `
  rows = [];
  eqRows = [];
  candidatesData = [];

  config() {
    return window.PAPERDIFF_CONFIG || {};
  }

  async post(endpointName, payload) {
    const endpoint = this.config()[endpointName];
    if (!endpoint) {
      throw new Error('The PaperDiff pipeline is not connected yet. Configure ' + endpointName + ' in /config.js.');
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await response.json(); } catch (error) { /* handled below */ }
    if (!response.ok) {
      throw new Error((data && (data.message || data.error)) || 'The PaperDiff pipeline request failed.');
    }
    return data;
  }

  normalizePaper(paper, fallback) {
    if (!paper || typeof paper !== 'object') throw new Error('Pipeline response is missing a paper record.');
    return {
      title: paper.title || fallback,
      venue: paper.venue || paper.journal || '',
      year: paper.year || '',
      authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : (paper.authors || ''),
      passages: paper.passages ?? (Array.isArray(paper.evidence) ? paper.evidence.length : 0),
      short: paper.short || paper.title || fallback,
      metaLine: paper.meta_line || paper.metaLine || '',
      domain: paper.domain || '',
      sourceUrl: paper.source_url || paper.url || '',
    };
  }

  normalizeDimension(dimension, index) {
    const classification = dimension.classification || dimension.state || 'review';
    const state = classification === 'incompatible' ? 'x' :
      (classification === 'different' ? 'diff' :
        (classification === 'equivalent' ? 'eq' : 'review'));
    const status = dimension.evidence_status || dimension.ground || 'Needs review';
    const ground = status === 'grounded' ? 'Grounded' :
      (status === 'qualified' ? 'Qualified' :
        (status === 'Grounded' || status === 'Qualified' ? status : 'Needs review'));
    const left = dimension.left_value ?? dimension.a ?? '';
    const right = dimension.right_value ?? dimension.b ?? '';
    return {
      key: dimension.key || 'dimension-' + index,
      dim: dimension.label || dimension.dim || dimension.key || 'Dimension',
      state,
      expanded: Boolean(dimension.drives_verdict),
      ground,
      a: left,
      b: right,
      interp: dimension.rationale || dimension.interpretation || '',
      teaser: dimension.teaser || (String(left) + ' ↔ ' + String(right)),
      chain: dimension.evidence_chain || [],
      passA: dimension.left_passage || { pre: '', span: '', post: '' },
      passB: dimension.right_passage || { pre: '', span: '', post: '' },
      verifier: dimension.verifier_rationale || '',
      whyVerdict: dimension.verdict_impact || dimension.rationale || '',
    };
  }

  normalizeCandidate(candidate, index) {
    const relation = candidate.relationship_type || candidate.rel || 'Comparable evidence';
    const fit = String(candidate.fit || candidate.comparison_fit || 'REVIEW').toUpperCase();
    return {
      ...candidate,
      rel: relation,
      relColor: relation.toLowerCase().includes('contradict') ? '#A93F35' : '#1746B7',
      relBg: relation.toLowerCase().includes('contradict') ? '#FDE7E4' : '#E9F0FF',
      fit,
      fitColor: fit === 'HIGH' ? '#1746B7' : '#A65F00',
      title: candidate.title || 'Candidate ' + (index + 1),
      venue: candidate.venue || candidate.journal || '',
      year: candidate.year || '',
      why: candidate.why || candidate.explanation || '',
      dims: candidate.dimensions || [],
      url: candidate.url || candidate.source_url || '',
    };
  }

  scheduleProgress() {
    const timers = [
      setTimeout(() => this.setState({ steps: [2,1,0,0,0] }), 600),
      setTimeout(() => this.setState({ steps: [2,2,1,0,0] }), 1400),
      setTimeout(() => this.setState({ steps: [2,2,2,1,0] }), 2200),
      setTimeout(() => this.setState({ steps: [2,2,2,2,1] }), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }

  async runAnalysis() {
    this.setState({ mode: 'compare', stage: 'analysis', steps: [1,0,0,0,0], traceOpen: false, error: null });
    const stopProgress = this.scheduleProgress();
    try {
      const data = await this.post('compareEndpoint', {
        left: { url: this.state.aUrl || null, claim: this.state.aClaim || null, use_detected_conclusion: this.state.aUse },
        right: { url: this.state.bUrl || null, claim: this.state.bClaim || null, use_detected_conclusion: this.state.bUse },
      });
      if (!data || !data.left || !data.right || !Array.isArray(data.dimensions) || !data.verdict) {
        throw new Error('The Compare response does not match the PaperDiff contract.');
      }
      const normalized = data.dimensions.map((item, index) => this.normalizeDimension(item, index));
      this.rows = normalized.filter(row => row.state !== 'eq');
      this.eqRows = normalized.filter(row => row.state === 'eq');
      this.setState({
        steps: [2,2,2,2,2],
        aSrc: this.normalizePaper(data.left, 'Paper A'),
        bSrc: this.normalizePaper(data.right, 'Paper B'),
        result: data,
      });
      setTimeout(() => this.setState({ stage: 'result', drawerKey: null, eqOpen: false, copied: false }), 250);
    } catch (error) {
      this.setState({ stage: 'input', steps: [0,0,0,0,0], error: error.message || String(error) });
    } finally {
      stopProgress();
    }
  }

  async runChallenge() {
    this.setState({ chStage: 'run', scouts: [1,1,1], candidatesReady: false, error: null });
    try {
      const data = await this.post('challengeEndpoint', { input: this.state.chUrl });
      if (!data || !Array.isArray(data.candidates)) {
        throw new Error('The Challenge response does not match the PaperDiff contract.');
      }
      this.candidatesData = data.candidates.map((item, index) => this.normalizeCandidate(item, index));
      this.setState({
        chSrc: data.source ? this.normalizePaper(data.source, this.state.chUrl) : null,
        scouts: [2,2,2],
        candidatesReady: true,
      });
    } catch (error) {
      this.setState({ chStage: 'input', scouts: [0,0,0], error: error.message || String(error) });
    }
  }
`;

replaceRequired(
  /\n  rows = \[[\s\S]*?\n\n  stateStyle\(st\) \{/,
  `\n${realMethods}\n  stateStyle(st) {`,
  "mock comparison and challenge data",
);

replaceRequired(
  /    const mode = s\.mode, stage = s\.stage;\n/,
  "    const mode = s.mode, stage = s.stage;\n    const result = s.result || {};\n",
  "result binding",
);
replaceRequired(
  /    const canCompare = \(s\.aSrc \|\| s\.aClaim\.length > 40\) && \(s\.bSrc \|\| s\.bClaim\.length > 40\);\n    const canChallenge = !!s\.chSrc;\n/,
  "    const canCompare = Boolean((s.aUrl || s.aClaim).trim() && (s.bUrl || s.bClaim).trim());\n" +
    "    const canChallenge = Boolean(s.chUrl.trim());\n",
  "input readiness",
);
replaceRequired(
  /      onAUrl: \(e\) => \{ this\.setState\(\{ aUrl: e\.target\.value, aSrc: null \}\); if \(e\.target\.value\.length > 9\) this\.resolve\('a'\); \},\n      onBUrl: \(e\) => \{ this\.setState\(\{ bUrl: e\.target\.value, bSrc: null \}\); if \(e\.target\.value\.length > 9\) this\.resolve\('b'\); \},/,
  "      onAUrl: (e) => this.setState({ aUrl: e.target.value, aSrc: null, error: null }),\n" +
    "      onBUrl: (e) => this.setState({ bUrl: e.target.value, bSrc: null, error: null }),",
  "input handlers",
);
replaceRequired(
  /      loadDemo: \(\) => \{[\s\S]*?\n      \},\n      srcA: s\.aSrc \|\| this\.demoA, srcB: s\.bSrc \|\| this\.demoB,/,
  "      srcA: s.aSrc || { title: s.aClaim || s.aUrl, short: s.aClaim || s.aUrl, venue: '', year: '' },\n" +
    "      srcB: s.bSrc || { title: s.bClaim || s.bUrl, short: s.bClaim || s.bUrl, venue: '', year: '' },",
  "demo loader and source fallbacks",
);
replaceRequired(
  /      eqLabel: s\.eqOpen \? 'Equivalent dimensions shown above' : '5 dimensions materially equivalent',/,
  "      eqLabel: s.eqOpen ? 'Equivalent dimensions shown above' : (this.eqRows.length + ' dimensions materially equivalent'),",
  "equivalent dimension count",
);
replaceRequired(
  /      copySynthesis: \(\) => \{ this\.setState\(\{ copied: true \}\); setTimeout\(\(\) => this\.setState\(\{ copied: false \}\), 1600\); \},/,
  "      copySynthesis: () => { navigator.clipboard && navigator.clipboard.writeText(result.synthesis || ''); this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1600); },",
  "synthesis copy",
);
replaceRequired(
  /      resetCompare: \(\) => this\.setState\(\{ stage: 'input',[^\n]*\}\),/,
  "      resetCompare: () => { this.rows = []; this.eqRows = []; this.setState({ stage: 'input', aUrl: '', bUrl: '', aClaim: '', bClaim: '', aSrc: null, bSrc: null, result: null, error: null, drawerKey: null, eqOpen: false }); },",
  "comparison reset",
);
replaceRequired(
  /      onChUrl: \(e\) => \{[\s\S]*?\n      \},\n      loadChDemo: \(\) => \{[^\n]*\},/,
  "      onChUrl: (e) => this.setState({ chUrl: e.target.value, chSrc: null, error: null }),",
  "challenge input and demo loader",
);
replaceRequired(
  /      candidates: this\.candidatesData\.map\(c => \(\{ \.\.\.c, onCompare: \(\) => \{ this\.setState\(\{ mode: 'compare' \}\); this\.runAnalysis\(\); \} \}\)\),/,
  "      candidates: this.candidatesData.map(c => ({ ...c, onCompare: () => this.setState({ mode: 'compare', stage: 'input', aUrl: s.chUrl, bUrl: c.url || '', aSrc: s.chSrc, bSrc: null, error: null }) })),",
  "challenge candidate action",
);

replaceRequired(
  /      candidatesReady: s\.candidatesReady,/,
  "      error: s.error,\n" +
    "      verdictHeadline: result.verdict && result.verdict.headline ? result.verdict.headline : 'Comparison complete',\n" +
    "      verdictExplanation: result.verdict && result.verdict.explanation ? result.verdict.explanation : '',\n" +
    "      evidenceSummary: result.evidence_summary || '',\n" +
    "      synthesisText: result.synthesis || '',\n" +
    "      paperAHeading: s.aSrc ? (s.aSrc.short || s.aSrc.title) : 'Paper A',\n" +
    "      paperBHeading: s.bSrc ? (s.bSrc.short || s.bSrc.title) : 'Paper B',\n" +
    "      traceRows: Array.isArray(result.trace) ? result.trace.map(item => ({ text: typeof item === 'string' ? item : ((item.stage || '') + ' · ' + (item.detail || item.status || '')) })) : [],\n" +
    "      candidatesReady: s.candidatesReady,",
  "view-model fields",
);

template = template.replace(
  /\s*<button sc-camel-on-click="\{\{ loadDemo \}\}"[\s\S]*?<\/button>/,
  "",
);
template = template.replace(
  /\s*<button sc-camel-on-click="\{\{ loadChDemo \}\}"[\s\S]*?<\/button>/,
  "",
);

const errorBanner = `
      <sc-if value="{{ error }}" hint-placeholder-val="{{ false }}">
        <div role="alert" style="margin:0 auto 24px;max-width:760px;background:#FDE7E4;border:1px solid #E4A39C;color:#7D2922;border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.5">{{ error }}</div>
      </sc-if>`;
template = template.replace(
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">',
  errorBanner + '\n      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">',
);
template = template.replace(
  '<div style="background:#FFFFFF;border:1px solid #DCE3EC;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(9,13,20,0.06)">\n        <input value="{{ chUrl }}"',
  errorBanner + '\n      <div style="background:#FFFFFF;border:1px solid #DCE3EC;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(9,13,20,0.06)">\n        <input value="{{ chUrl }}"',
);

template = template.replaceAll('Not a direct contradiction', '{{ verdictHeadline }}');
template = template.replace(
  '3 material scope differences explain the result. No unresolved conflict remains.',
  '{{ verdictExplanation }}',
);
template = template.replace(
  '18/20 displayed claims grounded · 1 qualified · 1 needs review',
  '{{ evidenceSummary }}',
);
template = template.replace(
  '<span style="width:250px">PAPER A · HARTLEY 2023</span><span style="width:250px">PAPER B · MOREAU 2024</span>',
  '<span style="width:250px">{{ paperAHeading }}</span><span style="width:250px">{{ paperBHeading }}</span>',
);
template = template.replace(
  /<p style="margin:0;font-size:17px;line-height:1\.65;color:#202734">In UK adolescents[\s\S]*?<\/p>/,
  '<p style="margin:0;font-size:17px;line-height:1.65;color:#202734">{{ synthesisText }}</p>',
);

replaceRequired(
  /        <sc-if value="\{\{ traceOpen \}\}"[\s\S]*?        <\/sc-if>\n      <\/div>\n    <\/main>\n  <\/sc-if>\n\n  <!-- ============ COMPARE : RESULT/,
  `        <sc-if value="{{ traceOpen }}" hint-placeholder-val="{{ false }}">
          <div style="margin-top:10px;background:#090D14;border-radius:12px;padding:18px 20px;font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:1.8;color:#8A95A6">
            <sc-for list="{{ traceRows }}" as="trace" hint-placeholder-count="3">
              <div>{{ trace.text }}</div>
            </sc-for>
          </div>
        </sc-if>
      </div>
    </main>
  </sc-if>

  <!-- ============ COMPARE : RESULT`,
  "pipeline trace",
);

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
];
for (const value of forbidden) {
  if (template.includes(value)) throw new Error(`Mock data remains in the bundle: ${value}`);
}

html = html.replace(
  "  <noscript>\n    <style>#__bundler_loading { display: none; }</style>",
  '  <script src="./config.js" data-paperdiff-real-pipeline></script>\n' +
    "  <noscript>\n    <style>#__bundler_loading { display: none; }</style>",
);
const browserSafeTemplate = JSON.stringify(template).replaceAll("<", "\\u003c");
html = html.replace(templatePattern, `$1${browserSafeTemplate}$3`);
writeFileSync(entryPath, html);
console.log("Removed embedded mock data and connected the UI to real pipeline endpoints.");
