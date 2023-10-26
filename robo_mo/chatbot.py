import logging
import os

import streamlit as st
from dotenv import load_dotenv
from langchain.chains import ConversationalRetrievalChain
from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.chat_models import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.memory import ConversationBufferMemory
from langchain.vectorstores import MomentoVectorIndex
from momento import (
    CredentialProvider,
    PreviewVectorIndexClient,
    VectorIndexConfigurations,
)

from robo_mo.callbacks import StreamingLLMCallbackHandler
from robo_mo.prompts import QA_PROMPT
from robo_mo.secrets import get_secret_from_env_var_or_secrets_manager

load_dotenv()

MOMENTO_API_KEY = get_secret_from_env_var_or_secrets_manager(
    secret_env_var_name="MOMENTO_API_KEY",
    secret_name=os.environ.get("MOMENTO_API_KEY_SECRET_NAME"),
    aws_region=os.environ.get("AWS_REGION"),
)
OPENAI_API_KEY = get_secret_from_env_var_or_secrets_manager(
    secret_env_var_name="OPENAI_API_KEY",
    secret_name=os.environ.get("OPENAI_API_KEY_SECRET_NAME"),
    aws_region=os.environ.get("AWS_REGION"),
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class ChatBot:
    """A chatbot that answers questions about caching and Momento."""

    def __init__(self):
        embedder = OpenAIEmbeddings(model="text-embedding-ada-002", openai_api_key=OPENAI_API_KEY)  # type: ignore
        store = MomentoVectorIndex(
            embedding=embedder,
            client=PreviewVectorIndexClient(
                configuration=VectorIndexConfigurations.Default.latest(),
                credential_provider=CredentialProvider.from_string(MOMENTO_API_KEY),
            ),
            index_name="momento",
        )

        llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", openai_api_key=OPENAI_API_KEY)  # type: ignore
        streaming_llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", streaming=True, openai_api_key=OPENAI_API_KEY)  # type: ignore
        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=store.as_retriever(),
            memory=memory,
        )
        chain.combine_docs_chain = load_qa_with_sources_chain(streaming_llm, chain_type="stuff", prompt=QA_PROMPT)
        self.chain = chain

    def __call__(self, question):
        return self.chain({"question": question}, callbacks=[StreamingLLMCallbackHandler()])


# Everything that follows is Streamlit code to display the chatbot in the browser.
chat_bot = ChatBot()

st.title("🤖🐿️💬 Robo-Mo Chat")

avatars = {
    "assistant": "🐿️",
    "user": "😄",
}


if "messages" not in st.session_state:
    st.session_state["messages"] = [{"role": "assistant", "content": "How can I help you?"}]

for message in st.session_state.messages:
    with st.chat_message(message["role"], avatar=avatars[message["role"]]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ask Mo the caching squirrel any question about caching and Momento!"):
    logger.info(f"user prompt: {prompt}")
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user", avatar=avatars["user"]):
        st.markdown(prompt)

    with st.chat_message("assistant", avatar=avatars["assistant"]):
        chat_bot(prompt)
