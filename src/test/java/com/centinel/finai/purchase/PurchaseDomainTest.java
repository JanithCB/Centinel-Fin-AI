package com.centinel.finai.purchase;

import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class PurchaseDomainTest {

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private PurchaseRequestRepository purchaseRequestRepository;

    @Autowired
    private ApprovalDecisionRepository approvalDecisionRepository;

    @Test
    void testPurchaseRequestLifecycle() {
        User child = userRepository.save(new User("child@test.com", "Child", UserRole.CHILD));
        User parent = userRepository.save(new User("parent@test.com", "Parent", UserRole.PARENT));
        Family family = familyRepository.save(new Family("Test Family"));

        BigDecimal amount = new BigDecimal("19.9900");
        PurchaseRequest request = new PurchaseRequest(family, child, "amazon.com", "Book", amount, "USD", "ONLINE_RETAIL", "School book");
        PurchaseRequest savedRequest = purchaseRequestRepository.save(request);

        assertThat(savedRequest.getId()).isNotNull();
        assertThat(savedRequest.getStatus()).isEqualTo(PurchaseRequestStatus.PENDING);
        assertThat(savedRequest.getAmount()).isEqualByComparingTo(amount);

        // Find by child
        List<PurchaseRequest> childRequests = purchaseRequestRepository.findByChildId(child.getId());
        assertThat(childRequests).hasSize(1);

        // Find by family and status
        List<PurchaseRequest> pendingRequests = purchaseRequestRepository.findByFamilyIdAndStatus(family.getId(), PurchaseRequestStatus.PENDING);
        assertThat(pendingRequests).hasSize(1);

        // Parent decides
        savedRequest.setStatus(PurchaseRequestStatus.APPROVED);
        savedRequest.setDecidedAt(java.time.LocalDateTime.now());
        purchaseRequestRepository.save(savedRequest);

        ApprovalDecision decision = new ApprovalDecision(savedRequest, parent, "APPROVED", "Okay for school");
        ApprovalDecision savedDecision = approvalDecisionRepository.save(decision);

        assertThat(savedDecision.getId()).isNotNull();
        assertThat(savedDecision.getDecision()).isEqualTo("APPROVED");
    }
}
