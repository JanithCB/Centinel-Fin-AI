package com.centinel.finai.purchase;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.service.SensitiveDataMaskingService;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.BeforeEach;
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

    @InjectMocks
    private PurchaseRequestService purchaseRequestService;

    @Test
    void createRequest_validData_masksDomainAndSaves() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(2L);
        User child = new User();
        child.setId(2L);
        // Assume child gets ID 2
        when(userRepository.findById(2L)).thenReturn(Optional.of(child));
        
        Family family = new Family("Test Family");
        FamilyMember membership = new FamilyMember(family, child, UserRole.CHILD);
        when(familyMemberRepository.findByUserId(2L)).thenReturn(Collections.singletonList(membership));

        when(maskingService.maskUrl("https://www.amazon.com/dp/123")).thenReturn("amazon.com");

        PurchaseRequest savedMock = new PurchaseRequest();
        savedMock.setStatus(PurchaseRequestStatus.PENDING);
        savedMock.setFamily(family);
        savedMock.setChild(child);
        // We just need a dummy return
        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenReturn(savedMock);

        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("https://www.amazon.com/dp/123");
        dto.setAmount(new BigDecimal("10.00"));
        dto.setItemName("Toy");

        purchaseRequestService.createRequest(dto);

        ArgumentCaptor<PurchaseRequest> reqCaptor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(reqCaptor.capture());

        PurchaseRequest captured = reqCaptor.getValue();
        assertThat(captured.getSiteDomain()).isEqualTo("amazon.com");
        assertThat(captured.getItemName()).isEqualTo("Toy");
    }

    @Test
    void createRequest_unauthenticated_throwsException() {
        when(currentUserResolver.getCurrentUserId()).thenReturn(null);

        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        assertThrows(ForbiddenOperationException.class, () -> purchaseRequestService.createRequest(dto));
    }

    @Test
    void approveRequest_validParent_updatesStatusToApproved() {
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
        
        FamilyMember membership = new FamilyMember(family, parent, UserRole.PARENT);
        when(familyMemberRepository.findByFamilyIdAndUserId(10L, 1L)).thenReturn(Optional.of(membership));
        
        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenAnswer(i -> i.getArguments()[0]);

        purchaseRequestService.approveRequest(100L);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(captor.capture());
        
        assertThat(captor.getValue().getStatus()).isEqualTo(PurchaseRequestStatus.APPROVED);
        assertThat(captor.getValue().getDecidedAt()).isNotNull();
    }

    @Test
    void denyRequest_validParent_updatesStatusToDenied() {
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
        
        FamilyMember membership = new FamilyMember(family, parent, UserRole.PARENT);
        when(familyMemberRepository.findByFamilyIdAndUserId(10L, 1L)).thenReturn(Optional.of(membership));
        
        when(purchaseRequestRepository.save(any(PurchaseRequest.class))).thenAnswer(i -> i.getArguments()[0]);

        purchaseRequestService.denyRequest(100L);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequestRepository).save(captor.capture());
        
        assertThat(captor.getValue().getStatus()).isEqualTo(PurchaseRequestStatus.DENIED);
        assertThat(captor.getValue().getDecidedAt()).isNotNull();
    }
}
