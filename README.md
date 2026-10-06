# CRM App

An Angular CRM frontend with a PHP API, PostgreSQL database, and AI classifier service.

## Run locally

Requirements: Docker and Docker Compose.

```bash
./dev.sh
```

Open:

- Frontend: http://localhost:4200
- Backend health: http://localhost:8001/health
- AI health: http://localhost:8000/health
- n8n: http://localhost:5678

## Project structure

- `frontend/` — Angular application
- `backend/` — PHP API and database migrations
- `ai/classifier/` — AI classification service
- `docker-compose.yml` — local development services

To stop the stack:

```bash
docker compose down
```
