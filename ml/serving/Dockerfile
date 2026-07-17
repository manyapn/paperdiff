FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py boundary.py ./

# HF_REPO_ID defaults to o0meerkat0o/paperdiff-verifier-v1 (see app.py).
# HF_TOKEN must be set as a Space secret (Settings > Repository secrets) --
# use a read-scoped token, never the write token from 6_upload_weights_hf.py.
# HF Spaces expects the container to listen on 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
