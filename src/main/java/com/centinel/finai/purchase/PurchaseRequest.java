package com.centinel.finai.purchase;

import com.centinel.finai.family.Family;
import com.centinel.finai.identity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_requests")
public class PurchaseRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private User child;

    @Column(name = "site_domain")
    private String siteDomain;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "amount", precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false)
    private String currency = "USD";

    @Column(name = "category")
    private String category;

    @Column(name = "note")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PurchaseRequestStatus status = PurchaseRequestStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    public PurchaseRequest() {
        this.createdAt = LocalDateTime.now();
    }

    public PurchaseRequest(Family family, User child, String siteDomain, String itemName, BigDecimal amount, String currency, String category, String note) {
        this.family = family;
        this.child = child;
        this.siteDomain = siteDomain;
        this.itemName = itemName;
        this.amount = amount;
        this.currency = currency != null ? currency : "USD";
        this.category = category;
        this.note = note;
        this.status = PurchaseRequestStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Family getFamily() {
        return family;
    }

    public User getChild() {
        return child;
    }

    public void setFamily(Family family) {
        this.family = family;
    }

    public void setChild(User child) {
        this.child = child;
    }

    public String getSiteDomain() {
        return siteDomain;
    }

    public String getItemName() {
        return itemName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getCategory() {
        return category;
    }

    public String getNote() {
        return note;
    }

    public PurchaseRequestStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseRequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(LocalDateTime decidedAt) {
        this.decidedAt = decidedAt;
    }
}
