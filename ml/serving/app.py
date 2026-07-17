# FastAPI wrapper for the paperdiff-verifier-v1 classifier, meant to run
# on a free Hugging Face Space (Docker SDK) so RocketRide's tool_http_request
# node can call it -- RocketRide's own Python tool node cannot load torch/
# transformers (RestrictedPython sandbox, no filesystem/network access), so
# inference has to be hosted as its own HTTP service.
#
# Loads weights from the public, ungated HF Hub repo produced by
# ml/6_upload_weights_hf.py (see ml/7_load_model_from_huggingface.py, whose
# loading logic this mirrors) rather than a locally-uploaded checkpoint
# directory -- no manual zip/upload step to this Space needed. HF_TOKEN is
# optional and only useful for authenticated Hub rate limits.

import json
import os
from typing import Literal

import torch
from fastapi import FastAPI, HTTPException
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from boundary import build_results, validate_label_mapping

HF_REPO_ID = os.environ.get("HF_REPO_ID", "o0meerkat0o/paperdiff-verifier-v1")
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

    # The default repo is public and ungated. An optional read-scoped token can
    # provide authenticated Hub rate limits; never use the upload token here.
    token = os.environ.get("HF_TOKEN")
    tokenizer = AutoTokenizer.from_pretrained(HF_REPO_ID, token=token)
    model = AutoModelForSequenceClassification.from_pretrained(HF_REPO_ID, token=token).to(_device)
    model.eval()

    # label_mapping.json isn't a standard HF file, so pull it separately --
    # this is the REAL trained order (from 1_data_prep.py / 2_train.py),
    # not export-contract.md's example order. Don't assume, read it.
    mapping_path = hf_hub_download(HF_REPO_ID, "label_mapping.json", token=token)
    with open(mapping_path) as f:
        raw_mapping = {int(k): v for k, v in json.load(f).items()}
    id2label = validate_label_mapping(raw_mapping, model.config.num_labels)

    _tokenizer = tokenizer
    _model = model
    _id2label = id2label


class Pair(BaseModel):
    claim: str
    evidence: str


class ScoreRequest(BaseModel):
    pairs: list[Pair]


class ScoreResult(BaseModel):
    label: Literal["supports", "contradicts", "insufficient"]
    confidence: float
    abstained: bool
    model_version: str


class ScoreResponse(BaseModel):
    results: list[ScoreResult]


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None, "device": _device}


@app.post("/score_batch", response_model=ScoreResponse)
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

    return {"results": build_results(probs.cpu().tolist(), _id2label)}
