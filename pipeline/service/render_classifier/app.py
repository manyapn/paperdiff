"""
Render free-tier classifier service. Loads the quantized ONNX export
(ml/9_export_onnx_quantized.py) via onnxruntime -- deliberately no torch
dependency, to fit Render's 512MB free-tier RAM limit as closely as
possible. transformers is used ONLY for its tokenizer, which doesn't
require torch to be installed for tokenization alone.

Deploy: Render dashboard -> New Web Service -> connect the paperdiff
GitHub repo -> Root Directory: pipeline/service/render_classifier ->
Build Command: cd ../../../apps/web && npm install && npm run build && cd ../../../pipeline/service/render_classifier && pip install -r requirements.txt
Start Command: python app.py. No credit card required for Render's free tier.

Free-tier behavior: sleeps after ~15 min idle, auto-wakes on the next
request (unlike the earlier Colab approach, this needs no laptop or
tab open -- it wakes itself). First request after sleep will be slow
(cold start + model load); subsequent requests are fast. Same
"ping /health before a demo" advice as before still applies for the
best experience, just isn't strictly required for correctness anymore.
"""

import json
import os

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify, send_from_directory

HF_REPO_ID = "o0meerkat0o/paperdiff-verifier-v1"
ONNX_SUBFOLDER = "onnx"
GROUNDED_THRESHOLD = 0.85  # must match packages/core/src/classifier-policy.ts
QUALIFIED_THRESHOLD = 0.6

# Rerouted to map directly to the apps/web/dist folder inside the monorepo structure
app = Flask(__name__, static_folder='../../apps/web/dist', static_url_path='/')
_session = None
_tokenizer = None
_id2label = None


def _load():
    global _session, _tokenizer, _id2label
    if _session is not None:
        return
    token = os.environ.get("HF_TOKEN")
    model_path = hf_hub_download(HF_REPO_ID, f"{ONNX_SUBFOLDER}/model_quantized.onnx", token=token)
    _session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    _tokenizer = AutoTokenizer.from_pretrained(HF_REPO_ID, subfolder=ONNX_SUBFOLDER, token=token)
    mapping_path = hf_hub_download(HF_REPO_ID, f"{ONNX_SUBFOLDER}/label_mapping.json", token=token)
    with open(mapping_path) as f:
        _id2label = {int(k): v for k, v in json.load(f).items()}
    print("ONNX model loaded.")


def _softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def _classify_pair(claim: str, evidence: str) -> dict:
    _load()
    inputs = _tokenizer(claim, evidence, truncation=True, max_length=256, return_tensors="np")
    onnx_inputs = {k: v for k, v in inputs.items() if k in [i.name for i in _session.get_inputs()]}
    logits = _session.run(None, onnx_inputs)[0][0]
    probs = _softmax(logits)
    pred_id = int(np.argmax(probs))
    return {"label": _id2label[pred_id], "confidence": float(probs[pred_id]),
            "abstained": False, "model_version": "paperdiff-verifier-v1-onnx-quantized"}


def _apply_policy(classification: dict, provenance_passed: bool, rationale: str) -> dict:
    label, confidence, abstained = classification["label"], classification["confidence"], classification["abstained"]
    if not provenance_passed:
        status = "blocked"
    elif label == "contradicts":
        status = "flagged_for_correction"
    elif label == "insufficient" or abstained:
        status = "needs_review"
    elif confidence >= GROUNDED_THRESHOLD:
        status = "grounded"
    elif confidence >= QUALIFIED_THRESHOLD:
        status = "qualified"
    else:
        status = "needs_review"
    return {**classification, "status": status, "rationale": rationale}


def _classify_side(dim: dict, side: str) -> tuple[dict | None, dict]:
    provenance = dim.get(f"{side}_provenance", {"passed": False, "failure_reasons": ["No provenance result."]})
    evidence = dim.get(f"{side}_evidence")
    if not provenance["passed"]:
        stub = {"label": None, "confidence": 0.0, "abstained": False, "model_version": "paperdiff-verifier-v1-onnx-quantized"}
        return None, _apply_policy(stub, False, "; ".join(provenance["failure_reasons"]))
    claim = dim.get(f"{side}_value", "")
    quote = evidence.get("quote", "") if evidence else ""
    classification = _classify_pair(claim, quote)
    rationale = f"Model classified evidence as {classification['label']} (confidence {classification['confidence']:.2f})."
    return classification, _apply_policy(classification, True, rationale)


@app.post("/classify")
def classify():
    data = request.get_json(force=True)
    dimensions = []
    for dim in data.get("dimensions", []):
        dim = dict(dim)
        left_classification, left_decision = _classify_side(dim, "left")
        right_classification, right_decision = _classify_side(dim, "right")
        dim["left_classifier"] = left_classification
        dim["left_status"] = left_decision["status"]
        dim["left_rationale"] = left_decision["rationale"]
        dim["right_classifier"] = right_classification
        dim["right_status"] = right_decision["status"]
        dim["right_rationale"] = right_decision["rationale"]
        severity = {"blocked": 0, "needs_review": 1, "flagged_for_correction": 1, "qualified": 2, "grounded": 3}
        worse = min([left_decision["status"], right_decision["status"]], key=lambda s: severity[s])
        status_display = {"grounded": "Grounded", "qualified": "Qualified", "needs_review": "Needs review",
                           "flagged_for_correction": "Needs review", "blocked": "Needs review"}
        dim["evidence_status"] = status_display[worse]
        dimensions.append(dim)
    return jsonify({**data, "dimensions": dimensions})


@app.get("/health")
def health():
    _load()
    return jsonify({"status": "ok"})


# --- SERVE FRONTEND (Registered before the app execution loops) ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


# --- SERVER RUN TIME EXECUTION (Placed at absolute bottom) ---

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render sets $PORT
    app.run(host="0.0.0.0", port=port)