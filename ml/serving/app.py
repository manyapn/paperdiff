# FastAPI wrapper for the paperdiff-verifier-v1 classifier, meant to run
# on a free Hugging Face Space (Docker SDK) so RocketRide's tool_http_request
# node can call it -- RocketRide's own Python tool node cannot load torch/
# transformers (RestrictedPython sandbox, no filesystem/network access), so
# inference has to be hosted as its own HTTP service.
#
# Loads weights from the private HF Hub repo produced by
# ml/6_upload_weights_hf.py (see ml/7_load_model_from_huggingface.py, whose
# loading logic this mirrors) rather than a locally-uploaded checkpoint
# directory -- no manual zip/upload step to this Space needed.

import json
import os

import torch
from fastapi import FastAPI, HTTPException
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HF_REPO_ID = os.environ.get("HF_REPO_ID", "o0meerkat0o/paperdiff-verifier-v1")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.7"))
MAX_LENGTH = 256

app = FastAPI(title="paperdiff-verifier")

_device = "cuda" if torch.cuda.is_available() else "cpu"
_tokenizer = None
_model = None
_id2label = None


def _load():
    global _tokenizer, _model, _id2label
    if _model is not None:
        return

    token = os.environ.get("HF_TOKEN")  # read-scoped token, not the upload token
    _tokenizer = AutoTokenizer.from_pretrained(HF_REPO_ID, token=token)
    _model = AutoModelForSequenceClassification.from_pretrained(HF_REPO_ID, token=token).to(_device)
    _model.eval()

    # label_mapping.json isn't a standard HF file, so pull it separately --
    # this is the REAL trained order (from 1_data_prep.py / 2_train.py),
    # not export-contract.md's example order. Don't assume, read it.
    mapping_path = hf_hub_download(HF_REPO_ID, "label_mapping.json", token=token)
    with open(mapping_path) as f:
        _id2label = {int(k): v for k, v in json.load(f).items()}


class Pair(BaseModel):
    claim: str
    evidence: str


class ScoreRequest(BaseModel):
    pairs: list[Pair]


def to_product_state(label: str, confidence: float) -> str:
    if label == "contradicts":
        return "flag_for_correction"
    if label == "insufficient":
        return "needs_review"
    if label == "supports":
        return "grounded" if confidence >= CONFIDENCE_THRESHOLD else "qualified"
    return "needs_review"


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None, "device": _device}


@app.post("/score_batch")
def score_batch(req: ScoreRequest):
    if not req.pairs:
        raise HTTPException(400, "pairs must be non-empty")
    _load()

    claims = [p.claim for p in req.pairs]
    evidence = [p.evidence for p in req.pairs]
    inputs = _tokenizer(
        claims, evidence, truncation=True, max_length=MAX_LENGTH, padding=True, return_tensors="pt"
    ).to(_device)

    with torch.no_grad():
        logits = _model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)

    results = []
    for row in probs.cpu().numpy():
        pred_id = int(row.argmax())
        label = _id2label[pred_id]
        confidence = float(row[pred_id])
        results.append({
            "label": label,
            "confidence": confidence,
            "abstained": False,
            "model_version": "paperdiff-verifier-v1",
            "product_state": to_product_state(label, confidence),
            "probs": {_id2label[i]: float(row[i]) for i in range(len(_id2label))},
        })
    return {"results": results}
