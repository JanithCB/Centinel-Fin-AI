-- PG-BE-1C: Add auth_id to users table for Supabase UUID tracking
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id
    ON users (auth_id)
    WHERE auth_id IS NOT NULL;
