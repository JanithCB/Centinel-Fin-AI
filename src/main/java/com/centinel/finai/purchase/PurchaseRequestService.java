package com.centinel.finai.purchase;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.purchase.dto.PurchaseRequestResponseDTO;
import com.centinel.finai.service.SensitiveDataMaskingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PurchaseRequestService {

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final SensitiveDataMaskingService maskingService;

    public PurchaseRequestService(
            PurchaseRequestRepository purchaseRequestRepository,
            UserRepository userRepository,
            FamilyMemberRepository familyMemberRepository,
            CurrentUserResolver currentUserResolver,
            SensitiveDataMaskingService maskingService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.currentUserResolver = currentUserResolver;
        this.maskingService = maskingService;
    }

    @Transactional
    public PurchaseRequestResponseDTO createRequest(CreatePurchaseRequestDTO dto) {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        if (currentUserId == null) {
            throw new ForbiddenOperationException("User not authenticated");
        }

        User child = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ForbiddenOperationException("User not found"));

        List<FamilyMember> memberships = familyMemberRepository.findByUserId(child.getId());
        if (memberships.isEmpty()) {
            throw new ForbiddenOperationException("Child is not a member of any family");
        }

        Family family = memberships.get(0).getFamily();

        String maskedUrl = maskingService.maskUrl(dto.getSiteDomain());

        PurchaseRequest request = new PurchaseRequest(
                family,
                child,
                maskedUrl,
                dto.getItemName(),
                dto.getAmount(),
                dto.getCurrency(),
                dto.getCategory(),
                dto.getNote()
        );

        PurchaseRequest saved = purchaseRequestRepository.save(request);
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<PurchaseRequestResponseDTO> getMyRequests() {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        if (currentUserId == null) {
            throw new ForbiddenOperationException("User not authenticated");
        }

        List<PurchaseRequest> requests = purchaseRequestRepository.findByChildId(currentUserId);
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Transactional(readOnly = true)
    public List<PurchaseRequestResponseDTO> getFamilyRequests() {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        if (currentUserId == null) {
            throw new ForbiddenOperationException("User not authenticated");
        }

        List<FamilyMember> memberships = familyMemberRepository.findByUserId(currentUserId);
        List<Long> familyIds = memberships.stream()
                .filter(m -> m.getRelationshipRole() == com.centinel.finai.identity.UserRole.PARENT)
                .map(m -> m.getFamily().getId())
                .collect(Collectors.toList());

        if (familyIds.isEmpty()) {
            throw new ForbiddenOperationException("User is not a parent of any family");
        }

        // For simplicity in MVP, we fetch requests for the first family the parent belongs to
        List<PurchaseRequest> requests = purchaseRequestRepository.findByFamilyId(familyIds.get(0));
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public PurchaseRequestResponseDTO approveRequest(Long requestId) {
        return processRequestDecision(requestId, PurchaseRequestStatus.APPROVED);
    }

    @Transactional
    public PurchaseRequestResponseDTO denyRequest(Long requestId) {
        return processRequestDecision(requestId, PurchaseRequestStatus.DENIED);
    }

    private PurchaseRequestResponseDTO processRequestDecision(Long requestId, PurchaseRequestStatus newStatus) {
        Long currentUserId = currentUserResolver.getCurrentUserId();
        if (currentUserId == null) {
            throw new ForbiddenOperationException("User not authenticated");
        }

        PurchaseRequest request = purchaseRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        FamilyMember membership = familyMemberRepository.findByFamilyIdAndUserId(request.getFamily().getId(), currentUserId)
                .orElseThrow(() -> new ForbiddenOperationException("User does not have permission to manage this family's requests"));

        if (membership.getRelationshipRole() != com.centinel.finai.identity.UserRole.PARENT) {
            throw new ForbiddenOperationException("Only parents can approve or deny requests");
        }

        if (request.getStatus() != PurchaseRequestStatus.PENDING) {
            throw new IllegalStateException("Request is already processed");
        }

        request.setStatus(newStatus);
        request.setDecidedAt(java.time.LocalDateTime.now());
        
        PurchaseRequest saved = purchaseRequestRepository.save(request);
        return mapToDTO(saved);
    }
    private PurchaseRequestResponseDTO mapToDTO(PurchaseRequest req) {
        PurchaseRequestResponseDTO dto = new PurchaseRequestResponseDTO();
        dto.setId(req.getId());
        dto.setFamilyId(req.getFamily().getId());
        dto.setChildId(req.getChild().getId());
        dto.setSiteDomain(req.getSiteDomain());
        dto.setItemName(req.getItemName());
        dto.setAmount(req.getAmount());
        dto.setCurrency(req.getCurrency());
        dto.setCategory(req.getCategory());
        dto.setNote(req.getNote());
        dto.setStatus(req.getStatus());
        dto.setCreatedAt(req.getCreatedAt());
        dto.setDecidedAt(req.getDecidedAt());
        return dto;
    }
}
