@echo off
echo ========================================
echo Executando migration do Prisma...
echo ========================================
cd /d %~dp0
call npm run migrate
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Migration executada com sucesso!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Erro ao executar migration!
    echo ========================================
)
pause

