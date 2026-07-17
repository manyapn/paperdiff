# Google Colab work

The claim-evidence classifier is already being developed in Google Colab. Do not maintain a second invented training implementation in this repository.

When the current Colab work is ready to share, export only the useful, cleaned artifacts here, for example:

```text
notebooks/
├── 1_data_prep.ipynb          # SciFact → canonical claim/evidence JSONL
├── 2_train_verifier.ipynb     # Lightweight three-class classifier
└── 3_baselines.py             # Majority, embedding, prompted LLM, model, hybrid
```

Before committing an exported notebook:

- clear service keys and tokens;
- clear large cell outputs and downloaded datasets;
- keep the fixed seed and exact dataset version visible;
- preserve real metrics, confusion matrices, and training configuration;
- keep curated PaperDiff product pairs out of training;
- confirm the exported model follows `ml/export-contract.md`.

