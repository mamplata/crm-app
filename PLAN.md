# PLAN.md

## Project
AI-Powered CRM Automation Platform

## Goal
Build a production-style CRM that demonstrates backend engineering, frontend development, workflow automation, SaaS integration, and bounded AI classification.

## Core Stack
- Backend: Symfony
- Frontend: Angular
- Database: PostgreSQL
- Automation: n8n Community Edition
- Scripting / data processing: Python
- Local AI: Ollama with a small 3B-class model
- Containers: Docker Compose
- External integrations: HubSpot Free CRM + Telegram or Discord
- API style: REST + webhooks

## Primary Portfolio Objective
Show that the developer can build and integrate business systems, not just CRUD applications.

The project should demonstrate:
- REST API design
- authentication and authorization
- PostgreSQL data modeling
- external API integrations
- incoming and outgoing webhooks
- OAuth where supported
- idempotency
- retries and failure handling
- automation orchestration with n8n
- local AI classification
- human review for uncertain AI output
- audit and automation history
- Dockerized local development

## Main CRM Domain
### Entities
- User
- Company
- Contact
- Lead
- Deal
- Activity
- Task
- Pipeline
- PipelineStage
- AutomationRun
- IntegrationConnection
- WebhookEvent

### Lead Lifecycle
1. Lead enters from Angular form or external webhook.
2. Symfony validates and stores the lead.
3. Symfony emits an automation event/webhook.
4. n8n receives the event.
5. n8n requests AI classification.
6. Local AI returns structured intent/priority/summary data.
7. n8n updates the lead through the Symfony API.
8. Qualified/high-priority leads are synchronized to HubSpot.
9. High-priority leads trigger Telegram/Discord notifications.
10. Failures are recorded and can be retried manually.

## AI Scope
The AI component is intentionally bounded.

Use it for:
- intent classification
- urgency / priority classification
- short summary generation
- industry/category extraction
- optional entity extraction

Do not use the AI model for:
- authorization
- financial calculations
- database decisions
- retry rules
- lead assignment rules
- irreversible business actions

Expected structured response:

```json
{
  "intent": "PRICING_INQUIRY",
  "priority": "HIGH",
  "industry": "healthcare",
  "summary": "Prospect is requesting pricing for a multi-site inventory system.",
  "confidence": 0.91
}
```

If confidence is below the configured threshold, route the lead to human review.

## Integrations
### HubSpot
Use HubSpot as the external CRM integration.

Initial capabilities:
- create/update contact
- create/update company
- create deal
- synchronize selected lead/deal fields

### Telegram or Discord
Use for operational notifications:
- high-priority lead
- automation failure
- integration failure
- manual review required

## Non-Goals for v1
Do not build:
- full Salesforce replacement
- accounting system
- marketing email designer
- advanced AI agents
- autonomous browser agents
- multi-tenant SaaS billing
- mobile application

## Development Phases

### Phase 1 — Foundation
- Symfony API
- Angular app
- PostgreSQL
- Docker Compose
- basic authentication
- health checks

### Phase 2 — CRM Core
- Companies
- Contacts
- Leads
- Deals
- Pipeline/stages
- Activities/tasks
- Angular CRUD and filtering

### Phase 3 — Automation Infrastructure
- n8n container
- webhook event model
- outgoing automation webhook
- automation run tracking
- retry support
- idempotency keys

### Phase 4 — AI Classification
- Python classifier adapter/service
- Ollama integration
- strict JSON schema
- confidence threshold
- human-review state
- test dataset for classification quality

### Phase 5 — External SaaS Integrations
- HubSpot integration
- Telegram/Discord notifications
- integration credentials configuration
- integration logs and failure states

### Phase 6 — Reliability
- webhook signature verification
- duplicate event protection
- retries/backoff
- dead/failure state
- manual replay
- audit history
- structured logging

### Phase 7 — Portfolio Polish
- seed/demo data
- screenshots
- architecture diagram
- README
- demo workflow
- test coverage
- sample n8n workflow export

## Definition of Done
The project is portfolio-ready when a reviewer can:

1. Start the stack with Docker Compose.
2. Log into the Angular CRM.
3. Create a lead.
4. Observe an automation run.
5. See the lead classified by the local AI model.
6. See the CRM updated with intent, priority, summary, and confidence.
7. See the record synchronized to HubSpot.
8. Receive a high-priority notification.
9. Trigger a failed integration and see it recorded.
10. Retry the failed automation successfully.
