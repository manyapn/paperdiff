# PaperDiff repository guide

This is the teammate-facing map of the repository: what exists, what each component owns, and where to start.

## The intentionally simple architecture

PaperDiff has three moving parts:

```text
Supplied interactive HTML frontend
    ↓ will call one deployed workflow
RocketRide pipeline + Linkup retrieval
    ↓ sends (claim, exact evidence passage)
Lightweight classifier trained in Google Colab
    ↓ supports / contradicts / insufficient + confidence
RocketRide returns diff + verdict + evidence states
    ↓
Interactive frontend renders the result
```

There is no FastAPI service, separate Node server, database, or Docker setup. RocketRide is the hosted backend/orchestrator. The supplied self-contained HTML bundle is the only frontend; Vite is just its local server/build wrapper. The model is trained separately in Colab and exposed to the pipeline through the small contract in `ml/export-contract.md`.

## File structure

```text
paperdiff/
├── apps/
│   └── web/                              # Supplied self-contained product UI
│       ├── index.html                    # Styles, assets, UI logic, real API wiring
│       ├── public/config.js              # Public RocketRide endpoint URLs
│       ├── scripts/                      # Imported-bundle sanitizing/hardening
│       ├── tests/frontend.test.ts        # Bundle smoke/feature checks
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts                # Thin static build wrapper
│       └── AGENTS.md                     # Frontend-specific agent rules
│
├── packages/
│   └── core/                             # Small, pure trust-policy package
│       ├── src/
│       │   ├── provenance.ts             # Deterministic citation validation
│       │   ├── classifier-policy.ts      # Model label → product state mapping
│       │   ├── types.ts                  # Classifier and provenance contracts
│       │   └── index.ts
│       ├── tests/
│       │   ├── provenance.test.ts
│       │   └── classifier-policy.test.ts
│       ├── package.json
│       └── AGENTS.md
│
├── notebooks/
│   └── README.md                         # Where cleaned Colab exports belong
│
├── ml/
│   ├── export-contract.md                # Model artifact + inference contract
│   ├── model-card.md
│   └── README.md
│
├── data/
│   ├── README.md                         # Sources, licenses, splits, annotations
│   ├── raw/README.md                     # Local source-data policy
│   ├── processed/README.md               # Canonical train JSONL schema
│   └── annotations/                      # Traceable, review-status-labeled pairs
│
├── evaluation/
│   └── README.md                         # Required baselines and metrics
│
├── contracts/
│   ├── README.md                         # Cross-team schema rules
│   ├── compare.md                        # Compare request/response contract
│   ├── challenge.md                      # Challenge request/response contract
│   └── examples/compare-request.json     # Placeholder-only request shape
│
├── artifacts/
│   └── README.md                         # Where reviewed real results belong
│
├── docs/
│   ├── architecture.md                   # Pipeline and trust boundary
│   ├── demo-script.md                    # Ten-second pitch sequence
│   ├── hackathon-backlog.md              # Ordered work by teammate
│   ├── integrations.md                   # Linkup/RocketRide checklist
│   ├── team-playbook.md                  # Ownership and merge rhythm
│   └── repository-guide.md               # This document
│
├── .claude/agents/                       # Claude prompts by component
├── .codex/agents/                        # Codex briefs by component
├── .github/workflows/ci.yml              # Tests, build, GitHub Pages deploy
├── AGENTS.md                              # Repository-wide agent rules
├── CLAUDE.md                              # Repository-wide Claude rules
├── Makefile                               # Thin aliases for npm commands
├── package.json                           # npm workspace root
└── README.md                              # Quick start
```

## What works now

- The supplied Compare and Challenge UI runs locally and builds as a static site.
- The UI sends real POST requests to configured RocketRide endpoints and contains no scientific fallback data.
- The UI includes input resolution, analysis animation, methodological diffs, provenance drawers, verdict, careful synthesis, pipeline trace, and Challenge candidates.
- Deterministic provenance code validates source origin, fetch success, paper identity, exact normalized passage existence, and span specificity.
- Classifier policy maps every model result to a user-facing state and blocks model confidence from overriding failed provenance.
- Tests cover the frontend bundle features, provenance gate, and all classifier mappings.
- GitHub Actions type-checks, tests, builds, and deploys the static site from `main`.

