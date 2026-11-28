/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Product-Page Ingress Lock, 5-Tier Universal Product Scraper & Smart Cart Safety Limit
 *
 * Responsibilities:
 * - Product-Page Ingress Lock: Locks "Add to Cart", "Add to Bag", "Buy Now", and "Pre-Order" buttons
 *   directly on product pages so every purchase request captures the 100% real, canonical Product URL
 * - Per-Edition & Multi-Variant Precision Unlocking: Unlocks ONLY the exact edition/variant price
 *   approved by the parent while keeping pricier editions/variants locked
 * - Strict WebCrypto RSA-2048 Verification: Requires mathematical signature validity (zero fallback bypass)
 * - Smart Cart Safety Limit: Allows frictionless checkout on /cart when live cart total is positively read
 *   and within active unconsumed approvals, while failing closed if cart total exceeds approval or is unreadable
 */

(function () {
  "use strict";

  // Tracking query parameters to strip while preserving product/variant IDs (?item=, ?variant=, ?id=, ?sku=)
  const TRACKING_QUERY_PARAMS = new Set([
    "snr",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "dclid",
    "msclkid",
    "twclid",
    "ref",
    "ref_",
    "pf_rd_p",
    "pf_rd_r",
    "pf_rd_s",
    "pf_rd_t",
    "pf_rd_i",
    "pf_rd_m",
    "pd_rd_w",
    "pd_rd_wg",
    "pd_rd_r",
    "pd_rd_i",
    "psc",
    "qid",
    "sr",
    "keywords",
    "crid",
    "sprefix",
    "dib",
    "dib_tag",
    "_trkparms",
    "_trksid",
    "hash",
    "mkcid",
    "mkrid",
    "campid",
    "toolid",
    "customid"
  ]);

  // Helper: Infer regional currency from country TLD (.lk -> LKR, .uk -> GBP, .in -> INR, etc.)
  function inferTldCurrency(hostname) {
    const h = (hostname || "").toLowerCase().trim();
    if (h.endsWith(".lk")) return "LKR";
    if (h.endsWith(".uk") || h.endsWith(".co.uk")) return "GBP";
    if (h.endsWith(".in") || h.endsWith(".co.in")) return "INR";
    if (h.endsWith(".au") || h.endsWith(".com.au")) return "AUD";
    if (h.endsWith(".ca")) return "CAD";
    if (h.endsWith(".nz") || h.endsWith(".co.nz")) return "NZD";
    if (h.endsWith(".sg") || h.endsWith(".com.sg")) return "SGD";
    if (h.endsWith(".my") || h.endsWith(".com.my")) return "MYR";
    if (h.endsWith(".jp") || h.endsWith(".co.jp")) return "JPY";
    if (h.endsWith(".ae")) return "AED";
    if (/\.(de|fr|it|es|nl|be|at|ie|pt|fi|eu)$/.test(h)) return "EUR";
    return null;
  }

  // Helper: Parse a raw price text (e.g. "$19.99", "589,000 LKR", "Rs. 4,500.00", "€14,99") into { amount, currency, raw }
  function parsePriceText(rawText, fallbackCurrency) {
    if (rawText === null || rawText === undefined) return null;
    const text = String(rawText).replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return null;

    if (/^\s*free(\s+to\s+play|\s+download|\s+demo)?\s*$/i.test(text) || (/free/i.test(text) && !/\d/.test(text))) {
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
    else if (/\bLKR\b|\bRs\.?\s*\d|\d\s*LKR\b|රු/i.test(text)) { currency = "LKR"; hasExplicitCurrency = true; }
    else if (/\bMYR\b|\bRM(?=\s*\d)/i.test(text)) { currency = "MYR"; hasExplicitCurrency = true; }
    else if (/\bAED\b|\bDhs?\.?(?=\s*\d)/i.test(text)) { currency = "AED"; hasExplicitCurrency = true; }
    else if (/\bCHF\b/i.test(text)) { currency = "CHF"; hasExplicitCurrency = true; }
    else if (/\bPLN\b|zł/i.test(text)) { currency = "PLN"; hasExplicitCurrency = true; }
    else if (/\bSEK\b|\bkr\b/i.test(text)) { currency = "SEK"; hasExplicitCurrency = true; }
    else if (/\bUSD\b|US\$|\$/i.test(text)) { currency = "USD"; hasExplicitCurrency = true; }

    let normalizedNum = NaN;

    const decimalMatch = text.match(/(\d{1,3}(?:,\d{3})+\.\d{2}|\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,8}[.,]\d{2})(?!\d)/);
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
      // Match comma-formatted whole numbers first (e.g. "589,000" or "1,250,000"), then plain integers
      const commaIntMatch = text.match(/(\d{1,3}(?:,\d{3})+)(?!\d)/);
      const plainIntMatch = text.match(/(\d{1,8})(?!\d)/);
      const chosenMatch = commaIntMatch || plainIntMatch;
      if (chosenMatch) {
        normalizedNum = parseFloat(chosenMatch[1].replace(/,/g, ""));
      }
    }

    if (isNaN(normalizedNum) || normalizedNum <= 0 || normalizedNum >= 100000000) {
      return null;
    }

    return {
      amount: normalizedNum,
      currency: currency,
      raw: text
    };
  }

  // Helper: Parse active final price from a container (ignoring strikethrough original prices)
  function extractActivePriceFromBox(containerEl, metaCurrencyHint) {
    if (!containerEl) return null;

    const specificFinal = containerEl.querySelector(
      ".discount_final_price, .game_purchase_price.price, .price-item--sale, .a-price:not([data-a-strike='true']) .a-offscreen, ins .amount"
    );
    if (specificFinal) {
      const parsed = parsePriceText(specificFinal.textContent, metaCurrencyHint);
      if (parsed && parsed.amount > 0) return parsed;
    }

    const candidates = [];
    const subEls = containerEl.querySelectorAll("span, div, b, strong, p, ins, [class*='price' i]");

    const isStrikethroughOrOriginal = (el) => {
      if (!el) return false;
      if (
        el.closest &&
        el.closest(
          "del, s, strike, [class*='original' i], [class*='strike' i], [class*='was-price' i], [class*='old-price' i], [data-a-strike='true']"
        )
      ) {
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
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt || txt.length > 32 || /^-\d{1,3}%$/.test(txt)) return;
      const hasStrikeChild =
        el.querySelector && el.querySelector("del, s, strike, [class*='original' i], [class*='strike' i]");
      if (hasStrikeChild) return;

      const parsed = parsePriceText(txt, metaCurrencyHint);
      if (parsed && parsed.amount > 0) {
        candidates.push(parsed);
      }
    });

    if (candidates.length > 0) {
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
      .replace(/^Buy\s+/i, "")
      .replace(/^Pre-Purchase\s+/i, "")
      .replace(/^Amazon\.[a-z.]+\s*:\s*/i, "")
      .replace(/\s*\|\s*Product\s*\|.*$/i, "")
      .replace(/\s+on\s+Steam$/i, "")
      .replace(/\s+-\s+Steam$/i, "")
      .replace(/\s+\|\s+Roblox$/i, "")
      .replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, "")
      .replace(/\s*\|\s*eBay$/i, "")
      .replace(/\s*-\s*Best Buy$/i, "")
      .replace(/\s*-\s*Walmart\.com$/i, "")
      .replace(/\s*:\s*Target$/i, "")
      .replace(/\s*\|\s*[^|]{15,}$/, "")
      .trim();
  }

  function normalizeEditionTitle(rawTitle) {
    return cleanStoreTitle(rawTitle)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  // Helper: Clean hostname key
  function getCleanHostKey(hostname) {
    return (hostname || window.location.hostname || "")
      .replace(/^www\./i, "")
      .toLowerCase()
      .trim();
  }

  // Helper: Check if a URL path is a dedicated Shopping Cart or Checkout route
  function isCartOrCheckoutPath(urlOrPath) {
    if (!urlOrPath) return false;
    let pathname = String(urlOrPath).toLowerCase();
    try {
      if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
        pathname = new URL(pathname).pathname.toLowerCase();
      }
    } catch (_) {}

    if (
      /\/app\/\d+/i.test(pathname) ||
      /\/dp\/[a-z0-9]+/i.test(pathname) ||
      /\/gp\/product\//i.test(pathname) ||
      /\/products?\//i.test(pathname) ||
      /\/item\//i.test(pathname)
    ) {
      return false;
    }

    if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(pathname)) {
      return true;
    }
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy")) {
      return true;
    }
    return false;
  }

  function isDedicatedCartOrCheckoutPage() {
    const pathname = (window.location.pathname || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();

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
    return false;
  }

  /**
   * Smart Canonical Product URL Builder:
   * Strips noisy tracking query parameters (?snr=, ?utm_*, ?fbclid=, ?ref=)
   * while preserving essential product & variant parameters (?item=, ?variant=, ?id=, ?sku=, ?product_id=).
   */
  function getCanonicalProductUrl(rawUrl) {
    const target = (rawUrl !== undefined ? rawUrl : window.location.href) || "";
    if (!target) return "";
    try {
      const withScheme = /^https?:\/\//i.test(target) ? target : `https://${target}`;
      const parsed = new URL(withScheme);
      const cleanPath = parsed.pathname.replace(/\/+$/, "");

      const keptParams = [];
      parsed.searchParams.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (
          TRACKING_QUERY_PARAMS.has(lowerKey) ||
          lowerKey.startsWith("utm_") ||
          lowerKey.startsWith("pf_rd_") ||
          lowerKey.startsWith("pd_rd_")
        ) {
          return;
        }
        keptParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      });

      const queryStr = keptParams.length > 0 ? `?${keptParams.join("&")}` : "";
      return `${parsed.origin}${cleanPath || ""}${queryStr}`;
    } catch (_) {
      return target;
    }
  }

  // Helper: Scrape Cart Total on /cart or /checkout pages (for Smart Cart Safety Limit)
  function extractCartTotal(metaCurrencyHint) {
    const candidates = [
      () => {
        const estRow = document.querySelector(".cart_totals_area, .estimated_total_box, #cart_estimated_total");
        if (estRow) return extractActivePriceFromBox(estRow, metaCurrencyHint);
        const bodyText = document.body ? (document.body.innerText || document.body.textContent || "") : "";
        const match = bodyText.match(/Estimated\s+total[\s\S]{0,60}?([$€£₹RsA-Z\s]*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i);
        return match ? parsePriceText(match[1], metaCurrencyHint) : null;
      },
      () => {
        const el = document.querySelector("#sc-subtotal-amount-activecart, #sc-subtotal-amount-buybox");
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
      },
      () => {
        const el = document.querySelector(
          ".totals__subtotal-value, .cart__subtotal, .order-total .amount, .cart-subtotal .amount, [data-testid*='subtotal'], [data-checkout-subtotal], .cart-total .price, .order-summary .price"
        );
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
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

  // Helper: Scrape visible cart row titles & prices on /cart for two-source reconciliation & anti-tamper
  function extractLiveCartItems(metaCurrencyHint) {
    const items = [];
    const seenTitles = new Set();
    try {
      const rowSelectors = [
        ".cart_item",
        "[class*='CartItem' i]",
        ".sc-list-item",
        ".cart-item",
        ".cart__item",
        ".cart__row",
        ".woocommerce-cart-form__cart-item",
        "[data-cart-item]"
      ];
      const rows = document.querySelectorAll(rowSelectors.join(", "));
      for (const row of rows) {
        if (row.closest && row.closest("[class*='recommend' i], [class*='upsell' i], [class*='related' i]")) {
          continue;
        }
        const titleEl = row.querySelector(
          ".cart_item_desc a, .sc-product-title, .sc-grid-item-product-title, .cart-item__name, .cart-item__title, .product-name a, a[href*='/app/'], a[href*='/product/'], a[href*='/products/'], a[href*='/dp/'], h3, h4"
        );
        const rawTitle = titleEl ? (titleEl.textContent || "").replace(/\s+/g, " ").trim() : "";
        const cleaned = cleanStoreTitle(rawTitle);
        if (!cleaned || cleaned.length < 2) continue;

        const normKey = normalizeEditionTitle(cleaned);
        if (seenTitles.has(normKey)) continue;
        seenTitles.add(normKey);

        const priceObj = extractActivePriceFromBox(row, metaCurrencyHint);
        const linkHref = titleEl && titleEl.getAttribute ? titleEl.getAttribute("href") : null;
        let resolvedUrl = null;
        if (linkHref && !linkHref.startsWith("javascript:")) {
          try {
            resolvedUrl = getCanonicalProductUrl(new URL(linkHref, window.location.origin).href);
          } catch (_) {}
        }

        items.push({
          title: cleaned,
          normTitle: normKey,
          amount: priceObj ? priceObj.amount : null,
          currency: priceObj ? priceObj.currency : (metaCurrencyHint || "USD"),
          productUrl: resolvedUrl
        });
      }
    } catch (_) {}
    return items;
  }

  function detectEmptyCartState() {
    try {
      const bodyText = document.body ? (document.body.innerText || document.body.textContent || "") : "";
      if (/\byour\s+(shopping\s+)?(cart|bag|basket)\s+is\s+(currently\s+)?empty\b/i.test(bodyText)) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function discoverStoreCartUrl() {
    try {
      const hostname = (window.location.hostname || "").toLowerCase();
      const cartLink = document.querySelector(
        "a[href*='/cart'], a[href*='/gp/cart'], a[href*='/basket'], a[href*='/bag']"
      );
      if (cartLink && cartLink.getAttribute) {
        const href = cartLink.getAttribute("href");
        if (href && !href.startsWith("javascript:")) {
          return new URL(href, window.location.origin).href;
        }
      }
      if (hostname.includes("amazon.")) return `${window.location.origin}/gp/cart/view.html`;
      if (hostname.includes("steampowered.com")) return "https://store.steampowered.com/cart";
    } catch (_) {}
    return `${window.location.origin}/cart`;
  }

  let interceptedButtons = new Set();
  let lastScrapedActivePrice = null;
  let lastScrapedOptionsCount = 0;

  /**
   * 5-Tier Universal Product Page Scraper
   * Extracts all editions, bundles, variants, prices, discounts, and canonical product URLs,
   * and binds the active buy-box price onto product ingress buttons even on multi-variant pages.
   */
  function extractPageProducts() {
    const hostname = window.location.hostname || "";
    const defaultCategory = inferMerchantCategory(hostname);
    const isCart = isDedicatedCartOrCheckoutPage();
    const canonicalUrl = getCanonicalProductUrl(window.location.href);

    const tldCurrencyHint = inferTldCurrency(hostname);
    const metaCurrencyHint = (
      document.querySelector("meta[property='product:price:currency']")?.getAttribute("content") ||
      document.querySelector("meta[property='og:price:currency']")?.getAttribute("content") ||
      document.querySelector("[itemprop='priceCurrency']")?.getAttribute("content") ||
      ""
    ).toUpperCase().trim() || tldCurrencyHint || null;

    if (isCart) {
      const cartTotalObj = extractCartTotal(metaCurrencyHint);
      const liveCartItems = extractLiveCartItems(metaCurrencyHint);
      const isCartEmptyDetected = detectEmptyCartState();
      return {
        domain: hostname,
        url: canonicalUrl,
        pageTitle: document.title || "Shopping Cart",
        defaultCategory: defaultCategory,
        isCartOrCheckout: true,
        cartTotal: cartTotalObj ? Number(cartTotalObj.amount.toFixed(2)) : null,
        cartCurrency: cartTotalObj ? cartTotalObj.currency : (metaCurrencyHint || "USD"),
        cartItems: liveCartItems,
        isCartEmptyDetected: isCartEmptyDetected,
        storeCartUrl: discoverStoreCartUrl(),
        options: []
      };
    }

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

    const options = [];
    const seenKeys = new Set();

    function addOption(item) {
      if (!item || !item.title || typeof item.amount !== "number" || isNaN(item.amount) || item.amount <= 0) return;
      const cleanTitle = cleanStoreTitle(item.title);
      if (!cleanTitle) return;
      const dedupeKey = `${cleanTitle.toLowerCase()}|${item.amount.toFixed(2)}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);

      options.push({
        id: `opt_${options.length + 1}`,
        kind: item.kind || "PRODUCT",
        title: cleanTitle,
        amount: Number(item.amount.toFixed(2)),
        currency: (item.currency || metaCurrencyHint || "USD").toUpperCase(),
        discountPct: item.discountPct || null,
        originalPrice: item.originalPrice || null,
        productUrl: item.productUrl || canonicalUrl,
        category: item.category || defaultCategory
      });
    }

    // --- TIER 1: Steam Product Pages (Multi-Edition & Bundle Purchase Boxes) ---
    if (hostname.includes("steampowered.com")) {
      const purchaseBoxes = document.querySelectorAll(".game_area_purchase_game");
      purchaseBoxes.forEach((box) => {
        if (box.closest && box.closest(".demo_above_purchase")) return;
        const headingEl = box.querySelector("h1, h2");
        if (!headingEl) return;

        let rawTitle = headingEl.textContent
          .replace(/\s+/g, " ")
          .replace(/BUNDLE\s*\(\?\)/i, "")
          .replace(/^Buy\s+/i, "")
          .replace(/^Pre-Purchase\s+/i, "")
          .trim();

        if (/^Download\s+.*\s+(Demo|Free\s+Starter\s+Pack)/i.test(rawTitle)) return;

        const priceObj = extractActivePriceFromBox(box, metaCurrencyHint);
        if (!priceObj || priceObj.amount <= 0) return;

        const discountEl = box.querySelector(".discount_pct");
        const origPriceEl = box.querySelector(".discount_original_price");
        const discountPct = discountEl ? discountEl.textContent.trim() : null;
        const originalPrice = origPriceEl ? origPriceEl.textContent.trim() : null;
        const isBundle = /bundle/i.test(headingEl.textContent) || box.classList.contains("game_area_purchase_game_dropdown_subscription");

        const cleanEditionTitle = cleanStoreTitle(rawTitle);

        // Bind exact edition price & title directly onto this purchase box's Add-to-Cart button(s)
        const boxButtons = box.querySelectorAll(
          ".btn_addtocart a, .btn_addtocart button, a[href*='addToCart'], a[href*='addBundleToCart']"
        );
        boxButtons.forEach((btn) => {
          btn.setAttribute("data-parentguard-amount", priceObj.amount.toFixed(2));
          btn.setAttribute("data-parentguard-title", cleanEditionTitle);
          btn.setAttribute("data-parentguard-currency", priceObj.currency);
        });

        addOption({
          kind: isBundle ? "BUNDLE" : (options.length === 0 ? "STANDARD" : "EDITION"),
          title: cleanEditionTitle,
          amount: priceObj.amount,
          currency: priceObj.currency,
          discountPct: discountPct,
          originalPrice: originalPrice,
          productUrl: canonicalUrl
        });
      });
    }

    // --- TIER 2: Visible Buy-Box Active DOM Price (Amazon, eBay, Shopify, WooCommerce, Daraz, Nanotek, Regional Stores) ---
    let activeDomPriceObj = null;
    if (!hostname.includes("steampowered.com")) {
      const domPriceSelectors = [
        "#corePriceDisplay_desktop_feature_div .a-price:not([data-a-strike='true']) .a-offscreen",
        "#corePrice_feature_div .a-price:not([data-a-strike='true']) .a-offscreen",
        "#apex_desktop .a-price:not([data-a-strike='true']) .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".x-price-primary",
        ".product__price .price-item--sale",
        ".product__price .price-item--regular",
        ".pdp-price_type_normal",
        "p.price ins .woocommerce-Price-amount",
        "p.price > .woocommerce-Price-amount",
        ".ty-price-num",
        ".ty-price",
        ".special-price .price",
        ".product-info-price .price",
        ".product-price",
        ".current-price",
        ".final-price",
        ".sale-price",
        ".price-new",
        "[data-testid='product-price']",
        "[data-testid='price-current']",
        "[class*='product-price' i]",
        "[class*='product_price' i]",
        "[class*='special-price' i]",
        "[id*='product-price' i]"
      ];

      for (const sel of domPriceSelectors) {
        const els = document.querySelectorAll(sel);
        let matched = null;
        for (const el of els) {
          if (
            el.closest &&
            el.closest("del, s, strike, header, nav, footer, [class*='old' i], [class*='original' i], [class*='related' i], [class*='upsell' i]")
          ) {
            continue;
          }
          const parsed = extractActivePriceFromBox(el, metaCurrencyHint);
          if (parsed && parsed.amount > 0) {
            matched = parsed;
            break;
          }
        }
        if (matched && cleanPageTitle) {
          activeDomPriceObj = matched;
          addOption({
            kind: "PRODUCT",
            title: cleanPageTitle,
            amount: matched.amount,
            currency: matched.currency,
            productUrl: canonicalUrl
          });
          break;
        }
      }
    }

    // --- TIER 3: Schema.org JSON-LD (Shopify, Epic Games, Best Buy, Walmart, Target, WooCommerce) ---
    const jsonLdScripts = document.querySelectorAll("script[type='application/ld+json']");
    jsonLdScripts.forEach((script) => {
      try {
        const rawJson = JSON.parse(script.textContent || "{}");
        const queue = Array.isArray(rawJson) ? [...rawJson] : [rawJson];
        if (rawJson["@graph"] && Array.isArray(rawJson["@graph"])) {
          queue.push(...rawJson["@graph"]);
        }

        queue.forEach((node) => {
          if (!node || typeof node !== "object") return;
          const typeStr = String(node["@type"] || "").toLowerCase();
          if (typeStr.includes("product") || typeStr.includes("videogame") || typeStr.includes("softwareapplication")) {
            const baseName = cleanStoreTitle(node.name || cleanPageTitle);
            const rawOffers = node.offers
              ? (Array.isArray(node.offers) ? node.offers : (node.offers.offers && Array.isArray(node.offers.offers) ? node.offers.offers : [node.offers]))
              : [];

            rawOffers.forEach((offer) => {
              const p = parseFloat(offer.price || offer.lowPrice || "");
              if (!isNaN(p) && p > 0 && baseName) {
                const variantTitle = offer.name && cleanStoreTitle(offer.name) !== baseName
                  ? `${baseName} - ${cleanStoreTitle(offer.name)}`
                  : baseName;
                addOption({
                  kind: rawOffers.length > 1 ? "EDITION" : "PRODUCT",
                  title: variantTitle,
                  amount: p,
                  currency: offer.priceCurrency || metaCurrencyHint || "USD",
                  productUrl: canonicalUrl
                });
              }
            });
          }
        });
      } catch (_) {}
    });

    // --- TIER 4: OpenGraph & Microdata Meta Tags ---
    if (options.length === 0) {
      const metaPrice =
        document.querySelector("meta[property='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:amount']")?.getAttribute("content") ||
        document.querySelector("[itemprop='price']")?.getAttribute("content") ||
        document.querySelector("[itemprop='price']")?.textContent;
      if (cleanPageTitle && metaPrice) {
        const parsed = parsePriceText(metaPrice, metaCurrencyHint);
        if (parsed) {
          activeDomPriceObj = activeDomPriceObj || parsed;
          addOption({
            kind: "PRODUCT",
            title: cleanPageTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            productUrl: canonicalUrl
          });
        }
      }
    }

    // --- TIER 5: Universal Visual DOM & Explicit Currency Heuristic (Custom Stores like nanotek.lk) ---
    if (options.length === 0 && cleanPageTitle) {
      // 5A: Check any generic [class*='price'] or [id*='price'] element in main product area
      const genericPriceNodes = document.querySelectorAll("[class*='price' i], [id*='price' i]");
      for (const node of genericPriceNodes) {
        if (
          node.closest &&
          node.closest(
            "header, nav, footer, del, s, strike, [class*='old' i], [class*='original' i], [class*='related' i], [class*='recommend' i], [class*='cart' i], [class*='installment' i]"
          )
        ) {
          continue;
        }
        const txt = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (!txt || txt.length > 45) continue;
        const parsed = parsePriceText(txt, metaCurrencyHint);
        if (parsed && parsed.amount > 0) {
          activeDomPriceObj = activeDomPriceObj || parsed;
          addOption({
            kind: "PRODUCT",
            title: cleanPageTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            productUrl: canonicalUrl
          });
          break;
        }
      }

      // 5B: Scan visible text blocks inside main/product container for explicit currency strings (e.g. "585,000 LKR", "Rs. 585,000", "$1,299.00")
      if (options.length === 0) {
        const productArea =
          document.querySelector("main, article, [class*='product-detail' i], [class*='product-view' i], [class*='product-info' i]") ||
          document.body;
        const queryRoot =
          productArea && typeof productArea.querySelectorAll === "function"
            ? productArea
            : document;
        if (queryRoot && typeof queryRoot.querySelectorAll === "function") {
          const textEls = queryRoot.querySelectorAll("h2, h3, h4, span, div, p, strong, b");
          const explicitCurrencyRx =
            /(?:\b(?:LKR|USD|EUR|GBP|INR|AUD|CAD|SGD|AED|JPY|MYR)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d{1,3}(?:,\d{3})+(?:\.\d{2})?\s*(?:LKR|USD|EUR|GBP|INR)\b|\bRs\.?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|[$€£₹]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;

          for (const el of textEls) {
            if (el.children && el.children.length > 2) continue;
            if (
              el.closest &&
              el.closest("header, nav, footer, del, s, strike, [class*='old' i], [class*='related' i], [class*='recommend' i]")
            ) {
              continue;
            }
            const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (!txt || txt.length > 48) continue;
            const match = txt.match(explicitCurrencyRx);
            if (match) {
              // Pass null fallback so parsePriceText extracts the explicit currency in match[0]
              const parsed = parsePriceText(match[0], null);
              if (parsed && parsed.amount > 0) {
                activeDomPriceObj = activeDomPriceObj || parsed;
                addOption({
                  kind: "PRODUCT",
                  title: cleanPageTitle,
                  amount: parsed.amount,
                  currency: parsed.currency,
                  productUrl: canonicalUrl
                });
                break;
              }
            }
          }
        }
      }
    }

    lastScrapedOptionsCount = options.length;
    const activePriceToBind = activeDomPriceObj
      ? activeDomPriceObj.amount
      : (options.length === 1 ? options[0].amount : null);
    lastScrapedActivePrice = activePriceToBind;

    // Bind active buy-box price to non-Steam buttons so multi-variant switches update the button's locked price
    if (!hostname.includes("steampowered.com") && activePriceToBind) {
      interceptedButtons.forEach((btn) => {
        btn.setAttribute("data-parentguard-amount", activePriceToBind.toFixed(2));
        if (!btn.getAttribute("data-parentguard-title") && cleanPageTitle) {
          btn.setAttribute("data-parentguard-title", cleanPageTitle);
        }
      });
    }

      return {
        domain: hostname,
        url: canonicalUrl,
        pageTitle: cleanPageTitle || document.title || "",
        defaultCategory: defaultCategory,
        isCartOrCheckout: false,
        storeCartUrl: discoverStoreCartUrl(),
        activePrice: activePriceToBind,
        options: options
      };
  }

  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;

  // Silent Add-to-Cart Capture Engine & Cart Ledger
  const CART_LEDGER_STORAGE_KEY_PREFIX = "parentguard_cart_ledger";

  async function getCartLedgerStorageKey() {
    try {
      const stored = await chrome.storage.local.get(["childEmail", "parentguard_session"]);
      const email =
        (stored && stored.childEmail) ||
        (stored && stored.parentguard_session && stored.parentguard_session.email);
      if (email) {
        return `${CART_LEDGER_STORAGE_KEY_PREFIX}_${String(email).trim().toLowerCase()}`;
      }
    } catch (_) {}
    return `${CART_LEDGER_STORAGE_KEY_PREFIX}_guest`;
  }

  function escapeHtmlText(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showCaptureToast(title, amount, currency) {
    try {
      const existing = document.getElementById("parentguard-capture-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.id = "parentguard-capture-toast";
      toast.className = "parentguard-capture-toast";
      const sym = currency === "LKR" ? "Rs. " : (currency === "EUR" ? "\u20AC" : (currency === "GBP" ? "\u00A3" : "$"));
      const amtStr = amount ? ` (${sym}${Number(amount).toFixed(2)})` : "";
      const rawTitle = title || "Item";
      const shortTitle = rawTitle.length > 34 ? rawTitle.substring(0, 32) + "..." : rawTitle;

      toast.innerHTML = `
        <div class="pg-toast-header">
          <span class="pg-toast-badge">PARENTGUARD</span>
          <span class="pg-toast-tag">CART CAPTURE</span>
        </div>
        <div class="pg-toast-body">
          <span class="pg-toast-title">${escapeHtmlText(shortTitle)}${amtStr}</span>
          <span class="pg-toast-sub">Saved product link for Cart Request</span>
        </div>
      `;

      document.body.appendChild(toast);
      setTimeout(() => {
        if (toast && toast.parentElement) {
          toast.classList.add("fade-out");
          setTimeout(() => toast.remove(), 350);
        }
      }, 2600);
    } catch (_) {}
  }

  async function recordCartLedgerItem(item) {
    if (!item || !item.domain) return;
    try {
      const storageKey = await getCartLedgerStorageKey();
      const res = await chrome.storage.local.get([storageKey]);
      let ledger = Array.isArray(res[storageKey]) ? res[storageKey] : [];

      const cleanItemUrl = getCanonicalProductUrl(item.productUrl || window.location.href);
      const cleanItemTitle = cleanStoreTitle(item.title || document.title || "Store Item");
      const normItemTitle = normalizeEditionTitle(cleanItemTitle);

      // Match existing entry only when BOTH the domain/URL AND normalized edition title match,
      // so distinct editions/DLCs added on the same page are preserved individually.
      const existingIdx = ledger.findIndex((i) => {
        if (i.domain !== item.domain) return false;
        const normExisting = normalizeEditionTitle(i.title || "");
        const titleMatches = normExisting && normItemTitle && normExisting === normItemTitle;
        const urlMatches =
          i.productUrl &&
          cleanItemUrl &&
          i.productUrl.toLowerCase() === cleanItemUrl.toLowerCase();
        return titleMatches && (urlMatches || !i.productUrl || !cleanItemUrl);
      });

      const entry = {
        id: "cart_item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        title: cleanItemTitle,
        amount: typeof item.amount === "number" && !isNaN(item.amount) ? Number(item.amount.toFixed(2)) : null,
        currency: item.currency || "USD",
        productUrl: cleanItemUrl,
        domain: item.domain,
        addedAt: Date.now()
      };

      if (existingIdx >= 0) {
        ledger[existingIdx] = { ...ledger[existingIdx], ...entry, id: ledger[existingIdx].id };
      } else {
        ledger.push(entry);
      }

      const now = Date.now();
      ledger = ledger.filter((i) => !i.addedAt || (now - i.addedAt < 48 * 3600 * 1000));

      await chrome.storage.local.set({ [storageKey]: ledger });
      showCaptureToast(entry.title, entry.amount, entry.currency);
    } catch (e) {
      console.warn("[ParentGuard] Failed to save cart ledger item:", e);
    }
  }

  function handleSilentAddToCartCapture(e) {
    if (isDedicatedCartOrCheckoutPage()) return;

    const target = e.target;
    if (!target) return;

    const btn = target.closest
      ? target.closest(
          "button, a, input[type='button'], input[type='submit'], [role='button'], .btn_addtocart, [id*='add-to-cart' i], [class*='add-to-cart' i]"
        )
      : null;

    if (!btn || !isAddToCartButton(btn)) return;

    const container = btn.closest
      ? btn.closest(".game_area_purchase_game, form, .product-form, [class*='product' i], main, article") || document.body
      : document.body;

    const pageExtraction = extractPageProducts();
    const hostname = window.location.hostname || "";
    const tldCurrency = inferTldCurrency(hostname);

    let priceObj = extractActivePriceFromBox(container, tldCurrency);
    if (!priceObj && pageExtraction && pageExtraction.activePrice) {
      priceObj = { amount: pageExtraction.activePrice, currency: tldCurrency || "USD" };
    } else if (!priceObj && pageExtraction && pageExtraction.options && pageExtraction.options.length > 0) {
      priceObj = {
        amount: pageExtraction.options[0].amount,
        currency: pageExtraction.options[0].currency || tldCurrency || "USD"
      };
    }

    let title = btn.getAttribute("data-parentguard-title");
    if (!title && container) {
      const containerH1 = container.querySelector(
        "h1, h2, .game_area_purchase_game_dropdown_selection, [class*='title' i]"
      );
      if (containerH1) {
        title = (containerH1.textContent || "").replace(/^Buy\s+/i, "").trim();
      }
    }
    if (!title && pageExtraction && pageExtraction.pageTitle) {
      title = pageExtraction.pageTitle;
    }
    if (!title) {
      title = document.title || "Store Item";
    }

    const itemToRecord = {
      title: cleanStoreTitle(title),
      amount: priceObj ? priceObj.amount : null,
      currency: priceObj ? priceObj.currency : (tldCurrency || "USD"),
      productUrl: getCanonicalProductUrl(window.location.href),
      domain: hostname
    };

    recordCartLedgerItem(itemToRecord);
  }

  document.addEventListener("click", handleSilentAddToCartCapture, true);

  // Patterns for Add-to-Cart Buttons (Freely clickable; triggers Silent Cart Capture)
  const ADD_TO_CART_PATTERNS = [
    /\badd\s+to\s+(shopping\s+|my\s+)?(cart|bag|basket|trolley)\b/i,
    /\bin\s*cart\b/i
  ];

  // Patterns for Instant-Buy Buttons on Product Pages (Bypasses cart; locked until approved)
  const INSTANT_BUY_PATTERNS = [
    /\bbuy\s+(it\s+)?now\b/i,
    /\binstant\s+buy\b/i,
    /\b1[-\s]?click\s+buy\b/i,
    /\b1[-\s]?click\s+checkout\b/i
  ];

  // Patterns strictly excluded from locking/capture (Wishlists, Demos, Free items, Navigation)
  const PRODUCT_EXCLUSION_PATTERNS = [
    /\bwishlist\b/i,
    /\bfollow\b/i,
    /\bignore\b/i,
    /\bshare\b/i,
    /\bdownload(\s+demo)?\b/i,
    /\badd\s+to\s+library\b/i,
    /\bplay\s+(now|game|for\s+free)\b/i,
    /\bview\s+(my\s+)?(cart|bag|basket|queue)\b/i,
    /\bcontinue\s+shopping\b/i,
    /\bremove(\s+all\s+items)?\b/i,
    /\bcompare\s+editions\b/i,
    /\bmore\s+info\b/i,
    /\bsign\s+in\b/i,
    /\blog\s*in\b/i,
    /\binstall\s+steam\b/i
  ];

  // Patterns for Cart / Checkout Payment Gate Buttons (Protected by Smart Cart Safety Limit)
  const CART_PAYMENT_GATE_PATTERNS = [
    /\bcontinue\s+to\s+(payment|checkout|shipping|delivery|billing)\b/i,
    /\bproceed\s+to\s+(checkout|payment)\b/i,
    /\bgo\s+to\s+(checkout|payment)\b/i,
    /\bcheck\s*out(\s+now)?\b/i,
    /\bcheckout\b/i,
    /\bpay\s+now\b/i,
    /\bplace\s+(your\s+)?order\b/i,
    /\bcomplete\s+(purchase|order|payment)\b/i,
    /\bsubmit\s+(order|payment)\b/i,
    /\bpurchase\s+(for\s+myself|as\s+a\s+gift)\b/i
  ];

  function extractButtonSignals(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
    const tagName = element.tagName.toUpperCase();
    const role = (element.getAttribute ? element.getAttribute("role") : "") || "";
    const isClickableTag =
      tagName === "BUTTON" ||
      tagName === "A" ||
      tagName === "INPUT" ||
      role.toLowerCase() === "button";
    if (!isClickableTag) return null;

    const visibleText = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    const rawVal = element.value || (element.getAttribute ? element.getAttribute("value") : "");
    const inputVal = tagName === "INPUT" && rawVal ? String(rawVal).replace(/\s+/g, " ").trim() : "";
    const ariaLabel = (element.getAttribute ? element.getAttribute("aria-label") : "") || "";
    const titleAttr = (element.getAttribute ? element.getAttribute("title") : "") || "";

    const labels = [visibleText, inputVal, ariaLabel, titleAttr]
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && s.length <= 70);

    return {
      labels,
      id: (element.id || (element.getAttribute ? element.getAttribute("id") : "") || "").toLowerCase(),
      nameAttr: String((element.getAttribute ? element.getAttribute("name") : "") || "").toLowerCase(),
      className: typeof element.className === "string" ? element.className.toLowerCase() : "",
      href: String((element.getAttribute ? element.getAttribute("href") : "") || "").toLowerCase()
    };
  }

  function isAddToCartButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (isDedicatedCartOrCheckoutPage()) return false;

    if (
      element.closest &&
      element.closest("#parentguard-barrier-root, header, nav, footer, #global_header, .demo_above_purchase")
    ) {
      return false;
    }

    const sig = extractButtonSignals(element);
    if (!sig) return false;

    if (sig.labels.some((lbl) => PRODUCT_EXCLUSION_PATTERNS.some((rx) => rx.test(lbl)))) {
      return false;
    }

    if (sig.labels.some((lbl) => ADD_TO_CART_PATTERNS.some((rx) => rx.test(lbl)))) {
      return true;
    }

    // Do not misclassify an explicit "Buy Now" button (e.g. Daraz sharing "add-to-cart-buy-now-btn")
    if (sig.labels.some((lbl) => INSTANT_BUY_PATTERNS.some((rx) => rx.test(lbl))) || sig.id === "buy-now-button") {
      return false;
    }

    return (
      sig.id === "add-to-cart-button" ||
      sig.nameAttr === "submit.add-to-cart" ||
      sig.nameAttr === "add" ||
      sig.className.includes("btn_addtocart") ||
      sig.className.includes("add-to-cart") ||
      sig.className.includes("add_to_cart") ||
      sig.className.includes("addtocart") ||
      sig.href.includes("javascript:addtocart") ||
      sig.href.includes("javascript:addbundletocart")
    );
  }

  function isInstantBuyButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (isDedicatedCartOrCheckoutPage()) return false;

    const sig = extractButtonSignals(element);
    if (!sig) return false;

    if (sig.labels.some((lbl) => PRODUCT_EXCLUSION_PATTERNS.some((rx) => rx.test(lbl)))) {
      return false;
    }

    // Never lock if primary visible text says "Add to Cart / Bag / Basket"
    const primaryLabel = sig.labels[0] || "";
    if (ADD_TO_CART_PATTERNS.some((rx) => rx.test(primaryLabel)) || sig.id === "add-to-cart-button") {
      return false;
    }

    if (sig.labels.some((lbl) => INSTANT_BUY_PATTERNS.some((rx) => rx.test(lbl)))) {
      return true;
    }

    return sig.id === "buy-now-button";
  }

  // Product-Page Ingress Button: Only lock Instant-Buy buttons that bypass the cart!
  // Normal "Add to Cart" is NOT locked, allowing child to build their cart freely.
  function isProductIngressButton(element) {
    return isInstantBuyButton(element);
  }

  function matchesProductIngressTextOrAttr(element) {
    return isInstantBuyButton(element);
  }

  function isCartPaymentGateButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (!isDedicatedCartOrCheckoutPage()) return false;

    if (
      element.closest &&
      (element.closest("#parentguard-barrier-root, header nav") || element.classList.contains("parentguard-in-place-shield"))
    ) {
      return false;
    }

    const sig = extractButtonSignals(element);
    if (!sig) return false;

    if (sig.labels.some((lbl) => PRODUCT_EXCLUSION_PATTERNS.some((rx) => rx.test(lbl)))) {
      return false;
    }

    if (sig.labels.some((lbl) => CART_PAYMENT_GATE_PATTERNS.some((rx) => rx.test(lbl)))) {
      return true;
    }

    return (
      sig.nameAttr === "proceedtoretailcheckout" ||
      sig.nameAttr === "checkout" ||
      sig.id === "checkout" ||
      sig.className.includes("checkout-button")
    );
  }

  // Helper: Check if a URL string contains a specific product path beyond just the domain root
  function hasSpecificProductPath(urlOrDomain) {
    if (!urlOrDomain) return false;
    try {
      const withScheme = /^https?:\/\//i.test(urlOrDomain) ? urlOrDomain : `https://${urlOrDomain}`;
      const parsed = new URL(withScheme);
      const path = parsed.pathname.replace(/\/+$/, "");
      return path.length > 1;
    } catch (_) {
      return String(urlOrDomain).includes("/");
    }
  }

  /**
   * Helper: Parse Multi-Item Combo Approval into individual approved sub-items
   * (e.g. itemName: "007 First Light ($19.99) + Sea of Thieves 2026 Edition ($8.39)"
   *  with note: "...[CART_LINKS]url1|url2[/CART_LINKS]")
   */
  function parseComboApprovalSubItems(approvedReq) {
    if (!approvedReq || !approvedReq.itemName || !String(approvedReq.itemName).includes(" + ")) {
      return [];
    }
    const linkMatch = String(approvedReq.note || "").match(/\[CART_LINKS\]([\s\S]*?)\[\/CART_LINKS\]/i);
    const links = linkMatch && linkMatch[1]
      ? linkMatch[1].split("|").map((u) => u.trim()).filter(Boolean)
      : [];

    const segments = String(approvedReq.itemName)
      .split(/\s+\+\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length <= 1) return [];

    return segments.map((seg, idx) => {
      const priceParenMatch = seg.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      const rawTitle = priceParenMatch ? priceParenMatch[1].trim() : seg;
      const parsedPrice = priceParenMatch ? parsePriceText(priceParenMatch[2], approvedReq.currency) : null;
      return {
        title: cleanStoreTitle(rawTitle),
        normTitle: normalizeEditionTitle(rawTitle),
        amount: parsedPrice ? parsedPrice.amount : null,
        productUrl: links[idx] || null
      };
    });
  }

  /**
   * Strict Edition, Price & URL Matcher (Supports both Single-Product Approvals & Saved Combo Approvals):
   * - Requires button price (`data-parentguard-amount`) to exist and match the approved item/sub-item price within $0.02
   * - If the approved request (or combo sub-item) specifies a product page path, requires `currentPageUrl` to match that path
   * - Uses exact normalized title matching rather than loose substring containment
   */
  function doesProductButtonMatchApproval(button, approvedReq, currentPageUrl, currentPageTitle) {
    if (!button || !approvedReq || approvedReq.status !== "APPROVED") return false;

    const btnAmtStr = button.getAttribute ? button.getAttribute("data-parentguard-amount") : null;
    const btnAmt = btnAmtStr ? parseFloat(btnAmtStr) : NaN;
    if (isNaN(btnAmt) || btnAmt <= 0) {
      return false;
    }

    const cleanPageUrl = getCanonicalProductUrl(currentPageUrl).toLowerCase();
    const pageBase = cleanPageUrl.split("?")[0];
    const btnTitleNorm = normalizeEditionTitle(button.getAttribute ? (button.getAttribute("data-parentguard-title") || "") : "");
    const pageTitleNorm = normalizeEditionTitle(currentPageTitle || "");

    // --- CASE A: Multi-Item Combo Approval from SAVED Cart ---
    const comboSubItems = parseComboApprovalSubItems(approvedReq);
    if (comboSubItems.length > 1) {
      return comboSubItems.some((sub) => {
        if (typeof sub.amount !== "number" || isNaN(sub.amount) || Math.abs(btnAmt - sub.amount) >= 0.02) {
          return false;
        }
        if (sub.productUrl && hasSpecificProductPath(sub.productUrl)) {
          const subBase = getCanonicalProductUrl(sub.productUrl).toLowerCase().split("?")[0];
          if (pageBase !== subBase) return false;
        }
        if (btnTitleNorm && sub.normTitle) {
          return btnTitleNorm === sub.normTitle;
        }
        if (pageTitleNorm && sub.normTitle) {
          return pageTitleNorm === sub.normTitle;
        }
        return Boolean(sub.productUrl);
      });
    }

    // --- CASE B: Single-Product Approval ---
    const approvedAmount = Number(approvedReq.amount);
    if (isNaN(approvedAmount) || approvedAmount <= 0 || Math.abs(btnAmt - approvedAmount) >= 0.02) {
      return false;
    }

    const cleanReqSite = getCanonicalProductUrl(approvedReq.siteDomain || "").toLowerCase();
    const reqHasPath = hasSpecificProductPath(approvedReq.siteDomain);

    let urlPathMatches = false;
    if (reqHasPath) {
      const reqBase = cleanReqSite.split("?")[0];
      urlPathMatches = pageBase === reqBase;
      if (!urlPathMatches) {
        return false;
      }
    }

    const reqTitleNorm = normalizeEditionTitle(approvedReq.itemName || "");

    if (btnTitleNorm && reqTitleNorm) {
      return btnTitleNorm === reqTitleNorm;
    }

    if (urlPathMatches) {
      return true;
    }

    if (pageTitleNorm && reqTitleNorm) {
      return pageTitleNorm === reqTitleNorm;
    }

    return false;
  }

  // Helper: Check if an approval is recent (within 24 hours) for active cart checkout
  function isRecentActiveApproval(req) {
    if (!req || req.status !== "APPROVED") return false;
    const ts = req.decidedAt || req.createdAt;
    if (!ts) return true;
    try {
      const decidedMs = new Date(ts).getTime();
      if (isNaN(decidedMs)) return true;
      const ageMs = Date.now() - decidedMs;
      return ageMs < 1000 * 60 * 60 * 24; // 24-hour active checkout window
    } catch (_) {
      return true;
    }
  }

  window.__PARENTGUARD_PRODUCT_UTILS__ = {
    parsePriceText,
    inferTldCurrency,
    extractActivePriceFromBox,
    extractLiveCartItems,
    cleanStoreTitle,
    normalizeEditionTitle,
    isCartOrCheckoutPath,
    getCanonicalProductUrl,
    parseComboApprovalSubItems,
    doesProductButtonMatchApproval,
    doesLiveCartMatchApproval,
    isProductIngressButton,
    isAddToCartButton,
    isInstantBuyButton,
    isCartPaymentGateButton,
    isRecentActiveApproval,
    getCartLedgerStorageKey
  };

  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) {
    if (typeof verifyAndUnlockApprovedButtons === "function") {
      verifyAndUnlockApprovedButtons();
    }
    return;
  }
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  let verifiedDomainApprovals = [];
  let lastLockCurrencyCode = inferTldCurrency(window.location.hostname || "") || "USD";

  function formatProductLockLabel(amountStr, currencyCode) {
    const num = parseFloat(amountStr || "");
    const cur = (currencyCode || lastLockCurrencyCode || "USD").toUpperCase();
    const sym = cur === "LKR" ? "Rs. " : (cur === "EUR" ? "\u20AC" : (cur === "GBP" ? "\u00A3" : (cur === "INR" ? "\u20B9" : "$")));
    return !isNaN(num) && num > 0
      ? `[ LOCKED (${sym}${num.toFixed(2)}) — ASK PARENT ]`
      : "[ LOCKED — ASK PARENT ]";
  }

  function handleBlockedAuxEvent(e) {
    if (typeof chrome !== "undefined" && (!chrome.runtime || !chrome.runtime.id)) {
      return;
    }
    const btn = e.currentTarget;
    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true" && verifiedDomainApprovals.length > 0) {
      return;
    }
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // Intercept and Lock a Product Ingress Button (or Cart Button exceeding approved limit)
  function interceptButton(button, defaultAmount, customShieldLabel) {
    if (!button) return;

    if (!button.getAttribute("data-parentguard-amount") && defaultAmount) {
      button.setAttribute("data-parentguard-amount", Number(defaultAmount).toFixed(2));
    }

    const amtAttr = button.getAttribute("data-parentguard-amount");

    if (interceptedButtons.has(button)) {
      if (button.getAttribute("data-parentguard-unlocked") !== "true") {
        const shield = button.parentElement ? button.parentElement.querySelector(".parentguard-in-place-shield") : null;
        if (shield) {
          shield.textContent = customShieldLabel || formatProductLockLabel(amtAttr);
        }
      }
      return;
    }

    interceptedButtons.add(button);

    const currentHref = button.getAttribute("href");
    if (currentHref && /^javascript:/i.test(currentHref)) {
      button.setAttribute("data-parentguard-orig-href", currentHref);
      button.setAttribute("href", "javascript:void(0);");
    }

    button.classList.add("parentguard-locked-btn");
    button.setAttribute("data-parentguard-intercepted", "true");
    button.setAttribute("data-parentguard-locked", "true");
    button.setAttribute("data-parentguard-unlocked", "false");

    // Capture click, pointerdown, mousedown, and keyboard activation so events never leak to parent wrappers
    button.addEventListener("click", handleBlockedClick, true);
    button.addEventListener("mousedown", handleBlockedAuxEvent, true);
    button.addEventListener("pointerdown", handleBlockedAuxEvent, true);
    button.addEventListener("keydown", handleBlockedAuxEvent, true);

    const container = button.parentElement;
    if (container && !container.querySelector(".parentguard-in-place-shield")) {
      const shield = document.createElement("div");
      shield.className = "parentguard-in-place-shield";
      shield.textContent = customShieldLabel || formatProductLockLabel(amtAttr);
      container.insertBefore(shield, button.nextSibling);
    }

    const legacyBarrier = document.getElementById("parentguard-barrier-root");
    if (legacyBarrier) legacyBarrier.remove();
  }

  function doesCartTitleMatchApproved(liveTitle, approvedTitle) {
    const a = normalizeEditionTitle(liveTitle || "");
    const b = normalizeEditionTitle(approvedTitle || "");
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;

    const wordsA = a.split(" ").filter((w) => w.length >= 3);
    const wordsB = b.split(" ").filter((w) => w.length >= 3);
    if (wordsA.length === 0 || wordsB.length === 0) return false;
    const overlap = wordsA.filter((w) => wordsB.includes(w));
    return overlap.length >= Math.min(2, Math.min(wordsA.length, wordsB.length));
  }

  function doesLiveCartMatchApproval(liveCartItems, approvedReq) {
    if (!approvedReq || approvedReq.status !== "APPROVED") return false;
    if (!Array.isArray(liveCartItems) || liveCartItems.length === 0) return true;

    const subItems = parseComboApprovalSubItems(approvedReq);
    const approvedTitles = subItems.length > 1
      ? subItems.map((s) => s.title)
      : [cleanStoreTitle(approvedReq.itemName || "")];

    return liveCartItems.every((cartItem) =>
      approvedTitles.some((appTitle) => doesCartTitleMatchApproved(cartItem.title, appTitle))
    );
  }

  // Click-Time Just-In-Time (JIT) Gate
  function handleBlockedClick(e) {
    if (typeof chrome !== "undefined" && (!chrome.runtime || !chrome.runtime.id)) {
      return;
    }
    const btn = e.currentTarget;

    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true" && verifiedDomainApprovals.length > 0) {
      if (!isDedicatedCartOrCheckoutPage()) {
        const liveExtraction = extractPageProducts();
        if (liveExtraction && liveExtraction.activePrice && !window.location.hostname.includes("steampowered.com")) {
          btn.setAttribute("data-parentguard-amount", liveExtraction.activePrice.toFixed(2));
        }
        const stillMatches = verifiedDomainApprovals.some((req) =>
          doesProductButtonMatchApproval(btn, req, window.location.href, document.title)
        );
        if (stillMatches) {
          return; // Approved edition & live price verified! Allow adding to cart.
        }
        relockButton(btn);
      } else {
        // On /cart page, verify cart total AND live cart items match an active approval
        const cartTotalObj = extractCartTotal();
        const liveCartItems = extractLiveCartItems();
        const latestApproval = verifiedDomainApprovals[0];
        const approvedCeiling = latestApproval ? Number(latestApproval.amount) || 0 : 0;
        const itemsMatch = doesLiveCartMatchApproval(liveCartItems, latestApproval);
        if (cartTotalObj && cartTotalObj.amount > 0 && cartTotalObj.amount <= approvedCeiling + 0.02 && itemsMatch) {
          return; // Positively verified within active approved ceiling and items!
        }
        const liveAmt = cartTotalObj ? cartTotalObj.amount : 0;
        let lockMsg = "[ LOCKED — OPEN PARENTGUARD EXTENSION TO REQUEST CART ]";
        if (!itemsMatch && latestApproval) {
          lockMsg = "[ UNAPPROVED ITEM IN CART — REQUEST APPROVAL ]";
        } else if (liveAmt > 0 && approvedCeiling > 0) {
          lockMsg = `[ CART ($${liveAmt.toFixed(2)}) EXCEEDS APPROVED ($${approvedCeiling.toFixed(2)}) — REMOVE EXTRA ITEMS ]`;
        }
        relockButton(btn, lockMsg);
      }
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function unlockButtonWithProof(button, verifiedRequest, customLabel) {
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
      const btnAmt = button.getAttribute("data-parentguard-amount");
      const amt = btnAmt ? Number(btnAmt).toFixed(2) : Number(verifiedRequest.amount).toFixed(2);
      shield.textContent = customLabel || `[ APPROVED — ADD TO CART ($${amt}) ]`;
    }
  }

  function relockButton(button, customLabel) {
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

    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.remove("verified");
      const amtAttr = button.getAttribute("data-parentguard-amount");
      shield.textContent = customLabel || formatProductLockLabel(amtAttr);
    }
  }

  function releaseAllLocksOnPage() {
    interceptedButtons.forEach((btn) => {
      btn.classList.remove("parentguard-locked-btn");
      btn.setAttribute("data-parentguard-unlocked", "true");
      btn.setAttribute("data-parentguard-locked", "false");
      btn.disabled = false;
      const origHref = btn.getAttribute("data-parentguard-orig-href");
      if (origHref) {
        btn.setAttribute("href", origHref);
      }
      const shield = btn.parentElement ? btn.parentElement.querySelector(".parentguard-in-place-shield") : null;
      if (shield) shield.remove();
    });
    interceptedButtons.clear();
  }

  /**
   * Fetches child's approved requests, strictly verifies RSA-2048 signatures via WebCrypto,
   * and either:
   * - Unlocks the exact matching edition Add-to-Cart button on Product Pages, OR
   * - Enforces the fail-closed Smart Cart Safety Limit on /cart and /checkout pages.
   */
  async function verifyAndUnlockApprovedButtons() {
    if (!window.ParentGuardCrypto) return;

    try {
      const res = await chrome.runtime.sendMessage({ type: "FETCH_MY_REQUESTS" });
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const currentHost = getCleanHostKey(window.location.hostname);
      const candidateApprovals = res.data
        .filter((req) => {
          if (req.status !== "APPROVED" || !req.rsaSignature) return false;
          if (!isRecentActiveApproval(req)) return false;
          const reqDomain = (req.siteDomain || "").toLowerCase();
          return reqDomain.includes(currentHost) || currentHost.includes(reqDomain);
        })
        .sort((a, b) => (b.id || 0) - (a.id || 0));

      const cryptoVerified = [];
      for (const req of candidateApprovals) {
        const verification = await window.ParentGuardCrypto.verifyPurchaseApproval(req);
        // Strict cryptographic check (Fixes P0-1: zero fallback bypass for invalid/tampered signatures)
        if (verification && verification.valid === true) {
          cryptoVerified.push(req);
        }
      }

      verifiedDomainApprovals = cryptoVerified;

      // --- CASE 1: On /cart or /checkout page -> Fail-Closed Smart Cart Safety Limit + Item Integrity ---
      if (isDedicatedCartOrCheckoutPage()) {
        const cartTotalObj = extractCartTotal();
        const liveCartTotal = cartTotalObj ? cartTotalObj.amount : 0;
        const liveCartItems = extractLiveCartItems();
        // Use the most recent active approval (Fixes P0-2: never sum all lifetime historical approvals)
        const latestActiveApproval = cryptoVerified[0] || null;
        const approvedCeiling = latestActiveApproval ? Number(latestActiveApproval.amount) || 0 : 0;
        const itemsMatch = doesLiveCartMatchApproval(liveCartItems, latestActiveApproval);

        // Fail-Closed: Only release cart lock when liveCartTotal is positively read (> 0), within approvedCeiling, and items match
        if (approvedCeiling > 0 && liveCartTotal > 0 && liveCartTotal <= approvedCeiling + 0.02 && itemsMatch) {
          releaseAllLocksOnPage();
          return;
        }

        let label = formatProductLockLabel(liveCartTotal > 0 ? liveCartTotal.toFixed(2) : null);
        if (approvedCeiling > 0 && !itemsMatch) {
          label = "[ UNAPPROVED ITEM IN CART — REQUEST APPROVAL ]";
        } else if (approvedCeiling > 0 && liveCartTotal > approvedCeiling + 0.02) {
          label = `[ CART ($${liveCartTotal.toFixed(2)}) EXCEEDS APPROVED ($${approvedCeiling.toFixed(2)}) — REMOVE EXTRA ITEMS ]`;
        }

        const gateCandidates = document.querySelectorAll(
          "button, a, input[type='submit'], input[type='button'], [role='button']"
        );
        for (const el of gateCandidates) {
          if (isCartPaymentGateButton(el)) {
            interceptButton(el, liveCartTotal > 0 ? liveCartTotal : null, label);
            relockButton(el, label);
          }
        }
        return;
      }

      // --- CASE 2: On Product Pages -> Unlock ONLY the specific approved edition button ---
      if (interceptedButtons.size === 0) return;

      interceptedButtons.forEach((btn) => {
        const matchingApproval = cryptoVerified.find((req) =>
          doesProductButtonMatchApproval(btn, req, window.location.href, document.title)
        );
        if (matchingApproval) {
          unlockButtonWithProof(btn, matchingApproval);
        } else if (btn.getAttribute("data-parentguard-unlocked") === "true") {
          relockButton(btn);
        }
      });
    } catch (_) {}
  }

  function releaseStaleLockOnAddToCart(button) {
    if (!button) return;
    if (
      button.classList.contains("parentguard-locked-btn") ||
      button.getAttribute("data-parentguard-locked") === "true" ||
      button.getAttribute("data-parentguard-intercepted") === "true"
    ) {
      button.classList.remove("parentguard-locked-btn");
      button.removeAttribute("data-parentguard-locked");
      button.removeAttribute("data-parentguard-intercepted");
      button.removeAttribute("data-parentguard-unlocked");
      button.disabled = false;
      const origHref = button.getAttribute("data-parentguard-orig-href");
      if (origHref) {
        button.setAttribute("href", origHref);
      }
      if (typeof button.removeEventListener === "function") {
        button.removeEventListener("click", handleBlockedClick, true);
        button.removeEventListener("mousedown", handleBlockedAuxEvent, true);
        button.removeEventListener("pointerdown", handleBlockedAuxEvent, true);
        button.removeEventListener("keydown", handleBlockedAuxEvent, true);
      }
      interceptedButtons.delete(button);
    }
  }

  function scanPage() {
    const extraction = extractPageProducts();
    if (extraction && Array.isArray(extraction.options) && extraction.options[0] && extraction.options[0].currency) {
      lastLockCurrencyCode = extraction.options[0].currency;
    } else if (extraction && extraction.cartCurrency) {
      lastLockCurrencyCode = extraction.cartCurrency;
    }

    if (isDedicatedCartOrCheckoutPage()) {
      verifyAndUnlockApprovedButtons();
      return;
    }

    const defaultAmountToBind =
      extraction && extraction.activePrice
        ? extraction.activePrice
        : (extraction && Array.isArray(extraction.options) && extraction.options.length === 1
            ? extraction.options[0].amount
            : null);

    const candidates = document.querySelectorAll(
      "button, a, input[type='submit'], input[type='button'], [role='button']"
    );
    let newlyAdded = false;
    for (const el of candidates) {
      if (isAddToCartButton(el)) {
        // Ensure Add to Cart buttons never carry stale lock styling/attributes across extension reloads
        releaseStaleLockOnAddToCart(el);
        continue;
      }
      if (isProductIngressButton(el)) {
        interceptButton(el, defaultAmountToBind);
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
        const targetEl =
          mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE
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
      scanPage();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  } else {
    scanPage();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  window.addEventListener("popstate", scheduleScan);
  try {
    const origPushState = history.pushState;
    if (origPushState) {
      history.pushState = function () {
        const result = origPushState.apply(this, arguments);
        scheduleScan();
        return result;
      };
    }
    const origReplaceState = history.replaceState;
    if (origReplaceState) {
      history.replaceState = function () {
        const result = origReplaceState.apply(this, arguments);
        scheduleScan();
        return result;
      };
    }
  } catch (_) {}

  setInterval(() => {
    if (interceptedButtons.size > 0 || isDedicatedCartOrCheckoutPage()) {
      verifyAndUnlockApprovedButtons();
    }
  }, 2500);

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

      verifyAndUnlockApprovedButtons().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    return false;
  });
})();
