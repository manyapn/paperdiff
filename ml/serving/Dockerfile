FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py boundary.py ./

# HF_REPO_ID defaults to o0meerkat0o/paperdiff-verifier-v1 (see app.py).
# The default repo is public and ungated. HF_TOKEN is optional for authenticated
# Hub rate limits; if set, use a read-scoped token, never the upload token.
# HF Spaces expects the container to listen on 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
