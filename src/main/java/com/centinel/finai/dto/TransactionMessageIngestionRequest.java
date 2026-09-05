package com.centinel.finai.dto;

import com.centinel.finai.util.MaskingUtils;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public class TransactionMessageIngestionRequest {

    @NotBlank(message = "source is required")
    private String source;

    @NotBlank(message = "externalMessageId is required")
    private String externalMessageId;

    @NotBlank(message = "userReference is required")
    private String userReference;

    @NotBlank(message = "messageText is required")
    private String messageText;

    @NotNull(message = "receivedAt is required")
    private OffsetDateTime receivedAt;

    public TransactionMessageIngestionRequest() {
    }

    public TransactionMessageIngestionRequest(String source, String externalMessageId, String userReference, String messageText, OffsetDateTime receivedAt) {
        this.source = source;
        this.externalMessageId = externalMessageId;
        this.userReference = userReference;
        this.messageText = messageText;
        this.receivedAt = receivedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getExternalMessageId() {
        return externalMessageId;
    }

    public void setExternalMessageId(String externalMessageId) {
        this.externalMessageId = externalMessageId;
    }

    public String getUserReference() {
        return userReference;
    }

    public void setUserReference(String userReference) {
        this.userReference = userReference;
    }

    public String getMessageText() {
        return messageText;
    }

    public void setMessageText(String messageText) {
        this.messageText = messageText;
    }

    public OffsetDateTime getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(OffsetDateTime receivedAt) {
        this.receivedAt = receivedAt;
    }

    @Override
    public String toString() {
        return "TransactionMessageIngestionRequest{" +
                "source='" + source + '\'' +
                ", externalMessageId='" + externalMessageId + '\'' +
                ", userReference='" + userReference + '\'' +
                ", messageTextPreview='" + MaskingUtils.getSafePreview(messageText, 30) + '\'' +
                ", receivedAt=" + receivedAt +
                '}';
    }
}
