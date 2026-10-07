package com.centinel.finai.controller;

import com.centinel.finai.dto.AddFamilyMemberDTO;
import com.centinel.finai.dto.CreateFamilyDTO;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        familyMemberRepository.deleteAll();
        familyRepository.deleteAll();
        userRepository.deleteAll();
    }

    // =========================================================================
    // POST /api/v1/families (Family Creation Matrix)
    // =========================================================================

    @Test
    @DisplayName("Create family succeeds when authorized parent creates for self")
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
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Smith Family"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 401 when unauthenticated")
    void testCreateFamily_Unauthorized() throws Exception {
        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", 1L);

        mockMvc.perform(post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Create family fails with 403 and safe JSON error when caller has CHILD role")
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
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can create a family."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 403 when CHILD in DB attempts to spoof PARENT claim in JWT")
    void testCreateFamily_Forbidden_ChildSpoofingParentClaim() throws Exception {
        User child = new User("child-spoof@test.com", "Child Spoof", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedChild.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can create a family."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 403 when Parent1 tries to create family for Parent2")
    void testCreateFamily_Forbidden_DifferentUserId_ParentForAnotherParent() throws Exception {
        User parent1 = new User("parent1@test.com", "Parent1", UserRole.PARENT);
        final User savedParent1 = userRepository.save(parent1);

        User parent2 = new User("parent2@test.com", "Parent2", UserRole.PARENT);
        final User savedParent2 = userRepository.save(parent2);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedParent2.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent1.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Cannot create a family for another user."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 403 when Parent tries to create family for Child user ID")
    void testCreateFamily_Forbidden_DifferentUserId_ParentForChild() throws Exception {
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        User child = new User("child@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedChild.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Cannot create a family for another user."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 403 when Child tries to create family for Parent user ID")
    void testCreateFamily_Forbidden_ChildForParent() throws Exception {
        User child = new User("child@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", savedParent.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "CHILD"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can create a family."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Create family fails with 400 when name is blank")
    void testCreateFamily_ValidationFailed_BlankName() throws Exception {
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        CreateFamilyDTO request = new CreateFamilyDTO("", savedParent.getId());

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.validationErrors.name").exists());
    }

    @Test
    @DisplayName("Create family fails with 400 when parentUserId is null")
    void testCreateFamily_ValidationFailed_NullParentUserId() throws Exception {
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", null);

        mockMvc.perform(post("/api/v1/families")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.validationErrors.parentUserId").exists());
    }

    // =========================================================================
    // POST /api/v1/families/{id}/members (Member Management Matrix)
    // =========================================================================

    @Test
    @DisplayName("Add family member succeeds when authorized parent modifies own family")
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
    @DisplayName("Add family member fails with 401 when unauthenticated")
    void testAddFamilyMember_Unauthorized() throws Exception {
        AddFamilyMemberDTO request = new AddFamilyMemberDTO(2L);

        mockMvc.perform(post("/api/v1/families/1/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Add family member fails with 403 and safe JSON error when caller has CHILD role")
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

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "CHILD"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can manage family members."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Add family member fails with 403 when CHILD who is already a family member attempts to add members")
    void testAddFamilyMember_Forbidden_ChildMemberOfFamily() throws Exception {
        User parent = new User("parent-mem@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        User child1 = new User("child-mem1@test.com", "Child 1", UserRole.CHILD);
        final User savedChild1 = userRepository.save(child1);

        User child2 = new User("child-mem2@test.com", "Child 2", UserRole.CHILD);
        final User savedChild2 = userRepository.save(child2);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);

        familyMemberRepository.save(new FamilyMember(savedFamily, savedParent, UserRole.PARENT));
        familyMemberRepository.save(new FamilyMember(savedFamily, savedChild1, UserRole.CHILD));

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild2.getId());

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild1.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "CHILD"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can manage family members."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Add family member fails with 403 when CHILD in DB attempts to spoof PARENT in JWT claim")
    void testAddFamilyMember_Forbidden_ChildSpoofingParentClaim() throws Exception {
        User parent = new User("parent-spoof@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        User child = new User("child-spoof2@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);

        familyMemberRepository.save(new FamilyMember(savedFamily, savedParent, UserRole.PARENT));

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedChild.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Only a PARENT can manage family members."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Add family member fails with 403 when Parent2 tries to add member to Parent1's family")
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
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("You are not authorized to modify this family."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Add family member fails with 403 when parent tries to modify non-existent family ID")
    void testAddFamilyMember_Forbidden_NonExistentFamily() throws Exception {
        User parent = new User("parent-nonexist@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        User child = new User("child-nonexist@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        mockMvc.perform(post("/api/v1/families/999999/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("You are not authorized to modify this family."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("Add family member fails with 400 when childUserId is null")
    void testAddFamilyMember_ValidationFailed_NullChildId() throws Exception {
        User parent = new User("parent-val@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);
        familyMemberRepository.save(new FamilyMember(savedFamily, savedParent, UserRole.PARENT));

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(null);

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.validationErrors.childUserId").exists());
    }

    @Test
    @DisplayName("Add family member fails with 400 when child is already a member of the family")
    void testAddFamilyMember_BadRequest_ChildAlreadyMember() throws Exception {
        User parent = new User("parent-dup@test.com", "Parent", UserRole.PARENT);
        final User savedParent = userRepository.save(parent);

        User child = new User("child-dup@test.com", "Child", UserRole.CHILD);
        final User savedChild = userRepository.save(child);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);

        familyMemberRepository.save(new FamilyMember(savedFamily, savedParent, UserRole.PARENT));
        familyMemberRepository.save(new FamilyMember(savedFamily, savedChild, UserRole.CHILD));

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedChild.getId());

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Child is already a member of this family"));
    }

    @Test
    @DisplayName("Add family member fails with 400 when user being added is not a CHILD")
    void testAddFamilyMember_BadRequest_UserNotAChild() throws Exception {
        User parent1 = new User("parent-main@test.com", "Parent 1", UserRole.PARENT);
        final User savedParent1 = userRepository.save(parent1);

        User parent2 = new User("parent-other@test.com", "Parent 2", UserRole.PARENT);
        final User savedParent2 = userRepository.save(parent2);

        Family family = new Family("Smith Family");
        final Family savedFamily = familyRepository.save(family);
        familyMemberRepository.save(new FamilyMember(savedFamily, savedParent1, UserRole.PARENT));

        // Parent1 attempts to add Parent2 as a child
        AddFamilyMemberDTO request = new AddFamilyMemberDTO(savedParent2.getId());

        mockMvc.perform(post("/api/v1/families/" + savedFamily.getId() + "/members")
                .with(jwt().jwt(builder -> builder
                        .subject(savedParent1.getId().toString())
                        .claim("app_metadata", java.util.Map.of("role", "PARENT"))))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("User not found or is not a CHILD"));
    }
}
