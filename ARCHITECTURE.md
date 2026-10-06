# ARCHITECTURE.md

## System Overview

```text
                         +-------------------+
                         |      Angular      |
                         |     CRM Web UI    |
                         +---------+---------+
                                   |
                                  REST
                                   |
                         +---------v---------+
                         |      Symfony      |
                         |      CRM API      |
                         +----+----+----+----+
                              |    |    |
                       PostgreSQL  |    +------------------+
                              |    |                       |
                              |   webhook                  | REST API
                              |    |                       |
                              | +--v----------------+   +--v-----------+
                              | |       n8n         |   |   HubSpot    |
                              | |  Orchestration    |   |  External CRM|
                              | +--+---------+------+   +--------------+
                              |    |         |
                              |    |         +---------------------+
                              |    |                               |
                              | HTTP                              API
                              |    |                               |
                              | +--v------------+             +----v------+
                              | | Python / AI   |             | Telegram /|
                              | | Classifier    |             | Discord   |
                              | +-------+-------+             +-----------+
                              |         |
                              |       Ollama
                              |         |
                              |      3B Model
```

## Repository Layout

```text
/
├── backend/                 # Symfony
├── frontend/                # Angular
├── automation/
│   ├── n8n/                 # workflow exports / docs
│   └── scripts/             # helper scripts
├── ai/
│   ├── classifier/          # Python service
│   └── fixtures/            # test inputs / expected outputs
├── docker/
├── docs/
├── docker-compose.yml
├── .env.example
├── README.md
├── PLAN.md
├── ARCHITECTURE.md
└── TASKS.md
```

## Application Design Principles

Follow pragmatic object-oriented design inside each service:

- **Entities** represent domain identity and lifecycle. Keep invariants and state transitions in the entity or a domain service, not in controllers or Angular components.
- **Value objects** represent validated concepts such as email addresses, money, statuses, and identifiers when the concept has rules of its own.
- **Use-case services** coordinate one business operation. They may depend on ports/interfaces, but must not depend on HTTP, framework requests, or vendor SDK details.
- **Repositories** persist and retrieve domain objects. Query/persistence details stay behind the repository boundary.
- **Adapters** implement external concerns such as PostgreSQL, HubSpot, n8n, Ollama, and Telegram/Discord.
- **Controllers and message handlers** translate transport data into commands/DTOs, call one use case, and translate the result back. They contain no business rules.
- **DTOs** cross API, webhook, and integration boundaries. Do not expose ORM entities directly as public API contracts.
- **Dependency direction** points inward: transport and infrastructure depend on application/domain code; domain code does not depend on Symfony, Angular, n8n, or vendor SDKs.
- Prefer composition and small focused classes. Do not add interfaces, factories, or abstractions without a second implementation or a real boundary to protect.

### Backend Boundary

Use this flow for business operations:

```text
HTTP/Webhook -> Controller -> DTO/Command -> Use Case -> Domain -> Repository/Port
                                                        -> Event/Integration Port
Infrastructure adapters implement Repository/Port interfaces.
```

Symfony controllers, Doctrine entities, Messenger handlers, and integration clients are delivery/infrastructure details. The use-case layer owns orchestration; the domain layer owns business rules.

### Frontend Boundary

Use Angular with strict TypeScript and standalone components.

- Organize code by feature, for example `features/leads/`, rather than one global folder for components, services, and models.
- Components own rendering, user interaction, and local presentation state. Keep them small; move reusable behavior into a service or directive.
- Feature services own API calls and feature state. Components should not build URLs, call `HttpClient` directly, or contain workflow rules.
- Use typed interfaces/types for API DTOs, request payloads, responses, and UI state. Avoid `any`; use `unknown` at untrusted boundaries and narrow it through validation.
- Keep API DTO types separate from form models and display models when their shapes or responsibilities differ.
- Put cross-feature infrastructure in `core/` (HTTP interceptors, authentication, API client setup) and reusable visual code in `shared/`. Do not put business logic in either folder.
- Prefer Angular dependency injection and composition over inheritance. Use inheritance only for a genuine shared behavioral contract.
- Use reactive forms for non-trivial forms and centralize mapping between form values and API payloads.
- Handle loading, empty, success, and error states explicitly. Do not hide failed requests or silently use stale data.
- Use route guards for navigation experience, but enforce authentication and authorization in Symfony.
- Keep state local by default. Introduce shared/global state only when multiple distant features truly need the same live state.
- Use `OnPush` change detection and Angular signals/observables consistently with the chosen state flow; do not mix competing state patterns without a reason.

Recommended feature flow:

```text
Component -> Feature Service -> API Client/HttpClient -> Symfony REST API
     ^              |
     +---- typed view state / DTO mapping
```

TypeScript is a compile-time safety boundary, not runtime validation. Validate API responses and user-controlled data at runtime where the application relies on their shape. Business-critical validation remains in Symfony; Angular validation provides immediate user feedback only.

## System Design Rules

- Symfony is the source of truth; all other systems are consumers, workers, or adapters.
- API requests should be stateless. Persist workflow state in Symfony and use correlation IDs across every asynchronous boundary.
- Treat every webhook and callback as at-least-once delivery: require an event ID, validate the schema, persist the event, and make processing idempotent.
- Keep slow or failure-prone work asynchronous through n8n/Messenger. User-facing requests should persist the command and return without waiting on AI or SaaS integrations where practical.
- Apply bounded timeouts, retries with backoff, and a terminal failure/manual-review state to external calls. Retries must not create duplicate records or notifications.
- Version public payloads and events. Make additive changes compatible; use a new version for breaking changes.
- Enforce authorization at the Symfony use-case boundary, validate all untrusted input, and keep secrets out of source control and event payloads.
- Emit structured logs with `event_id`, `correlation_id`, entity ID, operation, status, and duration. Never log secrets or unnecessary PII.

