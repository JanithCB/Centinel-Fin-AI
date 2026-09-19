package com.centinel.finai.purchase;

import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.purchase.dto.PurchaseRequestResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.junit.jupiter.api.BeforeEach;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
public class PurchaseRequestControllerTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    private ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private PurchaseRequestService purchaseRequestService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void createRequest_validData_childRole_returns201() throws Exception {
        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("amazon.com");
        dto.setItemName("Toy");
        dto.setAmount(new BigDecimal("10.00"));

        PurchaseRequestResponseDTO responseDTO = new PurchaseRequestResponseDTO();
        responseDTO.setId(1L);
        when(purchaseRequestService.createRequest(any(CreatePurchaseRequestDTO.class))).thenReturn(responseDTO);

        mockMvc.perform(post("/api/v1/purchase-requests")
                .with(jwt().jwt(j -> j.claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CHILD")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void createRequest_missingAmount_returns400() throws Exception {
        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("amazon.com");
        dto.setItemName("Toy");
        // Missing amount

        mockMvc.perform(post("/api/v1/purchase-requests")
                .with(jwt().jwt(j -> j.claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CHILD")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRequest_parentRole_returns403() throws Exception {
        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("amazon.com");
        dto.setItemName("Toy");
        dto.setAmount(new BigDecimal("10.00"));

        mockMvc.perform(post("/api/v1/purchase-requests")
                .with(jwt().jwt(j -> j.claim("app_metadata", Collections.singletonMap("role", "PARENT")))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_PARENT")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createRequest_noToken_returns401() throws Exception {
        CreatePurchaseRequestDTO dto = new CreatePurchaseRequestDTO();
        dto.setSiteDomain("amazon.com");
        dto.setItemName("Toy");
        dto.setAmount(new BigDecimal("10.00"));

        mockMvc.perform(post("/api/v1/purchase-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void approveRequest_parentRole_returns200() throws Exception {
        PurchaseRequestResponseDTO responseDTO = new PurchaseRequestResponseDTO();
        responseDTO.setId(1L);
        responseDTO.setStatus(PurchaseRequestStatus.APPROVED);

        when(purchaseRequestService.approveRequest(1L)).thenReturn(responseDTO);

        mockMvc.perform(post("/api/v1/purchase-requests/1/approve")
                .with(jwt().jwt(j -> j.claim("app_metadata", Collections.singletonMap("role", "PARENT")))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_PARENT"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void approveRequest_childRole_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/purchase-requests/1/approve")
                .with(jwt().jwt(j -> j.claim("app_metadata", Collections.singletonMap("role", "CHILD")))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CHILD"))))
                .andExpect(status().isForbidden());
    }
}
