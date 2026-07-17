# PaperDiff

**The verification layer after citations.** PaperDiff determines whether two well-sourced research claims truly conflict or simply studied different populations, interventions, outcomes, definitions, or time horizons.

Start with the [repository guide](docs/repository-guide.md). It explains the complete file structure, three-person ownership split, classifier contract, testing strategy, and deployment path.

## Simple architecture

- `apps/web`: static Vite frontend with separated template, styles, behavior, and generated animation runtime
- `pipelines/compare.pipe`: RocketRide Compare workflow with live Linkup tools and observable parallel retrieval
- `pipelines/challenge.pipe`: three live Linkup discovery scouts with cited seven-dimension fit ranking
- RocketRide + Linkup: hosted retrieval and comparison pipeline
- `packages/core`: deterministic provenance and classifier-to-product-state policy
- `notebooks` + `ml`: Google Colab claim-evidence classifier

There is no separate API server or Docker setup.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The UI stays empty until you enter two inputs and configure the real RocketRide endpoint in `apps/web/public/config.json`.

## Validate everything

```bash
npm run check
```

## Model contract

Given `(claim, evidence passage)`, the lightweight classifier returns:

- `supports` → high-confidence Grounded or lower-confidence Qualified
- `contradicts` → flag the extracted field for correction
- `insufficient` → Needs review

The deterministic provenance gate always runs first. Failed provenance is Blocked regardless of classifier confidence.

## Deployment

The static frontend deploys from `main` through GitHub Pages. It contains no paper, evidence, verdict, or candidate fixtures. Its animations reflect a request in progress, and results render only from RocketRide responses. All service and model-hosting secrets stay server-side.

## Team docs

- [Repository guide](docs/repository-guide.md)
- [Team playbook](docs/team-playbook.md)
- [Hackathon backlog](docs/hackathon-backlog.md)
- [Architecture](docs/architecture.md)
- [Integration checklist](docs/integrations.md)
- [Demo script](docs/demo-script.md)
