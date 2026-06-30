import os
import json
import re
from fastapi import APIRouter, HTTPException
import google.generativeai as genai
from dotenv import load_dotenv
from api.models import GenerateRequest

load_dotenv()
router = APIRouter()

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

SYSTEM_PROMPT = """당신은 초등학교 선생님을 돕는 교육 퀴즈 생성 AI입니다.
반드시 JSON 배열만 출력하세요. 다른 텍스트, 마크다운 코드블록, 설명은 절대 포함하지 마세요."""

OX_PROMPT = """초등학교 {grade}학년 {subject} 과목의 [{unit}] 단원 내용을 바탕으로
O/X 퀴즈 {count}개를 만들어주세요.

규칙:
- {grade}학년 학생 수준에 맞는 쉬운 언어 사용
- 교과서 핵심 내용 위주
- true(O)/false(X) 비율을 비슷하게

출력 형식 (JSON 배열만, 다른 텍스트 없이):
[
  {{"question": "문제 내용", "answer": true, "explanation": "정답 설명 한 줄"}},
  {{"question": "문제 내용", "answer": false, "explanation": "정답 설명 한 줄"}}
]"""

MULTIPLE_PROMPT = """초등학교 {grade}학년 {subject} 과목의 [{unit}] 단원 내용을 바탕으로
사지선다 퀴즈 {count}개를 만들어주세요.

규칙:
- {grade}학년 학생 수준에 맞는 쉬운 언어 사용
- 교과서 핵심 내용 위주
- 오답도 그럴듯하게 만들기
- answer는 정답 인덱스 (0~3)

출력 형식 (JSON 배열만, 다른 텍스트 없이):
[
  {{
    "question": "문제 내용",
    "options": ["① 보기1", "② 보기2", "③ 보기3", "④ 보기4"],
    "answer": 0,
    "explanation": "정답 설명 한 줄"
  }}
]"""


def clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text)
    text = re.sub(r"```$", "", text)
    return text.strip()


@router.post("/quiz/generate")
async def generate_quiz(req: GenerateRequest):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY가 설정되지 않았습니다")

    if req.mode == "ox":
        prompt = OX_PROMPT.format(
            grade=req.grade, subject=req.subject,
            unit=req.unit, count=req.count
        )
    elif req.mode == "multiple":
        prompt = MULTIPLE_PROMPT.format(
            grade=req.grade, subject=req.subject,
            unit=req.unit, count=req.count
        )
    else:
        raise HTTPException(status_code=400, detail="mode는 'ox' 또는 'multiple'이어야 합니다")

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            system_instruction=SYSTEM_PROMPT
        )
        response = model.generate_content(prompt)
        raw = clean_json(response.text)
        questions = json.loads(raw)
        return {"questions": questions, "mode": req.mode}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI 응답 파싱 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")
