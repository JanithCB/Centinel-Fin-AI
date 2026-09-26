package com.centinel.finai.controller;

import com.centinel.finai.dto.RegisterUserDTO;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class UserControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        userRepository.deleteAll();
    }

    @Test
    void testRegisterUser_Success_WithSupabaseUuid() throws Exception {
        String supabaseUuid = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
        RegisterUserDTO request = new RegisterUserDTO(UserRole.PARENT, "Jane Doe", "+1234567890");

        mockMvc.perform(post("/api/v1/users/register")
                .with(jwt().jwt(builder -> builder
                        .subject(supabaseUuid)
                        .claim("email", "jane.doe@example.com")
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authId").value(supabaseUuid))
                .andExpect(jsonPath("$.email").value("jane.doe@example.com"))
                .andExpect(jsonPath("$.displayName").value("Jane Doe"))
                .andExpect(jsonPath("$.role").value("PARENT"));
    }

    @Test
    void testRegisterUser_Unauthorized_NoJwt() throws Exception {
        RegisterUserDTO request = new RegisterUserDTO(UserRole.PARENT);

        mockMvc.perform(post("/api/v1/users/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetCurrentUser_Success() throws Exception {
        String supabaseUuid = "uuid-parent-999";
        User user = new User(supabaseUuid, "parent.profile@example.com", "Parent Profile", UserRole.PARENT);
        userRepository.save(user);

        mockMvc.perform(get("/api/v1/users/me")
                .with(jwt().jwt(builder -> builder
                        .subject(supabaseUuid)
                        .claim("email", "parent.profile@example.com")
                        .claim("app_metadata", java.util.Map.of("role", "PARENT")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authId").value(supabaseUuid))
                .andExpect(jsonPath("$.email").value("parent.profile@example.com"))
                .andExpect(jsonPath("$.role").value("PARENT"));
    }
}
