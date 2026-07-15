@echo off
echo ==========================================
echo   Installation automatique de UniSphere AI
echo ==========================================

echo.
echo [1/2] Installation du Frontend (Next.js)...
cd frontend
call npm install
cd ..

echo.
echo [2/2] Installation du Backend (Python)...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo.
echo ==========================================
echo   Installation terminee avec succes !
echo   N'oublie pas de creer les fichiers .env
echo ==========================================
pause