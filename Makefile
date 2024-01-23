.PHONY: default

default: pull-request-ci

pipeline-build: build-common-ts

pipeline-synth: build-common-ts
	npx cdk synth

build-common-ts:
	cd infrastructure && npm ci --verbose && npm run build && cd ..

pull-request-ci: build-common-ts
	MOCK_LOOKUPS_FOR_CI_SYNTH=true npx cdk --app "npx ts-node --prefer-ts-exts bin/infrastructure.ts" synth
