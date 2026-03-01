@echo off
title Fullstack Dev Launcher
cd /d %~dp0

echo Setting up Backend .env...
if not exist backend\.env (
(
echo JWT_SECRET=weogeawi
) > backend\.env
)

echo Installing Backend...
pushd backend
call npm install
popd

echo Installing Frontend...
pushd frontend
call npm install
popd

echo Starting Backend...
start "Backend" cmd /k "cd /d %~dp0backend && npx nodemon ."

timeout /t 3 > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting for Frontend to boot...
timeout /t 5 > nul

echo Opening Browser...
start http://localhost:5173

echo All services are running!
pause