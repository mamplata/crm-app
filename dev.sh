#!/usr/bin/env bash
set -euo pipefail

docker compose up --build -d

cat <<'EOF'

CRM development stack is running:
  Angular:  http://localhost:4200
  Backend:  http://localhost:8001/health
  AI:       http://localhost:8000/health
  n8n:      http://localhost:5678
  Postgres: localhost:55432
EOF
