package com.centinel.finai.service;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.dto.RegisterUserDTO;
import com.centinel.finai.dto.UserResponseDTO;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private FamilyMemberRepository familyMemberRepository;

    @InjectMocks
    private UserService userService;

    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        mockJwt = Jwt.withTokenValue("mock-jwt-token")
                .header("alg", "none")
                .subject("auth-uuid-12345")
                .claim("email", "testuser@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    @Test
    void registerOrSyncUser_newUser_createsWithRequestedRole() {
        when(userRepository.findByAuthId("auth-uuid-12345")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.empty());
        when(familyMemberRepository.findByUserId(any())).thenReturn(Collections.emptyList());

        User savedUser = new User("auth-uuid-12345", "testuser@example.com", "Test Display", UserRole.PARENT);
        savedUser.setId(1L);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        RegisterUserDTO dto = new RegisterUserDTO(UserRole.PARENT, "Test Display", null);
        UserResponseDTO response = userService.registerOrSyncUser(dto, mockJwt);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getAuthId()).isEqualTo("auth-uuid-12345");
        assertThat(response.getEmail()).isEqualTo("testuser@example.com");
        assertThat(response.getRole()).isEqualTo(UserRole.PARENT);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerOrSyncUser_existingUser_preservesExistingRole_preventsEscalation() {
        // AC-06, AC-94: Existing CHILD user attempts to change role to PARENT
        User existingUser = new User("auth-uuid-12345", "child@example.com", "Child User", UserRole.CHILD);
        existingUser.setId(10L);

        when(userRepository.findByAuthId("auth-uuid-12345")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(familyMemberRepository.findByUserId(10L)).thenReturn(Collections.emptyList());

        RegisterUserDTO maliciousDto = new RegisterUserDTO(UserRole.PARENT, "Child Updated Name", null);
        UserResponseDTO response = userService.registerOrSyncUser(maliciousDto, mockJwt);

        // Role must remain CHILD, not changed to PARENT
        assertThat(response.getRole()).isEqualTo(UserRole.CHILD);
        assertThat(response.getDisplayName()).isEqualTo("Child Updated Name");
        assertThat(existingUser.getRole()).isEqualTo(UserRole.CHILD);
    }

    @Test
    void registerOrSyncUser_nullJwt_throwsForbiddenOperation() {
        RegisterUserDTO dto = new RegisterUserDTO(UserRole.PARENT);
        assertThatThrownBy(() -> userService.registerOrSyncUser(dto, null))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("Authentication token required");
    }

    @Test
    void getCurrentUserProfile_includesFamilyMembershipInfo() {
        User user = new User("auth-uuid-12345", "parent@example.com", "Parent User", UserRole.PARENT);
        user.setId(5L);

        Family family = new Family("The Brady Bunch");
        family.setId(99L);
        FamilyMember member = new FamilyMember(family, user, UserRole.PARENT);

        when(currentUserResolver.getCurrentUser()).thenReturn(Optional.of(user));
        when(familyMemberRepository.findByUserId(5L)).thenReturn(List.of(member));

        UserResponseDTO profile = userService.getCurrentUserProfile(mockJwt);

        assertThat(profile.getId()).isEqualTo(5L);
        assertThat(profile.getFamilyId()).isEqualTo(99L);
        assertThat(profile.getFamilyName()).isEqualTo("The Brady Bunch");
    }
}
