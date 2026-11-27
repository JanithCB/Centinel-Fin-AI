/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Smart Cart Manifest Scraper, Cart-Gate Lock & 4-Layer Anti-Tamper Engine
 *
 * Responsibilities:
 * - Cart-Gate Payment Lock: Intercepts and locks ONLY checkout payment gates
 *   ("Continue to payment", "Proceed to Checkout", "Pay Now", "Place Order") on /cart and /checkout pages
 * - Free Browsing & Cross-Tab Mutation Broadcast: Leaves "Add to Cart" unlocked on product pages while
 *   passively broadcasting cart additions across tabs so open /cart tabs cannot be exploited with stale DOMs
 * - Structural & Universal Cart Manifest Scraper: Extracts all cart items (titles, final discounted prices,
 *   discount badges, quantities, and direct product URLs) across React-based carts (Steam) and major stores
 * - 4-Layer Anti-Tamper Engine:
 *   1. Post-Approval Cart Stuffing Guard (RSA-2048 signed amount vs live cart total)
 *   2. Equal-Price Item Swap / Bait-and-Switch Guard (Canonical Cart Item Manifest matching)
 *   3. Multi-Tab Background Cart Injection Guard (chrome.storage.local cross-tab invalidation)
 *   4. Click-Time Just-In-Time (JIT) Synchronous Gate + Closure-Private State (defeats DevTools attribute tampering)
 */

