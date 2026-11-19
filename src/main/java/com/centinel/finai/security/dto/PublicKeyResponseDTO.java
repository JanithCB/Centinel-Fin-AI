package com.centinel.finai.security.dto;

public class PublicKeyResponseDTO {

    private String algorithm;
    private String signatureAlgorithm;
    private String publicKeyBase64;
    private String publicKeyPem;

    public PublicKeyResponseDTO() {}

    public PublicKeyResponseDTO(String algorithm, String signatureAlgorithm, String publicKeyBase64, String publicKeyPem) {
        this.algorithm = algorithm;
        this.signatureAlgorithm = signatureAlgorithm;
        this.publicKeyBase64 = publicKeyBase64;
        this.publicKeyPem = publicKeyPem;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public void setAlgorithm(String algorithm) {
        this.algorithm = algorithm;
    }

    public String getSignatureAlgorithm() {
        return signatureAlgorithm;
    }

    public void setSignatureAlgorithm(String signatureAlgorithm) {
        this.signatureAlgorithm = signatureAlgorithm;
    }

    public String getPublicKeyBase64() {
        return publicKeyBase64;
    }

    public void setPublicKeyBase64(String publicKeyBase64) {
        this.publicKeyBase64 = publicKeyBase64;
    }

    public String getPublicKeyPem() {
        return publicKeyPem;
    }

    public void setPublicKeyPem(String publicKeyPem) {
        this.publicKeyPem = publicKeyPem;
    }
}
