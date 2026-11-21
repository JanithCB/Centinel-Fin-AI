/**
 * Shared formatting and safe external URL helpers for ParentGuard dashboards.
 */

export function buildSafeMerchantUrl(siteDomain: string): string {
  const trimmed = (siteDomain || "").trim();
  if (!trimmed) {
    return "#";
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "#";
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getDisplayDomain(siteDomain: string): string {
  const trimmed = (siteDomain || "").trim();
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function formatCurrencyAmount(amount: number, currency?: string): string {
  const numeric = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const code = (currency || "USD").trim().toUpperCase();
  if (code === "USD") {
    return `$${numeric.toFixed(2)}`;
  }
  return `${code} ${numeric.toFixed(2)}`;
}
