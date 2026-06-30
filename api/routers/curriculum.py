from fastapi import APIRouter
from api.curriculum_data import CURRICULUM

router = APIRouter()


@router.get("/curriculum")
def get_curriculum():
    result = {}
    for grade, data in CURRICULUM.items():
        result[grade] = {
            "name": data["name"],
            "subjects": list(data["subjects"].keys())
        }
    return result


@router.get("/curriculum/{grade}")
def get_grade(grade: str):
    if grade not in CURRICULUM:
        return {"error": "학년 정보가 없습니다"}
    return {
        "name": CURRICULUM[grade]["name"],
        "subjects": list(CURRICULUM[grade]["subjects"].keys())
    }


@router.get("/curriculum/{grade}/{subject}")
def get_subject(grade: str, subject: str):
    if grade not in CURRICULUM:
        return {"error": "학년 정보가 없습니다"}
    subjects = CURRICULUM[grade]["subjects"]
    if subject not in subjects:
        return {"error": "과목 정보가 없습니다"}
    return {
        "grade": grade,
        "subject": subject,
        "semesters": {
            "1": subjects[subject].get("1", []),
            "2": subjects[subject].get("2", [])
        }
    }
