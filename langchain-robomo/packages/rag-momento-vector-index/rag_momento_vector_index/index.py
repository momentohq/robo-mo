"""
Code related to indexing and re-indexing Momento content.
"""
import itertools

import nest_asyncio
from bs4 import BeautifulSoup
from langchain.docstore.document import Document
from langchain.document_loaders import SitemapLoader
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import TokenTextSplitter
from langchain.vectorstores import MomentoVectorIndex
from momento import CredentialProvider, PreviewVectorIndexClient, VectorIndexConfigurations

nest_asyncio.apply()


def reindex_content(index_name: str, momento_env_var_name: str = "MOMENTO_API_KEY") -> None:
    documents = load_content()
    chunked_documents = split_documents(documents)
    load_into_mvi(chunked_documents, index_name, momento_env_var_name)


def load_content() -> list[Document]:
    return load_tech_docs() + load_blogs()


def parse_content_fn(content: BeautifulSoup) -> str:
    # Strip irrelevant elements from the content
    to_remove = list(
        itertools.chain(
            content.find_all("title"),
            content.find_all("nav"),
            content.find_all("div", role="region"),
            content.find_all("div", class_="page-wrapper"),
            content.find_all("div", class_="blog-post_newsletter"),
            content.find_all("div", class_="blog-post-social-wrapper"),
            content.find_all("section", class_="section-more-blog-posts"),
            content.find_all("button"),
            content.find_all("aside"),
            content.find_all(id="faqs"),
            content.find_all("header"),
            content.find_all("footer"),
        )
    )

    for element in to_remove:
        element.decompose()

    return str(content.get_text()).strip()


def load_tech_docs() -> list[Document]:
    tech_docs_loader = SitemapLoader(
        web_path="https://docs.momentohq.com/sitemap.xml", parsing_function=parse_content_fn
    )
    return tech_docs_loader.load()


def trim_metadata_fn(meta: dict, _content: BeautifulSoup) -> dict:
    meta = {k: v.strip() for k, v in meta.items()}
    return {"source": meta["loc"], **meta}


def load_blogs() -> list[Document]:
    blog_docs_loader = SitemapLoader(
        web_path="https://www.gomomento.com/sitemap.xml",
        filter_urls=[r"https://www.gomomento.com/blog.*"],
        meta_function=trim_metadata_fn,
    )
    return blog_docs_loader.load()


def split_documents(documents: list[Document], chunk_size: int = 128, chunk_overlap: int = 32) -> list[Document]:
    text_splitter = TokenTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap, model_name="text-embedding-ada-002", add_start_index=True
    )
    return text_splitter.split_documents(documents)


def load_into_mvi(documents: list[Document], index_name: str, momento_env_var_name: str) -> None:
    client = PreviewVectorIndexClient(
        configuration=VectorIndexConfigurations.Default.latest(),
        credential_provider=CredentialProvider.from_environment_variable(momento_env_var_name),
    )

    # We are re-indexing all of the data.
    # There can be a small availability window where the index is not available or not fully populated.
    client.delete_index(index_name)
    embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")  # type: ignore
    ids = [f"{document.metadata['source']}, chunk={document.metadata['start_index']}" for document in documents]
    MomentoVectorIndex.from_documents(documents, embedding=embeddings, client=client, index_name=index_name, ids=ids)