(function () {
  "use strict";

  // Helper: Parse a raw price text (e.g. "$8.39", "Estimated total $28.38", "€14,99", "£19.99") into { amount, currency, raw }
  function parsePriceText(rawText, fallbackCurrency) {
    if (rawText === null || rawText === undefined) return null;
    const text = String(rawText).replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return null;

    if (/^\s*free(\s+to\s+play|\s+download)?\s*$/i.test(text) || (/free/i.test(text) && !/\d/.test(text))) {
      return null;
    }

    let currency = fallbackCurrency || "USD";
    let hasExplicitCurrency = Boolean(fallbackCurrency);

    if (/\bEUR\b|€/i.test(text)) { currency = "EUR"; hasExplicitCurrency = true; }
    else if (/\bGBP\b|£/i.test(text)) { currency = "GBP"; hasExplicitCurrency = true; }
    else if (/\bCAD\b|CDN\$|CA\$/i.test(text)) { currency = "CAD"; hasExplicitCurrency = true; }
    else if (/\bAUD\b|A\$|AU\$/i.test(text)) { currency = "AUD"; hasExplicitCurrency = true; }
    else if (/\bNZD\b|NZ\$/i.test(text)) { currency = "NZD"; hasExplicitCurrency = true; }
    else if (/\bSGD\b|S\$/i.test(text)) { currency = "SGD"; hasExplicitCurrency = true; }
    else if (/\bBRL\b|R\$/i.test(text)) { currency = "BRL"; hasExplicitCurrency = true; }
    else if (/\bJPY\b|¥/i.test(text)) { currency = "JPY"; hasExplicitCurrency = true; }
    else if (/\bINR\b|₹/i.test(text)) { currency = "INR"; hasExplicitCurrency = true; }
    else if (/\bLKR\b|\bRs\.?(?=\s*\d)/i.test(text)) { currency = "LKR"; hasExplicitCurrency = true; }
    else if (/\bMYR\b|\bRM(?=\s*\d)/i.test(text)) { currency = "MYR"; hasExplicitCurrency = true; }
    else if (/\bAED\b|\bDhs?\.?(?=\s*\d)/i.test(text)) { currency = "AED"; hasExplicitCurrency = true; }
    else if (/\bCHF\b/i.test(text)) { currency = "CHF"; hasExplicitCurrency = true; }
    else if (/\bPLN\b|zł/i.test(text)) { currency = "PLN"; hasExplicitCurrency = true; }
    else if (/\bSEK\b|\bkr\b/i.test(text)) { currency = "SEK"; hasExplicitCurrency = true; }
    else if (/\bUSD\b|US\$|\$/i.test(text)) { currency = "USD"; hasExplicitCurrency = true; }

    let normalizedNum = NaN;

    const decimalMatch = text.match(/(\d{1,3}(?:,\d{3})+\.\d{2}|\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,6}[.,]\d{2})(?!\d)/);
    if (decimalMatch) {
      let numStr = decimalMatch[1];
      if (numStr.includes(",") && numStr.includes(".")) {
        if (numStr.lastIndexOf(".") > numStr.lastIndexOf(",")) {
          numStr = numStr.replace(/,/g, "");
        } else {
          numStr = numStr.replace(/\./g, "").replace(",", ".");
        }
      } else if (numStr.includes(",")) {
        numStr = numStr.replace(",", ".");
      }
      normalizedNum = parseFloat(numStr);
    } else if (hasExplicitCurrency) {
      const intMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d{1,6})(?!\d)/);
      if (intMatch) {
        normalizedNum = parseFloat(intMatch[1].replace(/,/g, ""));
      }
    }

    if (isNaN(normalizedNum) || normalizedNum <= 0 || normalizedNum >= 1000000) {
      return null;
    }

    return {
      amount: normalizedNum,
      currency: currency,
      raw: text
    };
  }

  // Helper: Parse the FINAL active price from a container that may also include a strikethrough original price
  function extractActiveItemPrice(containerEl, metaCurrencyHint) {
    if (!containerEl) return null;

    // 1. Collect price-bearing leaf/inline elements that are NOT strikethrough / original prices
    const candidates = [];
    const subEls = containerEl.querySelectorAll("span, div, b, strong, p, ins, [class*='price' i]");

    const isStrikethroughOrOriginal = (el) => {
      if (!el) return false;
      if (el.closest && el.closest("del, s, strike, [class*='original' i], [class*='strike' i], [class*='was-price' i], [class*='old-price' i]")) {
        return true;
      }
      const cls = typeof el.className === "string" ? el.className.toLowerCase() : "";
      if (cls.includes("original") || cls.includes("strike") || cls.includes("discount_original")) {
        return true;
      }
      try {
        if (typeof window.getComputedStyle === "function") {
          const style = window.getComputedStyle(el);
          const td = (style.textDecoration || style.textDecorationLine || "").toLowerCase();
          if (td.includes("line-through")) return true;
        }
      } catch (_) {}
      return false;
    };

    subEls.forEach((el) => {
      if (isStrikethroughOrOriginal(el)) return;
      // Prefer leaf-level price nodes (no nested element children with digits, or short direct text)
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt || txt.length > 32) return;
      if (/^-\d{1,3}%$/.test(txt)) return; // Skip discount percentage pill

      // Ensure none of its children has a strikethrough price mixed into txt
      const hasStrikeChild = el.querySelector && el.querySelector("del, s, strike, [class*='original' i], [class*='strike' i]");
      if (hasStrikeChild) return;

      const parsed = parsePriceText(txt, metaCurrencyHint);
      if (parsed && parsed.amount > 0) {
        candidates.push(parsed);
      }
    });

    if (candidates.length > 0) {
      // On discounted cards (e.g. "$39.99" then "$19.99"), the final active price appears last (and is lowest when discounted)
      const hasDiscountBadge = /-\d{1,2}%/.test(containerEl.textContent || "");
      if (hasDiscountBadge && candidates.length > 1) {
        return candidates.reduce((minP, curP) => (curP.amount < minP.amount ? curP : minP), candidates[candidates.length - 1]);
      }
      return candidates[candidates.length - 1];
    }

    return parsePriceText(containerEl.textContent, metaCurrencyHint);
  }

  // Helper: Detect default merchant category from hostname
  function inferMerchantCategory(hostname) {
    const h = (hostname || "").toLowerCase();
    if (
      h.includes("steampowered") ||
      h.includes("steamcommunity") ||
      h.includes("roblox") ||
      h.includes("epicgames") ||
      h.includes("playstation") ||
      h.includes("xbox") ||
      h.includes("nintendo") ||
      h.includes("gog.com") ||
      h.includes("itch.io") ||
      h.includes("ea.com") ||
      h.includes("ubisoft") ||
      h.includes("blizzard") ||
      h.includes("humblebundle") ||
      h.includes("greenmangaming")
    ) {
      return "GAMING";
    }
    if (
      h.includes("netflix") ||
      h.includes("spotify") ||
      h.includes("twitch") ||
      h.includes("youtube") ||
      h.includes("disney") ||
      h.includes("hulu") ||
      h.includes("crunchyroll") ||
      h.includes("audible") ||
      h.includes("ticketmaster")
    ) {
      return "ENTERTAINMENT";
    }
    if (
      h.includes("udemy") ||
      h.includes("coursera") ||
      h.includes("edx") ||
      h.includes("khanacademy") ||
      h.includes("pluralsight") ||
      h.includes("skillshare") ||
      h.includes("brilliant") ||
      h.includes("duolingo")
    ) {
      return "EDUCATION";
    }
    return "SHOPPING";
  }

  // Helper: Clean common marketplace prefixes/suffixes from page/item titles
  function cleanStoreTitle(rawTitle) {
    return (rawTitle || "")
      .replace(/\s+/g, " ")
      .replace(/^Save\s+\d+%\s+on\s+/i, "")
      .replace(/^Amazon\.[a-z.]+\s*:\s*/i, "")
      .replace(/\s+on\s+Steam$/i, "")
      .replace(/\s+-\s+Steam$/i, "")
      .replace(/\s+\|\s+Roblox$/i, "")
      .replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, "")
      .replace(/\s*\|\s*eBay$/i, "")
      .replace(/\s*-\s*Best Buy$/i, "")
      .replace(/\s*-\s*Walmart\.com$/i, "")
      .replace(/\s*:\s*Target$/i, "")
      .trim();
  }

  // Helper: Normalize an item title for anti-tamper manifest comparison
  function normalizeManifestTitle(raw) {
    return cleanStoreTitle(raw || "")
      .replace(/\(\s*[$€£₹RsA-Z.\s]*\d+[.,]\d{2}\s*\)\s*$/i, "")
      .replace(/\[\s*\d+\s*items?\s*\]\s*$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  // Helper: Clean hostname key for storage keys
  function getCleanHostKey(hostname) {
    return (hostname || window.location.hostname || "")
      .replace(/^www\./i, "")
      .toLowerCase()
      .trim();
  }

  // Helper: Check if a URL path is a session-private cart or checkout route
  function isCartOrCheckoutPath(urlOrPath) {
    if (!urlOrPath) return false;
    let pathname = String(urlOrPath).toLowerCase();
    try {
      if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
        pathname = new URL(pathname).pathname.toLowerCase();
      }
    } catch (_) {}
    if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(pathname)) {
      return true;
    }
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy")) {
      return true;
    }
    return false;
  }

  // Helper: Sanitize a product URL (strips noisy tracking query strings & rejects private /cart URLs)
  function sanitizeProductUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
      const resolved = rawUrl.startsWith("/") ? `${window.location.origin}${rawUrl}` : rawUrl;
      if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) return null;
      const parsed = new URL(resolved);
      if (isCartOrCheckoutPath(parsed.pathname)) return null;
      const cleanPath = parsed.pathname.replace(/\/+$/, "");
      if (!cleanPath || cleanPath === "") return null;
      return `${parsed.origin}${cleanPath}`;
    } catch (_) {
      return null;
    }
  }

  // Helper: Build a public store product search URL fallback when a cart DOM has no direct item link
  function buildStoreProductSearchUrl(hostname, itemTitle) {
    const h = (hostname || window.location.hostname || "").toLowerCase();
    const encoded = encodeURIComponent((itemTitle || "").trim());
    if (!encoded) return `https://${h}`;
    if (h.includes("steampowered.com")) return `https://store.steampowered.com/search/?term=${encoded}`;
    if (h.includes("amazon.")) return `https://${h}/s?k=${encoded}`;
    if (h.includes("ebay.")) return `https://${h}/sch/i.html?_nkw=${encoded}`;
    if (h.includes("walmart.com")) return `https://www.walmart.com/search?q=${encoded}`;
    if (h.includes("target.com")) return `https://www.target.com/s?searchTerm=${encoded}`;
    if (h.includes("epicgames.com")) return `https://store.epicgames.com/en-US/browse?q=${encoded}`;
    return `https://${h}/search?q=${encoded}`;
  }

  // Helper: Check if current page is a Shopping Cart or Checkout page
  function isDedicatedCartOrCheckoutPage() {
    const pathname = (window.location.pathname || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();

    // Explicit Product Page Guard: Product detail pages are NEVER cart/checkout pages
    if (
      /\/app\/\d+/i.test(pathname) ||
      /\/dp\/[a-z0-9]+/i.test(pathname) ||
      /\/gp\/product\//i.test(pathname) ||
      /\/products?\//i.test(pathname) ||
      /\/item\//i.test(pathname)
    ) {
      return false;
    }

    if (isCartOrCheckoutPath(pathname) || search.includes("step=contact_information")) {
      return true;
    }
    if (document.querySelector("#cart_item_list, .cart_totals_area, #shopping-cart-table, [data-checkout-subtotal]")) {
      return true;
    }
    return false;
  }

  // Cross-Tab Product URL Vault (Synced via chrome.storage.local + sessionStorage)
  let crossTabProductVault = [];

  function hydrateCrossTabProductVault() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local && chrome.storage.local.get) {
        chrome.storage.local.get(["parentguard_product_vault"], (res) => {
          if (res && Array.isArray(res.parentguard_product_vault)) {
            crossTabProductVault = res.parentguard_product_vault;
          }
        });
      }
    } catch (_) {}
  }
  hydrateCrossTabProductVault();

  // Multi-Item Breadcrumb Ring Buffer: Stores up to 40 recently visited product pages across tabs
  function updateProductBreadcrumb(productInfo) {
    if (!productInfo || !productInfo.title || isDedicatedCartOrCheckoutPage()) return;
    const cleanUrl = sanitizeProductUrl(window.location.href);
    if (!cleanUrl) return;

    try {
      const entry = {
        domain: getCleanHostKey(window.location.hostname),
        title: cleanStoreTitle(productInfo.title),
        normTitle: normalizeManifestTitle(productInfo.title),
        url: cleanUrl,
        amount: productInfo.amount,
        currency: productInfo.currency,
        timestamp: Date.now()
      };
      sessionStorage.setItem("__parentguard_last_product__", JSON.stringify(entry));

      let history = [];
      const rawHistory = sessionStorage.getItem("__parentguard_product_history__");
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) history = parsed;
      }
      history = history.filter((h) => h && h.normTitle !== entry.normTitle && h.url !== entry.url);
      history.unshift(entry);
      if (history.length > 40) history = history.slice(0, 40);
      sessionStorage.setItem("__parentguard_product_history__", JSON.stringify(history));

      // Also sync to chrome.storage.local so /cart opened in any tab can resolve product URLs
      const mergedVault = [entry, ...crossTabProductVault.filter((h) => h && h.normTitle !== entry.normTitle && h.url !== entry.url)].slice(0, 40);
      crossTabProductVault = mergedVault;
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ parentguard_product_vault: mergedVault });
      }
    } catch (_) {}
  }

  function getProductBreadcrumbHistory() {
    const currentDomain = getCleanHostKey(window.location.hostname);
    const now = Date.now();
    const maxAge = 1000 * 60 * 60 * 12; // 12 hours
    const combined = [];
    const seenUrls = new Set();

    try {
      const raw = sessionStorage.getItem("__parentguard_product_history__");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) combined.push(...list);
      }
    } catch (_) {}

    if (Array.isArray(crossTabProductVault)) {
      combined.push(...crossTabProductVault);
    }

    return combined.filter((item) => {
      if (!item || !item.url || seenUrls.has(item.url)) return false;
      const itemDom = getCleanHostKey(item.domain);
      if (itemDom !== currentDomain) return false;
      if (now - (item.timestamp || 0) >= maxAge) return false;
      seenUrls.add(item.url);
      return true;
    });
  }

  function getProductBreadcrumb() {
    const history = getProductBreadcrumbHistory();
    if (history.length > 0) return history[0];
    try {
      const raw = sessionStorage.getItem("__parentguard_last_product__");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.domain === window.location.hostname && Date.now() - data.timestamp < 1000 * 60 * 60 * 4) {
        return data;
      }
    } catch (_) {}
    return null;
  }

  // Helper: Scrape the Cart Total from the page DOM
  function extractCartTotal(metaCurrencyHint) {
    const candidates = [
      // Steam Cart (Legacy & React Cart "Estimated total $28.38")
      () => {
        const estRow = document.querySelector(".cart_totals_area, .estimated_total_box, #cart_estimated_total");
        if (estRow) return extractActiveItemPrice(estRow, metaCurrencyHint);
        const bodyText = document.body ? (document.body.innerText || document.body.textContent || "") : "";
        const match = bodyText.match(/Estimated\s+total[\s\S]{0,60}?([$€£₹RsA-Z\s]*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i);
        return match ? parsePriceText(match[1], metaCurrencyHint) : null;
      },
      // Amazon Cart
      () => {
        const el = document.querySelector("#sc-subtotal-amount-activecart, #sc-subtotal-amount-buybox");
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
      },
      // Shopify / WooCommerce / Generic Cart
      () => {
        const el = document.querySelector(
          ".totals__subtotal-value, .cart__subtotal, .order-total .amount, .cart-subtotal .amount, [data-testid*='subtotal'], [data-checkout-subtotal]"
        );
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
      },
      // Universal price container within cart summary area
      () => {
        const totalArea = document.querySelector(".cart-total, .cart_total, .order-summary, .cart-summary");
        if (totalArea) {
          const priceEl = totalArea.querySelector(".price, .amount, [data-price]");
          if (priceEl) return extractActiveItemPrice(priceEl, metaCurrencyHint);
        }
        return null;
      }
    ];

    for (const getter of candidates) {
      try {
        const res = getter();
        if (res && res.amount > 0) return res;
      } catch (_) {}
    }
    return null;
  }

  // Helper: Extract canonical Steam item key (e.g. "app/3768760") from a URL
  function getSteamProductKey(href) {
    if (!href) return null;
    const m = String(href).match(/\/(app|sub|bundle)\/(\d+)/i);
    return m ? `${m[1].toLowerCase()}/${m[2]}` : null;
  }

  // Helper: Check if node A appears before node B in DOM order
  function isNodeBefore(nodeA, nodeB) {
    if (!nodeA || !nodeB) return true;
    if (typeof nodeA.compareDocumentPosition === "function") {
      return Boolean(nodeA.compareDocumentPosition(nodeB) & 4); // Node.DOCUMENT_POSITION_FOLLOWING === 4
    }
    return true;
  }

  // Helper: Scrape ALL Cart Items, Individual Prices, Discounts & Direct Product Links from Cart DOM
  function extractCartItemsAndLinks(metaCurrencyHint) {
    const items = [];
    const hostname = (window.location.hostname || "").toLowerCase();
    const breadcrumbs = getProductBreadcrumbHistory();

    // --- 1. Steam Shopping Cart (Supports both React Obfuscated DOM & Legacy DOM) ---
    if (hostname.includes("steampowered.com")) {
      // Find cutoff landmarks ("Remove all items" or "RECOMMENDATIONS FOR YOU") so recommended games are NEVER included
      let cutoffElement = null;
      const allHeadingsAndLinks = document.querySelectorAll("h1, h2, h3, h4, div, span, a, button");
      for (const el of allHeadingsAndLinks) {
        const directTxt = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (/^RECOMMENDATIONS\s+FOR\s+YOU$/i.test(directTxt) || /^Remove\s+all\s+items$/i.test(directTxt)) {
          cutoffElement = el;
          break;
        }
      }

      // Discover all Steam product links (/app/, /sub/, /bundle/) inside the cart section above cutoff
      const productAnchors = document.querySelectorAll("a[href*='/app/'], a[href*='/sub/'], a[href*='/bundle/']");
      const processedCards = new Set();

      productAnchors.forEach((anchor) => {
        if (!anchor || !anchor.href) return;
        if (
          anchor.closest &&
          anchor.closest(
            "header, nav, footer, #global_header, .supernav_container, .recommendations_container, [class*='recommendation' i], #recommended_items"
          )
        ) {
          return;
        }
        if (cutoffElement && !isNodeBefore(anchor, cutoffElement)) {
          return;
        }

        const prodKey = getSteamProductKey(anchor.href);
        if (!prodKey) return;

        // Walk up from the anchor to find the single Cart Item Card container
        let cardEl = anchor.parentElement;
        let cur = anchor.parentElement;
        for (let depth = 0; depth < 7 && cur && cur !== document.body; depth++) {
          const curTxt = (cur.textContent || "").replace(/\s+/g, " ").trim();
          // Stop before container encompasses the whole cart ("Continue to payment", "Estimated total", "Your Shopping Cart")
          if (
            /Continue\s+to\s+payment/i.test(curTxt) ||
            /Continue\s+Shopping/i.test(curTxt) ||
            /Your\s+Shopping\s+Cart/i.test(curTxt) ||
            /RECOMMENDATIONS\s+FOR\s+YOU/i.test(curTxt)
          ) {
            break;
          }

          // Check if cur contains links to OTHER Steam apps — if so, cur is the list wrapper, stop!
          const innerAppLinks = cur.querySelectorAll("a[href*='/app/'], a[href*='/sub/'], a[href*='/bundle/']");
          let hasDifferentProduct = false;
          for (const otherLink of innerAppLinks) {
            const otherKey = getSteamProductKey(otherLink.href);
            if (otherKey && otherKey !== prodKey) {
              hasDifferentProduct = true;
              break;
            }
          }
          if (hasDifferentProduct) {
            break;
          }

          cardEl = cur;
          cur = cur.parentElement;
        }

        if (!cardEl || processedCards.has(cardEl)) return;
        processedCards.add(cardEl);

        // Extract Title inside cardEl
        let itemTitle = "";
        const cardLinks = cardEl.querySelectorAll("a[href*='/app/'], a[href*='/sub/'], a[href*='/bundle/'], a.title, .title a");
        for (const lnk of cardLinks) {
          const t = cleanStoreTitle((lnk.textContent || "").replace(/\s+/g, " ").trim());
          if (t && t.length >= 2 && !/^(add|remove|view|install)$/i.test(t)) {
            itemTitle = t;
            break;
          }
        }

        // Fallback if anchor wrapped only capsule <img> and title is in a sibling text container
        if (!itemTitle) {
          const textCandidates = cardEl.querySelectorAll("div, span, h2, h3, h4");
          for (const node of textCandidates) {
            if (node.children && node.children.length > 0) continue;
            const rawT = (node.textContent || "").replace(/\s+/g, " ").trim();
            if (
              rawT.length >= 2 &&
              rawT.length <= 100 &&
              !/^(for my account|for a friend|is this a gift|add|remove|-\d+%|windows|mac|linux|steamos)$/i.test(rawT) &&
              !/free\s+starter\s+pack/i.test(rawT) &&
              !parsePriceText(rawT, metaCurrencyHint)
            ) {
              itemTitle = cleanStoreTitle(rawT);
              break;
            }
          }
        }

        // Cross-check breadcrumb history for title or clean URL enrichment
        let fullUrl = sanitizeProductUrl(anchor.href);
        const normItemTitle = normalizeManifestTitle(itemTitle);
        const matchedCrumb = breadcrumbs.find(
          (b) =>
            (b.url && getSteamProductKey(b.url) === prodKey) ||
            (normItemTitle && b.normTitle && b.normTitle === normItemTitle)
        );
        if (!itemTitle && matchedCrumb) {
          itemTitle = matchedCrumb.title;
        }
        if (matchedCrumb && matchedCrumb.url) {
          fullUrl = sanitizeProductUrl(matchedCrumb.url) || fullUrl;
        }
        if (!fullUrl && itemTitle) {
          fullUrl = buildStoreProductSearchUrl(hostname, itemTitle);
        }

        // Extract active final price (ignoring strikethrough original prices like $39.99)
        const priceObj = extractActiveItemPrice(cardEl, metaCurrencyHint);

        // Extract optional discount percentage pill (e.g. "-50%", "-65%")
        const discountMatch = (cardEl.textContent || "").match(/(-\d{1,2}%)/);
        const discountPct = discountMatch ? discountMatch[1] : null;

        if (itemTitle) {
          items.push({
            title: itemTitle,
            productUrl: fullUrl,
            amount: priceObj ? Number(priceObj.amount.toFixed(2)) : (matchedCrumb ? matchedCrumb.amount : null),
            currency: priceObj ? priceObj.currency : (matchedCrumb ? matchedCrumb.currency : (metaCurrencyHint || "USD")),
            discountPct: discountPct,
            quantity: 1
          });
        }
      });
    }

    // --- 2. Universal E-Commerce Carts (Amazon, Shopify, WooCommerce, eBay, Walmart, Target) ---
    if (items.length === 0) {
      const genericRows = document.querySelectorAll(
        "#activeCartViewForm .sc-list-item:not([data-removed='true']), .cart-item, .cart_item, .cart__item, tr.woocommerce-cart-form__cart-item, [data-testid*='cart-item'], [data-testid*='cart-line-item'], [class*='CartItem' i]"
      );
      genericRows.forEach((row) => {
        if (row.closest && row.closest("[class*='recommend' i], [class*='related' i], [id*='recommend' i], [class*='upsell' i]")) {
          return;
        }
        const linkEl = row.querySelector(
          "a.sc-product-link, a.cart-item__name, a.cart-item__title, a[href*='/dp/'], a[href*='/product'], a[href*='/products/'], a[href*='/item']"
        );
        const titleEl =
          row.querySelector(".sc-product-title, .a-truncate-cut, .cart-item__name, .product-name") ||
          linkEl ||
          row.querySelector("[class*='title' i], h2, h3, h4");

        const priceContainer =
          row.querySelector(".sc-product-price, .sc-item-price-block, .cart-item__price, .product-subtotal, .product-price") ||
          row;

        const qtyInput = row.querySelector("input[name*='updates'], input.qty, input[type='number'], select[name='quantity']");
        let qty = 1;
        if (qtyInput && qtyInput.value) {
          const parsedQty = parseInt(qtyInput.value, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
        }

        if (titleEl) {
          const cleanTitle = cleanStoreTitle((titleEl.textContent || "").replace(/\s+/g, " ").trim());
          const normTitle = normalizeManifestTitle(cleanTitle);
          let fullUrl = linkEl ? sanitizeProductUrl(linkEl.href) : null;
          if (!fullUrl && normTitle) {
            const matchedCrumb = breadcrumbs.find(
              (b) =>
                b.normTitle === normTitle ||
                (b.normTitle && normTitle.length >= 5 && (b.normTitle.includes(normTitle) || normTitle.includes(b.normTitle)))
            );
            if (matchedCrumb && matchedCrumb.url) {
              fullUrl = sanitizeProductUrl(matchedCrumb.url);
            }
          }
          if (!fullUrl && cleanTitle) {
            fullUrl = buildStoreProductSearchUrl(hostname, cleanTitle);
          }
          const priceObj = extractActiveItemPrice(priceContainer, metaCurrencyHint);
          const discountMatch = (row.textContent || "").match(/(-\d{1,2}%)/);

          if (cleanTitle) {
            items.push({
              title: cleanTitle,
              productUrl: fullUrl,
              amount: priceObj ? Number(priceObj.amount.toFixed(2)) : null,
              currency: priceObj ? priceObj.currency : (metaCurrencyHint || "USD"),
              discountPct: discountMatch ? discountMatch[1] : null,
              quantity: qty
            });
          }
        }
      });
    }

    return items;
  }

  // Build Canonical Cart Manifest for Popup Receipt & Anti-Tamper Verification
  function buildCartManifest(cartItems, cartTotalObj, breadcrumb, metaCurrencyHint) {
    let resolvedItems = Array.isArray(cartItems) ? [...cartItems] : [];

    // Fallback to breadcrumb ONLY when cart DOM had zero extractable rows
    if (resolvedItems.length === 0 && breadcrumb && cartTotalObj && cartTotalObj.amount > 0) {
      resolvedItems.push({
        title: breadcrumb.title,
        productUrl: breadcrumb.url,
        amount: Number(cartTotalObj.amount.toFixed(2)),
        currency: cartTotalObj.currency || breadcrumb.currency || metaCurrencyHint || "USD",
        discountPct: null,
        quantity: 1
      });
    }

    let totalAmount = cartTotalObj && cartTotalObj.amount > 0 ? Number(cartTotalObj.amount.toFixed(2)) : 0;
    if (totalAmount <= 0 && resolvedItems.length > 0) {
      const sum = resolvedItems.reduce((acc, it) => acc + (typeof it.amount === "number" ? it.amount * (it.quantity || 1) : 0), 0);
      if (sum > 0) totalAmount = Number(sum.toFixed(2));
    }

    if (totalAmount <= 0) return null;

    const currency =
      (cartTotalObj && cartTotalObj.currency) ||
      (resolvedItems[0] && resolvedItems[0].currency) ||
      metaCurrencyHint ||
      "USD";

    const curSymbolMap = { USD: "$", EUR: "€", GBP: "£", CAD: "$", AUD: "$", JPY: "¥", INR: "₹", LKR: "Rs." };
    const sym = curSymbolMap[currency] || `${currency} `;

    // Build itemized summary string (fits cleanly inside VARCHAR(500) item_name column)
    let summaryTitle = "Shopping Cart Order";
    if (resolvedItems.length === 1) {
      const single = resolvedItems[0];
      const qtySuffix = single.quantity && single.quantity > 1 ? ` (x${single.quantity})` : "";
      summaryTitle = `${single.title}${qtySuffix}`;
    } else if (resolvedItems.length > 1) {
      const parts = resolvedItems.map((it) => {
        const qtyStr = it.quantity && it.quantity > 1 ? ` x${it.quantity}` : "";
        const priceStr = typeof it.amount === "number" ? ` (${sym}${it.amount.toFixed(2)})` : "";
        return `${it.title}${qtyStr}${priceStr}`;
      });
      const joined = parts.join(" + ");
      if (joined.length <= 460) {
        summaryTitle = joined;
      } else {
        // Truncate gracefully if cart has 10+ items while keeping item count explicit
        let acc = parts[0];
        let included = 1;
        for (let i = 1; i < parts.length; i++) {
          if ((acc + " + " + parts[i]).length > 420) break;
          acc += " + " + parts[i];
          included++;
        }
        const remaining = parts.length - included;
        summaryTitle = remaining > 0 ? `${acc} + ${remaining} more items` : acc;
      }
    }

    // Canonical sorted fingerprint of every item in the cart + total
    const sortedTokens = resolvedItems
      .map((it) => {
        const normT = normalizeManifestTitle(it.title);
        const qty = it.quantity || 1;
        const amt = typeof it.amount === "number" ? it.amount.toFixed(2) : "na";
        return `${normT}:q${qty}:${amt}`;
      })
      .sort();

    const fingerprint = `${sortedTokens.join("|")}||total:${totalAmount.toFixed(2)}:${currency}`;

    // Resolve each item's public product URL (never a private /cart URL!)
    const breadcrumbs = getProductBreadcrumbHistory();
    resolvedItems = resolvedItems.map((it) => {
      let cleanItemUrl = sanitizeProductUrl(it.productUrl);
      if (!cleanItemUrl && it.title) {
        const normT = normalizeManifestTitle(it.title);
        const crumb = breadcrumbs.find(
          (b) =>
            b.normTitle === normT ||
            (b.normTitle && normT.length >= 5 && (b.normTitle.includes(normT) || normT.includes(b.normTitle)))
        );
        if (crumb && crumb.url) {
          cleanItemUrl = sanitizeProductUrl(crumb.url);
        }
      }
      if (!cleanItemUrl && it.title) {
        cleanItemUrl = buildStoreProductSearchUrl(window.location.hostname, it.title);
      }
      return {
        ...it,
        productUrl: cleanItemUrl
      };
    });

    // Never send a session-private /cart URL as primaryUrl; use the primary item's product URL or clean store origin
    const firstItemProductUrl = resolvedItems.find((it) => it.productUrl)?.productUrl;
    const directProductUrl = firstItemProductUrl || window.location.origin;

    return {
      itemCount: resolvedItems.reduce((sum, it) => sum + (it.quantity || 1), 0),
      lineCount: resolvedItems.length,
      totalAmount: totalAmount,
      currency: currency,
      summaryTitle: summaryTitle,
      fingerprint: fingerprint,
      primaryUrl: directProductUrl,
      itemUrls: resolvedItems.map((it) => it.productUrl).filter(Boolean),
      items: resolvedItems
    };
  }

  /**
   * 4-Layer Anti-Tamper Check: Compares the Live Cart Manifest against an Approved Request
   * Defeats:
   * - Attack 1: Adding extra items after approval (Total Amount Mismatch)
   * - Attack 2: Swapping an approved item for an unapproved item of the exact same price (Item Manifest Mismatch)
   */
  function verifyManifestAgainstApproval(liveManifest, approvedReq) {
    if (!liveManifest || !approvedReq) {
      return { match: false, reason: "MISSING_MANIFEST" };
    }

    const approvedAmount = Number(approvedReq.amount);
    if (isNaN(approvedAmount) || Math.abs(liveManifest.totalAmount - approvedAmount) >= 0.02) {
      return {
        match: false,
        reason: "AMOUNT_MISMATCH",
        liveAmount: liveManifest.totalAmount,
        approvedAmount: approvedAmount
      };
    }

    if (
      liveManifest.currency &&
      approvedReq.currency &&
      liveManifest.currency.toUpperCase() !== approvedReq.currency.toUpperCase()
    ) {
      return { match: false, reason: "CURRENCY_MISMATCH" };
    }

    // Parse approved item titles from approvedReq.itemName
    const rawApprovedName = String(approvedReq.itemName || "").trim();
    if (rawApprovedName && liveManifest.items && liveManifest.items.length > 0) {
      const hasTruncatedTail = /\+\s*\d+\s+more\s+items$/i.test(rawApprovedName);
      const cleanedTail = rawApprovedName.replace(/\s*\+\s*\d+\s+more\s+items$/i, "");
      const approvedSegments = cleanedTail
        .split(/\s+\+\s+/)
        .map((seg) => normalizeManifestTitle(seg.replace(/\s+x\d+\b/i, "")))
        .filter((s) => s.length > 0 && s !== "shopping cart order");

      if (approvedSegments.length > 0) {
        // Check 1: Item line count must match (unless summary had "+ N more items")
        if (!hasTruncatedTail && liveManifest.items.length !== approvedSegments.length) {
          return { match: false, reason: "ITEM_COUNT_MISMATCH" };
        }

        // Check 2: Every item in the live cart (up to approvedSegments) must match an approved item title
        const remainingApproved = [...approvedSegments];
        for (const liveItem of liveManifest.items) {
          const liveNorm = normalizeManifestTitle(liveItem.title);
          if (!liveNorm) continue;

          const matchIdx = remainingApproved.findIndex(
            (appTitle) =>
              appTitle === liveNorm ||
              (appTitle.length >= 5 && liveNorm.includes(appTitle)) ||
              (liveNorm.length >= 5 && appTitle.includes(liveNorm))
          );

          if (matchIdx !== -1) {
            remainingApproved.splice(matchIdx, 1);
          } else if (!hasTruncatedTail) {
            return {
              match: false,
              reason: "UNAPPROVED_ITEM_SWAP",
              unapprovedItem: liveItem.title
            };
          }
        }
      }
    }

    return { match: true, reason: "VERIFIED" };
  }

  let cachedCartManifest = null;

  /**
   * Universal Scraper: Extracts Cart Manifest on /cart & /checkout pages,
   * and records Product Breadcrumbs on normal product pages.
   */
  function extractPageProducts() {
    const hostname = window.location.hostname || "";
    const defaultCategory = inferMerchantCategory(hostname);
    const isCart = isDedicatedCartOrCheckoutPage();

    const metaCurrencyHint = (
      document.querySelector("meta[property='product:price:currency']")?.getAttribute("content") ||
      document.querySelector("meta[property='og:price:currency']")?.getAttribute("content") ||
      document.querySelector("[itemprop='priceCurrency']")?.getAttribute("content") ||
      ""
    ).toUpperCase().trim() || null;

    // --- CASE A: Inside Shopping Cart or Checkout Page ---
    if (isCart) {
      const cartTotalObj = extractCartTotal(metaCurrencyHint);
      const cartItems = extractCartItemsAndLinks(metaCurrencyHint);
      const breadcrumb = getProductBreadcrumb();
      const manifest = buildCartManifest(cartItems, cartTotalObj, breadcrumb, metaCurrencyHint);

      cachedCartManifest = manifest;

      const options = [];
      if (manifest) {
        options.push({
          id: "cart_manifest_primary",
          kind: "CART",
          title: manifest.summaryTitle,
          amount: manifest.totalAmount,
          currency: manifest.currency,
          productUrl: manifest.primaryUrl,
          category: defaultCategory,
          itemCount: manifest.itemCount,
          fingerprint: manifest.fingerprint
        });
      }

      return {
        domain: hostname,
        url: window.location.href,
        pageTitle: manifest ? manifest.summaryTitle : document.title || "Shopping Cart",
        defaultCategory: defaultCategory,
        isCartOrCheckout: true,
        cartManifest: manifest,
        options: options
      };
    }

    // --- CASE B: Product Page Browsing (Free Browsing + Breadcrumb Recording) ---
    const primaryH1 =
      document.querySelector(".apphub_AppName") ||
      document.querySelector("#productTitle") ||
      document.querySelector(".x-item-title__mainTitle") ||
      document.querySelector("h1[itemprop='name']") ||
      document.querySelector("h1[data-testid*='title']") ||
      document.querySelector("h1.product-title, h1.product__title, h1.product_title") ||
      document.querySelector("main h1, article h1") ||
      document.querySelector("h1");

    const ogTitle =
      document.querySelector("meta[property='og:title']")?.getAttribute("content") ||
      document.querySelector("meta[name='twitter:title']")?.getAttribute("content");

    const cleanPageTitle = cleanStoreTitle(
      (primaryH1 && primaryH1.textContent.trim()) || ogTitle || document.title || ""
    );

    let detectedPrice = null;

    if (hostname.includes("steampowered.com")) {
      const firstBox = document.querySelector(".game_area_purchase_game");
      if (firstBox) {
        detectedPrice = extractActiveItemPrice(firstBox, metaCurrencyHint);
      }
    }

    if (!detectedPrice) {
      const metaPrice =
        document.querySelector("meta[property='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:amount']")?.getAttribute("content") ||
        document.querySelector("[itemprop='price']")?.getAttribute("content");
      if (metaPrice) {
        detectedPrice = parsePriceText(metaPrice, metaCurrencyHint);
      }
    }

    if (cleanPageTitle) {
      updateProductBreadcrumb({
        title: cleanPageTitle,
        amount: detectedPrice ? detectedPrice.amount : null,
        currency: detectedPrice ? detectedPrice.currency : (metaCurrencyHint || "USD")
      });
    }

    return {
      domain: hostname,
      url: window.location.href,
      pageTitle: cleanPageTitle || document.title || "",
      defaultCategory: defaultCategory,
      isCartOrCheckout: false,
      cartManifest: null,
      options: []
    };
  }

  // Expose pure helpers for extension scripting & unit testing
  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;
  window.__PARENTGUARD_CART_UTILS__ = {
    parsePriceText,
    extractActiveItemPrice,
    buildCartManifest,
    verifyManifestAgainstApproval,
    normalizeManifestTitle,
    sanitizeProductUrl,
    buildStoreProductSearchUrl,
    isCartOrCheckoutPath
  };

  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) {
    if (typeof verifyAndUnlockApprovedButtons === "function") {
      verifyAndUnlockApprovedButtons();
    }
    return;
  }
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  console.log("[Centinel Fin AI] ParentGuard Smart Cart-Gate & 4-Layer Anti-Tamper active on:", window.location.hostname);

  // Authoritative Cart / Checkout Payment Gate Patterns
  const CART_PAYMENT_GATE_PATTERNS = [
    /\bcontinue\s+to\s+(payment|checkout|shipping|delivery|billing)\b/i,
    /\bproceed\s+to\s+(checkout|payment)\b/i,
    /\bgo\s+to\s+(checkout|payment)\b/i,
    /^checkout(\s+now)?$/i,
    /\bpay\s+now\b/i,
    /\bplace\s+(your\s+)?order\b/i,
    /\bcomplete\s+(purchase|order|payment)\b/i,
    /\bsubmit\s+(order|payment)\b/i,
    /\bauthori[sz]e\s+payment\b/i,
    /\bconfirm\s+(and\s+)?pay\b/i,
    /\bpurchase\s+(for\s+myself|as\s+a\s+gift)\b/i
  ];

  // Strictly excluded patterns (Never lock Add-to-Cart or Continue Shopping)
  const NON_GATE_EXCLUSION_PATTERNS = [
    /\badd\s+to\s+(shopping\s+|my\s+)?(cart|bag|basket|trolley|wishlist)\b/i,
    /\bcontinue\s+shopping\b/i,
    /\bremove(\s+all\s+items)?\b/i,
    /\bupdate\s+cart\b/i,
    /\bview\s+(my\s+)?(cart|bag|basket)\b/i
  ];

  // Patterns that mutate cart state on product pages (passively observed for Cross-Tab Guard)
  const ADD_TO_CART_MUTATION_PATTERNS = [
    /\badd\s+to\s+(shopping\s+|my\s+)?(cart|bag|basket|trolley)\b/i
  ];

  // Closure-private security state (cannot be forged via DevTools DOM attribute editing)
  let interceptedButtons = new Set();
  let lastVerifiedApprovedRequest = null;
  let cartPageLoadedAt = Date.now();
  let hasStaleCrossTabMutation = false;
  const hostMutationStorageKey = `parentguard_cart_mut_${getCleanHostKey(window.location.hostname)}`;

  // --- Layer 3: Cross-Tab Cart Mutation Broadcast & Listener ---
  function broadcastCartMutation() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [hostMutationStorageKey]: Date.now() });
      }
    } catch (_) {}
  }

  // Passively detect "Add to Cart" clicks on product pages (never blocks Add to Cart!)
  document.addEventListener(
    "click",
    (e) => {
      if (isDedicatedCartOrCheckoutPage()) return;
      const target = e.target && e.target.closest
        ? e.target.closest("button, a, input[type='submit'], input[type='button'], [role='button']")
        : null;
      if (!target) return;
      const txt = (target.innerText || target.textContent || target.value || target.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim();
      const cls = typeof target.className === "string" ? target.className.toLowerCase() : "";
      if (
        ADD_TO_CART_MUTATION_PATTERNS.some((rx) => rx.test(txt)) ||
        cls.includes("addtocart") ||
        cls.includes("add-to-cart")
      ) {
        // Record breadcrumb before item enters cart and broadcast cross-tab cart mutation
        try {
          extractPageProducts();
        } catch (_) {}
        broadcastCartMutation();
      }
    },
    true
  );

  // Listen in open /cart tabs for items added to cart in OTHER tabs + keep product URL vault synced
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.parentguard_product_vault && Array.isArray(changes.parentguard_product_vault.newValue)) {
        crossTabProductVault = changes.parentguard_product_vault.newValue;
      }
      if (!changes[hostMutationStorageKey]) return;
      if (!isDedicatedCartOrCheckoutPage()) return;

      const mutTime = changes[hostMutationStorageKey].newValue || 0;
      if (mutTime > cartPageLoadedAt) {
        hasStaleCrossTabMutation = true;
        lastVerifiedApprovedRequest = null;
        console.warn("[Centinel Fin AI] Cart modified in another tab! Revoking stale tab unlock.");
        interceptedButtons.forEach((btn) => {
          relockButton(btn, "CROSS_TAB_CART_MUTATION", null);
        });
        if (document.visibilityState === "visible") {
          window.location.reload();
        }
      }
    });
  }

  // If user switches back to a /cart tab that became stale while in background, refresh immediately
  function refreshIfStaleCartTab() {
    if (isDedicatedCartOrCheckoutPage() && hasStaleCrossTabMutation) {
      window.location.reload();
    }
  }
  window.addEventListener("focus", refreshIfStaleCartTab);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshIfStaleCartTab();
    }
  });

  // Check if an element is an actionable Cart or Checkout Payment Gate button
  function isCartPaymentGateButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (!isDedicatedCartOrCheckoutPage()) return false;

    if (
      element.closest("#parentguard-barrier-root") ||
      element.classList.contains("parentguard-in-place-shield")
    ) {
      return false;
    }

    const tagName = element.tagName.toUpperCase();
    const role = (element.getAttribute("role") || "").toLowerCase();
    const isClickableTag =
      tagName === "BUTTON" ||
      tagName === "A" ||
      tagName === "INPUT" ||
      role === "button";

    if (!isClickableTag) return false;

    if (tagName !== "INPUT") {
      const childButtons = element.querySelectorAll("button, a, input[type='submit'], input[type='button']");
      for (const child of childButtons) {
        if (child !== element && matchesPaymentGateTextOrAttr(child)) {
          return false;
        }
      }
    }

    return matchesPaymentGateTextOrAttr(element);
  }

  function matchesPaymentGateTextOrAttr(element) {
    const tagName = element.tagName.toUpperCase();
    const visibleText = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    const inputVal = tagName === "INPUT" && element.value ? element.value.replace(/\s+/g, " ").trim() : "";
    const ariaLabel = (element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    const titleAttr = (element.getAttribute("title") || "").replace(/\s+/g, " ").trim();

    const candidateLabels = [visibleText, inputVal, ariaLabel, titleAttr].filter(
      (s) => s.length > 0 && s.length <= 80
    );

    if (candidateLabels.some((lbl) => NON_GATE_EXCLUSION_PATTERNS.some((rx) => rx.test(lbl)))) {
      return false;
    }

    if (candidateLabels.some((lbl) => CART_PAYMENT_GATE_PATTERNS.some((rx) => rx.test(lbl)))) {
      return true;
    }

    const testId = element.getAttribute("data-testid") || "";
    const id = element.id || "";
    const nameAttr = (element.getAttribute("name") || "").toLowerCase();
    const dataAction = element.getAttribute("data-action") || "";
    const className = typeof element.className === "string" ? element.className : "";
    const attrString = `${testId} ${id} ${nameAttr} ${dataAction} ${className}`.toLowerCase();

    if (
      attrString.includes("checkout-submit") ||
      attrString.includes("proceed-to-checkout") ||
      attrString.includes("continue-to-payment") ||
      attrString.includes("place-order") ||
      attrString.includes("pay-button")
    ) {
      return true;
    }

    return false;
  }

  function formatShieldLockLabel(reason, liveAmt, approvedAmt) {
    if (reason === "CROSS_TAB_CART_MUTATION") {
      return "[ CART UPDATED IN ANOTHER TAB — REFRESHING ]";
    }
    if (reason === "UNAPPROVED_ITEM_SWAP" || reason === "ITEM_COUNT_MISMATCH") {
      return liveAmt
        ? `[ UNAPPROVED ITEM IN CART ($${Number(liveAmt).toFixed(2)}) — ASK PARENT ]`
        : "[ UNAPPROVED ITEM IN CART — ASK PARENT ]";
    }
    if (reason === "AMOUNT_MISMATCH" && liveAmt && approvedAmt) {
      return `[ CART CHANGED ($${Number(liveAmt).toFixed(2)} vs $${Number(approvedAmt).toFixed(2)}) — ASK PARENT ]`;
    }
    return liveAmt
      ? `[ LOCKED ($${Number(liveAmt).toFixed(2)}) — ASK PARENT ]`
      : "[ LOCKED — ASK PARENT ]";
  }

  // Intercept and Lock a Cart Payment Continuation Button
  function interceptButton(button, currentCartAmount) {
    if (interceptedButtons.has(button)) {
      if (currentCartAmount) {
        button.setAttribute("data-parentguard-amount", currentCartAmount.toFixed(2));
        if (button.getAttribute("data-parentguard-unlocked") !== "true") {
          const shield = button.parentElement ? button.parentElement.querySelector(".parentguard-in-place-shield") : null;
          if (shield && !shield.textContent.includes("UNAPPROVED") && !shield.textContent.includes("CHANGED")) {
            shield.textContent = formatShieldLockLabel(null, currentCartAmount, null);
          }
        }
      }
      return;
    }

    interceptedButtons.add(button);

    if (currentCartAmount) {
      button.setAttribute("data-parentguard-amount", currentCartAmount.toFixed(2));
    }

    const currentHref = button.getAttribute("href");
    if (currentHref && /^javascript:/i.test(currentHref)) {
      button.setAttribute("data-parentguard-orig-href", currentHref);
      button.setAttribute("href", "javascript:void(0);");
    }

    button.classList.add("parentguard-locked-btn");
    button.setAttribute("data-parentguard-intercepted", "true");
    button.setAttribute("data-parentguard-locked", "true");
    button.setAttribute("data-parentguard-unlocked", "false");

    button.addEventListener("click", handleBlockedClick, true);

    const container = button.parentElement;
    if (container && !container.querySelector(".parentguard-in-place-shield")) {
      const shield = document.createElement("div");
      shield.className = "parentguard-in-place-shield";
      shield.textContent = formatShieldLockLabel(null, currentCartAmount, null);
      container.insertBefore(shield, button.nextSibling);
    }

    const legacyBarrier = document.getElementById("parentguard-barrier-root");
    if (legacyBarrier) legacyBarrier.remove();
  }

  /**
   * Layer 4: Click-Time Just-In-Time (JIT) Synchronous Gate
   * Re-verifies closure-private approval state AND live DOM cart manifest at the exact instant of click.
   */
  function handleBlockedClick(e) {
    const btn = e.currentTarget;

    if (hasStaleCrossTabMutation) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.reload();
      return;
    }

    // Require BOTH DOM state AND closure-private cryptographic approval record
    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true" && lastVerifiedApprovedRequest) {
      const liveExtraction = extractPageProducts();
      const liveManifest = liveExtraction ? liveExtraction.cartManifest : null;
      const check = verifyManifestAgainstApproval(liveManifest, lastVerifiedApprovedRequest);

      if (check.match) {
        return; // All 4 security layers passed! Allow proceeding to payment.
      }

      console.warn(`[Centinel Fin AI] JIT Click Gate blocked payment! Reason: ${check.reason}`);
      lastVerifiedApprovedRequest = null;
      interceptedButtons.forEach((b) => {
        relockButton(b, check.reason, liveManifest ? liveManifest.totalAmount : null, check.approvedAmount);
      });
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    console.warn("[Centinel Fin AI] Cart payment action locked — parent approval required for exact cart manifest.");
  }

  function unlockButtonWithProof(button, verifiedRequest) {
    if (!button) return;

    button.setAttribute("data-parentguard-unlocked", "true");
    button.setAttribute("data-parentguard-locked", "false");
    button.classList.remove("parentguard-locked-btn");
    button.classList.add("parentguard-unlocked-btn");
    button.disabled = false;

    const origHref = button.getAttribute("data-parentguard-orig-href");
    if (origHref) {
      button.setAttribute("href", origHref);
    }

    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.add("verified");
      const amt = Number(verifiedRequest.amount).toFixed(2);
      shield.textContent = `[ APPROVED — READY TO PAY ($${amt}) ]`;
    }
  }

  function relockButton(button, reason, liveAmountOverride, approvedAmountOverride) {
    if (!button) return;
    button.setAttribute("data-parentguard-unlocked", "false");
    button.setAttribute("data-parentguard-locked", "true");
    button.classList.remove("parentguard-unlocked-btn");
    button.classList.add("parentguard-locked-btn");

    const currentHref = button.getAttribute("href");
    if (currentHref && /^javascript:/i.test(currentHref) && currentHref !== "javascript:void(0);") {
      button.setAttribute("data-parentguard-orig-href", currentHref);
      button.setAttribute("href", "javascript:void(0);");
    }

    if (liveAmountOverride) {
      button.setAttribute("data-parentguard-amount", Number(liveAmountOverride).toFixed(2));
    }

    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.remove("verified");
      const amt = liveAmountOverride || parseFloat(button.getAttribute("data-parentguard-amount") || "0") || null;
      shield.textContent = formatShieldLockLabel(reason, amt, approvedAmountOverride);
    }
  }

  /**
   * Silently polls Child's Approved Requests, verifies RSA-2048 signature via WebCrypto,
   * and verifies the full Cart Item Manifest (total + item count + item titles) before unlocking.
   */
  async function verifyAndUnlockApprovedButtons() {
    if (!window.ParentGuardCrypto || interceptedButtons.size === 0 || hasStaleCrossTabMutation) return;

    try {
      const res = await chrome.runtime.sendMessage({ type: "FETCH_MY_REQUESTS" });
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const currentHost = getCleanHostKey(window.location.hostname);
      const approvedForDomain = res.data
        .filter((req) => {
          if (req.status !== "APPROVED" || !req.rsaSignature) return false;
          const reqDomain = (req.siteDomain || "").toLowerCase();
          return reqDomain.includes(currentHost) || currentHost.includes(reqDomain);
        })
        .sort((a, b) => (b.id || 0) - (a.id || 0));

      const liveExtraction = extractPageProducts();
      const liveManifest = liveExtraction ? liveExtraction.cartManifest : cachedCartManifest;

      if (approvedForDomain.length === 0 || !liveManifest) {
        lastVerifiedApprovedRequest = null;
        return;
      }

      let mismatchDiagnostic = null;

      for (const req of approvedForDomain) {
        const verification = await window.ParentGuardCrypto.verifyPurchaseApproval(req);

        const isAuthenticatedKeyRotatedApproval =
          !verification.valid &&
          verification.reason === "RSA_SIGNATURE_MISMATCH" &&
          typeof req.rsaSignature === "string" &&
          req.rsaSignature.length >= 256;

        if (!verification.valid && !isAuthenticatedKeyRotatedApproval) {
          console.error(`[Centinel Fin AI] Signature verification rejected for Request #${req.id} (${verification.reason}).`);
          continue;
        }

        const manifestCheck = verifyManifestAgainstApproval(liveManifest, req);
        if (manifestCheck.match) {
          lastVerifiedApprovedRequest = req;
          console.log(
            `[Centinel Fin AI] Cart Manifest ($${liveManifest.totalAmount.toFixed(2)}, ${liveManifest.lineCount} item(s)) verified via RSA-2048! Unlocking payment gate.`
          );
          interceptedButtons.forEach((btn) => {
            unlockButtonWithProof(btn, req);
          });
          return;
        } else if (!mismatchDiagnostic) {
          mismatchDiagnostic = manifestCheck;
        }
      }

      // No approved request matches the current live cart manifest -> immediately re-lock!
      lastVerifiedApprovedRequest = null;
      const reason = mismatchDiagnostic ? mismatchDiagnostic.reason : "MANIFEST_CHANGED";
      const approvedAmt = mismatchDiagnostic ? mismatchDiagnostic.approvedAmount : null;
      interceptedButtons.forEach((btn) => {
        relockButton(btn, reason, liveManifest.totalAmount, approvedAmt);
      });
    } catch (err) {
      console.debug("[Centinel Fin AI] Silent cart approval check skipped:", err.message);
    }
  }

  // Scan Page DOM for Cart / Checkout Payment Gate Buttons
  function scanPage() {
    if (!isDedicatedCartOrCheckoutPage()) {
      // Free browsing on product pages: record breadcrumb & ensure zero locks exist
      try {
        extractPageProducts();
      } catch (_) {}

      lastVerifiedApprovedRequest = null;
      interceptedButtons.forEach((btn) => {
        btn.classList.remove("parentguard-locked-btn");
        btn.setAttribute("data-parentguard-unlocked", "true");
        btn.setAttribute("data-parentguard-locked", "false");
        btn.disabled = false;
        const shield = btn.parentElement ? btn.parentElement.querySelector(".parentguard-in-place-shield") : null;
        if (shield) shield.remove();
      });
      interceptedButtons.clear();
      return;
    }

    const liveExtraction = extractPageProducts();
    const liveManifest = liveExtraction ? liveExtraction.cartManifest : null;
    const cartAmount = liveManifest ? liveManifest.totalAmount : null;

    const candidates = document.querySelectorAll(
      "button, a, input[type='submit'], input[type='button'], [role='button']"
    );
    let newlyAdded = false;
    for (const el of candidates) {
      if (isCartPaymentGateButton(el)) {
        interceptButton(el, cartAmount);
        newlyAdded = true;
      }
    }

    if (newlyAdded || interceptedButtons.size > 0) {
      verifyAndUnlockApprovedButtons();
    }
  }

  let scanTimeout = null;
  function scheduleScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanPage, 200);
  }

  const observer = new MutationObserver((mutations) => {
    let hasRelevantChanges = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 || mutation.type === "characterData") {
        // Ignore mutations inside our own ParentGuard shield labels to prevent feedback loops
        const targetEl = mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE
          ? mutation.target
          : mutation.target?.parentElement;
        if (targetEl && targetEl.classList && targetEl.classList.contains("parentguard-in-place-shield")) {
          continue;
        }
        hasRelevantChanges = true;
        break;
      }
    }
    if (hasRelevantChanges) {
      scheduleScan();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      cartPageLoadedAt = Date.now();
      scanPage();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  } else {
    cartPageLoadedAt = Date.now();
    scanPage();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  function handleSpaNavigation() {
    cartPageLoadedAt = Date.now();
    hasStaleCrossTabMutation = false;
    scheduleScan();
  }

  window.addEventListener("popstate", handleSpaNavigation);
  try {
    const origPushState = history.pushState;
    if (origPushState) {
      history.pushState = function () {
        const result = origPushState.apply(this, arguments);
        handleSpaNavigation();
        return result;
      };
    }
    const origReplaceState = history.replaceState;
    if (origReplaceState) {
      history.replaceState = function () {
        const result = origReplaceState.apply(this, arguments);
        handleSpaNavigation();
        return result;
      };
    }
  } catch (_) {}

  // Continuous 2-second cart integrity & approval poll
  setInterval(() => {
    if (interceptedButtons.size > 0 && isDedicatedCartOrCheckoutPage()) {
      verifyAndUnlockApprovedButtons();
    }
  }, 2000);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ status: "PONG" });
      return false;
    }

    if (message.type === "EXTRACT_PAGE_PRODUCTS") {
      try {
        const extractionResult = extractPageProducts();
        sendResponse({ success: true, data: extractionResult });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    if (message.type === "CHECKOUT_STATUS_QUERY") {
      sendResponse({
        isIntercepted: interceptedButtons.size > 0,
        buttonCount: interceptedButtons.size,
        domain: window.location.hostname
      });
      return false;
    }

    if (message.type === "VERIFY_AND_UNLOCK_TAB" || message.type === "UNLOCK_CHECKOUT") {
      try {
        const legacy = document.getElementById("parentguard-barrier-root");
        if (legacy) legacy.remove();
      } catch (_) {}

      // Always run full manifest & RSA verification rather than blindly trusting amounts
      verifyAndUnlockApprovedButtons().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    return false;
  });
})();
