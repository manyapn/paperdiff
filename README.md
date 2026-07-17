# PaperDiff

**The verification layer after citations.** PaperDiff determines whether two well-sourced research claims truly conflict or simply studied different populations, interventions, outcomes, definitions, or time horizons.

This repository starts with **Compare mode**, the hackathon MVP. It includes a working demo path, a typed comparison contract, a deterministic provenance gate, a git-diff-style interface, test seams for Linkup and RocketRide, and a clean three-person ownership split.

## Quick start

Requirements: Node 22+, npm 10+, and Python 3.11+.

```bash
cp .env.example .env
make setup
```

In two terminals:

```bash
make dev-api
make dev-web
```

Open <http://localhost:5173>. Click **Load demo pair**, then **Debug disagreement**. The checked-in fixture is deliberately marked as synthetic; swap in a prevalidated real paper pair before presenting it as peer-reviewed evidence.

Run the full local quality gate with:

```bash
make check
```

## Repository map

| Area | Owner | Purpose |
| --- | --- | --- |
| `apps/web/` | Frontend | Claim cards, diff view, verdict, provenance expansion |
| `services/api/paperdiff_api/pipeline/` | Pipeline | Symmetric extraction, dimension alignment, orchestration |
| `services/api/paperdiff_api/integrations/` | Pipeline | Linkup and RocketRide boundaries |
| `services/api/paperdiff_api/verification/` | Verification | Deterministic provenance and semantic relationship checks |
| `contracts/` | Shared; review required | Stable JSON examples and API contract notes |
| `evaluation/` and `data/` | Verification/eval | Curated pairs, annotation schema, metrics, model artifacts |
| `docs/` | Shared | Architecture, demo, integrations, and team workflow |

Read [docs/team-playbook.md](docs/team-playbook.md) and the [hackathon backlog](docs/hackathon-backlog.md) before taking a component. Agent-specific instructions live in `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`, and `.codex/agents/`.

## Current capabilities

- `POST /api/v1/compare` accepts two paper/claim inputs.
- `GET /api/v1/demo` returns a validated synthetic comparison for offline UI work.
- Both extraction branches use the same schema and extractor interface.
- Every displayed evidence span passes deterministic source, identity, fetch, and passage checks.
- Each comparison row has a backend-generated `equivalent`, `different`, or `incompatible` classification.
- The verdict and careful synthesis are returned by the backend, not invented by the UI.
- Live Linkup and RocketRide implementations fail closed until configured.

## Hackathon order of operations

1. Stabilize Compare end to end on one real, open-access pair.
2. Add two fallback pairs and preserve their source text for deterministic validation.
3. Confirm the installed RocketRide extension's current node/config names, then implement its adapter.
4. Connect Linkup live fetch while preserving raw responses and source origin.
5. Add Challenge discovery/ranking only after Compare is reliable.

Do not build paywall bypasses, a general paper library, citation-network views, or a universal truth score during the hackathon.

## API examples

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/demo
curl -X POST http://localhost:8000/api/v1/compare \
  -H 'content-type: application/json' \
  -d '{"left":{"kind":"demo","value":"paper-a"},"right":{"kind":"demo","value":"paper-b"}}'
```

Live URLs intentionally return an actionable `503` until the Linkup adapter is configured. This prevents unverified material from being labeled grounded.
