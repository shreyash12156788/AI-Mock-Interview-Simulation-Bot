@echo off
setlocal
title Stop Adaptive Interview Challenge
cd /d "%~dp0"

echo.
echo Stopping the Adaptive Interview Challenge server...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\project-server.ps1" -Action Stop
if errorlevel 1 (
    echo.
    echo The server could not be stopped safely. Review the message above.
    echo.
    pause
    exit /b 1
)

echo.
pause
exit /b 0
