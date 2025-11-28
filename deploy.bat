@echo off
REM HATOD Deployment Script for Windows
REM This script helps deploy your application to various platforms

echo 🚀 HATOD Deployment Script
echo ==========================

echo.
echo Select deployment option:
echo 1) Vercel (Recommended for beginners)
echo 2) Railway (Full-stack platform)
echo 3) Docker (Local development)
echo 4) Test current deployment
echo 5) Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto railway
if "%choice%"=="3" goto docker
if "%choice%"=="4" goto test
if "%choice%"=="5" goto exit

echo Invalid option. Please choose 1-5.
goto menu

:vercel
echo [INFO] Deploying to Vercel...
echo [INFO] Please ensure you have Vercel CLI installed: npm install -g vercel
echo [INFO] Then run: vercel --prod
echo [INFO] Don't forget to set environment variables in Vercel dashboard!
goto end

:railway
echo [INFO] Deploying to Railway...
echo [INFO] Please ensure you have Railway CLI installed: npm install -g @railway/cli
echo [INFO] Then run: railway login && railway init && railway up
echo [INFO] Don't forget to set environment variables!
goto end

:docker
echo [INFO] Deploying with Docker...
echo [INFO] Building and starting services...
if exist docker-compose.yml (
    docker-compose up --build -d
    echo [SUCCESS] Docker deployment completed!
    echo [INFO] Frontend: http://localhost:8080
    echo [INFO] API: http://localhost:4000
) else (
    echo [ERROR] docker-compose.yml not found!
)
goto end

:test
echo [INFO] Testing deployment...
timeout /t 10 /nobreak > nul
curl -f http://localhost:4000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] API health check passed
) else (
    echo [ERROR] API health check failed
)
curl -f http://localhost:8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend serving correctly
) else (
    echo [ERROR] Frontend not accessible
)
goto end

:exit
echo [INFO] Goodbye!
goto end

:end
echo.
echo Deployment script completed.
pause