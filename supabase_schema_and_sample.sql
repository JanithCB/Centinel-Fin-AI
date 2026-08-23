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

-- 3. Sample Insert Script
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
