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

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class FamilyControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        userRepository.deleteAll();
        familyRepository.deleteAll();
    }

    @Test
    void testCreateFamily() throws Exception {
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        parent = userRepository.save(parent);

        CreateFamilyDTO request = new CreateFamilyDTO("Smith Family", parent.getId());

        mockMvc.perform(post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Smith Family"));
    }

    @Test
    void testCreateFamily_ValidationFailed() throws Exception {
        CreateFamilyDTO request = new CreateFamilyDTO("", null);

        mockMvc.perform(post("/api/v1/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAddFamilyMember() throws Exception {
        User parent = new User("parent2@test.com", "Parent2", UserRole.PARENT);
        parent = userRepository.save(parent);
        
        User child = new User("child@test.com", "Child", UserRole.CHILD);
        child = userRepository.save(child);

        Family family = new Family("Smith Family");
        family = familyRepository.save(family);
        
        FamilyMember parentMember = new FamilyMember(family, parent, UserRole.PARENT);
        familyMemberRepository.save(parentMember);

        AddFamilyMemberDTO request = new AddFamilyMemberDTO(child.getId());

        mockMvc.perform(post("/api/v1/families/" + family.getId() + "/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void testAddFamilyMember_ValidationFailed() throws Exception {
        AddFamilyMemberDTO request = new AddFamilyMemberDTO(null);

        mockMvc.perform(post("/api/v1/families/10/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
