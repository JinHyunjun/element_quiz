from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

from api.database import init_db
from api.routers import curriculum, quiz, game

load_dotenv()

app = FastAPI(title="초등 교실 퀴즈")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


app.include_router(curriculum.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(game.router, prefix="/api")

frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
