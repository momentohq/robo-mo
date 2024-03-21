import logging
import re
from typing import Any, Optional

import streamlit as st
from langchain.callbacks.base import BaseCallbackHandler

logger = logging.getLogger(__name__)


class StreamingLLMCallbackHandler(BaseCallbackHandler):
    """Callback handler for streaming LLM responses."""

    output_sink: Optional[st.delta_generator.DeltaGenerator] = None  # type: ignore
    full_response: str = ""

    def __init__(self):
        pass

    def __clear(self):
        self.output_sink = None
        self.full_response = ""

    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if self.output_sink is None:
            self.output_sink = st.empty()
        self.full_response += token
        self.output_sink = self.output_sink.markdown(self.full_response + "▌")

    def on_chain_end(self, outputs: dict[str, Any], **kwargs: Any) -> Any:
        """Run when chain ends running."""
        if self.output_sink is None:
            return

        self.full_response = re.sub(r"SOURCES:\s*$", "", self.full_response)
        self.full_response = re.sub(r"Source:(\s*-?\[.*?\]\(http)", "SOURCES:\\1", self.full_response)
        self.full_response = re.sub(r"SOURCES:(\s)", "\n\n*SOURCES*:\\1", self.full_response)
        self.output_sink.markdown(self.full_response)
        logger.info(f"assistant response: {self.full_response}")
        st.session_state.messages.append({"role": "assistant", "content": self.full_response})

        self.__clear()
