import app.core.net  # noqa: F401  — must be first: forces IPv4-only DNS before any other import can open a connection

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from app.api.v1.router import api_router
from app.core.db import translate_api_error

app = FastAPI(title="FxPool API", version="0.1.0")

# "*" + credentials is rejected by browsers, which then surfaces API 500s as "Network Error".
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://main.d1k7sposf36ug4.amplifyapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(APIError)
async def postgrest_exception_handler(_request: Request, exc: APIError):
    from fastapi import HTTPException

    try:
        translate_api_error(exc)
    except HTTPException as http_exc:
        return JSONResponse({"detail": http_exc.detail}, status_code=http_exc.status_code)
    return JSONResponse({"detail": "Not found"}, status_code=404)