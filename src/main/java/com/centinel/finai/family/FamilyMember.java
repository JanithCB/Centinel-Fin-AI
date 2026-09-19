package com.centinel.finai.family;

import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRole;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Associates a {@link User} with a {@link Family}.
 * The relationshipRole specifies whether the user acts as a PARENT or CHILD
 * within this specific family.
 */
@Entity
@Table(name = "family_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"family_id", "user_id"})
})
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_role", nullable = false, length = 20)
    private UserRole relationshipRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public FamilyMember() {
    }

    public FamilyMember(Family family, User user, UserRole relationshipRole) {
        this.family = family;
        this.user = user;
        this.relationshipRole = relationshipRole;
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

    public void setFamily(Family family) {
        this.family = family;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public UserRole getRelationshipRole() {
        return relationshipRole;
    }

    public void setRelationshipRole(UserRole relationshipRole) {
        this.relationshipRole = relationshipRole;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
