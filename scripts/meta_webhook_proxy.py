from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

BACKEND = 'http://127.0.0.1:8001/api/meta/webhook'
PATH = '/api/meta/webhook'


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.forward()

    def do_POST(self):
        self.forward()

    def forward(self):
        if urlsplit(self.path).path != PATH or self.command not in {'GET', 'POST'}:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))) if self.command == 'POST' else None
        request = Request(BACKEND + ('?' + urlsplit(self.path).query if urlsplit(self.path).query else ''), data=body, method=self.command)
        if body is not None:
            request.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))
        try:
            with urlopen(request, timeout=10) as response:
                payload = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(payload)
        except HTTPError as error:
            self.send_response(error.code)
            self.end_headers()
            self.wfile.write(error.read())
        except URLError:
            self.send_error(502, 'Backend unavailable')

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    # ponytail: dev-only single-purpose proxy; use managed ingress for production.
    ThreadingHTTPServer(('127.0.0.1', 18080), Handler).serve_forever()
