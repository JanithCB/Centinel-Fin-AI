package com.centinel.finai.purchase;

import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.security.RsaSignatureService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-End Cryptographic Approval & Idempotency Integration Test (Milestone 1, Task 4).
 * Aligns with Coursework 1 Task 1.c (Algorithm & Protocol Level Security).
 */
@SpringBootTest
@Transactional
public class PurchaseApprovalFlowIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private PurchaseRequestRepository purchaseRequestRepository;

    @Autowired
    private RsaSignatureService rsaSignatureService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private User parentUser;
    private User childUser;
    private Family testFamily;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        // Seed parent and child users
        parentUser = userRepository.save(new User("parent_e2e@centinel.local", "E2E Parent", UserRole.PARENT));
        childUser = userRepository.save(new User("child_e2e@centinel.local", "E2E Child", UserRole.CHILD));

        testFamily = familyRepository.save(new Family("Centinel E2E Test Family"));
        familyMemberRepository.save(new FamilyMember(testFamily, parentUser, UserRole.PARENT));
        familyMemberRepository.save(new FamilyMember(testFamily, childUser, UserRole.CHILD));
    }

    @Test
    @DisplayName("Complete Milestone 1 End-to-End Approval Journey with RSA-2048 signing & SHA-256 deduplication")
    void testCompleteMilestone1Workflow() throws Exception {
        // Step 1: Discover backend RSA-2048 public key (ENC-2)
        mockMvc.perform(get("/api/v1/security/public-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.algorithm").value("RSA-2048"))
                .andExpect(jsonPath("$.signatureAlgorithm").value("SHA256withRSA"))
                .andExpect(jsonPath("$.publicKeyBase64").isNotEmpty())
                .andExpect(jsonPath("$.publicKeyPem").isNotEmpty());

        // Step 2: Child creates purchase request with SHA-256 idempotency hash
        CreatePurchaseRequestDTO requestDTO = new CreatePurchaseRequestDTO();
        requestDTO.setSiteDomain("https://store.steampowered.com/app/1091500");
        requestDTO.setItemName("Cyberpunk Expansion");
        requestDTO.setAmount(new BigDecimal("29.99"));
        requestDTO.setCurrency("USD");
        requestDTO.setCategory("GAMING");
        requestDTO.setNote("Birthday gift request");

        MvcResult createResult = mockMvc.perform(post("/api/v1/purchase-requests")
                        .with(jwt().jwt(j -> j.subject(String.valueOf(childUser.getId()))
                                        .claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CHILD")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.idempotencyHash").isNotEmpty())
                .andExpect(jsonPath("$.rsaSignature").doesNotExist())
                .andReturn();

        Map<?, ?> createdBody = objectMapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        Long requestId = ((Number) createdBody.get("id")).longValue();
        String hash = (String) createdBody.get("idempotencyHash");
        assertThat(hash).hasSize(64);

        // Step 3: Child double-clicks / replays identical request (Idempotency deduplication check)
        MvcResult duplicateResult = mockMvc.perform(post("/api/v1/purchase-requests")
                        .with(jwt().jwt(j -> j.subject(String.valueOf(childUser.getId()))
                                        .claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CHILD")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isCreated())
                .andReturn();

        Map<?, ?> duplicateBody = objectMapper.readValue(duplicateResult.getResponse().getContentAsString(), Map.class);
        Long duplicateId = ((Number) duplicateBody.get("id")).longValue();
        assertThat(duplicateId).isEqualTo(requestId); // Verifies no second record was created

        // Step 4: Child tries to approve the request (Access Control Check - 403 Forbidden)
        mockMvc.perform(post("/api/v1/purchase-requests/" + requestId + "/approve")
                        .with(jwt().jwt(j -> j.subject(String.valueOf(childUser.getId()))
                                        .claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                                .authorities(new SimpleGrantedAuthority("ROLE_CHILD"))))
                .andExpect(status().isForbidden());

        // Step 5: Parent approves request -> status APPROVED + RSA-2048 digital signature attached
        MvcResult approveResult = mockMvc.perform(post("/api/v1/purchase-requests/" + requestId + "/approve")
                        .with(jwt().jwt(j -> j.subject(String.valueOf(parentUser.getId()))
                                        .claim("app_metadata", Collections.singletonMap("role", "PARENT")))
                                .authorities(new SimpleGrantedAuthority("ROLE_PARENT"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.rsaSignature").isNotEmpty())
                .andReturn();

        Map<?, ?> approveBody = objectMapper.readValue(approveResult.getResponse().getContentAsString(), Map.class);
        String rsaSig = (String) approveBody.get("rsaSignature");

        // Verify the signature against the actual RsaSignatureService public key
        PurchaseRequest savedReq = purchaseRequestRepository.findById(requestId).orElseThrow();
        String canonicalPayload = rsaSignatureService.buildCanonicalApprovalPayload(
                savedReq.getId(),
                savedReq.getFamily().getId(),
                savedReq.getChild().getId(),
                savedReq.getAmount(),
                savedReq.getCurrency(),
                savedReq.getStatus().name(),
                savedReq.getDecidedAt()
        );

        boolean signatureValid = rsaSignatureService.verifySignature(canonicalPayload, rsaSig);
        assertThat(signatureValid).isTrue();
    }
}
