package com.centinel.finai.controller;

import com.centinel.finai.dto.AddFamilyMemberDTO;
import com.centinel.finai.dto.CreateFamilyDTO;
import com.centinel.finai.dto.FamilyResponseDTO;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.LocalDateTime;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class FamilyControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        userRepository.deleteAll();
        familyRepository.deleteAll();
    }

    @Test
    void testCreateFamily_Success() throws Exception {
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedParent.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Smith Family"));
    }

    @Test
    void testCreateFamily_Unauthorized() throws Exception {
        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", 1L);

        mockMvc.perform(post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testCreateFamily_Forbidden_ChildRole() throws Exception {
        User child = new User("child@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedChild.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "CHILD"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testCreateFamily_Forbidden_DifferentUserId() throws Exception {
        User parent1 = new User("parent1@test.com", "Parent1", UserRole.PARENT);
        final User savedParent1 = userRepository.save(parent1);

        User parent2 = new User("parent2@test.com", "Parent2", UserRole.PARENT);
        final User savedParent2 = userRepository.save(parent2);

        // Parent1 tries to create family for Parent2
        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedParent2.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent1.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAddFamilyMember_Success() throws Exception {
        User parent = new User("parent2@test.com", "Parent2", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);
        
        User child = new User("child@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);
        
        FamilyMember parentMember = new FamilyMember(savedFamily, savedParent, UserRole.PARENT);
        familyMemberRepository.save(parentMember);

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void testAddFamilyMember_Forbidden_ChildRole() throws Exception {
        User parent = new User("parent3@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);
        
        User child = new User("child2@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);
        
        FamilyMember parentMember = new FamilyMember(savedFamily, savedParent, UserRole.PARENT);
        familyMemberRepository.save(parentMember);

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        // Child tries to add a member
        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "CHILD"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAddFamilyMember_Forbidden_WrongParent() throws Exception {
        User parent1 = new User("parentA@test.com", "ParentA", UserRole.PARENT);
        final User savedParent1 = userRepository.save(parent1);
        
        User parent2 = new User("parentB@test.com", "ParentB", UserRole.PARENT);
        final User savedParent2 = userRepository.save(parent2);
        
        User child = new User("child3@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        Family family = new Family("Family A");
        final Family savedFamily = familyRepository.save(family);
        
        // parent1 owns the family
        FamilyMember parentMember = new FamilyMember(savedFamily, savedParent1, UserRole.PARENT);
        familyMemberRepository.save(parentMember);

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        // parent2 tries to add a child to parent1's family
        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent2.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
