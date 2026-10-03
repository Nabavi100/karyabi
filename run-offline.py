#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Run Karjoy Herat fully offline (no internet). Double-click or: python run-offline.py"""
import os
import sys
import threading
import time
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
sys.path.insert(0, ROOT)

PORT = int(os.environ.get("PORT", "8080"))
HOST = "127.0.0.1"
APP = "http://127.0.0.1:%s/" % PORT
ADMIN = "http://127.0.0.1:%s/admin.html" % PORT


def open_browser():
    time.sleep(0.9)
    try:
        webbrowser.open(APP)
    except Exception:
        pass


def main():
    import server as karjo_server
    from http.server import ThreadingHTTPServer

    karjo_server.HOST = "0.0.0.0"
    karjo_server.PORT = PORT
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), karjo_server.Handler)
    threading.Thread(target=open_browser, daemon=True).start()
    print("")
    print("  کارجوی هرات — حالت آفلاین")
    print("  برنامه:   " + APP)
    print("  مدیریت:  " + ADMIN)
    print("  رمز مدیر: nabavi")
    print("  برای توقف: Ctrl+C")
    print("")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nتوقف شد.")


if __name__ == "__main__":
    main()
