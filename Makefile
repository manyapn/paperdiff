.PHONY: setup dev dev-api dev-web test lint format check

setup:
	python3 -m venv .venv
	.venv/bin/python -m pip install -e 'services/api[dev]'
	npm --prefix apps/web install

dev:
	@echo "Run 'make dev-api' and 'make dev-web' in separate terminals."

dev-api:
	.venv/bin/uvicorn paperdiff_api.main:app --reload --app-dir services/api --port 8000

dev-web:
	npm --prefix apps/web run dev

test:
	.venv/bin/pytest services/api/tests
	.venv/bin/pytest evaluation
	npm --prefix apps/web run test

lint:
	.venv/bin/ruff check services/api evaluation ml
	npm --prefix apps/web run lint

format:
	.venv/bin/ruff format services/api
	npm --prefix apps/web run format

check: lint test
	npm --prefix apps/web run build
