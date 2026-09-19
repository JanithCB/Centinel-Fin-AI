-- PG-BE-1B: Create family_members table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
    id                BIGSERIAL PRIMARY KEY,
    family_id         BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id           BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    relationship_role VARCHAR(20) NOT NULL,    -- PARENT | CHILD
    created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, user_id)
);
