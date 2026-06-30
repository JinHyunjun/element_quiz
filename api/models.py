from pydantic import BaseModel
from typing import List, Optional, Any


class Team(BaseModel):
    name: str
    score: int = 0


class OXQuestion(BaseModel):
    question: str
    answer: bool
    explanation: str = ""


class MultipleQuestion(BaseModel):
    question: str
    options: List[str]
    answer: int
    explanation: str = ""


class GenerateRequest(BaseModel):
    grade: str
    subject: str
    unit: str
    mode: str        # "ox" | "multiple"
    count: int = 5


class CreateSessionRequest(BaseModel):
    mode: str
    questions: List[Any]
    teams: List[Team]
    grade: str = ""
    subject: str = ""
    unit: str = ""


class ScoreUpdate(BaseModel):
    team_index: int
    delta: int
