@echo off
chcp 65001 >nul
title HGESolarSCADA - Deploy to Vercel
color 0F

cd /d "d:\02-CONG VIEC HUNG GIANG\2025-HUNG GIANG\THANG 12\solar dashboard\code\frontend"
if %errorlevel% neq 0 (
    echo.
    echo  [LOI] Khong the chuyen den thu muc project!
    echo  Kiem tra lai duong dan thu muc.
    goto :END
)

echo.
echo  ============================================
echo   HGESolarSCADA - Auto Deploy to Vercel
echo  ============================================
echo.

:: Kiem tra git co san trong PATH khong
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [LOI] Khong tim thay git trong PATH!
    echo  Hay cai dat Git hoac them git vao PATH.
    goto :END
)

:: Kiem tra co thay doi gi khong (dung errorlevel thay vi doc file tam)
git diff --quiet HEAD 2>nul
set HAS_COMMITTED_CHANGES=%errorlevel%
git status --porcelain 2>nul | findstr /r /c:"." >nul 2>&1
set HAS_UNCOMMITTED=%errorlevel%

if %HAS_UNCOMMITTED% neq 0 (
    if %HAS_COMMITTED_CHANGES% equ 0 (
        echo  [!] Khong co thay doi nao de deploy.
        goto :END
    )
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
    goto :END
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
    goto :END
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
    goto :END
)

echo.
echo  ============================================
echo   THANH CONG! Da push len GitHub.
echo   Vercel se tu dong build trong 1-2 phut.
echo  ============================================

:END
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
