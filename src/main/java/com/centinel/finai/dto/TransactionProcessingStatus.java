package com.centinel.finai.dto;

/**
 * Lifecycle status of an ingested transaction notification as it moves
 * through the processing pipeline.
 */
public enum TransactionProcessingStatus {
    RULE_CATEGORIZED,
    PENDING_AI,
    PARSE_FAILED,
    REJECTED,
    DUPLICATE
}
