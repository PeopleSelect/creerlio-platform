@echo off
echo Starting Creerlio Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r ..\requirements.txt
) else (
    call venv\Scripts\activate.bat
)
python -c "from app.database import init_db; init_db()"
python main.py


