package com.centinel.finai.security;

import com.centinel.finai.security.dto.PublicKeyResponseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public Cryptographic Key Discovery Controller.
 * Exposes the backend's RSA-2048 Public Key to the ParentGuard Chrome Extension
 * and external verifiers for offline WebCrypto API verification.
 */
@RestController
@RequestMapping("/api/v1/security")
public class SecurityController {

    private final RsaSignatureService rsaSignatureService;

    public SecurityController(RsaSignatureService rsaSignatureService) {
        this.rsaSignatureService = rsaSignatureService;
    }

    @GetMapping("/public-key")
    public ResponseEntity<PublicKeyResponseDTO> getPublicKey() {
        PublicKeyResponseDTO dto = new PublicKeyResponseDTO(
                rsaSignatureService.getAlgorithmName(),
                rsaSignatureService.getSignatureAlgorithm(),
                rsaSignatureService.getPublicKeyBase64(),
                rsaSignatureService.getPublicKeyPem()
        );
        return ResponseEntity.ok(dto);
    }
}
