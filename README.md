# PaperDiff

### The verification layer that starts *after* the citation.

Two papers, two headlines, one apparent contradiction. Does the research actually
conflict — or did the studies just look at different people, doses, outcomes, or time
horizons? PaperDiff reads both primary sources, lines them up dimension by dimension,
and shows you exactly where the disagreement is real and where it's just scope.

> **"They found the opposite!"** is usually wrong. PaperDiff shows you why.

---

## What it does

**🔍 Compare** — Paste two claims or paper links. PaperDiff fetches both primary
sources, extracts comparable fields (population, exposure, outcome, design…), and
returns a verdict that's honest about what's *grounded*, what's *qualified*, and what
still *needs review* — every call backed by an exact source passage.

**⚡ Challenge** — Give it one claim. Three live scouts go find the closest
**contradictory result**, the best **direct replication**, and the most useful **later
reassessment**, then rank all three by methodological fit — not text similarity.

Every verdict is traceable back to a highlighted span in the original paper. No vibes,
no hallucinated citations — if provenance fails, the dimension is **Blocked**, not
guessed.

---

## Run locally

```bash
npm install
npm run dev        # → http://localhost:5173
```

Enter two claims or paper links to Compare, or one claim to Challenge. Configure the
RocketRide endpoints in `apps/web/public/config.json` to point the frontend at the
hosted pipeline.

---

## How it's built

| Layer | What's there |
| --- | --- |
| **`apps/web`** | Static Vite frontend — separated template, styles, behavior, and a generated animation runtime |
| **`pipelines/compare.pipe`** | RocketRide Compare workflow with live Linkup retrieval and observable parallel fetch |
| **`pipelines/challenge.pipe`** | Three live Linkup discovery scouts + cited seven-dimension fit ranking |
| **`packages/core`** | Deterministic provenance gate and classifier→product-state policy |
| **`notebooks` + `ml`** | Google Colab claim–evidence classifier |

**Stack:** RocketRide (pipeline orchestration) · Linkup (live retrieval) · Gemini
(field extraction) · TypeScript + Vite frontend. No API server, no Docker — the
frontend is fully static and every service secret stays server-side.

---

## The model contract

Given `(claim, evidence passage)`, the lightweight classifier returns:

- `supports` → **Grounded** (high confidence) or **Qualified** (lower confidence)
- `contradicts` → flag the extracted field for correction
- `insufficient` → **Needs review**

The deterministic provenance gate always runs **first**. Failed provenance is
**Blocked** regardless of classifier confidence — a claim we can't trace to the source
never gets a verdict.

---

## Validate everything

```bash
npm run check      # lint + contract tests + build
```

The frontend ships with **zero** paper, evidence, verdict, or candidate fixtures in the
production bundle — its animations only ever reflect a request in progress, and real
results render solely from live pipeline responses.

---

## Docs

- [Architecture](docs/architecture.md) — data flow, trust boundary, and repository layout
- [Product requirements](docs/PRD.md) — the problem, the users, and what's out of scope
- [Integrations](docs/integrations.md) — Linkup, classifier hosting, and RocketRide deployment notes
- [Demo script](docs/demo-script.md)
