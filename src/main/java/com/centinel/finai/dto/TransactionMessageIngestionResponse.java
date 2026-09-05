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

    public static TransactionMessageIngestionResponse accepted(Long messageId, String externalMessageId, String message) {
        return new TransactionMessageIngestionResponse("ACCEPTED", messageId, externalMessageId, message, OffsetDateTime.now());
    }

    public static TransactionMessageIngestionResponse duplicate(Long messageId, String externalMessageId, String message) {
        return new TransactionMessageIngestionResponse("DUPLICATE", messageId, externalMessageId, message, OffsetDateTime.now());
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
