"""
Colab cell 3 of 5 (baselines). Run 1_data_prep.py and 2_train.py first.

CHANGED from the original version:
  - LogisticRegression max_iter 1000 -> 2000 (was hitting the iteration
    cap and throwing a ConvergenceWarning -- fixed before treating that
    number as final).
  - Added the fine-tuned model into the SAME comparison table instead of
    reporting it separately, so majority / frozen-embedding / fine-tuned
    are directly next to each other for the writeup.
"""

import json
import numpy as np
from collections import Counter
from pathlib import Path
from sklearn.metrics import f1_score, precision_recall_fscore_support, confusion_matrix
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

LABEL2ID = {"insufficient": 0, "supports": 1, "contradicts": 2}
VERIFIER_DIR = "./verifier_final"


def load_triples(path: str) -> list[dict]:
    with open(path) as f:
        return json.load(f)


def report(name: str, y_true, y_pred):
    macro_f1 = f1_score(y_true, y_pred, average="macro")
    precision, recall, f1_per_class, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=[0, 1, 2], zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])
    print(f"\n--- {name} ---")
    print(f"macro-F1: {macro_f1:.3f}")
    print(f"per-class F1 [insufficient, supports, contradicts]: {f1_per_class.round(3)}")
    print("confusion matrix (rows=true, cols=pred):")
    print(cm)
    return macro_f1


def majority_class_baseline(train, val):
    counts = Counter(t["label_id"] for t in train)
    majority = counts.most_common(1)[0][0]
    y_true = [t["label_id"] for t in val]
    y_pred = [majority] * len(val)
    return report("Majority-class baseline", y_true, y_pred)


def frozen_embedding_baseline(train, val):
    encoder = SentenceTransformer("allenai-specter")

    def featurize(triples):
        claims = [t["claim"] for t in triples]
        evidence = [t["evidence"] for t in triples]
        claim_emb = encoder.encode(claims, show_progress_bar=False)
        evidence_emb = encoder.encode(evidence, show_progress_bar=False)
        return np.concatenate(
            [claim_emb, evidence_emb, claim_emb * evidence_emb, np.abs(claim_emb - evidence_emb)],
            axis=1,
        )

    X_train = featurize(train)
    y_train = [t["label_id"] for t in train]
    X_val = featurize(val)
    y_val = [t["label_id"] for t in val]

    # max_iter raised 1000 -> 2000: the original run hit the cap without
    # converging. Gap between this baseline and the fine-tuned model was
    # large enough that it didn't change the conclusion, but a number
    # that didn't converge shouldn't go in a writeup as final.
    clf = LogisticRegression(max_iter=2000, class_weight="balanced")
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_val)

    return report("Frozen embedding + classifier baseline", y_val, y_pred)


def finetuned_model_baseline(val):
    """Run the actual trained model on the same val set, so it's reported
    in the same table as the other baselines instead of separately."""
    if not Path(VERIFIER_DIR).exists():
        print(f"\n--- Fine-tuned model ---\nSkipped: {VERIFIER_DIR} not found. Run 2_train.py first.")
        return None

    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(VERIFIER_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(VERIFIER_DIR).to(device)
    model.eval()

    claims = [t["claim"] for t in val]
    evidence = [t["evidence"] for t in val]
    inputs = tokenizer(claims, evidence, truncation=True, max_length=256, padding=True, return_tensors="pt").to(device)
    with torch.no_grad():
        logits = model(**inputs).logits
    y_pred = torch.argmax(logits, dim=-1).cpu().numpy()
    y_true = [t["label_id"] for t in val]

    return report("Fine-tuned cross-encoder (this project's model)", y_true, y_pred)


def prompted_llm_baseline_stub(val, call_llm_fn):
    y_true, y_pred = [], []
    for t in val:
        label = call_llm_fn(t["claim"], t["evidence"])
        y_true.append(t["label_id"])
        y_pred.append(LABEL2ID[label])
    return report("Prompted LLM baseline", y_true, y_pred)


def main():
    train = load_triples("scifact_train_triples.json")
    val = load_triples("scifact_val_triples.json")

    results = {}
    results["majority_class"] = majority_class_baseline(train, val)
    results["frozen_embedding"] = frozen_embedding_baseline(train, val)
    results["finetuned_model"] = finetuned_model_baseline(val)

    print("\n=== Summary (macro-F1) ===")
    for name, score in results.items():
        print(f"{name}: {score if score is not None else 'skipped'}")

    print(
        "\nPrompted LLM baseline not run here -- call prompted_llm_baseline_stub() "
        "with your pipeline's LLM client once it's wired up, on this same val set. "
        "Add its result to the summary table above before writing up the five-way comparison."
    )


if __name__ == "__main__":
    main()
