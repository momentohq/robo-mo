# Robo-mo chatbot

Robo-mo is a chatbot over the [Momento](https://www.gomomento.com) documentation and blogs. Indexing and consulting the Momento documentation is done using Momento Vector Index by way of the langchain integration.

# Prerequisites

The [robo-mo](https://github.com/momentohq/robo-mo) project is a sibling of this project. The index has been populated with the Momento documentation and blogs. The API key used to populate the index is used by the chatbot to query the index.

# Project Structure

The project is structured as follows:

```
. ................................. CDK to deploy the POC
├── dev-deploy-chat-demo.sh ....... Deploy the POC
├── dev-destroy-chat-demo.sh ...... Destroy the POC
├── prod-deploy-chat-demo.sh ...... Deploy the POC to prod
```

To deploy to prod, run the following command:

```bash
OPENAI_API_KEY=<your-openai-api-key> MOMENTO_API_KEY=<your-momento-api-key> ./prod-deploy-chat-demo.sh
```

Note that the API key needs to have the Momento index. See the `robo-mo` project for instructions on how to populate it.
