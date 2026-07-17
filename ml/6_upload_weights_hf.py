"""
Colab cell 6 (upload, Hugging Face version). Run after 5_export_model.py
has produced ./paperdiff-verifier-v1/.

Replaces the RocketRide store upload attempt. Pushes the model + tokenizer
to a Hugging Face Hub repo, PRIVATE by default (this is a fine-tuned
research artifact, not something to publish publicly mid-hackathon).

pip install (Colab cell 0, if not already installed):
    !pip install -q huggingface_hub

You'll need a HF token with write access: https://huggingface.co/settings/tokens
Set it as an environment variable or pass it to notebook_login().
"""

import json
import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo, upload_folder

EXPORT_DIR = Path("./paperdiff-verifier-v1")
HF_REPO_ID = "o0meerkat0o/paperdiff-verifier-v1"
PRIVATE = True


def main():
    token = os.environ.get("HF_TOKEN")
    if not token:
        # Alternative: run `from huggingface_hub import notebook_login;
        # notebook_login()` in a cell before this one instead of setting
        # HF_TOKEN directly.
        raise RuntimeError(
            "Set os.environ['HF_TOKEN'] to a token with write access "
            "(https://huggingface.co/settings/tokens), or run "
            "notebook_login() in a prior cell."
        )

    api = HfApi(token=token)

    print(f"Creating repo {HF_REPO_ID} (private={PRIVATE}) if it doesn't exist...")
    create_repo(HF_REPO_ID, private=PRIVATE, exist_ok=True, token=token)

    print(f"Uploading {EXPORT_DIR} -> {HF_REPO_ID} ...")
    upload_folder(
        repo_id=HF_REPO_ID,
        folder_path=str(EXPORT_DIR),
        token=token,
        commit_message="Upload paperdiff-verifier-v1 export (weights + metrics + model card)",
    )

    print(f"\nDone. Model live at: https://huggingface.co/{HF_REPO_ID}")
    print(
        "\nRecord this repo ID in paperdiff_metrics.json / model-card.md as the "
        "weights location. Whoever wires the pipeline's inference adapter loads "
        "it directly with:\n"
        f'  AutoModelForSequenceClassification.from_pretrained("{HF_REPO_ID}", token=<HF_TOKEN>)\n'
        f'  AutoTokenizer.from_pretrained("{HF_REPO_ID}", token=<HF_TOKEN>)\n'
        "No zip/unzip step needed -- that's the whole advantage over the RocketRide "
        "store approach we tried first."
    )


if __name__ == "__main__":
    main()
