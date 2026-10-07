CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY,
    workflow VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    correlation_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
    input JSONB,
    output JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry VARCHAR(30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_original JSONB;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('NEW', 'NEEDS_REVIEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'));

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
    config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_runs_correlation_id_idx ON automation_runs(correlation_id);
CREATE INDEX IF NOT EXISTS automation_runs_status_idx ON automation_runs(status);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events(status);
CREATE INDEX IF NOT EXISTS integration_connections_provider_idx ON integration_connections(provider);
