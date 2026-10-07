# CRM App

An Angular CRM frontend with a PHP API, PostgreSQL database, and AI classifier service.

## Run locally

Requirements: Docker and Docker Compose.

```bash
./dev.sh
```

Frontend source is mounted into Docker, so edits under `frontend/` reload automatically. Rebuild only after changing dependencies or Docker configuration.

Open:

- Frontend: http://localhost:4200
- Backend health: http://localhost:8001/health
- AI health: http://localhost:8000/health
- n8n: http://localhost:5678

Set `N8N_WEBHOOK_URL` in `.env` to the n8n webhook URL. Lead creation stores a
`lead.created` event and retries delivery up to three times. Failed events can
be retried with `POST /api/webhook-events/{id}?action=retry`.
Leads below `CLASSIFICATION_REVIEW_THRESHOLD` (default `0.7`) appear in the
Angular Review queue, with the original AI result preserved in `ai_original`.
Qualified leads can be synced with `POST /api/leads/{id}?action=hubspot-sync`.
HubSpot rate limits and temporary server failures retry up to three times.

## Project structure

- `frontend/` — Angular application
- `backend/` — PHP API and database migrations
- `ai/classifier/` — AI classification service
- `docker-compose.yml` — local development services

To stop the stack:

```bash
docker compose down
```
