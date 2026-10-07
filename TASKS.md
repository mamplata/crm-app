# TASKS.md

## Rules for Codex
- Implement tasks in order unless a dependency requires otherwise.
- Do not introduce major libraries without documenting why.
- Keep the application runnable after each milestone.
- Prefer small, reviewable commits.
- Add tests with each business-critical feature.
- Do not hardcode credentials.
- Update README when setup changes.
- Avoid speculative features outside PLAN.md.

---

# Milestone 0 — Repository Bootstrap

- [x] Create repository structure.
- [x] Add root `.gitignore`.
- [x] Add `.env.example`.
- [x] Add Docker Compose.
- [x] Add PostgreSQL service.
- [x] Add Symfony backend service.
- [x] Add Angular frontend service.
- [x] Add n8n Community Edition service.
- [x] Add Python AI service placeholder.
- [x] Add health checks.
- [x] Confirm stack starts locally.

Acceptance:
- `docker compose up` starts the required services.
- Symfony can connect to PostgreSQL.
- Angular can reach Symfony.
- n8n UI is reachable locally.
- Python service exposes `/health`.

---

# Milestone 1 — Authentication

- [x] User entity.
- [x] Password hashing.
- [x] Login API.
- [x] Token/session approach.
- [x] Angular login page.
- [x] Route protection.
- [x] Current-user endpoint.
- [x] Authentication tests.

Acceptance:
- Anonymous users cannot access protected CRM endpoints.
- Valid user can log in and access CRM UI.

---

# Milestone 2 — CRM Data Model

Implement:
- [x] Company
- [x] Contact
- [x] Lead
- [x] Deal
- [x] Pipeline
- [x] PipelineStage
- [x] Activity
- [x] Task

Requirements:
- UUID identifiers preferred.
- created_at / updated_at timestamps.
- validation.
- useful indexes.
- database migrations.

Acceptance:
- Schema can be created from migrations.
- Fixtures/seed data available.

---

# Milestone 3 — CRM REST API

- [x] Company CRUD.
- [x] Contact CRUD.
- [x] Lead CRUD.
- [x] Deal CRUD.
- [x] Pipeline/stage endpoints.
- [x] Activity/task endpoints.
- [x] Pagination.
- [x] Filtering.
- [x] Sorting.
- [x] API validation errors.
- [x] API tests.

Acceptance:
- Main CRM resources can be managed entirely through REST.

---

# Milestone 4 — Angular CRM UI

- [x] App shell/navigation.
- [x] Dashboard.
- [x] Companies.
- [x] Contacts.
- [x] Leads.
- [x] Deals.
- [x] Pipeline board/list.
- [x] Tasks/activities.
- [x] Loading/error states.
- [x] Reusable API services.

Acceptance:
- User can complete standard CRM workflows from Angular.

---

# Milestone 5 — Automation Domain

Create:
- [x] AutomationRun entity.
- [x] WebhookEvent entity.
- [x] IntegrationConnection entity.

AutomationRun fields should include:
- id
- workflow
- status
- correlation_id
- entity_type
- entity_id
- attempt
- input
- output
- error
- started_at
- finished_at

Acceptance:
- CRM records automation execution history independently of n8n.

---

# Milestone 6 — Lead Created Webhook

- [x] Create event payload schema.
- [x] Generate unique event ID.
- [x] Send webhook to n8n.
- [x] Store WebhookEvent.
- [x] Implement retry behavior.
- [x] Implement idempotency protection.
- [x] Tests.

Acceptance:
Creating a lead causes one logical `lead.created` event even if delivery is retried.

---

# Milestone 7 — n8n Lead Workflow

Workflow:
1. Receive `lead.created`.
2. Validate payload.
3. Call AI classifier.
4. Validate classifier result.
5. Call Symfony callback/update endpoint.
6. Continue to external integrations.
7. Record success/failure.

- [x] Export workflow JSON into repository.
- [x] Document required n8n credentials/env.
- [x] Add error branch.

Acceptance:
Lead creation visibly produces an n8n execution.

---

# Milestone 8 — Local AI Classifier

Python service:
- [x] `/health`.
- [x] `/classify-lead`.
- [x] Ollama client.
- [x] strict classifier prompt.
- [x] JSON schema validation.
- [x] controlled enums.
- [x] timeout.
- [x] malformed output handling.
- [x] tests.

Classifier output:
- intent
- priority
- industry
- summary
- confidence

Acceptance:
A representative fixture set can be classified without manual prompt editing.

---

# Milestone 9 — Human Review

- [x] Configure confidence threshold.
- [x] Mark uncertain classification as NEEDS_REVIEW.
- [x] Add Angular review queue.
- [x] Allow user to correct classification.
- [x] Store original AI output and corrected value.

Acceptance:
Low-confidence model output never automatically drives high-impact workflow steps.

---

# Milestone 10 — HubSpot Integration

- [x] Create HubSpot developer/free account integration configuration.
- [x] Implement API client.
- [x] Contact sync.
- [x] Company sync.
- [x] Deal sync.
- [x] Store external IDs.
- [x] Handle rate limits/errors.
- [x] Log integration attempts.

Acceptance:
A qualified CRM lead can create/update corresponding HubSpot records.

---

# Milestone 11 — Notification Integration

Choose Telegram or Discord.

- [ ] High-priority lead notification.
- [ ] Automation-failure notification.
- [ ] Manual-review notification.
- [ ] Prevent duplicate notifications.

Acceptance:
Relevant workflow events produce one clear external notification.

---

# Milestone 12 — Reliability

- [ ] Exponential retry/backoff.
- [ ] Max retry policy.
- [ ] Manual replay endpoint/UI.
- [ ] Idempotent callbacks.
- [ ] Duplicate webhook handling.
- [ ] Integration timeout handling.
- [ ] Structured logs.
- [ ] Correlation IDs.

Acceptance:
Intentionally breaking an external integration produces a recoverable FAILED state.

---

# Milestone 13 — Dashboard / Observability

Dashboard metrics:
- [ ] total leads
- [ ] high-priority leads
- [ ] automation success count
- [ ] automation failure count
- [ ] manual review count
- [ ] recent automation runs
- [ ] average automation duration

Acceptance:
User can understand current automation health without opening n8n.

---

# Milestone 14 — Portfolio Readiness

- [ ] Demo seed data.
- [ ] Clean README.
- [ ] Architecture diagram.
- [ ] Setup instructions.
- [ ] Screenshots.
- [ ] Example webhook payloads.
- [ ] n8n workflow export.
- [ ] Example classifier fixtures.
- [ ] Explain design decisions.
- [ ] Explain AI limitations.
- [ ] Explain retry/idempotency design.
- [ ] Add sample demo script / walkthrough.

Final demo:
1. Create lead.
2. n8n runs.
3. AI classifies.
4. CRM updates.
5. HubSpot syncs.
6. notification fires.
7. automation history appears.
8. simulate failure.
9. retry successfully.
