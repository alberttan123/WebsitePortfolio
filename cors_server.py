import http.server
import socketserver

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        return super().end_headers()

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
