package com.centinel.finai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Objects;

public class CreateFamilyDTO {
    
    @NotBlank(message = "Family name is required")
    private String name;
    
    @NotNull(message = "Parent user ID is required")
    private Long parentUserId;

    public CreateFamilyDTO() {
    }

    public CreateFamilyDTO(String name, Long parentUserId) {
        this.name = name;
        this.parentUserId = parentUserId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getParentUserId() {
        return parentUserId;
    }

    public void setParentUserId(Long parentUserId) {
        this.parentUserId = parentUserId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CreateFamilyDTO that = (CreateFamilyDTO) o;
        return Objects.equals(name, that.name) && Objects.equals(parentUserId, that.parentUserId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, parentUserId);
    }
}
