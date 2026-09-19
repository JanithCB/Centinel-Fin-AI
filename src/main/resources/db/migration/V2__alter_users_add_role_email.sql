-- PG-BE-1A: Add UserRole and email to users table
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two new columns to the existing `users` table.
-- Backward-compatible: existing rows default to CHILD, email is nullable.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add role column; default all existing users to CHILD (safe fallback).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'CHILD';

-- Add email column; nullable to preserve existing SMS-only rows.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add unique constraint on email (only applies when email is not null).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users (email)
    WHERE email IS NOT NULL;
