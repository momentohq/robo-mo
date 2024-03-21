import os

import uvicorn
from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from langserve import add_routes

from .secrets import get_secret_from_env_var_or_secrets_manager

os.environ["MOMENTO_API_KEY"] = get_secret_from_env_var_or_secrets_manager(
    secret_env_var_name="MOMENTO_API_KEY",
    secret_name=os.environ.get("MOMENTO_API_KEY_SECRET_NAME"),
    aws_region=os.environ.get("AWS_REGION"),
)
os.environ["OPENAI_API_KEY"] = get_secret_from_env_var_or_secrets_manager(
    secret_env_var_name="OPENAI_API_KEY",
    secret_name=os.environ.get("OPENAI_API_KEY_SECRET_NAME"),
    aws_region=os.environ.get("AWS_REGION"),
)

# Note the imports are here since they expect the above environment variables to be set
from rag_momento_vector_index import chain as rag_momento_vector_index_chain  # noqa: E402
from rag_momento_vector_index.index import reindex_content  # noqa: E402

app = FastAPI()

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")


# Edit this to add the chain you want to add
add_routes(app, rag_momento_vector_index_chain, path="/rag-momento-vector-index")


@app.post("/reindex/{index_name}")
async def reindex(index_name: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(reindex_content, index_name)
    return {"message": f"Reindexing {index_name} in progress."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
