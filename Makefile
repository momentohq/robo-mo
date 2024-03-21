.PHONY: default

default: pull-request-ci

pipeline-build: build-common-ts

pipeline-synth: build-common-ts
	cd infrastructure && npx cdk synth

.PHONY: build-streamlit-docker
build-streamlit-docker:
	cd robo-mo-streamlit && make docker-build

build-common-ts:
	cd infrastructure && npm ci && npm run build && cd .. \
		&& cd robo-mo-discord-bot/ecs-code && npm ci && npm run build && cd ../..

pull-request-ci: build-common-ts build-streamlit-docker
	cd infrastructure && MVI_CHAT_DOMAIN=sample.com MOCK_LOOKUPS_FOR_CI_SYNTH=true npx cdk --app "npx ts-node --prefer-ts-exts bin/infrastructure.ts" synth
