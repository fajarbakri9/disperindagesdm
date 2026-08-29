@echo off
chcp 65001 > nul
echo ============================================================
echo   SINKRONISASI RILIS BERITA & DEPLOY PORTAL DISPERINDAG ESDM
echo ============================================================
echo.
python sync_and_deploy.py
echo.
pause
