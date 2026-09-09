package com.centinel.finai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class TransactionMessageIngestionResponse {

    private String status;
    private Long messageId;
    private String externalMessageId;
    private String message;
    private OffsetDateTime ingestedAt;

    public TransactionMessageIngestionResponse() {
    }

    public TransactionMessageIngestionResponse(String status, Long messageId, String externalMessageId, String message, OffsetDateTime ingestedAt) {
        this.status = status;
        this.messageId = messageId;
        this.externalMessageId = externalMessageId;
        this.message = message;
        this.ingestedAt = ingestedAt;
    }

    public static TransactionMessageIngestionResponse of(String status, Long messageId, String externalMessageId, String message) {
        return new TransactionMessageIngestionResponse(status, messageId, externalMessageId, message, OffsetDateTime.now());
    }

    public static TransactionMessageIngestionResponse ruleCategorized(Long messageId, String externalMessageId, String message) {
        return of("RULE_CATEGORIZED", messageId, externalMessageId, message);
    }

    public static TransactionMessageIngestionResponse pendingAi(Long messageId, String externalMessageId, String message) {
        return of("PENDING_AI", messageId, externalMessageId, message);
    }

    public static TransactionMessageIngestionResponse parseFailed(Long messageId, String externalMessageId, String message) {
        return of("PARSE_FAILED", messageId, externalMessageId, message);
    }

    public static TransactionMessageIngestionResponse accepted(Long messageId, String externalMessageId, String message) {
        return of("ACCEPTED", messageId, externalMessageId, message);
    }

    public static TransactionMessageIngestionResponse duplicate(Long messageId, String externalMessageId, String message) {
        return of("DUPLICATE", messageId, externalMessageId, message);
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public String getExternalMessageId() {
        return externalMessageId;
    }

    public void setExternalMessageId(String externalMessageId) {
        this.externalMessageId = externalMessageId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public OffsetDateTime getIngestedAt() {
        return ingestedAt;
    }

    public void setIngestedAt(OffsetDateTime ingestedAt) {
        this.ingestedAt = ingestedAt;
    }
}
