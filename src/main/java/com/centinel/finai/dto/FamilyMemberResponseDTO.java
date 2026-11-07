package com.centinel.finai.dto;

import java.time.LocalDateTime;

public class FamilyMemberResponseDTO {

    private Long id;
    private Long userId;
    private String displayName;
    private String email;
    private String role;
    private LocalDateTime joinedAt;

    public FamilyMemberResponseDTO() {
    }

    public FamilyMemberResponseDTO(Long id, Long userId, String displayName, String email, String role, LocalDateTime joinedAt) {
        this.id = id;
        this.userId = userId;
        this.displayName = displayName;
        this.email = email;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
}

