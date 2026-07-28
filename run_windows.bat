@echo off
cd /d "%~dp0"

if not exist venv (
    echo [1/2] 처음 실행: 가상환경을 만들고 패키지를 설치합니다...
    python -m venv venv
    call venv\Scripts\pip install -r requirements.txt
)

echo [2/2] 서버를 시작합니다...
call venv\Scripts\python app.py

pause
