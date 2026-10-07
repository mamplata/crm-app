from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://host.docker.internal:11434').rstrip('/')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2:3b')
TIMEOUT_SECONDS = float(os.getenv('OLLAMA_TIMEOUT_SECONDS', '30'))
PRIORITIES = {'LOW', 'MEDIUM', 'HIGH'}
INDUSTRIES = {'SAAS', 'SERVICES', 'RETAIL', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE', 'REAL_ESTATE', 'EDUCATION', 'OTHER'}


def validate_lead(lead: object) -> dict:
    if not isinstance(lead, dict) or not str(lead.get('name', '')).strip() or not str(lead.get('message', '')).strip():
        raise ValueError('name and message are required')
    return lead


def validate_result(result: object) -> dict:
    if not isinstance(result, dict):
        raise ValueError('classifier output must be an object')
    if not isinstance(result.get('intent'), str) or not result['intent'].strip():
        raise ValueError('intent must be a non-empty string')
    if result.get('priority') not in PRIORITIES:
        raise ValueError('priority is invalid')
    if result.get('industry') not in INDUSTRIES:
        raise ValueError('industry is invalid')
    if not isinstance(result.get('summary'), str) or not result['summary'].strip():
        raise ValueError('summary must be a non-empty string')
    confidence = result.get('confidence')
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise ValueError('confidence must be between 0 and 1')
    return {key: result[key] for key in ('intent', 'priority', 'industry', 'summary', 'confidence')}


def classify(lead: dict) -> dict:
    prompt = f'''Classify this CRM lead and return exactly one JSON object. Do not use markdown.
Required keys: intent, priority, industry, summary, confidence. Every key is required.
priority must be LOW, MEDIUM, or HIGH.
industry must be one of SAAS, SERVICES, RETAIL, MANUFACTURING, HEALTHCARE, FINANCE, REAL_ESTATE, EDUCATION, OTHER.
summary must be a concise, non-empty string.
confidence must be a number from 0 to 1.
Lead:
{json.dumps(lead, ensure_ascii=False)}'''
    request = Request(
        f'{OLLAMA_URL}/api/generate',
        data=json.dumps({'model': OLLAMA_MODEL, 'prompt': prompt, 'format': 'json', 'stream': False, 'options': {'temperature': 0}}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            output = json.loads(response.read())
    except HTTPError as error:
        raise RuntimeError(f'Ollama returned HTTP {error.code}') from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError('Ollama is unavailable') from error
    try:
        return validate_result(json.loads(output['response']))
    except (KeyError, json.JSONDecodeError, TypeError) as error:
        raise ValueError('Ollama returned malformed JSON') from error


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != '/classify-lead':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            lead = validate_lead(json.loads(self.rfile.read(length)))
            self.respond(200, classify(lead))
        except ValueError as error:
            self.respond(400, {'error': str(error)})
        except RuntimeError as error:
            self.respond(503, {'error': str(error)})
        except (json.JSONDecodeError, TypeError):
            self.respond(400, {'error': 'request body must be valid JSON'})

    def respond(self, status: int, payload: dict):
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
