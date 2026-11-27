/**
 * Shared formatting and safe external URL helpers for ParentGuard dashboards.
 */

export function isSessionPrivateCartPath(pathname: string): boolean {
  const p = (pathname || "").toLowerCase();
  if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(p)) {
    return true;
  }
  if (p.includes("/gp/cart") || p.includes("/gp/buy")) {
    return true;
  }
  return false;
}

export function buildSafeMerchantUrl(siteDomain: string, fallbackProductTitle?: string): string {
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

  const candidate = lower.startsWith("http://") || lower.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    // Never send a parent to a child's session-private /cart or /checkout route
    if (isSessionPrivateCartPath(parsed.pathname)) {
      if (fallbackProductTitle) {
        return buildStoreSearchFallbackUrl(parsed.hostname, fallbackProductTitle);
      }
      return parsed.origin;
    }
    return candidate;
  } catch {
    return candidate;
  }
}

export function buildStoreSearchFallbackUrl(hostnameOrDomain: string, itemTitle: string): string {
  const host = getDisplayDomain(hostnameOrDomain).toLowerCase();
  const cleanTitle = (itemTitle || "")
    .replace(/\(\s*[$€£₹RsA-Z.\s]*\d+[.,]\d{2}\s*\)\s*$/i, "")
    .replace(/\s+x\d+\s*$/i, "")
    .trim();
  const encoded = encodeURIComponent(cleanTitle);
  if (!host) return "#";
  if (!encoded) return `https://${host}`;

  if (host.includes("steampowered.com")) {
    return `https://store.steampowered.com/search/?term=${encoded}`;
  }
  if (host.includes("amazon.")) {
    return `https://${host}/s?k=${encoded}`;
  }
  if (host.includes("ebay.")) {
    return `https://${host}/sch/i.html?_nkw=${encoded}`;
  }
  if (host.includes("walmart.com")) {
    return `https://www.walmart.com/search?q=${encoded}`;
  }
  if (host.includes("target.com")) {
    return `https://www.target.com/s?searchTerm=${encoded}`;
  }
  if (host.includes("epicgames.com")) {
    return `https://store.epicgames.com/en-US/browse?q=${encoded}`;
  }
  return `https://${host}/search?q=${encoded}`;
}

/**
 * Extracts clean child note text and any embedded per-item product URLs ([CART_LINKS]url1|url2[/CART_LINKS])
 */
export function parseNoteAndCartLinks(rawNote?: string): {
  cleanNote: string;
  cartLinks: string[];
} {
  if (!rawNote) {
    return { cleanNote: "", cartLinks: [] };
  }
  const match = rawNote.match(/\[CART_LINKS\]([\s\S]*?)\[\/CART_LINKS\]/i);
  const cleanNote = rawNote.replace(/\s*\[CART_LINKS\][\s\S]*?\[\/CART_LINKS\]/gi, "").trim();
  if (!match || !match[1]) {
    return { cleanNote, cartLinks: [] };
  }
  const cartLinks = match[1]
    .split("|")
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
  return { cleanNote, cartLinks };
}

/**
 * Resolves a direct public product URL for an individual cart item, falling back to store search if needed.
 */
export function resolveCartItemProductUrl(
  explicitUrl: string | undefined,
  itemTitle: string,
  siteDomain: string
): string {
  if (explicitUrl) {
    const safeExplicit = buildSafeMerchantUrl(explicitUrl, itemTitle);
    if (safeExplicit !== "#") {
      return safeExplicit;
    }
  }
  return buildStoreSearchFallbackUrl(siteDomain, itemTitle);
}

export function getDisplayDomain(siteDomain: string): string {
  const trimmed = (siteDomain || "").trim();
  if (!trimmed) return "";
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.hostname) {
      return parsed.hostname;
    }
  } catch {
    // Fallback to simple strip
  }
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
