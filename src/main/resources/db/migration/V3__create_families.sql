-- PG-BE-1B: Create families table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);
