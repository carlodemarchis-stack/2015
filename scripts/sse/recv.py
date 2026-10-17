# One-shot local receiver: the browser page POSTs JSON here, it is written to sse_raw.json.
import http.server, os
OUT = os.path.join(os.environ.get("TMPDIR", "/tmp"), "sse_raw.json")  # outside the repo
class H(http.server.BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        open(OUT, "wb").write(body)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b"ok %d" % n)
http.server.HTTPServer(("127.0.0.1", 8799), H).serve_forever()
