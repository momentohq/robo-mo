.PHONY: default

default: docker-build

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

.PHONY: docker-build
docker-build:
	docker build -t robo-mo -f Dockerfile .

.PHONY: docker-run
docker-run:
	@docker run -p 8501:8501 -e MOMENTO_API_KEY=${MOMENTO_API_KEY} -e OPENAI_API_KEY=${OPENAI_API_KEY} -it robo-mo poetry run streamlit run robo_mo/chatbot.py
