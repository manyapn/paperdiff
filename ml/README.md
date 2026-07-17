# Claim-evidence classifier

The model answers one question:

> Given a claim and a candidate evidence passage, does the passage support it, contradict it, or provide insufficient information?

It is currently being trained in Google Colab on roughly 1,700 SciFact claim/evidence examples. The prompted LLM performs the same task as a fallback and evaluation baseline.

This directory contains only the stable handoff material:

- `export-contract.md`: model artifacts and inference input/output expected by RocketRide
- `model-card.md`: intended use, limitations, and required reporting

The live Colab notebook and `3_baselines.py` should be exported into `notebooks/` when cleaned and ready. Do not build a second local training stack.

The classifier is not responsible for retrieval, paper extraction, dimension alignment, diff classification, or the final PaperDiff verdict.

