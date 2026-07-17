"""
Colab cell 5 (export). Run after 2_train.py has produced ./verifier_final.

Produces the exact artifact directory ml/export-contract.md requires:

  paperdiff-verifier-v1/
  ├── config.json / model.safetensors / tokenizer.* / special_tokens_map.json  (copied from ./verifier_final)
  ├── label_mapping.json        <- YOUR real trained order, not the contract's example order
  ├── paperdiff_metrics.json    <- computed here, not hand-typed
  └── model-card.md             <- auto-filled from the computed metrics

IMPORTANT: the contract doc shows label_mapping.json as
{"0": "supports", "1": "contradicts", "2": "insufficient"} -- that is NOT
the order this project trained with (1_data_prep.py / 2_train.py used
{"insufficient": 0, "supports": 1, "contradicts": 2}). This script writes
YOUR actual order. Tell whoever builds the RocketRide adapter to read
label_mapping.json rather than assuming the contract example's order.
"""

import json
import shutil
import time
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import f1_score, recall_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification

VERIFIER_DIR = Path("./verifier_final")
EXPORT_DIR = Path("./paperdiff-verifier-v1")
VAL_TRIPLES_PATH = "scifact_val_triples.json"

# This project's actual trained order (from 1_data_prep.py / 2_train.py) --
# NOT the export-contract.md example order. Do not change this to match
# the doc; change the doc/adapter to read this file instead.
ID2LABEL = {0: "insufficient", 1: "supports", 2: "contradicts"}
LABEL2ID = {v: k for k, v in ID2LABEL.items()}

CONFIDENCE_THRESHOLD = 0.7  # matches 4_inference.py's Grounded/Qualified split
EXPERIMENT_NAME = "paperdiff-lightweight-verifier-v1"
SEED = 42  # matches TrainingArguments(seed=...) in 2_train.py
BASE_MODEL = "cross-encoder/nli-deberta-v3-base"
SCIFACT_RELEASE_URL = "https://scifact.s3-us-west-2.amazonaws.com/release/latest/data.tar.gz"


def load_val_triples():
    with open(VAL_TRIPLES_PATH) as f:
        return json.load(f)


def run_inference(triples, tokenizer, model, device, batch_size=32):
    all_probs = []
    for i in range(0, len(triples), batch_size):
        batch = triples[i:i + batch_size]
        claims = [t["claim"] for t in batch]
        evidence = [t["evidence"] for t in batch]
        inputs = tokenizer(
            claims, evidence, truncation=True, max_length=256, padding=True, return_tensors="pt",
        ).to(device)
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)
        all_probs.append(probs.cpu().numpy())
    return np.concatenate(all_probs, axis=0)


def brier_score_multiclass(y_true_ids, probs, num_classes=3):
    """Multiclass Brier score: mean squared distance between predicted
    probability vector and one-hot true label, averaged over classes."""
    one_hot = np.eye(num_classes)[y_true_ids]
    return float(np.mean(np.sum((probs - one_hot) ** 2, axis=1)))


def unsupported_pass_through_rate(triples, probs, id2label, threshold):
    """Rate at which a claim that should NOT be shown as Grounded (true
    label is contradicts or insufficient) gets high-confidence 'supports'
    from the model anyway -- i.e. would incorrectly pass through as
    Grounded per the product's classifier policy. This is the safety
    number the model card requires."""
    y_true = [t["label_id"] for t in triples]
    supports_id = LABEL2ID["supports"]
    bad_pass_throughs = 0
    denom = 0
    for true_id, prob_row in zip(y_true, probs):
        if true_id == supports_id:
            continue  # only claims that truly should NOT be marked supported
        denom += 1
        pred_id = int(np.argmax(prob_row))
        pred_conf = float(prob_row[pred_id])
        if pred_id == supports_id and pred_conf >= threshold:
            bad_pass_throughs += 1
    return bad_pass_throughs / denom if denom else 0.0


