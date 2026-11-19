package com.centinel.finai.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.LocalDateTime;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RsaSignatureServiceTest {

    private RsaSignatureService signatureService;

    @BeforeEach
    void setUp() {
        signatureService = new RsaSignatureService();
    }

    @Test
    @DisplayName("Should successfully sign canonical approval payload and verify signature")
    void testSignAndVerify_Success() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 19, 14, 30, 0);
        String payload = signatureService.buildCanonicalApprovalPayload(
                101L, 1L, 2L, new BigDecimal("49.99"), "USD", "APPROVED", now
        );

        String signature = signatureService.signPayload(payload);

        assertThat(signature).isNotNull().isNotBlank();
        boolean isValid = signatureService.verifySignature(payload, signature);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should reject signature verification when purchase amount is tampered with")
    void testTamperedAmount_FailsVerification() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 19, 14, 30, 0);
        String originalPayload = signatureService.buildCanonicalApprovalPayload(
                101L, 1L, 2L, new BigDecimal("49.99"), "USD", "APPROVED", now
        );
        String signature = signatureService.signPayload(originalPayload);

        // Adversary alters amount from 49.99 to 149.99
        String tamperedPayload = signatureService.buildCanonicalApprovalPayload(
                101L, 1L, 2L, new BigDecimal("149.99"), "USD", "APPROVED", now
        );

        boolean isValid = signatureService.verifySignature(tamperedPayload, signature);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject signature verification when approval status is tampered with")
    void testTamperedStatus_FailsVerification() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 19, 14, 30, 0);
        String originalPayload = signatureService.buildCanonicalApprovalPayload(
                101L, 1L, 2L, new BigDecimal("49.99"), "USD", "APPROVED", now
        );
        String signature = signatureService.signPayload(originalPayload);

        // Adversary alters status to DENIED or modifies timestamp
        String tamperedPayload = signatureService.buildCanonicalApprovalPayload(
                101L, 1L, 2L, new BigDecimal("49.99"), "USD", "DENIED", now
        );

        boolean isValid = signatureService.verifySignature(tamperedPayload, signature);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should return false when verifying with malformed signature bytes")
    void testMalformedSignature_ReturnsFalse() {
        String payload = "TEST_PAYLOAD";
        boolean isValid = signatureService.verifySignature(payload, "INVALID_BASE64_SIGNATURE_STRING==");
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when attempting to sign null or blank payload")
    void testSignNullOrBlank_ThrowsException() {
        assertThatThrownBy(() -> signatureService.signPayload(null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> signatureService.signPayload("   "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Should export valid RSA-2048 public key in X.509 PEM and Base64 formats")
    void testPublicKeyExport_ValidPemAndBase64() throws Exception {
        String pem = signatureService.getPublicKeyPem();
        String base64 = signatureService.getPublicKeyBase64();

        assertThat(pem).startsWith("-----BEGIN PUBLIC KEY-----")
                       .endsWith("-----END PUBLIC KEY-----\n");
        assertThat(base64).isNotBlank();

        // Reconstruct public key from Base64 to confirm cryptographic integrity
        byte[] decodedKey = Base64.getDecoder().decode(base64);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decodedKey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PublicKey reconstructedKey = keyFactory.generatePublic(keySpec);

        assertThat(reconstructedKey.getAlgorithm()).isEqualTo("RSA");
        assertThat(reconstructedKey.getFormat()).isEqualTo("X.509");
    }
}
