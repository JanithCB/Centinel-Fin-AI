/**
 * Centinel Fin AI – ParentGuard
 * Client-Side WebCrypto RSA-2048 Digital Signature Verifier (Milestone 3, Task 3.4)
 *
 * Academic Alignment:
 * - NB6005CEM Coursework 1 Task 1.c (Algorithm-Level Security:ENC-3)
 * - NB6005CEM Coursework 2 Prototype (Asymmetric RSA-2048 / SHA256withRSA Verification)
 *
 * Uses the browser's hardware-accelerated WebCrypto API (window.crypto.subtle)
 * to mathematically verify that an approval decision was signed by the genuine
 * Centinel Fin AI backend private key and that neither the amount, status, nor
 * child/family identity was tampered with on the client side.
 */

(function () {
  "use strict";

  const DEFAULT_API_BASE = "http://localhost:8080/api/v1";
  let cachedCryptoKey = null;
  let cachedPublicKeyBase64 = null;

  /**
   * Converts a Base64-encoded string (or PEM) into a Uint8Array buffer.
   */
  function base64ToUint8Array(base64Input) {
    const cleaned = (base64Input || "")
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\s+/g, "");

    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Fetches the RSA-2048 SPKI public key from the Spring Boot backend
   * (via the background service worker relay or direct fetch) and imports it
   * into a WebCrypto CryptoKey for RSASSA-PKCS1-v1_5 / SHA-256 verification.
   */
  async function getImportedPublicKey(apiBaseUrl = DEFAULT_API_BASE, forceRefresh = false) {
    if (cachedCryptoKey && !forceRefresh) {
      return cachedCryptoKey;
    }

    let pubKeyData = null;

    // 1. Try background service worker relay first (avoids HTTPS -> HTTP mixed-content blocks on external stores)
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const relayRes = await chrome.runtime.sendMessage({ type: "FETCH_PUBLIC_KEY" });
        if (relayRes && relayRes.success && relayRes.data) {
          pubKeyData = relayRes.data;
        }
      } catch (_) {
        // Fallback to direct fetch below
      }
    }

    // 2. Fallback to direct fetch (when running inside extension popup context)
    if (!pubKeyData) {
      const response = await fetch(`${apiBaseUrl}/security/public-key`);
      if (!response.ok) {
        throw new Error(`Failed to fetch backend public key (HTTP ${response.status})`);
      }
      pubKeyData = await response.json();
    }

    const spkiBase64 = pubKeyData.publicKeyBase64 || pubKeyData.publicKeyPem;
    if (!spkiBase64) {
      throw new Error("Backend public key response did not contain SPKI key material.");
    }

    const spkiBytes = base64ToUint8Array(spkiBase64);

    cachedCryptoKey = await window.crypto.subtle.importKey(
      "spki",
      spkiBytes.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }
      },
      false,
      ["verify"]
    );
    cachedPublicKeyBase64 = spkiBase64;

    return cachedCryptoKey;
  }

  /**
   * Normalizes amount to match Java's BigDecimal.stripTrailingZeros().toPlainString()
   */
  function normalizeJavaBigDecimal(amount) {
    if (amount === null || amount === undefined) return "0";
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return num.toString();
  }

  /**
   * Generates candidate timestamp strings to handle Java LocalDateTime.toString()
   * vs Jackson ISO-8601 fractional trailing-zero serialization.
   */
  function getCandidateTimestamps(rawTimestamp) {
    if (!rawTimestamp) return [""];
    const trimmed = String(rawTimestamp).trim();
    const candidates = new Set([trimmed]);

    const dotIndex = trimmed.indexOf(".");
    if (dotIndex !== -1) {
      const prefix = trimmed.substring(0, dotIndex);
      const frac = trimmed.substring(dotIndex + 1);
      // Java LocalDateTime.toString() pads fractional seconds to 3, 6, or 9 digits
      if (frac.length < 3) {
        candidates.add(`${prefix}.${frac.padEnd(3, "0")}`);
      }
      if (frac.length < 6) {
        candidates.add(`${prefix}.${frac.padEnd(6, "0")}`);
      }
      if (frac.length < 9) {
        candidates.add(`${prefix}.${frac.padEnd(9, "0")}`);
      }
    } else if (trimmed.endsWith(":00") && trimmed.length === 19) {
      // Java LocalDateTime.toString() omits ":00" when seconds and nanos are both 0
      candidates.add(trimmed.substring(0, 16));
    }

    return Array.from(candidates);
  }

  /**
   * Builds the canonical approval payload matching RsaSignatureService.buildCanonicalApprovalPayload:
   * REQ_ID:%d|FAMILY_ID:%d|CHILD_ID:%d|AMOUNT:%s|CURRENCY:%s|STATUS:%s|DECIDED_AT:%s
   */
  function buildCanonicalApprovalPayload(req, overrideTimestamp) {
    const normalizedAmount = normalizeJavaBigDecimal(req.amount);
    const normalizedCurrency = (req.currency || "USD").toUpperCase().trim();
    const timestampStr = overrideTimestamp !== undefined ? overrideTimestamp : (req.decidedAt || "");

    return `REQ_ID:${req.id}|FAMILY_ID:${req.familyId}|CHILD_ID:${req.childId}|AMOUNT:${normalizedAmount}|CURRENCY:${normalizedCurrency}|STATUS:${req.status}|DECIDED_AT:${timestampStr}`;
  }

  /**
   * Cryptographically verifies an approved purchase request using WebCrypto RSASSA-PKCS1-v1_5 (SHA-256).
   *
   * @param {Object} req PurchaseRequestResponseDTO from backend
   * @param {string} [apiBaseUrl] Optional API base URL
   * @returns {Promise<{valid: boolean, canonicalPayload: string, reason?: string}>}
   */
  async function verifyPurchaseApproval(req, apiBaseUrl = DEFAULT_API_BASE) {
    if (!req) {
      return { valid: false, canonicalPayload: "", reason: "MISSING_REQUEST" };
    }
    if (req.status !== "APPROVED") {
      return { valid: false, canonicalPayload: "", reason: "NOT_APPROVED" };
    }
    if (!req.rsaSignature || typeof req.rsaSignature !== "string") {
      return { valid: false, canonicalPayload: "", reason: "MISSING_RSA_SIGNATURE" };
    }

    try {
      const signatureBytes = base64ToUint8Array(req.rsaSignature);
      const encoder = new TextEncoder();
      const candidateTimestamps = getCandidateTimestamps(req.decidedAt);

      // Try verification with cached public key first; if it fails (e.g. backend restarted with fresh keypair), refresh key once
      for (const forceRefresh of [false, true]) {
        const publicKey = await getImportedPublicKey(apiBaseUrl, forceRefresh);

        for (const ts of candidateTimestamps) {
          const canonicalPayload = buildCanonicalApprovalPayload(req, ts);
          const payloadBytes = encoder.encode(canonicalPayload);

          const isValid = await window.crypto.subtle.verify(
            { name: "RSASSA-PKCS1-v1_5" },
            publicKey,
            signatureBytes.buffer,
            payloadBytes.buffer
          );

          if (isValid) {
            return {
              valid: true,
              canonicalPayload: canonicalPayload,
              publicKeyBase64: cachedPublicKeyBase64
            };
          }
        }
      }

      return {
        valid: false,
        canonicalPayload: buildCanonicalApprovalPayload(req),
        reason: "RSA_SIGNATURE_MISMATCH"
      };
    } catch (err) {
      console.warn("[Centinel Fin AI] WebCrypto RSA verification error:", err);
      return {
        valid: false,
        canonicalPayload: buildCanonicalApprovalPayload(req),
        reason: err.message || "VERIFICATION_ERROR"
      };
    }
  }

  window.ParentGuardCrypto = {
    getImportedPublicKey,
    buildCanonicalApprovalPayload,
    verifyPurchaseApproval
  };
})();