def measure_latency(triples, tokenizer, model, device, n=50):
    sample = triples[:n]
    claims = [t["claim"] for t in sample]
    evidence = [t["evidence"] for t in sample]
    # warmup
    inputs = tokenizer(claims[:4], evidence[:4], truncation=True, max_length=256,
                        padding=True, return_tensors="pt").to(device)
    with torch.no_grad():
        model(**inputs)

    start = time.perf_counter()
    inputs = tokenizer(claims, evidence, truncation=True, max_length=256,
                        padding=True, return_tensors="pt").to(device)
    with torch.no_grad():
        model(**inputs)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {"batch_size": len(sample), "total_ms": elapsed_ms, "per_item_ms": elapsed_ms / len(sample)}


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(VERIFIER_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(VERIFIER_DIR).to(device)
    model.eval()

    val_triples = load_val_triples()
    probs = run_inference(val_triples, tokenizer, model, device)
    y_true = np.array([t["label_id"] for t in val_triples])
    y_pred = np.argmax(probs, axis=1)

    macro_f1 = float(f1_score(y_true, y_pred, average="macro"))
    per_class_recall = {
        ID2LABEL[i]: float(r)
        for i, r in enumerate(recall_score(y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0))
    }
    brier = brier_score_multiclass(y_true, probs)
    unsupported_rate = unsupported_pass_through_rate(val_triples, probs, ID2LABEL, CONFIDENCE_THRESHOLD)
    latency = measure_latency(val_triples, tokenizer, model, device)

    # Coverage/accuracy at abstention thresholds -- report a small sweep,
    # not just one number, per model-card.md's "calibration ... at
    # coverage/abstention thresholds" requirement.
    abstention_sweep = []
    for thresh in [0.5, 0.6, 0.7, 0.8, 0.9]:
        max_probs = probs.max(axis=1)
        covered = max_probs >= thresh
        coverage = float(covered.mean())
        if covered.sum() > 0:
            acc = float((y_pred[covered] == y_true[covered]).mean())
        else:
            acc = None
        abstention_sweep.append({"threshold": thresh, "coverage": coverage, "accuracy_when_covered": acc})

    metrics = {
        "experiment_name": EXPERIMENT_NAME,
        "seed": SEED,
        "base_model": BASE_MODEL,
        "training_data": {
            "name": "SciFact",
            "version": "AI2 release, downloaded from " + SCIFACT_RELEASE_URL,
            "split_hashes": {
                "note": "run `!sha256sum scifact_data/data.tar.gz` and paste the hash here manually -- "
                        "not computed by this script since the tarball may not be present in this session."
            },
        },
        "macro_f1": round(macro_f1, 4),
        "per_class_recall": {k: round(v, 4) for k, v in per_class_recall.items()},
        "brier_score": round(brier, 4),
        "unsupported_claims_allowed_through_rate": round(unsupported_rate, 4),
        "abstention": abstention_sweep,
        "latency_ms": latency,
    }

    # --- Assemble export directory ---
    if EXPORT_DIR.exists():
        shutil.rmtree(EXPORT_DIR)
    shutil.copytree(VERIFIER_DIR, EXPORT_DIR)

    with open(EXPORT_DIR / "label_mapping.json", "w") as f:
        json.dump({str(k): v for k, v in ID2LABEL.items()}, f, indent=2)

    with open(EXPORT_DIR / "paperdiff_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    model_card = f"""# PaperDiff claim-evidence verifier — model card

## Intended use

Assess whether an exact cited passage supports, contradicts, or is insufficient for a structured comparison claim. The result follows a deterministic provenance gate and supports abstention.

## Out of scope

- Establishing scientific truth or consensus
- Replacing expert review in high-stakes decisions
- Validating paper identity, source origin, or quote existence
- Inferring evidence from inaccessible tables or figures without explicit extraction support

## Training

- Base model: `{BASE_MODEL}`
- Training data: SciFact ({SCIFACT_RELEASE_URL}), (claim, evidence) triples built via 1_data_prep.py
- Seed: {SEED}

## Results (val set, n={len(val_triples)})

- Macro-F1: **{metrics['macro_f1']}**
- Per-class recall: {json.dumps(metrics['per_class_recall'])}
- Brier score (multiclass, lower is better): **{metrics['brier_score']}**
- Unsupported-claims-allowed-through rate (non-supports claims wrongly passed as high-confidence supports): **{metrics['unsupported_claims_allowed_through_rate']}**
- Abstention/coverage sweep: {json.dumps(metrics['abstention'])}
- Latency: {json.dumps(metrics['latency_ms'])}

Compare against baselines (majority-class, frozen-embedding, prompted-LLM) in `3_baselines.py` before treating this model as production-ready.

## Known limitations

- Trained and evaluated only on SciFact; has NOT yet been evaluated on the curated PaperDiff paper-pair set (product-specific transfer performance is not yet measured -- report this once the 8-12 pairs are annotated).
- `insufficient` class is easiest to classify (paired with unrelated full abstracts during data construction); `contradicts` is the weakest class -- see the confusion matrix in the training run for the supports/contradicts confusion pattern.
- Error taxonomy (qualifier loss, causal overstatement, negation/hedging, numeric/CI error, table/figure evidence, identity/version mismatch, retrieval vs. reasoning failure) not yet broken out -- do this once real paper-pair errors are observable.

## Required reporting before release

- [x] Training data version, license — SciFact, CC BY-NC 2.0
- [ ] Download checksum — fill in from `sha256sum scifact_data/data.tar.gz`
- [x] Macro-F1 and per-class recall
- [x] Calibration and accuracy at coverage/abstention thresholds
- [x] Unsupported-claims-allowed-through rate
- [ ] Latency and cost against prompted LLM baseline — latency measured here; cost/LLM comparison needs `3_baselines.py`'s prompted-LLM stub wired up
- [ ] Transfer performance on fully held-out PaperDiff pairs — blocked on annotation
- [ ] Errors by category — blocked on annotation
"""

    with open(EXPORT_DIR / "model-card.md", "w") as f:
        f.write(model_card)

    print(f"Exported to {EXPORT_DIR}/")
    print(json.dumps(metrics, indent=2))
    print(
        "\nStill needed before this is a complete release:\n"
        "  1. Run `!sha256sum scifact_data/data.tar.gz` and paste into paperdiff_metrics.json "
        "and model-card.md where marked.\n"
        "  2. Zip and upload this directory somewhere the RocketRide adapter can pull it from "
        "(this script only produces the artifact locally in Colab)."
    )


if __name__ == "__main__":
    main()
