package com.centinel.finai.common;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.*;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigJwtValidationTest {

    private final String expectedIssuer = "https://bllntgtyksncfahhdxga.supabase.co/auth/v1";
    private final String expectedAudience = "authenticated";

    private OAuth2TokenValidator<Jwt> createValidator() {
        OAuth2TokenValidator<Jwt> defaultValidator = JwtValidators.createDefaultWithIssuer(expectedIssuer);
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
                JwtClaimNames.AUD,
                aud -> aud != null && aud.contains(expectedAudience)
        );
        return new DelegatingOAuth2TokenValidator<>(defaultValidator, audienceValidator);
    }

    @Test
    void validateToken_validIssuerAndAudience_success() {
        OAuth2TokenValidator<Jwt> validator = createValidator();

        Jwt validJwt = Jwt.withTokenValue("valid-mock-token")
                .header("alg", "none")
                .claim(JwtClaimNames.ISS, expectedIssuer)
                .claim(JwtClaimNames.AUD, List.of(expectedAudience))
                .issuedAt(Instant.now().minusSeconds(10))
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("test-uuid")
                .build();

        OAuth2TokenValidatorResult result = validator.validate(validJwt);
        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void validateToken_wrongIssuer_rejected() {
        // AC-06, AC-80: Wrong issuer token must be rejected
        OAuth2TokenValidator<Jwt> validator = createValidator();

        Jwt invalidIssuerJwt = Jwt.withTokenValue("invalid-issuer-token")
                .header("alg", "none")
                .claim(JwtClaimNames.ISS, "https://malicious-attacker.com/auth/v1")
                .claim(JwtClaimNames.AUD, List.of(expectedAudience))
                .issuedAt(Instant.now().minusSeconds(10))
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("test-uuid")
                .build();

        OAuth2TokenValidatorResult result = validator.validate(invalidIssuerJwt);
        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).anyMatch(err -> err.getDescription().contains("iss"));
    }

    @Test
    void validateToken_wrongAudience_rejected() {
        // AC-80: Token without configured audience must be rejected
        OAuth2TokenValidator<Jwt> validator = createValidator();

        Jwt invalidAudJwt = Jwt.withTokenValue("invalid-aud-token")
                .header("alg", "none")
                .claim(JwtClaimNames.ISS, expectedIssuer)
                .claim(JwtClaimNames.AUD, List.of("unauthorized-client"))
                .issuedAt(Instant.now().minusSeconds(10))
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("test-uuid")
                .build();

        OAuth2TokenValidatorResult result = validator.validate(invalidAudJwt);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    void validateToken_expired_rejected() {
        // AC-06: Expired token must be rejected
        OAuth2TokenValidator<Jwt> validator = createValidator();

        Jwt expiredJwt = Jwt.withTokenValue("expired-token")
                .header("alg", "none")
                .claim(JwtClaimNames.ISS, expectedIssuer)
                .claim(JwtClaimNames.AUD, List.of(expectedAudience))
                .issuedAt(Instant.now().minusSeconds(7200))
                .expiresAt(Instant.now().minusSeconds(3600))
                .subject("test-uuid")
                .build();

        OAuth2TokenValidatorResult result = validator.validate(expiredJwt);
        assertThat(result.hasErrors()).isTrue();
    }
}
