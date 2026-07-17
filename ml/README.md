# Claim-evidence verifier

Target task: given a comparison claim and an exact evidence passage, predict `supports`, `contradicts`, or `insufficient`, with calibrated confidence and abstention.

The prompted verifier is the hackathon delivery path. Post-hackathon work should add SciFact training, a frozen-embedding baseline, and a scientific cross-encoder while keeping the curated PaperDiff pairs fully held out.

Files in this scaffold:

- `configs/experiment.example.json`: fixed-seed experiment contract
- `model-card.md`: intended use, limitations, and reporting checklist
- `train.py`: command interface that validates configuration and refuses to imply a training run before data/model dependencies are selected

