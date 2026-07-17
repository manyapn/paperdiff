.PHONY: setup dev test lint format check

setup:
	npm install

dev:
	npm run dev

test:
	npm run test

lint:
	npm run lint

format:
	npm --prefix apps/web run format

check:
	npm run check
