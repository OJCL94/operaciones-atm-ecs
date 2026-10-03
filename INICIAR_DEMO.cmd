@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
if not exist node_modules\zod\package.json (
  call npm.cmd ci
  if errorlevel 1 goto :error
)
if not exist build\server.mjs (
  call npm.cmd run build
  if errorlevel 1 goto :error
)
echo Abre http://127.0.0.1:3000 y conserva esta ventana abierta.
call npm.cmd run demo
pause
exit /b
:error
echo No se pudo preparar Nexo. Revisa el mensaje anterior y el README.
pause
exit /b 1
