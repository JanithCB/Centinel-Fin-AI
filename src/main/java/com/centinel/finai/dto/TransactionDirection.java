package com.centinel.finai.dto;

/**
 * Indicates whether a transaction represents an outflow (expense/debit)
 * or an inflow (income/credit).
 */
public enum TransactionDirection {
    DEBIT,
    CREDIT,
    UNKNOWN
}
