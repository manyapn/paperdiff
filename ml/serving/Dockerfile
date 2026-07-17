FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
# Upload the exported paperdiff-verifier-v1/ directory alongside app.py
# (via the HF Space's file browser, git, or the hf CLI) before the first
# request -- it is not committed to this repo since it's a binary model
# artifact; see ml/export-contract.md.
COPY paperdiff-verifier-v1/ paperdiff-verifier-v1/

ENV MODEL_DIR=/app/paperdiff-verifier-v1
# HF Spaces expects the container to listen on 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
