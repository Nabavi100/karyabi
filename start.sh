#!/bin/sh
cd "$(dirname "$0")"
echo
echo " کارجوی هرات — اجرای آفلاین"
echo
if command -v python3 >/dev/null 2>&1; then
  exec python3 run-offline.py
elif command -v python >/dev/null 2>&1; then
  exec python run-offline.py
else
  echo "Python پیدا نشد. python3 را نصب کنید."
  exit 1
fi
