FROM python:3.11 as base

RUN pip install poetry==1.5.1

ENV POETRY_NO_INTERACTION=1 \
    POETRY_NO_ANSI=1 \
    POETRY_VIRTUALENVS_CREATE=0 \
    POETRY_CACHE_DIR=/tmp/poetry_cache \
    # In production these should be set to the actual values
    STREAMLIT_SERVER_PORT=8501

# Externally provided environment variables
# EITHER:
# - AWS_REGION
# - OPENAI_API_KEY_SECRET_NAME
# - MOMENTO_API_KEY_SECRET_NAME
# OR (for local development):
# - OPENAI_API_KEY
# - MOMENTO_API_KEY

WORKDIR /app
COPY poetry.lock pyproject.toml README.md ./
RUN poetry install --no-root --only=main && rm -rf $POETRY_CACHE_DIR

FROM base as dev

COPY robo_mo robo_mo
RUN poetry install --only=main && rm -rf $POETRY_CACHE_DIR
