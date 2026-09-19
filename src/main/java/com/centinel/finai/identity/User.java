package com.centinel.finai.identity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.centinel.finai.entity.Transaction;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents an application user (parent or child) in the ParentGuard system.
 *
 * <p>The {@code role} field distinguishes parents from children and drives
 * all authorization decisions server-side. The {@code email} field is the
 * primary human-readable identifier for web-app flows; {@code phoneNumber}
 * is retained for backward compatibility with the legacy SMS ingestion pipeline.
 *
 * <p>Moving this class from {@code entity} to {@code identity} is part of the
 * ParentGuard modular-monolith refactor (PG-BE-1A). All import paths in
 * dependent services have been updated accordingly.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Legacy identifier used by the SMS ingestion pipeline. Retained for backward compatibility. */
    @Column(name = "phone_number", unique = true)
    private String phoneNumber;

    /** Primary identifier for ParentGuard web-app users. */
    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "display_name")
    private String displayName;

    /**
     * The role of this user within the ParentGuard system.
     * Defaults to {@link UserRole#CHILD} for safety; must be explicitly
     * set to {@link UserRole#PARENT} when registering a parent account.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role = UserRole.CHILD;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Transaction> transactions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public User() {
    }

    /** Legacy constructor used by the SMS ingestion pipeline. */
    public User(String phoneNumber, String displayName) {
        this.phoneNumber = phoneNumber;
        this.displayName = displayName;
        this.role = UserRole.CHILD;
    }

    /** ParentGuard constructor for email-based registration. */
    public User(String email, String displayName, UserRole role) {
        this.email = email;
        this.displayName = displayName;
        this.role = role;
    }

    // ── Getters and Setters ───────────────────────────────────────────────────

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<Transaction> transactions) {
        this.transactions = transactions;
    }
}
