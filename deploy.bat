@echo off
chcp 65001 >nul
title Deploy to Vercel via GitHub

echo ============================================
echo   HGESolarSCADA - Auto Deploy to Vercel
echo ============================================
echo.

cd /d "%~dp0"

:: Kiem tra co thay doi gi khong
git diff --quiet --exit-code
if %errorlevel%==0 (
    git diff --cached --quiet --exit-code
    if %errorlevel%==0 (
        echo [!] Khong co thay doi nao de deploy.
        echo.
        pause
        exit /b 0
    )
)

:: Hien thi cac file da thay doi
echo [1/3] Cac file da thay doi:
echo ----------------------------------------
git status --short
echo ----------------------------------------
echo.

:: Stage tat ca
echo [2/3] Dang stage tat ca file...
git add -A
echo OK
echo.

:: Commit voi thoi gian hien tai
set COMMIT_MSG=update: deploy %date% %time:~0,8%
echo [3/3] Dang commit: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"
echo.

:: Push len GitHub
echo [>>>] Dang push len GitHub...
git push
echo.

if %errorlevel%==0 (
    echo ============================================
    echo   THANH CONG! Vercel se tu dong build.
    echo   Cho 1-2 phut roi kiem tra trang web.
    echo ============================================
) else (
    echo ============================================
    echo   LOI! Push that bai. Kiem tra ket noi mang.
    echo ============================================
)

echo.
pause