## What remains to build

- The actual RocketRide workflow and deployed Compare endpoint
- Configuring the deployed RocketRide endpoint in `apps/web/public/config.js`
- Linkup fetch/search nodes with raw-response preservation
- Symmetric paper extraction and dimension alignment
- Connection from RocketRide to the trained classifier artifact or endpoint
- Real golden paper pair plus two fallbacks
- Curated held-out product evaluation pairs
- Challenge-mode retrieval/ranking, only after Compare is stable

## The lightweight model's exact job

The model is a **claim-evidence classifier**, not a paper comparator or verdict generator.

Input:

```json
{
  "claim": "Paper B studies diagnosed depression over two years.",
  "evidence": "Participants were followed for 24 months, and depression diagnoses were obtained from linked clinical records."
}
```

Output:

```json
{
  "label": "supports",
  "confidence": 0.93,
  "abstained": false,
  "model_version": "paperdiff-verifier-v1"
}
```

Allowed labels:

| Model label | Meaning | Product behavior |
| --- | --- | --- |
| `supports` | Passage backs the claim | High confidence → Grounded; lower confidence → Qualified |
| `contradicts` | Passage says the opposite | Flag the extracted field for correction |
| `insufficient` | Passage does not address the claim | Needs review; do not force a binary answer |

If deterministic provenance fails, the result is always `Blocked`, regardless of model confidence.

The classifier is currently being trained in Google Colab on roughly 1,700 SciFact `(claim, evidence)` examples. The existing Colab work remains canonical; the repository does not create a duplicate training stack. Keep actual dataset counts, exact version, split hashes, and measured results in exported experiment artifacts rather than hard-coding them into product code.

The prompted-LLM verifier uses the same input/output contract as a fallback and baseline. The trained model is valuable because it should be faster and cheaper and can be evaluated reproducibly against the baselines described in `evaluation/README.md`.

## Three-person ownership

| Teammate | Owns | Immediate goal |
| --- | --- | --- |
| Frontend | `apps/web/**` | Make the ten-second Compare demo polished and resilient. |
| Pipeline | RocketRide workflow, Linkup integration, `contracts/**` | Produce the response contract from one real pair and deploy the workflow. |
| Model/evaluation | `notebooks/**`, `ml/**`, `data/**`, `evaluation/**`, `packages/core/**` | Finish the three-class classifier, export it, and report real safety metrics. |

Shared contract files require review from at least one teammate in another lane.

## Local setup

Requirements: Node 22+ and npm 10+.

```bash
git clone https://github.com/manyapn/paperdiff.git
cd paperdiff
npm install
npm run dev
```

Open <http://localhost:5173>.

Run everything before handing off:

```bash
npm run check
```

This runs workspace type-checks, all unit tests, the core declaration build, and the production frontend build.

## Deployment

The static frontend deploys from `main` through `.github/workflows/ci.yml`. It does not need Docker.

For the live pipeline:

1. Deploy Compare through RocketRide.
2. Set `compareEndpoint` in `apps/web/public/config.js`.
3. Keep `LINKUP_API_KEY`, `ROCKETRIDE_APIKEY`, model-hosting credentials, and LLM fallback keys server-side.
4. Use real, prevalidated inputs as judging fallbacks; never embed their results in the browser.

## Contract boundaries

- `contracts/examples/compare-request.json` is a placeholder-only workflow request shape.
- `contracts/compare.md` and `contracts/challenge.md` define the fields the frontend consumes.
- `packages/core/src/types.ts` is the narrow claim-evidence classifier/provenance contract.
- `ml/export-contract.md` is the handoff from Colab training to pipeline inference.

Validate every RocketRide response against the stable contract before frontend handoff.

The frontend renders classifications returned by the pipeline. It must not re-run scientific comparison logic in the browser.

## Testing expectations

Every product failure mode needs a test, especially:

- source origin, identity, fetch, passage, and span failures;
- high- and low-confidence `supports`;
- `contradicts` versus `insufficient` behavior;
- abstention;
- provenance failure overriding a confident model;
- RocketRide unavailable or malformed responses;
- the golden pair response matching the frontend contract;
- unsupported claims never passing through as Grounded.

Do not publish model numbers until a reproducible Colab run has produced them.
