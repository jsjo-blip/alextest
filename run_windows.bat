@echo off
cd /d "%~dp0"

if not exist venv (
    echo [1/3] First run: creating a virtual environment and installing packages...
    python -m venv venv
    call venv\Scripts\pip install -r requirements.txt
)

if exist google_config.bat (
    echo [2/3] Loading Google integration settings...
    call google_config.bat
) else (
    echo [2/3] No Google integration configured yet ^(see google_config.bat.example^) - everything else still works.
)

echo [3/3] Starting the server...
call venv\Scripts\python app.py

if "%~1"=="" (
    pause
)
