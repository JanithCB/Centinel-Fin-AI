package com.centinel.finai.dto;

import com.centinel.finai.identity.UserRole;
import java.time.LocalDateTime;

public class UserResponseDTO {

    private Long id;
    private String authId;
    private String email;
    private String displayName;
    private String phoneNumber;
    private UserRole role;
    private LocalDateTime createdAt;
    private Long familyId;
    private String familyName;

    public UserResponseDTO() {
    }

    public UserResponseDTO(Long id, String authId, String email, String displayName, String phoneNumber, UserRole role, LocalDateTime createdAt) {
        this(id, authId, email, displayName, phoneNumber, role, createdAt, null, null);
    }

    public UserResponseDTO(Long id, String authId, String email, String displayName, String phoneNumber, UserRole role, LocalDateTime createdAt, Long familyId, String familyName) {
        this.id = id;
        this.authId = authId;
        this.email = email;
        this.displayName = displayName;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.createdAt = createdAt;
        this.familyId = familyId;
        this.familyName = familyName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAuthId() {
        return authId;
    }

    public void setAuthId(String authId) {
        this.authId = authId;
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

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
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

    public Long getFamilyId() {
        return familyId;
    }

    public void setFamilyId(Long familyId) {
        this.familyId = familyId;
    }

    public String getFamilyName() {
        return familyName;
    }

    public void setFamilyName(String familyName) {
        this.familyName = familyName;
    }
}
