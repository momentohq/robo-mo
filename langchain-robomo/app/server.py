from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from langserve import add_routes
from rag_momento_vector_index import chain as rag_momento_vector_index_chain

app = FastAPI()

@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")


# Edit this to add the chain you want to add
# add_routes(app, NotImplemented)
add_routes(app, rag_momento_vector_index_chain, path="/rag-momento-vector-index")


app.mount("/static", StaticFiles(directory="frontend/build", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
