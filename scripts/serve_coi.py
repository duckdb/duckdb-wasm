#!/usr/bin/env python3
"""Serve a directory with the headers that make a page cross-origin isolated.

DuckDB-Wasm selects the wasm_threads bundle only on an isolated page, and
http-server cannot send these headers.
"""

import functools
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


Handler.extensions_map.update({".wasm": "application/wasm", ".js": "text/javascript"})


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] != "--open"):
        sys.exit("Usage: serve_coi.py <directory> <port> [--open]")
    root, port = sys.argv[1], int(sys.argv[2])
    url = f"http://127.0.0.1:{port}/original.html?local-extensions"
    server = ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=root))
    print(f"Serving {root} with COOP/COEP headers at {url}")
    if len(sys.argv) == 4:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
