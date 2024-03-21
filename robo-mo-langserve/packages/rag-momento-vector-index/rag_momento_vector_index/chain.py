import os
import re

from langchain.schema import Document, StrOutputParser
from langchain_community.vectorstores import MomentoVectorIndex
from langchain_core.pydantic_v1 import BaseModel
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from momento import (
    CredentialProvider,
    PreviewVectorIndexClient,
    VectorIndexConfigurations,
)

from .prompts import QA_PROMPT

API_KEY_ENV_VAR_NAME = "MOMENTO_API_KEY"
if os.environ.get(API_KEY_ENV_VAR_NAME, None) is None:
    raise Exception(f"Missing `{API_KEY_ENV_VAR_NAME}` environment variable.")

MOMENTO_INDEX_NAME = os.environ.get("MOMENTO_INDEX_NAME", "langchain-test")

### Sample Ingest Code - this populates the vector index with data
### Run this on the first time to seed with data
# from rag_momento_vector_index import ingest
# ingest.load(API_KEY_ENV_VAR_NAME, MOMENTO_INDEX_NAME)


# Vector store setup
vectorstore = MomentoVectorIndex(
    embedding=OpenAIEmbeddings(),
    client=PreviewVectorIndexClient(
        configuration=VectorIndexConfigurations.Default.latest(),
        credential_provider=CredentialProvider.from_environment_variable(API_KEY_ENV_VAR_NAME),
    ),
    index_name=MOMENTO_INDEX_NAME,
)
retriever = vectorstore.as_retriever()


# Vector store post-processing
def format_docs(docs: list[Document]) -> str:
    outputs = []
    for doc in docs:
        outputs.append(f"Content: {doc.page_content}\nSource: {doc.metadata['source']}")
    return "\n".join(outputs)


def postprocess(response: str) -> str:
    response = re.sub(r"SOURCES:\s*$", "", response)
    response = re.sub(r"Source:(\s*-?\[.*?\]\(http)", "SOURCES:\\1", response)
    response = re.sub(r"SOURCES:(\s)", "\n\n*SOURCES*:\\1", response)
    return response


model = ChatOpenAI(temperature=0, model="gpt-3.5-turbo")  # type: ignore
chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | QA_PROMPT
    | model
    | StrOutputParser()
    | RunnableLambda(postprocess)
)


# Add typing for input
class Question(BaseModel):
    __root__: str


chain = chain.with_types(input_type=Question)
