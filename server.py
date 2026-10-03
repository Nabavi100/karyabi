#!/usr/bin/env python3
"""Static app + JSON database next to index.html (merge-safe)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os

ROOT = Path(__file__).resolve().parent
DB_FILE = ROOT / "karjo-db.json"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8080"))


def read_db():
    if not DB_FILE.exists():
        return {}
    try:
        data = json.loads(DB_FILE.read_text(encoding="utf-8") or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def write_db(obj):
    DB_FILE.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def _json(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.split("?", 1)[0] in ("/api/db", "/karjo-db.json"):
            data = DB_FILE.read_bytes() if DB_FILE.exists() else b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/api/db":
            self.send_error(404)
            return
        raw = self._read_body()
        try:
            obj = json.loads(raw.decode("utf-8") or "{}")
            if not isinstance(obj, dict):
                raise ValueError("object required")
        except Exception as e:
            self._json(400, {"ok": False, "error": str(e)})
            return

        replace = bool(obj.pop("_replace", False)) or (
            self.headers.get("X-Karjo-Mode") == "replace"
        )
        current = read_db()
        if replace:
            saved = obj
        else:
            saved = dict(current)
            for k, v in obj.items():
                if v is not None:
                    saved[k] = v
        write_db(saved)
        self._json(
            200,
            {
                "ok": True,
                "file": "karjo-db.json",
                "merged": not replace,
                "keys": list(saved.keys()),
            },
        )

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Karjoy Herat http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()
