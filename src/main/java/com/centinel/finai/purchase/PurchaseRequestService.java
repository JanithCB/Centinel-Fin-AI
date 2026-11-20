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
import com.centinel.finai.security.CryptographicOperationException;
import com.centinel.finai.security.RsaSignatureService;
import com.centinel.finai.service.SensitiveDataMaskingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PurchaseRequestService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseRequestService.class);

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final CurrentUserResolver currentUserResolver;
    private final SensitiveDataMaskingService maskingService;
    private final RsaSignatureService rsaSignatureService;
    private final ApprovalDecisionRepository approvalDecisionRepository;

    public PurchaseRequestService(
            PurchaseRequestRepository purchaseRequestRepository,
            UserRepository userRepository,
            FamilyMemberRepository familyMemberRepository,
            CurrentUserResolver currentUserResolver,
            SensitiveDataMaskingService maskingService,
            RsaSignatureService rsaSignatureService,
            ApprovalDecisionRepository approvalDecisionRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.currentUserResolver = currentUserResolver;
        this.maskingService = maskingService;
        this.rsaSignatureService = rsaSignatureService;
        this.approvalDecisionRepository = approvalDecisionRepository;
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
        String idempotencyHash = computeIdempotencyHash(child.getId(), maskedUrl, dto.getAmount(), dto.getCurrency());

        Optional<PurchaseRequest> existingPending = purchaseRequestRepository
                .findByChildIdAndIdempotencyHashAndStatus(child.getId(), idempotencyHash, PurchaseRequestStatus.PENDING);
        if (existingPending.isPresent()) {
            log.info("Duplicate purchase request detected for childId={} with idempotencyHash={}. Returning existing pending request id={}",
                    child.getId(), idempotencyHash, existingPending.get().getId());
            return mapToDTO(existingPending.get());
        }

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
        request.setIdempotencyHash(idempotencyHash);

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

        LocalDateTime decidedAt = LocalDateTime.now();
        request.setStatus(newStatus);
        request.setDecidedAt(decidedAt);

        if (newStatus == PurchaseRequestStatus.APPROVED) {
            String canonicalPayload = rsaSignatureService.buildCanonicalApprovalPayload(
                    request.getId(),
                    request.getFamily().getId(),
                    request.getChild().getId(),
                    request.getAmount(),
                    request.getCurrency(),
                    newStatus.name(),
                    decidedAt
            );
            String signature = rsaSignatureService.signPayload(canonicalPayload);
            request.setRsaSignature(signature);
            log.info("Cryptographically signed purchase request id={} with RSA-2048", request.getId());
        }

        User parent = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ForbiddenOperationException("Parent user not found"));
        ApprovalDecision decision = new ApprovalDecision(request, parent, newStatus.name(), null);
        approvalDecisionRepository.save(decision);

        PurchaseRequest saved = purchaseRequestRepository.save(request);
        return mapToDTO(saved);
    }

    private String computeIdempotencyHash(Long childId, String domain, BigDecimal amount, String currency) {
        try {
            String normalizedAmount = amount != null ? amount.stripTrailingZeros().toPlainString() : "0";
            String normalizedCurrency = currency != null ? currency.trim().toUpperCase() : "USD";
            String raw = String.format("%d:%s:%s:%s",
                    childId,
                    domain != null ? domain.trim().toLowerCase() : "",
                    normalizedAmount,
                    normalizedCurrency
            );
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new CryptographicOperationException("SHA-256 algorithm not available in JVM", e);
        }
    }
    private PurchaseRequestResponseDTO mapToDTO(PurchaseRequest req) {
        PurchaseRequestResponseDTO dto = new PurchaseRequestResponseDTO();
        dto.setId(req.getId());
        dto.setFamilyId(req.getFamily().getId());
        dto.setChildId(req.getChild().getId());
        if (req.getChild() != null) {
            String name = req.getChild().getDisplayName();
            dto.setChildName(name != null && !name.isBlank() ? name : req.getChild().getEmail());
            dto.setChildEmail(req.getChild().getEmail());
        }
        dto.setSiteDomain(req.getSiteDomain());
        dto.setItemName(req.getItemName());
        dto.setAmount(req.getAmount());
        dto.setCurrency(req.getCurrency());
        dto.setCategory(req.getCategory());
        dto.setNote(req.getNote());
        dto.setStatus(req.getStatus());
        dto.setIdempotencyHash(req.getIdempotencyHash());
        dto.setRsaSignature(req.getRsaSignature());
        dto.setCreatedAt(req.getCreatedAt());
        dto.setDecidedAt(req.getDecidedAt());
        return dto;
    }
}
