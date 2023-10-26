# Robo-mo chatbot

Robo-mo is a chatbot over the [Momento](https://www.gomomento.com) [documentation](https://docs.momentohq.com) and [blogs](https://gomomento.com/blogs). Indexing and consulting the Momento documentation is done using Momento Vector Index by way of the langchain integration.

With Momento Vector Index, indexing and searching over vector embeddings is easier than ever!

# Project Structure

The project is structured as follows:

```
.
├── robo_mo ..................... chatbot source code
| ├── chatbot.py ................ core application and ui logic
| ├── prompts.py ................ customized prompts for the chatbot
| ├── callbacks.py .............. streaming callback functions
| └── secrets.py ................ helpers to read secrets
└── notebooks ................... the chat bot application
| └── 01-load-momento-data.ipynb  populates the index with Momento data
```

# Getting Started

## Prerequisites

- [Python 3.11](https://www.python.org/downloads/)
- [poetry](https://python-poetry.org/docs/#installation)
- [OpenAI API key](https://openai.com)
- [Momento API key](https://console.gomomento.com)

## Installation

```bash
poetry install
```

## Usage

### Set up environment

These assume you have the following API keys set in the environment:

- Open AI API key set to the environment variable `OPENAI_API_KEY`.
- Momento API key set to the environment variable `MOMENTO_API_KEY`.

When running from Python, this can be set in the project root `.env` file. Use the provided `.env.example` as a template, and rename it to `.env`.

### Build the index

Run the notebook `notebooks/01-load-momento-data.ipynb` to build the index.

To run the notebook, use your IDE's integrated notebook support (eg VS Code), or run the following command:

```bash
poetry run jupyter notebook
```

and open the notebook in your browser.

### Run the chatbot

To run directly using python:

```bash
make run-chatbot
```

This should launch a browser with the chatbot demo.

To run using docker:

```bash
make docker-build
make docker-run
```

This should run the server, accessible at http://localhost:8501.
