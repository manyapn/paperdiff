"""
For whoever builds the RocketRide inference adapter (pipeline lane) --
retrieval half of 6_upload_weights_hf.py.

Loading from a private HF Hub repo needs a token with READ access
(create a separate read-only token for this -- don't reuse the write
token from the upload step in a deployed service).
"""

import json
import os

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HF_REPO_ID = "o0meerkat0o/paperdiff-verifier-v1"

_device = "cuda" if torch.cuda.is_available() else "cpu"
_tokenizer = None
_model = None
_id2label = None


def _load():
    global _tokenizer, _model, _id2label
    if _model is not None:
        return

    token = os.environ.get("HF_TOKEN")  # read-scoped token in the deployed service
    _tokenizer = AutoTokenizer.from_pretrained(HF_REPO_ID, token=token)
    _model = AutoModelForSequenceClassification.from_pretrained(HF_REPO_ID, token=token).to(_device)
    _model.eval()

    # label_mapping.json isn't a standard HF file, so pull it separately
    # via hf_hub_download rather than expecting from_pretrained to know
    # about it.
    from huggingface_hub import hf_hub_download
    mapping_path = hf_hub_download(HF_REPO_ID, "label_mapping.json", token=token)
    with open(mapping_path) as f:
        raw_mapping = json.load(f)
    _id2label = {int(k): v for k, v in raw_mapping.items()}


def score_batch(pairs: list[tuple[str, str]]) -> list[dict]:
    """Same contract as 4_inference.py's score_batch -- this replaces
    that function's local-checkpoint version once the model lives on HF."""
    _load()
    claims = [p[0] for p in pairs]
    evidence = [p[1] for p in pairs]

    inputs = _tokenizer(
        claims, evidence, truncation=True, max_length=256, padding=True, return_tensors="pt",
    ).to(_device)

    with torch.no_grad():
        logits = _model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)

    results = []
    for row in probs.cpu().numpy():
        pred_id = int(row.argmax())
        results.append({
            "label": _id2label[pred_id],
            "confidence": float(row[pred_id]),
            "probs": {_id2label[i]: float(row[i]) for i in range(len(_id2label))},
        })
    return results


if __name__ == "__main__":
    example_pairs = [
        ("Paper B studies diagnosed depression over two years.",
         "Participants were followed for 24 months, and depression diagnoses "
         "were obtained from linked clinical records."),
    ]
    for pair, result in zip(example_pairs, score_batch(example_pairs)):
        print(pair[0])
        print(" ->", result)
