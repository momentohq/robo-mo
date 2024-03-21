# Robo-mo chatbot

Robo-mo is a chatbot over the [Momento](https://www.gomomento.com) [documentation](https://docs.momentohq.com) and [blogs](https://gomomento.com/blogs). Indexing and consulting the Momento documentation is done using Momento Vector Index by way of the langchain integration.

With Momento Vector Index, indexing and searching over vector embeddings is easier than ever!

In this project we demo a chatbot over the Momento tech docs and blogs. This covers the following:

- Indexing the Momento documentation and blogs into MVI
- Running a chatbot over the indexed data

There are two ways to run the chatbot:

- a Streamlit app that runs the chatbot, good for standalone use and local demos
- a FastAPI app that runs the chatbot using langserve, good for backend use and integration with other services

Each of these implementations is self-contained and can be run independently. See the `README.md` in each directory for more information.

# Project Structure

The project is structured as follows:

```
.
├── robo-mo-langserve ............. backend implementation of the chatbot using langserve
├── robo-mo-streamlit ............. frontend implementation of the chatbot using Streamlit
├── robo-mo-discord-bot ........... Discord bot integration with `robo-mo-langserve`
├── lambdas ....................... AWS lambda function to re-index Momento data using `robo-mo-langserve`'s reindex API
├── infrastructure ................ CDK infrastructure code to deploy the above
```

# How to run

The easiest way to run is to run the streamlit app. See the `README.md` in `robo-mo-streamlit` for more information.

# How to deploy

To deploy to AWS, deploy the CDK in the `infrastructure` directory. See the `README.md` in `infrastructure` for more information.
