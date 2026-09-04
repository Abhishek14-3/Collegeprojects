from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="KeyLens NLP Keyword & Key-Phrase Extraction API"
)

# CORS Middleware allowing frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to avoid exposing unhandled Python stack traces."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"An unexpected error occurred during NLP analysis: {str(exc)}"
        }
    )

app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def root_redirect():
    return {
        "message": "Welcome to KeyLens API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
