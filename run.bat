@echo off
cd /d C:\element_quiz
if not exist .env copy .env.example .env
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
