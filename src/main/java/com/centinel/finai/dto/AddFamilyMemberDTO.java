package com.centinel.finai.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Objects;

public class AddFamilyMemberDTO {
    
    @NotNull(message = "Child user ID is required")
    private Long childUserId;

    public AddFamilyMemberDTO() {
    }

    public AddFamilyMemberDTO(Long childUserId) {
        this.childUserId = childUserId;
    }

    public Long getChildUserId() {
        return childUserId;
    }

    public void setChildUserId(Long childUserId) {
        this.childUserId = childUserId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AddFamilyMemberDTO that = (AddFamilyMemberDTO) o;
        return Objects.equals(childUserId, that.childUserId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(childUserId);
    }
}
