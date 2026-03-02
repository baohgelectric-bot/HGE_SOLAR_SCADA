@echo off
chcp 65001 >nul
title HGESolarSCADA - Deploy to Vercel
color 0F

cd /d "d:\02-CONG VIEC HUNG GIANG\2025-HUNG GIANG\THANG 12\solar dashboard\code\frontend"

echo.
echo  ============================================
echo   HGESolarSCADA - Auto Deploy to Vercel
echo  ============================================
echo.

:: Kiem tra co thay doi gi khong
git status --short > "%TEMP%\git_status.tmp" 2>&1
set /p CHANGES=<"%TEMP%\git_status.tmp"
if "%CHANGES%"=="" (
    echo  [!] Khong co thay doi nao de deploy.
    echo.
    echo  Nhan phim bat ky de dong cua so nay...
    pause >nul
    exit /b 0
)

echo  Cac file da thay doi:
echo  ----------------------------------------
git status --short
echo  ----------------------------------------
echo.

:: Stage tat ca
echo  [1/3] Dang stage tat ca file...
git add -A
if %errorlevel% neq 0 (
    echo.
    echo  [LOI] Stage that bai!
    echo  Nhan phim bat ky de dong...
    pause >nul
    exit /b 1
)
echo  OK!
echo.

:: Commit
set COMMIT_MSG=update: deploy %date% %time:~0,8%
echo  [2/3] Dang commit: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo.
    echo  [LOI] Commit that bai!
    echo  Nhan phim bat ky de dong...
    pause >nul
    exit /b 1
)
echo.

:: Push
echo  [3/3] Dang push len GitHub...
git push 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ============================================
    echo   LOI! Push that bai.
    echo   Kiem tra ket noi mang hoac xac thuc GitHub.
    echo  ============================================
    echo.
    echo  Nhan phim bat ky de dong...
    pause >nul
    exit /b 1
)

echo.
echo  ============================================
echo   THANH CONG! Da push len GitHub.
echo   Vercel se tu dong build trong 1-2 phut.
echo  ============================================
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
