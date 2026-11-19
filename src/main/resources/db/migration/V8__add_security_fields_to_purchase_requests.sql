-- V8: Add cryptographic & idempotency security fields to purchase_requests
ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS idempotency_hash VARCHAR(64);

ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS rsa_signature TEXT;

-- Index to guarantee lightning-fast lookup for deduplication
CREATE INDEX IF NOT EXISTS idx_purchase_requests_idempotency_hash 
ON purchase_requests(idempotency_hash);
