"use client";

import { PurchaseRequestDTO } from "@/lib/api-client";
import {
  buildSafeMerchantUrl,
  formatCurrencyAmount,
  formatRelativeTime,
  getDisplayDomain,
} from "@/lib/format-utils";

interface PurchaseRequestCardProps {
  request: PurchaseRequestDTO;
  isProcessing: boolean;
  onApprove: (requestId: number) => void;
  onDeny: (requestId: number) => void;
  onInspectProof: (request: PurchaseRequestDTO) => void;
}

export default function PurchaseRequestCard({
  request,
  isProcessing,
  onApprove,
  onDeny,
  onInspectProof,
}: PurchaseRequestCardProps) {
  const isPending = request.status === "PENDING";
  const isApproved = request.status === "APPROVED";
  const isDenied = request.status === "DENIED";

  const displayDomain = getDisplayDomain(request.siteDomain);
  const merchantUrl = buildSafeMerchantUrl(request.siteDomain);
  const childLabel = request.childName || `Child #${request.childId}`;
  const childInitial = childLabel.charAt(0).toUpperCase();
  const formattedAmount = formatCurrencyAmount(request.amount, request.currency);
  const currencyCode = (request.currency || "USD").trim().toUpperCase();

  // Parse multi-item Shopping Cart Manifest summaries (e.g. "007 First Light ($19.99) + Sea of Thieves ($8.39)")
  const rawItemName = (request.itemName || "").trim();
  const cartSegments = rawItemName.includes(" + ")
    ? rawItemName
        .split(/\s+\+\s+/)
        .map((seg) => seg.trim())
        .filter(Boolean)
        .map((seg) => {
          const priceMatch = seg.match(/^(.*?)\s*\(([$€£₹RsA-Z.\s]*\d+[.,]\d{2})\)\s*$/i);
          if (priceMatch) {
            return { title: priceMatch[1].trim(), price: priceMatch[2].trim() };
          }
          return { title: seg, price: null };
        })
    : [];
  const isMultiItemCart = cartSegments.length > 1;

  return (
    <article className="p-5 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-4 transition-all">
      {/* Top Row: Child Info, Badges, and Cost Callout Box */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Child Avatar */}
          <div className="w-11 h-11 rounded-full bg-sun border-2 border-ink flex items-center justify-center font-bold text-sm text-ink shrink-0 shadow-[2px_2px_0px_#151515]">
            {childInitial}
          </div>

          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {/* Child Name, Time, Status & Category */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-body-sm font-bold text-xs text-ink">
                {childLabel}
              </span>
              <span className="text-outline text-xs">|</span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-outline">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                <span>{formatRelativeTime(request.createdAt)}</span>
              </span>

              {isPending && (
                <span className="px-2 py-0.5 bg-sun border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                  PENDING REVIEW
                </span>
              )}
              {isApproved && (
                <span className="px-2 py-0.5 bg-mint border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                  APPROVED
                </span>
              )}
              {isApproved && request.rsaSignature && (
                <span className="px-2 py-0.5 bg-mint/50 border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">shield</span>
                  <span>RSA-2048 SIGNED</span>
                </span>
              )}
              {isDenied && (
                <span className="px-2 py-0.5 bg-coral border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                  DENIED
                </span>
              )}
              {request.category && (
                <span className="px-2 py-0.5 bg-surface-container border border-ink/40 text-outline font-mono text-[10px] uppercase rounded">
                  {request.category}
                </span>
              )}
            </div>

            {/* Item Name or Multi-Item Cart Manifest Breakdown */}
            {isMultiItemCart ? (
              <div className="flex flex-col gap-2 mt-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm font-bold text-ink text-base sm:text-lg leading-snug">
                    Shopping Cart Order ({cartSegments.length} Items)
                  </h3>
                </div>
                <div className="bg-paper border-2 border-ink rounded-lg p-2.5 flex flex-col gap-1.5 shadow-[2px_2px_0px_#151515]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-outline">
                    Itemized Cart Manifest
                  </span>
                  {cartSegments.map((item, idx) => (
                    <div
                      key={`${idx}-${item.title}`}
                      className="flex items-center justify-between gap-2 bg-surface border border-ink/40 rounded px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 bg-ink text-surface font-mono text-[10px] font-bold rounded-sm shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-body-sm font-bold text-xs sm:text-sm text-ink truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.price && (
                        <span className="font-mono font-bold text-xs text-ink bg-sun/60 border border-ink px-2 py-0.5 rounded shrink-0">
                          {item.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <h3 className="font-headline-sm font-bold text-ink text-lg leading-snug break-words">
                {request.itemName}
              </h3>
            )}
          </div>
        </div>

        {/* High-Contrast Cost Callout Box */}
        <div className="bg-paper border-2 border-ink rounded-lg px-3.5 py-2 shadow-[2px_2px_0px_#151515] flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 shrink-0">
          <span className="font-mono font-bold text-xl text-ink leading-none">
            {formattedAmount}
          </span>
          <span className="font-mono text-[10px] font-bold text-outline uppercase tracking-wider mt-0.5">
            {currencyCode}
          </span>
        </div>
      </div>

      {/* Clickable Merchant Verification Strip */}
      <div className="p-3 bg-paper rounded-lg border-2 border-ink/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded bg-sky/40 border-2 border-ink flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-base text-ink">storefront</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-ink truncate">
                {displayDomain || request.siteDomain}
              </span>
              <span className="font-caption text-[10px] text-outline hidden sm:inline">
                &bull; Verify site legitimacy before authorizing payment
              </span>
            </div>
            <a
              href={merchantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-primary hover:underline truncate"
              title={merchantUrl}
            >
              {merchantUrl}
            </a>
          </div>
        </div>

        <a
          href={merchantUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 bg-sky text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:brightness-105 transition-all inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          <span>Visit Merchant ({displayDomain || request.siteDomain})</span>
        </a>
      </div>

      {/* Child Justification Speech Bubble */}
      {request.note ? (
        <div className="bg-surface-container/70 border-2 border-ink rounded-lg p-3 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-base text-ink shrink-0 mt-0.5">
            chat_bubble
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider text-outline">
              Child&apos;s Note
            </span>
            <p className="font-body-sm text-xs sm:text-sm text-ink italic break-words">
              &quot;{request.note}&quot;
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[11px] font-caption text-outline italic flex items-center gap-1.5">
          <span className="material-symbols-outlined text-xs">chat_bubble_outline</span>
          <span>No note provided by child.</span>
        </p>
      )}

      {/* Bottom Action Bar */}
      <div className="border-t-2 border-ink/15 pt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-outline">
          Request #{request.id}
        </span>

        {isPending && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onApprove(request.id)}
              disabled={isProcessing}
              className="px-4 py-2 bg-mint text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessing ? (
                <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-sm">done</span>
              )}
              <span>Approve</span>
            </button>

            <button
              type="button"
              onClick={() => onDeny(request.id)}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-coral text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>Deny</span>
            </button>
          </div>
        )}

        {isApproved && (
          <button
            type="button"
            onClick={() => onInspectProof(request)}
            className="ml-auto px-3.5 py-2 bg-paper text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-ink">verified</span>
            <span>Cryptographic Proof</span>
          </button>
        )}

        {isDenied && (
          <div className="ml-auto inline-flex items-center gap-1.5 font-mono text-xs font-bold text-outline">
            <span className="material-symbols-outlined text-sm text-coral">block</span>
            <span>
              Request denied
              {request.decidedAt ? ` (${formatRelativeTime(request.decidedAt)})` : ""}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