These rules are design constraints for new code and a review checklist for each milestone; they do not require speculative layers before a second use case or integration exists.

## Backend Responsibilities — Symfony
Symfony is the system of record.

Responsibilities:
- authentication
- authorization
- CRM domain logic
- validation
- persistence
- REST API
- webhook endpoints
- external integration adapters
- automation run state
- audit trail
- idempotency enforcement

Recommended Symfony components/features:
- Doctrine ORM
- Validator
- Security
- Serializer
- Messenger
- HttpClient
- EventDispatcher
- RateLimiter
- Monolog

## Frontend Responsibilities — Angular
Angular should focus on:
- authenticated CRM UI
- lead/contact/company management
- pipeline/deal views
- automation history
- integration status
- manual review queue
- retry/replay actions

Avoid putting business-critical workflow rules in Angular.

## n8n Responsibilities
n8n orchestrates cross-system workflows.

Examples:
- lead-created workflow
- AI classification workflow
- HubSpot synchronization
- high-priority alerting
- failed-run escalation

n8n should not become the system of record.

Symfony owns canonical state.

### Lead Classification Flow

```text
1. Symfony creates the lead and stores lead.created in WebhookEvent.
2. Symfony sends the versioned event to the n8n webhook.
3. n8n validates the event and starts an AutomationRun.
4. n8n calls Python: POST /classify-lead.
5. Python builds the bounded prompt and calls Ollama internally.
6. Python parses and validates the model's JSON response.
7. Python returns classification data and confidence to n8n.
8. n8n calls Symfony's callback/update endpoint with the result.
9. Symfony applies authorization and business rules, then updates the lead.
10. n8n continues to HubSpot/notification steps only when Symfony accepts the result.
```

n8n owns workflow sequencing, branching, retries, and cross-system calls. It does not own CRM data, classification rules, authorization, or permanent business state. A workflow may be re-run safely because the event ID and correlation ID are carried through every node.

On failure, n8n records the error and attempt, then retries bounded transient failures. Symfony remains the source of truth for the final `SUCCEEDED`, `FAILED`, or `NEEDS_REVIEW` state. Duplicate events, callbacks, and notifications must be ignored using their idempotency keys.

## Python AI Service
Expose a small internal HTTP API, for example:

`POST /classify-lead`

Input:
```json
{
  "lead_id": "uuid",
  "message": "We need inventory software for seven branches."
}
```

Output:
```json
{
  "intent": "SOFTWARE_INQUIRY",
  "priority": "HIGH",
  "industry": "retail",
  "summary": "Prospect needs a multi-branch inventory solution.",
  "confidence": 0.92
}
```

Responsibilities:
- prompt construction
- Ollama request
- response parsing
- schema validation
- confidence normalization
- fallback/error response

The Python service is a stateless adapter, not a CRM service. It does not access PostgreSQL, update leads, send notifications, or decide authorization. Its only business-facing output is a validated classification result:

- controlled `intent`, `priority`, and `industry` values
- short `summary`
- numeric `confidence` between `0` and `1`

Malformed model output, timeouts, unavailable Ollama, and invalid values return a controlled failure to n8n. The AI result is treated as untrusted input. Symfony decides whether low confidence becomes `NEEDS_REVIEW` and whether any downstream action is allowed.

### AI Safety Boundary

```text
n8n -> Python classifier -> Ollama model
                         <- validated JSON
n8n -> Symfony callback -> authorization/business rules -> CRM state
```

Keep Ollama private to the Docker network. Send only the lead message and minimum context needed for classification; do not send credentials, internal notes, or unnecessary PII. Never use the model for authorization, financial calculations, retry policy, lead assignment, or irreversible actions.

## Webhook Design

### Outgoing Symfony Event
Example:
`POST n8n /webhook/lead-created`

Payload:
```json
{
  "event_id": "uuid",
  "event_type": "lead.created",
  "occurred_at": "2026-10-06T08:00:00+08:00",
  "lead_id": "uuid",
  "data": {
    "name": "Example Lead",
    "email": "lead@example.com",
    "message": "..."
  }
}
```

### Required Reliability Fields
Every webhook/event should contain:
- unique event ID
- event type
- timestamp
- entity ID
- schema version

Use the event ID as an idempotency key.

## Failure Model
Automation runs should support:
- PENDING
- RUNNING
- SUCCEEDED
- FAILED
- NEEDS_REVIEW
- RETRYING

Store:
- workflow name
- correlation ID
- input snapshot
- output snapshot
- attempt count
- failure message
- started/finished timestamps

## Security
- Never commit secrets.
- Use `.env`.
- Validate webhook signatures where available.
- Keep n8n admin interface private/local in development.
- Do not expose Ollama publicly.
- Apply authentication between internal services where practical.
- Sanitize data before sending it to third-party SaaS.
- Avoid sending unnecessary PII to the AI classifier.

## Testing Strategy

### Symfony
- unit tests for domain/business rules
- integration tests for repositories/services
- API tests for endpoints
- webhook/idempotency tests

### Angular
- component tests for core UI
- service tests
- basic end-to-end happy path later

### Python
- schema parsing tests
- deterministic fixture tests
- invalid-model-output tests

### Automation
Maintain sample n8n workflow exports and documented test scenarios.

## Observability
Minimum:
- structured Symfony logs
- automation run table
- n8n execution history
- correlation IDs across systems

Optional:
- simple dashboard for success/failure counts
- average automation duration
- number of manual reviews
