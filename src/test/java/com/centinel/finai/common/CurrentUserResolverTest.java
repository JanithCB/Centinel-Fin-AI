package com.centinel.finai.common;

import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserResolverTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CurrentUserResolver currentUserResolver;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContextWithJwt(Jwt jwt) {
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getCurrentUserId_resolvesByAuthIdUuid() {
        String uuid = "550e8400-e29b-41d4-a716-446655440000";
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject(uuid)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        setSecurityContextWithJwt(jwt);

        User mockUser = new User();
        mockUser.setId(42L);
        mockUser.setAuthId(uuid);

        when(userRepository.findByAuthId(uuid)).thenReturn(Optional.of(mockUser));

        Long userId = currentUserResolver.getCurrentUserId();
        assertThat(userId).isEqualTo(42L);
    }

    @Test
    void getCurrentUserId_resolvesByEmailClaim() {
        String email = "alex@familyguard.org";
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject("unknown-uuid")
                .claim("email", email)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        setSecurityContextWithJwt(jwt);

        when(userRepository.findByAuthId("unknown-uuid")).thenReturn(Optional.empty());

        User mockUser = new User();
        mockUser.setId(99L);
        mockUser.setEmail(email);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(mockUser));

        Long userId = currentUserResolver.getCurrentUserId();
        assertThat(userId).isEqualTo(99L);
    }

    @Test
    void getCurrentUserId_fallbackNumericSubject() {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject("123")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        setSecurityContextWithJwt(jwt);

        when(userRepository.findByAuthId("123")).thenReturn(Optional.empty());

        Long userId = currentUserResolver.getCurrentUserId();
        assertThat(userId).isEqualTo(123L);
    }

    @Test
    void getCurrentUserRole_extractsFromAppMetadata() {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject("user-1")
                .claim("app_metadata", Map.of("role", "PARENT"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        setSecurityContextWithJwt(jwt);

        UserRole role = currentUserResolver.getCurrentUserRole();
        assertThat(role).isEqualTo(UserRole.PARENT);
    }
}
