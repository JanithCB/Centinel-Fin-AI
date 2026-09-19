CREATE TABLE purchase_requests (
    id              BIGSERIAL PRIMARY KEY,
    family_id       BIGINT       NOT NULL REFERENCES families(id),
    child_id        BIGINT       NOT NULL REFERENCES users(id),
    site_domain     VARCHAR(255),
    item_name       VARCHAR(500),
    amount          NUMERIC(19,4),
    currency        VARCHAR(10)  NOT NULL DEFAULT 'USD',
    category        VARCHAR(100),
    note            TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    decided_at      TIMESTAMP WITHOUT TIME ZONE
);
