package com.centinel.finai.purchase;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.purchase.dto.PurchaseRequestResponseDTO;
import com.centinel.finai.security.RsaSignatureService;
import com.centinel.finai.service.SensitiveDataMaskingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseRequestServiceTest {

    @Mock
    private PurchaseRequestRepository purchaseRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private FamilyMemberRepository familyMemberRepository;
    @Mock
    private CurrentUserResolver currentUserResolver;
    @Mock
    private SensitiveDataMaskingService maskingService;
    @Mock
    private RsaSignatureService rsaSignatureService;
    @Mock
    private ApprovalDecisionRepository approvalDecisionRepository;

    @InjectMocks
    private PurchaseRequestService purchaseRequestService;

    @Test
    @DisplayName("Should mask domain, compute SHA-256 idempotency hash, and save valid purchase request")
    void createRequest_validData_masksDomainAndComputesIdempotencyHash() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(2L);
        User child = new User();
        child.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(child));

        Family family = new Family("Test Family");
        family.setId(10L);
        FamilyMember membership = new FamilyMember(family, child, UserRole.CHILD);
        when(familyMemberRepository.findByUserId(2L)).thenReturn(Collections.singletonList(membership));

        when(maskingService.maskUrl("https://www.amazon.com/dp/123")).thenReturn("amazon.com");
        when(purchaseRequestRepository.findByChildIdAndIdempotencyHashAndStatus(eq(2L), anyString(), eq(PurchaseRequestStatus.PENDING)))
                .thenReturn(Optional.empty());

        PurchaseRequest savedMock = new PurchaseRequest();
        savedMock.setId(100L);
        savedMock.setStatus(PurchaseRequestStatus.PENDING);
        savedMock.setFamily(family);
        savedMock.setChild(child);
        savedMock.setAmount(new BigDecimal("10.00"));
        savedMock.setCurrency("USD");
        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenReturn(savedMock);

        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("https://www.amazon.com/dp/123");
        dto.setAmount(new BigDecimal("10.00"));
        dto.setCurrency("USD");
        dto.setItemName("Toy");

        PurchaseRequestResponseDTO result = purchaseRequestService.createRequest(dto);

        assertThat(result).isNotNull();
        ArgumentCaptor<PurchaseRequest> reqCaptor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(reqCaptor.capture());

        PurchaseRequest captured = reqCaptor.getValue();
        assertThat(captured.getSiteDomain()).isEqualTo("amazon.com");
        assertThat(captured.getItemName()).isEqualTo("Toy");
        assertThat(captured.getIdempotencyHash()).isNotNull().hasSize(64); // SHA-256 hex length
    }

    @Test
    @DisplayName("Should generate distinct SHA-256 idempotency hashes when cart items differ at the exact same price")
    void createRequest_differentCartItemsWithSamePrice_generatesDistinctIdempotencyHashes() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(2L);
        User child = new User();
        child.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(child));

        Family family = new Family("Test Family");
        family.setId(10L);
        FamilyMember membership = new FamilyMember(family, child, UserRole.CHILD);
        when(familyMemberRepository.findByUserId(2L)).thenReturn(Collections.singletonList(membership));

        when(maskingService.maskUrl("https://store.steampowered.com/cart")).thenReturn("store.steampowered.com");
        when(purchaseRequestRepository.findByChildIdAndIdempotencyHashAndStatus(eq(2L), anyString(), eq(PurchaseRequestStatus.PENDING)))
                .thenReturn(Optional.empty());
        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenAnswer(i -> i.getArguments()[0]);

        CreatePurchaseRequestDTO cartA = new CreatePurchaseRequestDTO();
        cartA.setSiteDomain("https://store.steampowered.com/cart");
        cartA.setItemName("Educational Coding Guide");
        cartA.setAmount(new BigDecimal("19.99"));
        cartA.setCurrency("USD");

        CreatePurchaseRequestDTO cartB = new CreatePurchaseRequestDTO();
        cartB.setSiteDomain("https://store.steampowered.com/cart");
        cartB.setItemName("007 First Light");
        cartB.setAmount(new BigDecimal("19.99"));
        cartB.setCurrency("USD");

        purchaseRequestService.createRequest(cartA);
        purchaseRequestService.createRequest(cartB);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository, times(2)).save(captor.capture());

        String hashA = captor.getAllValues().get(0).getIdempotencyHash();
        String hashB = captor.getAllValues().get(1).getIdempotencyHash();
        assertThat(hashA).isNotEqualTo(hashB);
    }

    @Test
    @DisplayName("Should detect duplicate pending request and return existing without saving duplicate")
    void createRequest_duplicatePendingRequest_returnsExistingWithoutSavingDuplicate() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(2L);
        User child = new User();
        child.setId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(child));

        Family family = new Family("Test Family");
        family.setId(10L);
        FamilyMember membership = new FamilyMember(family, child, UserRole.CHILD);
        when(familyMemberRepository.findByUserId(2L)).thenReturn(Collections.singletonList(membership));

        when(maskingService.maskUrl("https://www.amazon.com/dp/123")).thenReturn("amazon.com");

        PurchaseRequest existingPending = new PurchaseRequest();
        existingPending.setId(555L);
        existingPending.setStatus(PurchaseRequestStatus.PENDING);
        existingPending.setFamily(family);
        existingPending.setChild(child);
        existingPending.setAmount(new BigDecimal("10.00"));
        existingPending.setCurrency("USD");
        existingPending.setIdempotencyHash("mocked_existing_hash");

        when(purchaseRequestRepository.findByChildIdAndIdempotencyHashAndStatus(eq(2L), anyString(), eq(PurchaseRequestStatus.PENDING)))
                .thenReturn(Optional.of(existingPending));

        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("https://www.amazon.com/dp/123");
        dto.setAmount(new BigDecimal("10.00"));
        dto.setCurrency("USD");
        dto.setItemName("Toy");

        PurchaseRequestResponseDTO result = purchaseRequestService.createRequest(dto);

        assertThat(result.getId()).isEqualTo(555L);
        // Ensure no new database record was saved
        verify(purchaseRequestRepository, never()).save(any(PurchaseRequest.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenOperationException when unauthenticated user creates request")
    void createRequest_unauthenticated_throwsException() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(null);

        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        assertThrows(ForbiddenOperationException.class, () -> purchaseRequestService.createRequest(dto));
    }

    @Test
    @DisplayName("Should approve request, generate RSA-2048 signature, and save approval decision audit record")
    void approveRequest_validParent_updatesStatusAndSignsPayload() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(1L);

        Family family = new Family("Test Family");
        family.setId(10L);
        User parent = new User();
        parent.setId(1L);
        User child = new User();
        child.setId(2L);

        PurchaseRequest req = new PurchaseRequest();
        req.setId(100L);
        req.setFamily(family);
        req.setChild(child);
        req.setAmount(new BigDecimal("49.99"));
        req.setCurrency("USD");
        req.setStatus(PurchaseRequestStatus.PENDING);

        when(purchaseRequestRepository.findById(100L)).thenReturn(Optional.of(req));
        when(userRepository.findById(1L)).thenReturn(Optional.of(parent));

        FamilyMember membership = new FamilyMember(family, parent, UserRole.PARENT);
        when(familyMemberRepository.findByFamilyIdAndUserId(10L, 1L)).thenReturn(Optional.of(membership));

        when(rsaSignatureService.buildCanonicalApprovalPayload(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn("REQ_ID:100|FAMILY_ID:10|CHILD_ID:2|AMOUNT:49.99|CURRENCY:USD|STATUS:APPROVED|DECIDED_AT:2026-11-20T16:00:00");
        when(rsaSignatureService.signPayload(anyString()))
                .thenReturn("MOCK_BASE64_RSA_SIGNATURE");

        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenAnswer(i -> i.getArguments()[0]);

        PurchaseRequestResponseDTO response = purchaseRequestService.approveRequest(100L);

        assertThat(response.getStatus()).isEqualTo(PurchaseRequestStatus.APPROVED);
        assertThat(response.getRsaSignature()).isEqualTo("MOCK_BASE64_RSA_SIGNATURE");

        ArgumentCaptor<PurchaseRequest> reqCaptor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(reqCaptor.capture());
        assertThat(reqCaptor.getValue().getStatus()).isEqualTo(PurchaseRequestStatus.APPROVED);
        assertThat(reqCaptor.getValue().getRsaSignature()).isEqualTo("MOCK_BASE64_RSA_SIGNATURE");
        assertThat(reqCaptor.getValue().getDecidedAt()).isNotNull();

        ArgumentCaptor<ApprovalDecision> decisionCaptor = ArgumentCaptor.forClass(ApprovalDecision.class);
        verify(approvalDecisionRepository).save(decisionCaptor.capture());
        assertThat(decisionCaptor.getValue().getDecision()).isEqualTo("APPROVED");
        assertThat(decisionCaptor.getValue().getParent().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should deny request, record decision, and not generate RSA approval signature")
    void denyRequest_validParent_updatesStatusToDeniedWithoutSignature() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(1L);

        Family family = new Family("Test Family");
        family.setId(10L);
        User parent = new User();
        parent.setId(1L);
        User child = new User();
        child.setId(2L);

        PurchaseRequest req = new PurchaseRequest();
        req.setId(100L);
        req.setFamily(family);
        req.setChild(child);
        req.setStatus(PurchaseRequestStatus.PENDING);

        when(purchaseRequestRepository.findById(100L)).thenReturn(Optional.of(req));
        when(userRepository.findById(1L)).thenReturn(Optional.of(parent));

        FamilyMember membership = new FamilyMember(family, parent, UserRole.PARENT);
        when(familyMemberRepository.findByFamilyIdAndUserId(10L, 1L)).thenReturn(Optional.of(membership));

        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenAnswer(i -> i.getArguments()[0]);

        PurchaseRequestResponseDTO response = purchaseRequestService.denyRequest(100L);

        assertThat(response.getStatus()).isEqualTo(PurchaseRequestStatus.DENIED);
        assertThat(response.getRsaSignature()).isNull();

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(PurchaseRequestStatus.DENIED);
        assertThat(captor.getValue().getRsaSignature()).isNull();
        assertThat(captor.getValue().getDecidedAt()).isNotNull();

        verify(rsaSignatureService, never()).signPayload(anyString());

        ArgumentCaptor<ApprovalDecision> decisionCaptor = ArgumentCaptor.forClass(ApprovalDecision.class);
        verify(approvalDecisionRepository).save(decisionCaptor.capture());
        assertThat(decisionCaptor.getValue().getDecision()).isEqualTo("DENIED");
    }
}
