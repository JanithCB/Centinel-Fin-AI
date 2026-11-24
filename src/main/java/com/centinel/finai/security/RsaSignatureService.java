package com.centinel.finai.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

/**
 * Enterprise RSA-2048 Cryptographic Signing & Verification Service.
 * Fulfills NB6005CEM Coursework 1 Task 1.c (Algorithm-Level Security).
 *
 * Implements digital signatures via SHA256withRSA to provide Non-Repudiation
 * and Integrity for parent purchase approvals.
 */
@Service
public class RsaSignatureService {

    private static final Logger log = LoggerFactory.getLogger(RsaSignatureService.class);
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";
    private static final String KEY_ALGORITHM = "RSA";
    private static final int KEY_SIZE_BITS = 2048;
    private static final Path KEYPAIR_STORAGE_PATH = Path.of("target", "parentguard-rsa-keypair.key");

    private final KeyPair keyPair;

    public RsaSignatureService() {
        this.keyPair = loadOrGenerateRsaKeyPair();
    }

    public RsaSignatureService(KeyPair keyPair) {
        if (keyPair == null || keyPair.getPrivate() == null || keyPair.getPublic() == null) {
            throw new IllegalArgumentException("KeyPair and its keys cannot be null");
        }
        this.keyPair = keyPair;
    }

    private KeyPair loadOrGenerateRsaKeyPair() {
        try {
            if (Files.exists(KEYPAIR_STORAGE_PATH)) {
                List<String> lines = Files.readAllLines(KEYPAIR_STORAGE_PATH, StandardCharsets.UTF_8);
                if (lines.size() >= 2 && !lines.get(0).isBlank() && !lines.get(1).isBlank()) {
                    byte[] pubBytes = Base64.getDecoder().decode(lines.get(0).trim());
                    byte[] privBytes = Base64.getDecoder().decode(lines.get(1).trim());
                    KeyFactory kf = KeyFactory.getInstance(KEY_ALGORITHM);
                    PublicKey pub = kf.generatePublic(new X509EncodedKeySpec(pubBytes));
                    PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
                    log.info("Loaded persisted {}-bit RSA keypair from {}", KEY_SIZE_BITS, KEYPAIR_STORAGE_PATH);
                    return new KeyPair(pub, priv);
                }
            }
        } catch (Exception e) {
            log.warn("Could not load persisted RSA keypair ({}), generating fresh keypair", e.getMessage());
        }

        KeyPair generated = generateRsaKeyPair();
        try {
            if (KEYPAIR_STORAGE_PATH.getParent() != null) {
                Files.createDirectories(KEYPAIR_STORAGE_PATH.getParent());
            }
            String pubB64 = Base64.getEncoder().encodeToString(generated.getPublic().getEncoded());
            String privB64 = Base64.getEncoder().encodeToString(generated.getPrivate().getEncoded());
            Files.writeString(KEYPAIR_STORAGE_PATH, pubB64 + "\n" + privB64 + "\n", StandardCharsets.UTF_8);
            log.info("Generated and persisted {}-bit RSA keypair to {}", KEY_SIZE_BITS, KEYPAIR_STORAGE_PATH);
        } catch (Exception e) {
            log.warn("Initialized RsaSignatureService with in-memory {}-bit RSA keypair: {}", KEY_SIZE_BITS, e.getMessage());
        }
        return generated;
    }

    private KeyPair generateRsaKeyPair() {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance(KEY_ALGORITHM);
            keyGen.initialize(KEY_SIZE_BITS, new SecureRandom());
            return keyGen.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new CryptographicOperationException("Fatal error: RSA algorithm not supported in JVM", e);
        }
    }

    /**
     * Signs data using the backend's private key with SHA256withRSA.
     *
     * @param data Canonical data string to sign
     * @return Base64-encoded digital signature string
     */
    public String signPayload(String data) {
        if (data == null || data.isBlank()) {
            throw new IllegalArgumentException("Data payload to sign cannot be null or blank");
        }
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initSign(keyPair.getPrivate());
            signature.update(data.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = signature.sign();
            return Base64.getEncoder().encodeToString(signatureBytes);
        } catch (Exception e) {
            throw new CryptographicOperationException("Failed to generate RSA-2048 digital signature", e);
        }
    }

    /**
     * Verifies whether a Base64-encoded signature matches the payload using the public key.
     *
     * @param data Canonical data string that was allegedly signed
     * @param signatureBase64 Base64-encoded signature string
     * @return true if authentic and untampered, false otherwise
     */
    public boolean verifySignature(String data, String signatureBase64) {
        if (data == null || signatureBase64 == null || signatureBase64.isBlank()) {
            return false;
        }
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initVerify(keyPair.getPublic());
            signature.update(data.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return signature.verify(signatureBytes);
        } catch (Exception e) {
            log.warn("Cryptographic signature verification failed or encountered malformed input: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Builds a canonical, tamper-resistant payload string for purchase approvals.
     */
    public String buildCanonicalApprovalPayload(Long requestId, Long familyId, Long childId,
                                                BigDecimal amount, String currency, String status,
                                                LocalDateTime decidedAt) {
        String timestampStr = decidedAt != null ? decidedAt.toString() : "";
        String normalizedAmount = amount != null ? amount.stripTrailingZeros().toPlainString() : "0";
        String normalizedCurrency = currency != null ? currency.toUpperCase().trim() : "USD";

        return String.format(
                "REQ_ID:%d|FAMILY_ID:%d|CHILD_ID:%d|AMOUNT:%s|CURRENCY:%s|STATUS:%s|DECIDED_AT:%s",
                requestId,
                familyId,
                childId,
                normalizedAmount,
                normalizedCurrency,
                status,
                timestampStr
        );
    }

    public PublicKey getPublicKey() {
        return keyPair.getPublic();
    }

    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());
    }

    public String getPublicKeyPem() {
        String base64Key = Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(keyPair.getPublic().getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + base64Key + "\n-----END PUBLIC KEY-----\n";
    }

    public String getAlgorithmName() {
        return KEY_ALGORITHM + "-" + KEY_SIZE_BITS;
    }

    public String getSignatureAlgorithm() {
        return SIGNATURE_ALGORITHM;
    }
}
