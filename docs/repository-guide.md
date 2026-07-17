# PaperDiff repository guide

This is the teammate-facing map of the repository: what exists, what each component owns, and where to start.

## The intentionally simple architecture

PaperDiff has three moving parts:

```text
React frontend
    ↓ calls one deployed workflow
RocketRide pipeline + Linkup retrieval
    ↓ sends (claim, exact evidence passage)
Lightweight classifier trained in Google Colab
    ↓ supports / contradicts / insufficient + confidence
RocketRide returns diff + verdict + evidence states
    ↓
React frontend renders the result
```

There is no FastAPI service, separate Node server, database, or Docker setup. RocketRide is the hosted backend/orchestrator. The frontend is a static Vite app deployed through GitHub Pages. The model is trained separately in Colab and exposed to the pipeline through the small contract in `ml/export-contract.md`.

## File structure

```text
paperdiff/
├── apps/
│   └── web/                              # Static React/Vite product UI
│       ├── src/
│       │   ├── App.tsx                   # Compare screen and interactions
│       │   ├── styles.css                # Responsive visual system
│       │   ├── types.ts                  # Compare response types
│       │   └── lib/
│       │       ├── demoComparison.ts     # Synthetic end-to-end demo fixture
│       │       ├── pipelineClient.ts      # Calls deployed RocketRide workflow
│       │       ├── pipelineClient.test.ts
│       │       ├── presentation.ts       # UI-only formatting helpers
│       │       └── presentation.test.ts
│       ├── package.json
│       ├── vite.config.ts
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
│   └── annotations/example-pair.jsonl    # Synthetic pair annotation example
│
├── evaluation/
│   └── README.md                         # Required baselines and metrics
│
├── contracts/
│   ├── README.md                         # Cross-team schema rules
│   └── examples/compare-request.json
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
├── .env.example                          # Public pipeline URL only; no secrets
├── Makefile                               # Thin aliases for npm commands
├── package.json                           # npm workspace root
└── README.md                              # Quick start
```

## What works now

- The Compare UI runs locally and builds as a static site.
- The checked-in synthetic pair exercises the complete UI without any service keys.
- The UI displays eight comparison dimensions, gray/yellow/red backend classifications, provenance chains, a verdict, synthesis, and pipeline trace.
- `pipelineClient.ts` sends the stable request shape to a RocketRide URL once configured.
- Deterministic provenance code validates source origin, fetch success, paper identity, exact normalized passage existence, and span specificity.
- Classifier policy maps every model result to a user-facing state and blocks model confidence from overriding failed provenance.
- Tests cover the provenance gate, all classifier mappings, fixture presentation, and RocketRide client behavior.
- GitHub Actions type-checks, tests, builds, and deploys the static site from `main`.

## What remains to build

- The actual RocketRide workflow and deployed Compare endpoint
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

The static demo deploys from `main` through `.github/workflows/ci.yml`. It does not need Docker.

For the live pipeline:

1. Deploy Compare through RocketRide.
2. Add the public Compare endpoint as the GitHub Actions/environment value `VITE_ROCKETRIDE_PIPELINE_URL`.
3. Keep `LINKUP_API_KEY`, `ROCKETRIDE_APIKEY`, model-hosting credentials, and LLM fallback keys server-side—never in `VITE_*` variables.
4. Rebuild the frontend; `pipelineClient.ts` will call the configured workflow.

## Contract boundaries

- `contracts/examples/compare-request.json` is the workflow request.
- `apps/web/src/types.ts` is the current response shape consumed by the UI.
- `apps/web/src/lib/demoComparison.ts` is the response fixture used for parallel frontend work.
- `packages/core/src/types.ts` is the narrow claim-evidence classifier/provenance contract.
- `ml/export-contract.md` is the handoff from Colab training to pipeline inference.

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
