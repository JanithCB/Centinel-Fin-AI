package com.centinel.finai.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data transfer object encapsulating the results of rule-based field extraction
 * from raw transaction notifications.
 */
public class ParsedTransactionData {

    private boolean success;
    private BigDecimal amount;
    private String currency;
    private String merchant;
    private TransactionDirection direction;
    private LocalDateTime transactionDate;
    private String rawMessage;
    private String failureReason;

    public ParsedTransactionData() {
    }

    public static ParsedTransactionData success(
            BigDecimal amount,
            String currency,
            String merchant,
            TransactionDirection direction,
            LocalDateTime transactionDate,
            String rawMessage) {

        ParsedTransactionData data = new ParsedTransactionData();
        data.success = true;
        data.amount = amount;
        data.currency = currency;
        data.merchant = merchant;
        data.direction = direction != null ? direction : TransactionDirection.UNKNOWN;
        data.transactionDate = transactionDate;
        data.rawMessage = rawMessage;
        return data;
    }

    public static ParsedTransactionData failure(String failureReason, String rawMessage) {
        ParsedTransactionData data = new ParsedTransactionData();
        data.success = false;
        data.failureReason = failureReason;
        data.rawMessage = rawMessage;
        data.direction = TransactionDirection.UNKNOWN;
        return data;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public TransactionDirection getDirection() {
        return direction;
    }

    public void setDirection(TransactionDirection direction) {
        this.direction = direction;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getRawMessage() {
        return rawMessage;
    }

    public void setRawMessage(String rawMessage) {
        this.rawMessage = rawMessage;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    @Override
    public String toString() {
        if (!success) {
            return "ParsedTransactionData{success=false, failureReason='" + failureReason + "'}";
        }
        return "ParsedTransactionData{" +
                "success=true" +
                ", amount=" + amount +
                ", currency='" + currency + '\'' +
                ", merchant='" + merchant + '\'' +
                ", direction=" + direction +
                ", transactionDate=" + transactionDate +
                '}';
    }
}
