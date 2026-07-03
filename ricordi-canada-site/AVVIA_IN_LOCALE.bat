@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Installazione dipendenze...
call npm install
if errorlevel 1 (
  echo.
  echo Errore: controlla di avere installato Node.js 20 o superiore.
  pause
  exit /b 1
)
echo.
echo Il sito sara disponibile su http://localhost:3000
echo Codice: 17/07/2008
echo Premi CTRL+C per fermare il server.
echo.
call npm start
pause
