package com.centinel.finai.dto;

/**
 * Identifies the mechanism through which a transaction was assigned a category.
 */
public enum CategorizationSource {
    RULE_BASED,
    AI_FALLBACK,
    MANUAL,
    UNCATEGORIZED
}
