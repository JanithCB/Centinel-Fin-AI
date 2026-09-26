package com.centinel.finai.dto;

import com.centinel.finai.identity.UserRole;
import jakarta.validation.constraints.NotNull;

public class RegisterUserDTO {

    @NotNull(message = "User role is required")
    private UserRole role;

    private String displayName;

    private String phoneNumber;

    public RegisterUserDTO() {
    }

    public RegisterUserDTO(UserRole role) {
        this.role = role;
    }

    public RegisterUserDTO(UserRole role, String displayName, String phoneNumber) {
        this.role = role;
        this.displayName = displayName;
        this.phoneNumber = phoneNumber;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
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
}
