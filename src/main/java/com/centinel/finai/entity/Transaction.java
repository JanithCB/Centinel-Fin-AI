package com.centinel.finai.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "raw_message", columnDefinition = "TEXT")
    private String rawMessage;

    private BigDecimal amount;

    private String currency;

    private String merchant;

    private String category;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "pending_for_ai")
    private Boolean pendingForAi = true;

    @Column(name = "is_ai_categorized")
    private Boolean isAiCategorized = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.pendingForAi == null) {
            this.pendingForAi = true;
        }
        if (this.isAiCategorized == null) {
            this.isAiCategorized = false;
        }
    }

    public Transaction() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getRawMessage() {
        return rawMessage;
    }

    public void setRawMessage(String rawMessage) {
        this.rawMessage = rawMessage;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public Boolean getPendingForAi() {
        return pendingForAi;
    }

    public void setPendingForAi(Boolean pendingForAi) {
        this.pendingForAi = pendingForAi;
    }

    public Boolean getIsAiCategorized() {
        return isAiCategorized;
    }

    public void setIsAiCategorized(Boolean isAiCategorized) {
        this.isAiCategorized = isAiCategorized;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
