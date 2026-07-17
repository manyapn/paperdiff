"""Safe experiment entrypoint; model training is intentionally not faked in the scaffold."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    unresolved = [value for value in config.values() if isinstance(value, str) and "REQUIRED" in value]
    if unresolved:
        raise SystemExit(
            "Experiment config contains unresolved dataset/version placeholders. "
            "Record licenses, hashes, and held-out splits before training."
        )
    raise SystemExit(
        "Training dependencies and data are not installed. Implement the selected baseline in a "
        "separate, reproducible ML environment; do not claim scaffold output as a trained model."
    )


if __name__ == "__main__":
    main()

