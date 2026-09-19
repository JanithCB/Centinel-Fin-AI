package com.centinel.finai.purchase;

import com.centinel.finai.identity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "approval_decisions")
public class ApprovalDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    private PurchaseRequest purchaseRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", nullable = false)
    private User parent;

    @Column(name = "decision", nullable = false)
    private String decision; // APPROVED or DENIED

    @Column(name = "reason")
    private String reason;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private LocalDateTime decidedAt;

    public ApprovalDecision() {
        this.decidedAt = LocalDateTime.now();
    }

    public ApprovalDecision(PurchaseRequest purchaseRequest, User parent, String decision, String reason) {
        this.purchaseRequest = purchaseRequest;
        this.parent = parent;
        this.decision = decision;
        this.reason = reason;
        this.decidedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public User getParent() {
        return parent;
    }

    public String getDecision() {
        return decision;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getDecidedAt() {
        return decidedAt;
    }
}
