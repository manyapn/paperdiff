# PaperDiff

**The verification layer after citations.** PaperDiff determines whether two well-sourced research claims truly conflict or simply studied different populations, interventions, outcomes, definitions, or time horizons.

Start with the [repository guide](docs/repository-guide.md). It explains the complete file structure, three-person ownership split, classifier contract, testing strategy, and deployment path.

## Simple architecture

- `apps/web`: supplied self-contained interactive HTML interface, built by Vite
- RocketRide + Linkup: hosted retrieval and comparison pipeline
- `packages/core`: deterministic provenance and classifier-to-product-state policy
- `notebooks` + `ml`: Google Colab claim-evidence classifier

There is no separate API server or Docker setup.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and click **Debug disagreement** to run the synthetic interface fixture.

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

The static demo deploys from `main` through GitHub Pages. The supplied HTML currently contains its own demo interactions and data. Connecting its actions to the RocketRide Compare workflow is a separate integration task; all service and model-hosting secrets stay server-side.

## Team docs

- [Repository guide](docs/repository-guide.md)
- [Team playbook](docs/team-playbook.md)
- [Hackathon backlog](docs/hackathon-backlog.md)
- [Architecture](docs/architecture.md)
- [Integration checklist](docs/integrations.md)
- [Demo script](docs/demo-script.md)

The checked-in paper pair is synthetic and must never be presented as peer-reviewed evidence.
