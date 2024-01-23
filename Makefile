.PHONY: default

default: pull-request-ci

pipeline-build: build-common-ts

pipeline-synth: build-common-ts
	npx cdk synth

format:
	@poetry run ruff format robo_mo

.PHONY: lint
lint:
	@poetry run ruff check robo_mo
	@poetry run mypy robo_mo

.PHONY: precommit
precommit: format lint

.PHONY: run-chatbot
run-chatbot:
	@poetry run streamlit run robo_mo/chatbot.py

python-install:
	poetry install

.PHONY: docker-build
docker-build:
	@docker build -t robo-mo -f Dockerfile .

.PHONY: docker-run
docker-run:
	@docker run -p 8501:8501 -e MOMENTO_API_KEY=${MOMENTO_API_KEY} -e OPENAI_API_KEY=${OPENAI_API_KEY} -it robo-mo poetry run streamlit run robo_mo/chatbot.py

build-common-ts:
	cd infrastructure && npm ci --verbose && npm run build && cd ..

pull-request-ci: build-common-ts lint docker-build
	MOCK_LOOKUPS_FOR_CI_SYNTH=true npx cdk --app "npx ts-node --prefer-ts-exts bin/infrastructure.ts" synth
