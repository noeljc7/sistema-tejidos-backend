@echo off
title Lanzador del Sistema de Tejidos (Modo PdaNet)
echo ==========================================
echo   INICIANDO SISTEMA EN RED LOCAL
echo ==========================================

:: Iniciar Backend en el puerto 8000
start "BACKEND - Cerebro IA" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: Iniciar Frontend en el puerto 3000 (Comando correcto para Next.js)
start "FRONTEND - Pagina Web" cmd /k "cd frontend && npx next dev -H 0.0.0.0"

echo.
echo [!] PASOS IMPORTANTES:
echo 1. Asegurate de haber ejecutado el comando del Firewall en PowerShell.
echo 2. En tu telefono, entra a: http://10.226.191.5:3000
echo.
echo Presiona cualquier tecla para cerrar este lanzador...
pause > nul
