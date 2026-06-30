import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "game.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            questions TEXT NOT NULL,
            current_index INTEGER DEFAULT 0,
            revealed INTEGER DEFAULT 0,
            teams TEXT NOT NULL,
            status TEXT DEFAULT 'waiting',
            grade TEXT,
            subject TEXT,
            unit TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
