@echo off
cd /d "%~dp0"

if not exist venv (
    echo [1/3] 처음 실행: 가상환경을 만들고 패키지를 설치합니다...
    python -m venv venv
    call venv\Scripts\pip install -r requirements.txt
)

if exist google_config.bat (
    echo [2/3] Google 연동 설정을 불러옵니다...
    call google_config.bat
) else (
    echo [2/3] Google 연동 설정 없음 ^(google_config.bat.example 참고^) - 나머지 기능은 정상 동작합니다.
)

echo [3/3] 서버를 시작합니다...
call venv\Scripts\python app.py

if "%~1"=="" (
    pause
)
