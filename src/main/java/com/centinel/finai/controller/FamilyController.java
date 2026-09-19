package com.centinel.finai.controller;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.common.exception.RequestOwnershipException;
import com.centinel.finai.dto.AddFamilyMemberDTO;
import com.centinel.finai.dto.CreateFamilyDTO;
import com.centinel.finai.dto.FamilyResponseDTO;
import com.centinel.finai.identity.UserRole;
import com.centinel.finai.service.FamilyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/families")
public class FamilyController {

    private final FamilyService familyService;
    private final CurrentUserResolver currentUserResolver;

    public FamilyController(FamilyService familyService, CurrentUserResolver currentUserResolver) {
        this.familyService = familyService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public ResponseEntity<FamilyResponseDTO> createFamily(@Valid @RequestBody CreateFamilyDTO createFamilyDTO) {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        UserRole currentRole = currentUserResolver.getCurrentUserRole();

        if (currentRole != UserRole.PARENT) {
            throw new ForbiddenOperationException("Only a PARENT can create a family.");
        }

        // Parent can only create a family for themselves
        if (!createFamilyDTO.getParentUserId().equals(currentUserId)) {
            throw new RequestOwnershipException("Cannot create a family for another user.");
        }

        FamilyResponseDTO response = familyService.createFamily(createFamilyDTO.getName(), currentUserId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Void> addFamilyMember(@PathVariable Long id, @Valid @RequestBody AddFamilyMemberDTO addFamilyMemberDTO) {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        UserRole currentRole = currentUserResolver.getCurrentUserRole();

        if (currentRole != UserRole.PARENT) {
            throw new ForbiddenOperationException("Only a PARENT can manage family members.");
        }

        if (!familyService.isParentOfFamily(currentUserId, id)) {
            throw new RequestOwnershipException("You are not authorized to modify this family.");
        }

        familyService.addChild(id, addFamilyMemberDTO.getChildUserId());
        return ResponseEntity.ok().build();
    }
}
