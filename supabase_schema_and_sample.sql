-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    raw_message TEXT,
    amount NUMERIC,
    currency VARCHAR(10),
    merchant VARCHAR(255),
    category VARCHAR(255),
    transaction_date TIMESTAMP WITHOUT TIME ZONE,
    pending_for_ai BOOLEAN DEFAULT TRUE,
    is_ai_categorized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
      REFERENCES users(id)
      ON DELETE CASCADE
);

-- 3. Create ingested_messages table (for webhook & raw message ingestion events)
CREATE TABLE IF NOT EXISTS ingested_messages (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    external_message_id VARCHAR(255) NOT NULL UNIQUE,
    user_reference VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Sample Insert Script
-- Insert a sample user
INSERT INTO users (phone_number, display_name) 
VALUES ('+1234567890', 'Test User') 
ON CONFLICT (phone_number) DO NOTHING;

-- Insert a sample transaction for the above user
INSERT INTO transactions (user_id, raw_message, amount, currency, merchant, category, transaction_date)
VALUES (
    (SELECT id FROM users WHERE phone_number = '+1234567890'),
    'Spent $15.50 at Starbucks on coffee',
    15.50,
    'USD',
    'Starbucks',
    'Food & Beverage',
    NOW()
);

-- Insert a sample ingested message
INSERT INTO ingested_messages (source, external_message_id, user_reference, message_text, received_at, status)
VALUES (
    'mock_n8n',
    'mock-msg-001',
    'demo-user-001',
    'LKR 2,500.00 was spent at Keells Super using card ending 1234 on 2026-09-05.',
    NOW(),
    'PENDING'
)
ON CONFLICT (external_message_id) DO NOTHING;

