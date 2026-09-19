CREATE TABLE approval_decisions (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT      NOT NULL REFERENCES purchase_requests(id),
    parent_id           BIGINT      NOT NULL REFERENCES users(id),
    decision            VARCHAR(20) NOT NULL,
    reason              TEXT,
    decided_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);
