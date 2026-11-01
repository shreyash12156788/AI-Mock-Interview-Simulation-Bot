@echo off
setlocal
title Adaptive Interview Challenge
cd /d "%~dp0"

echo.
echo ============================================
echo   Adaptive Interview Challenge - One-click
echo ============================================
echo.

where.exe cmake >nul 2>nul
if errorlevel 1 (
    echo ERROR: CMake was not found on PATH. Install CMake 3.20 or newer.
    goto :failed
)
where.exe git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git was not found on PATH. Git is needed to download first-time C++ dependencies.
    goto :failed
)
where.exe c++ >nul 2>nul
if errorlevel 1 (
    where.exe g++ >nul 2>nul
    if errorlevel 1 (
        where.exe clang++ >nul 2>nul
        if errorlevel 1 (
            where.exe cl >nul 2>nul
            if errorlevel 1 (
                echo ERROR: No C++ compiler was found on PATH.
                echo Install a C++17 compiler such as MinGW-w64 or Visual Studio Build Tools.
                goto :failed
            )
        )
    )
)

if not exist "%~dp0scripts\project-server.ps1" (
    echo ERROR: scripts\project-server.ps1 is missing.
    goto :failed
)

echo [1/5] Checking whether the website is already running...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\project-server.ps1" -Action Check
set "CHECK_RESULT=%ERRORLEVEL%"
if "%CHECK_RESULT%"=="10" goto :already_running
if not "%CHECK_RESULT%"=="0" goto :failed

echo.
echo [2/5] Configuring the Release build with CMake...
cmake -S "%~dp0." -B "%~dp0build" -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 goto :failed

echo.
echo [3/5] Building the C++ backend...
cmake --build "%~dp0build" --config Release --parallel 2
if errorlevel 1 goto :failed

if not exist "%~dp0build\adaptive-interview.exe" (
    echo ERROR: Expected executable was not created:
    echo   %~dp0build\adaptive-interview.exe
    goto :failed
)

echo.
echo [4/5] Starting the backend and waiting for its health check...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\project-server.ps1" -Action Start
if errorlevel 1 goto :failed

echo.
echo [5/5] The website is ready at http://localhost:8080
echo This window can be closed; use STOP_PROJECT.bat to stop the server.
echo.
pause
exit /b 0

:already_running
echo.
echo The existing website was opened in your default browser.
echo This window can be closed; use STOP_PROJECT.bat to stop the server.
echo.
pause
exit /b 0

:failed
set "RUN_RESULT=%ERRORLEVEL%"
if "%RUN_RESULT%"=="0" set "RUN_RESULT=1"
echo.
echo ERROR: Project startup failed with exit code %RUN_RESULT%.
echo Review the error details above, fix the reported issue, and run this file again.
echo.
pause
exit /b %RUN_RESULT%
