package com.centinel.finai.controller;

import com.centinel.finai.dto.AddFamilyMemberDTO;
import com.centinel.finai.dto.CreateFamilyDTO;
import com.centinel.finai.dto.FamilyResponseDTO;
import com.centinel.finai.service.FamilyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for Family management.
 * NOTE: These endpoints are temporarily open until security is added in PG-BE-1D.
 */
@RestController
@RequestMapping("/api/v1/families")
public class FamilyController {

    private final FamilyService familyService;

    public FamilyController(FamilyService familyService) {
        this.familyService = familyService;
    }

    @PostMapping
    public ResponseEntity<FamilyResponseDTO> createFamily(@Valid @RequestBody CreateFamilyDTO createFamilyDTO) {
        FamilyResponseDTO response = familyService.createFamily(createFamilyDTO.getName(), createFamilyDTO.getParentUserId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Void> addFamilyMember(@PathVariable Long id, @Valid @RequestBody AddFamilyMemberDTO addFamilyMemberDTO) {
        familyService.addChild(id, addFamilyMemberDTO.getChildUserId());
        return ResponseEntity.ok().build();
    }
}
