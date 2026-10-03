@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  کارجوی هرات — اجرای آفلاین
echo.
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 run-offline.py
  goto :end
)
where python >nul 2>&1
if %errorlevel%==0 (
  python run-offline.py
  goto :end
)
where python3 >nul 2>&1
if %errorlevel%==0 (
  python3 run-offline.py
  goto :end
)
echo Python روی این کامپیوتر پیدا نشد.
echo از python.org نسخه ۳ را نصب کنید، بعد دوباره این فایل را باز کنید.
echo.
pause
exit /b 1
:end
pause
