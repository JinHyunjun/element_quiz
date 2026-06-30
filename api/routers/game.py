import uuid
import json
from fastapi import APIRouter, HTTPException
from api.database import get_db
from api.models import CreateSessionRequest, ScoreUpdate

router = APIRouter()


def _row_to_state(row) -> dict:
    return {
        "id": row["id"],
        "mode": row["mode"],
        "questions": json.loads(row["questions"]),
        "current_index": row["current_index"],
        "revealed": bool(row["revealed"]),
        "teams": json.loads(row["teams"]),
        "status": row["status"],
        "grade": row["grade"],
        "subject": row["subject"],
        "unit": row["unit"],
    }


@router.post("/game/session")
def create_session(req: CreateSessionRequest):
    session_id = str(uuid.uuid4())[:8]
    db = get_db()
    db.execute(
        """INSERT INTO game_sessions
           (id, mode, questions, teams, grade, subject, unit, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')""",
        (
            session_id,
            req.mode,
            json.dumps(req.questions, ensure_ascii=False),
            json.dumps([t.dict() for t in req.teams], ensure_ascii=False),
            req.grade, req.subject, req.unit,
        )
    )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.get("/game/session/{session_id}")
def get_session(session_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    return _row_to_state(row)


@router.put("/game/session/{session_id}/start")
def start_session(session_id: str):
    db = get_db()
    db.execute(
        "UPDATE game_sessions SET status='question', current_index=0, revealed=0 WHERE id=?",
        (session_id,)
    )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.put("/game/session/{session_id}/reveal")
def reveal_answer(session_id: str):
    db = get_db()
    db.execute(
        "UPDATE game_sessions SET revealed=1 WHERE id=?",
        (session_id,)
    )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.put("/game/session/{session_id}/next")
def next_question(session_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    questions = json.loads(row["questions"])
    next_idx = row["current_index"] + 1

    if next_idx >= len(questions):
        db.execute(
            "UPDATE game_sessions SET status='finished' WHERE id=?", (session_id,)
        )
    else:
        db.execute(
            "UPDATE game_sessions SET current_index=?, revealed=0, status='question' WHERE id=?",
            (next_idx, session_id)
        )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.put("/game/session/{session_id}/prev")
def prev_question(session_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    prev_idx = max(0, row["current_index"] - 1)
    db.execute(
        "UPDATE game_sessions SET current_index=?, revealed=0, status='question' WHERE id=?",
        (prev_idx, session_id)
    )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.put("/game/session/{session_id}/score")
def update_score(session_id: str, body: ScoreUpdate):
    db = get_db()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    teams = json.loads(row["teams"])
    if body.team_index < 0 or body.team_index >= len(teams):
        raise HTTPException(status_code=400, detail="잘못된 팀 인덱스")

    teams[body.team_index]["score"] = max(0, teams[body.team_index]["score"] + body.delta)
    db.execute(
        "UPDATE game_sessions SET teams=? WHERE id=?",
        (json.dumps(teams, ensure_ascii=False), session_id)
    )
    db.commit()
    row = db.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    db.close()
    return _row_to_state(row)


@router.delete("/game/session/{session_id}")
def delete_session(session_id: str):
    db = get_db()
    db.execute("DELETE FROM game_sessions WHERE id=?", (session_id,))
    db.commit()
    db.close()
    return {"ok": True}
