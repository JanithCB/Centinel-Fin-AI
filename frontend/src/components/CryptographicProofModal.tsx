"use client";

import { useEffect, useState } from "react";
import { PurchaseRequestDTO, PublicKeyResponseDTO } from "@/lib/api-client";
import {
  buildSafeMerchantUrl,
  formatCurrencyAmount,
  getDisplayDomain,
} from "@/lib/format-utils";

interface CryptographicProofModalProps {
  request: PurchaseRequestDTO | null;
  publicKeyData: PublicKeyResponseDTO | null;
  onClose: () => void;
}

export default function CryptographicProofModal({
  request,
  publicKeyData,
  onClose,
}: CryptographicProofModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [request, onClose]);

  if (!request) {
    return null;
  }

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const displayDomain = getDisplayDomain(request.siteDomain);
  const merchantUrl = buildSafeMerchantUrl(request.siteDomain);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-proof-modal-title"
    >
      <div
        className="bg-surface rounded-xl border-[4px] border-ink shadow-[8px_8px_0px_#151515] max-w-2xl w-full p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-mint border-2 border-ink flex items-center justify-center shadow-[2px_2px_0px_#151515]">
              <span className="material-symbols-outlined text-base text-ink">lock</span>
            </div>
            <div>
              <h3
                id="crypto-proof-modal-title"
                className="font-headline-sm font-bold text-ink uppercase text-base"
              >
                Cryptographic Approval Proof
              </h3>
              <p className="font-caption text-xs text-outline">
                RSA-2048 Non-Repudiation Guarantee (NB6005CEM CW1 Task 1.c)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cryptographic proof inspector"
            className="p-1.5 rounded border-2 border-transparent hover:border-ink hover:bg-surface-container text-ink transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Transaction Overview */}
        <div className="p-3.5 bg-surface-container/50 rounded-lg border-2 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-label-sm text-[10px] font-bold uppercase text-outline">
              Item &amp; Merchant
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-headline-sm font-bold text-ink text-sm">
                {request.itemName}
              </p>
              <a
                href={merchantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface border border-ink rounded font-mono text-[11px] font-bold text-ink hover:bg-primary/40 transition-colors"
              >
                <span>{displayDomain}</span>
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="font-label-sm text-[10px] font-bold uppercase text-outline">
              Amount
            </span>
            <p className="font-mono font-bold text-ink text-sm">
              {formatCurrencyAmount(request.amount, request.currency)}{" "}
              {(request.currency || "USD").toUpperCase()}
            </p>
          </div>
        </div>

        {/* Cryptographic Fields */}
        <div className="flex flex-col gap-3">
          {/* RSA-2048 Digital Signature */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-xs font-bold uppercase text-ink flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-ink">key</span>
                <span>RSA-2048 Digital Signature (SHA256withRSA)</span>
              </label>
              {request.rsaSignature && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(request.rsaSignature!, "sig")}
                  className="text-[11px] font-mono font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  <span>{copiedKey === "sig" ? "Copied!" : "Copy Signature"}</span>
                </button>
              )}
            </div>
            <div className="p-2.5 bg-paper rounded border-2 border-ink font-mono text-[11px] text-ink break-all max-h-24 overflow-y-auto">
              {request.rsaSignature || "Signature not recorded on this entity."}
            </div>
          </div>

          {/* SHA-256 Idempotency Hash */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-xs font-bold uppercase text-ink flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-ink">fingerprint</span>
                <span>SHA-256 Idempotency Fingerprint</span>
              </label>
              {request.idempotencyHash && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(request.idempotencyHash!, "hash")}
                  className="text-[11px] font-mono font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  <span>{copiedKey === "hash" ? "Copied!" : "Copy Hash"}</span>
                </button>
              )}
            </div>
            <div className="p-2.5 bg-paper rounded border-2 border-ink font-mono text-[11px] text-ink break-all">
              {request.idempotencyHash ||
                "Generated on creation to prevent spam double-clicks."}
            </div>
          </div>

          {/* Public Key Discovery Status */}
          <div className="p-3 bg-mint/20 border-2 border-ink rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-ink text-base shrink-0">
                verified
              </span>
              <div>
                <p className="font-body-sm font-bold text-xs text-ink">
                  {publicKeyData
                    ? `${publicKeyData.algorithm} (${publicKeyData.signatureAlgorithm}) Public Key Discovered`
                    : "Backend Key Discovery Online"}
                </p>
                <p className="font-caption text-[10px] text-outline">
                  Chrome Extension (PG-5) verifies this signature offline via WebCrypto API before unlocking DOM.
                </p>
              </div>
            </div>
            {publicKeyData && (
              <button
                type="button"
                onClick={() => copyToClipboard(publicKeyData.publicKeyPem, "pem")}
                className="px-2.5 py-1 bg-surface border border-ink text-ink font-mono text-[10px] font-bold rounded shadow-[1px_1px_0px_#151515] hover:bg-surface-container shrink-0 self-start sm:self-center cursor-pointer"
              >
                {copiedKey === "pem" ? "Copied PEM!" : "Copy PEM"}
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t-2 border-ink/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-surface text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
