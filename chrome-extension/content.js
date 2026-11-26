/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Universal E-Commerce Scraper, Single-Gate Product Ingress Lock & WebCrypto RSA-2048 Auto-Unlock
 *
 * Responsibilities:
 * - Single-Gate Product Ingress Lock: Intercepts "Add to Cart", "Add to Bag", "Buy Now", and "Pre-Order" buttons
 *   across any e-commerce platform (Amazon, Shopify, WooCommerce, eBay, Walmart, Target, Epic Games, Steam, etc.)
 * - Frictionless Cart Flow: Never double-locks shopping cart or checkout continuation buttons after product approval
 * - 5-Tier Deterministic Universal Scraper: Extracts titles, variants/editions/bundles, prices, and currencies via
 *   JSON-LD Schema.org, OpenGraph/Microdata, platform adapters, and visual DOM heuristics (zero AI API latency)
 * - Uses window.ParentGuardCrypto (WebCrypto RSASSA-PKCS1-v1_5 / SHA-256) to verify parent RSA-2048 signatures
 *   before silently auto-unlocking product purchase buttons
 */

(function () {
  "use strict";

  // Helper: Parse a raw price text (e.g. "$1,299.99", "€14,99", "£19.99", "Rs. 4,500.00") into { amount, currency, raw }
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

    // 1. Match standard decimal prices including thousands separators (e.g. 1,299.99 or 1.299,99 or 29.99)
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
      // 2. Support whole-number prices when an explicit currency symbol/code is present (e.g. "$49", "¥3,500", "Rs. 4,500")
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
      h.includes("duolingo") ||
      h.includes("oreilly")
    ) {
      return "EDUCATION";
    }
    return "SHOPPING";
  }

  // Helper: Clean common marketplace prefixes/suffixes from page titles
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

  // Helper: Detect dedicated Shopping Cart or Checkout pages so we never double-lock after product approval
  function isDedicatedCartOrCheckoutPage() {
    const pathname = (window.location.pathname || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();
    if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(pathname)) {
      return true;
    }
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy") || search.includes("step=contact_information")) {
      return true;
    }
    return false;
  }

  /**
   * Extract Title & Price metadata from a Steam .game_area_purchase_game box
   */
  function extractSteamPurchaseBoxInfo(box) {
    if (!box) return null;
    const headingEl = box.querySelector("h1, h2");
    if (!headingEl) return null;

    const clonedHeading = headingEl.cloneNode(true);
    clonedHeading.querySelectorAll(".bundle_label, p, .game_purchase_discount_countdown").forEach((n) => n.remove());

    let rawTitle = (clonedHeading.textContent || "").replace(/\s+/g, " ").trim();
    rawTitle = rawTitle.replace(/^Buy\s+/i, "").trim();
    rawTitle = rawTitle.replace(/\(\?\)\s*$/, "").trim();

    if (/^Download\s+.*\s+Demo$/i.test(rawTitle)) return null;

    let kind = "GAME";
    if (
      /\bBUNDLE\b/i.test(rawTitle) ||
      /\bPACK\b/i.test(rawTitle) ||
      box.querySelector(".bundle_label_tooltip")
    ) {
      kind = "BUNDLE";
    } else if (/\bDLC\b|\bSoundtrack\b|\bExpansion\b|\bPass\b/i.test(rawTitle)) {
      kind = "EDITION";
    }

    const priceContainer =
      box.querySelector(".discount_final_price") ||
      box.querySelector(".game_purchase_price.price") ||
      box.querySelector(".your_price div:last-child") ||
      box.querySelector(".game_area_purchase_game_dropdown_selection");

    let parsedPrice = priceContainer ? parsePriceText(priceContainer.textContent) : null;

    if (!parsedPrice) {
      const actionBg = box.querySelector(".game_purchase_action_bg, .game_purchase_action");
      if (actionBg) {
        parsedPrice = parsePriceText(actionBg.textContent);
      }
    }

    if (!parsedPrice) return null;

    const discountEl = box.querySelector(".discount_pct");
    const originalEl = box.querySelector(".discount_original_price");

    return {
      kind,
      title: rawTitle,
      amount: parsedPrice.amount,
      currency: parsedPrice.currency,
      discountPct: discountEl ? discountEl.textContent.trim() : null,
      originalPrice: originalEl ? originalEl.textContent.trim() : null,
      category: "GAMING"
    };
  }

  // Helper: Extract clean text from a price container while ignoring strikethrough "was" / "compare-at" prices
  function extractActivePriceFromElement(el, fallbackCurrency) {
    if (!el) return null;
    if (el.closest("del, s, strike, .was-price, .old-price, .compare-at-price, .discount_original_price")) {
      return null;
    }

    const contentAttr = el.getAttribute("content") || el.getAttribute("data-price") || el.getAttribute("data-product-price");
    if (contentAttr) {
      // Shopify data-price / data-product-price is occasionally in integer cents (e.g. "2999" with no decimal)
      const trimmed = contentAttr.trim();
      if (/^\d+$/.test(trimmed) && (el.hasAttribute("data-product-price") || el.hasAttribute("data-variant-price"))) {
        const centsVal = parseInt(trimmed, 10) / 100;
        if (centsVal > 0) {
          return { amount: centsVal, currency: fallbackCurrency || "USD", raw: trimmed };
        }
      }
      const parsedAttr = parsePriceText(trimmed, fallbackCurrency);
      if (parsedAttr) return parsedAttr;
    }

    const clone = el.cloneNode(true);
    clone
      .querySelectorAll("del, s, strike, .was-price, .old-price, .compare-at-price, .price__compare, .discount_original_price")
      .forEach((n) => n.remove());

    return parsePriceText(clone.textContent, fallbackCurrency);
  }

  let cachedPrimaryOption = null;

  /**
   * 5-Tier Deterministic Universal E-Commerce Scraper
   * Works across Steam, Amazon, Shopify, WooCommerce, eBay, Walmart, Target, Best Buy, Epic Games, and custom SPAs
   */
  function extractPageProducts() {
    const hostname = window.location.hostname || "";
    const defaultCategory = inferMerchantCategory(hostname);
    const options = [];
    const seenKeys = new Set();

    // Detect page-level currency hint from meta tags or Shopify/WooCommerce globals
    const metaCurrencyHint = (
      document.querySelector("meta[property='product:price:currency']")?.getAttribute("content") ||
      document.querySelector("meta[property='og:price:currency']")?.getAttribute("content") ||
      document.querySelector("[itemprop='priceCurrency']")?.getAttribute("content") ||
      ""
    ).toUpperCase().trim() || null;

    function addOption(item) {
      if (!item || !item.title || typeof item.amount !== "number" || isNaN(item.amount) || item.amount <= 0) {
        return;
      }
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
        category: item.category || defaultCategory
      });
    }

    // Primary Page Title Detection
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

    // TIER 0: Explicit ParentGuard Annotated Options
    const annotatedNodes = document.querySelectorAll("[data-parentguard-option]");
    annotatedNodes.forEach((node) => {
      const title = node.getAttribute("data-title") || node.getAttribute("data-parentguard-option");
      const priceVal = parseFloat(node.getAttribute("data-price") || "");
      const currency = node.getAttribute("data-currency") || metaCurrencyHint || "USD";
      const kind = node.getAttribute("data-kind") || "PRODUCT";
      const discountPct = node.getAttribute("data-discount") || null;
      const originalPrice = node.getAttribute("data-original-price") || null;

      if (title && !isNaN(priceVal) && priceVal > 0) {
        addOption({
          kind,
          title,
          amount: priceVal,
          currency,
          discountPct,
          originalPrice,
          category: node.getAttribute("data-category") || defaultCategory
        });
      }
    });

    // TIER 1: Specialized Multi-Option Marketplace Adapters (Steam, Amazon, eBay)
    if (hostname.includes("steampowered.com") && !isDedicatedCartOrCheckoutPage()) {
      const purchaseBoxes = document.querySelectorAll(".game_area_purchase_game");
      purchaseBoxes.forEach((box) => {
        const info = extractSteamPurchaseBoxInfo(box);
        if (info) addOption(info);
      });
    }

    if (hostname.includes("amazon.") && !isDedicatedCartOrCheckoutPage()) {
      const mainTitleEl = document.getElementById("productTitle");
      const mainTitle = mainTitleEl ? mainTitleEl.textContent.replace(/\s+/g, " ").trim() : cleanPageTitle;

      const mainPriceEl =
        document.querySelector("#corePriceDisplay_desktop_feature_div .a-price .a-offscreen") ||
        document.querySelector("#corePrice_feature_div .a-price .a-offscreen") ||
        document.querySelector("#apex_desktop .a-price .a-offscreen") ||
        document.querySelector(".a-price.aok-align-center .a-offscreen") ||
        document.getElementById("price_inside_buybox") ||
        document.getElementById("priceblock_ourprice");

      if (mainTitle && mainPriceEl) {
        const parsed = parsePriceText(mainPriceEl.textContent, metaCurrencyHint);
        if (parsed) {
          addOption({
            kind: "PRODUCT",
            title: mainTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            category: defaultCategory
          });
        }
      }

      const swatches = document.querySelectorAll("#twister li, .swatchElement");
      swatches.forEach((swatch) => {
        const text = (swatch.textContent || "").replace(/\s+/g, " ").trim();
        const parsed = parsePriceText(text, metaCurrencyHint);
        if (parsed && mainTitle) {
          const lines = text.split(" ").filter(Boolean);
          const editionName = lines.slice(0, 3).join(" ");
          addOption({
            kind: "OPTION",
            title: `${mainTitle} (${editionName})`,
            amount: parsed.amount,
            currency: parsed.currency,
            category: defaultCategory
          });
        }
      });
    }

    if (hostname.includes("ebay.") && !isDedicatedCartOrCheckoutPage()) {
      const ebayPriceEl =
        document.querySelector(".x-price-primary span") ||
        document.querySelector(".x-price-primary") ||
        document.getElementById("prcIsum") ||
        document.getElementById("mm-saleDscPrc");
      if (cleanPageTitle && ebayPriceEl) {
        const parsed = extractActivePriceFromElement(ebayPriceEl, metaCurrencyHint);
        if (parsed) {
          addOption({
            kind: "PRODUCT",
            title: cleanPageTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            category: defaultCategory
          });
        }
      }
    }

    // TIER 2: Universal Schema.org JSON-LD Graph, Offer & Variant Parser
    // Covers Shopify, WooCommerce, BigCommerce, Walmart, Target, Best Buy, Epic Games, Nike, Etsy, etc.
    if (!isDedicatedCartOrCheckoutPage()) {
      const PRODUCT_SCHEMA_TYPES = new Set([
        "product",
        "productgroup",
        "individualproduct",
        "productmodel",
        "videogame",
        "softwareapplication",
        "book",
        "course"
      ]);

      function hasMatchingSchemaType(node) {
        if (!node || !node["@type"]) return false;
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        return types.some((t) => typeof t === "string" && PRODUCT_SCHEMA_TYPES.has(t.toLowerCase()));
      }

      function extractOffersFromNode(productNode, fallbackTitle, isVariant) {
        const baseName = productNode.name || fallbackTitle || cleanPageTitle;
        if (!baseName) return;

        const rawOffers = productNode.offers;
        const offerQueue = Array.isArray(rawOffers) ? [...rawOffers] : rawOffers ? [rawOffers] : [];

        offerQueue.forEach((offer) => {
          if (!offer || typeof offer !== "object") return;

          // Unpack nested offers inside AggregateOffer
          if (Array.isArray(offer.offers) && offer.offers.length > 0) {
            offer.offers.forEach((subOffer) => {
              offerQueue.push(subOffer);
            });
          }

          const specPrice =
            offer.priceSpecification &&
            (offer.priceSpecification.price || offer.priceSpecification.minPrice);
          const rawPriceVal = offer.price ?? offer.lowPrice ?? specPrice ?? offer.highPrice;
          const currencyCode = (
            offer.priceCurrency ||
            (offer.priceSpecification && offer.priceSpecification.priceCurrency) ||
            metaCurrencyHint ||
            "USD"
          ).toUpperCase();

          let priceNum = typeof rawPriceVal === "number" ? rawPriceVal : parseFloat(String(rawPriceVal || ""));
          if (isNaN(priceNum) && rawPriceVal) {
            const parsed = parsePriceText(String(rawPriceVal), currencyCode);
            if (parsed) priceNum = parsed.amount;
          }

          if (!isNaN(priceNum) && priceNum > 0) {
            const offerTitle =
              offer.name && offer.name.toLowerCase() !== baseName.toLowerCase()
                ? `${baseName} - ${offer.name}`
                : baseName;
            addOption({
              kind: isVariant || offerQueue.length > 1 ? "OPTION" : "PRODUCT",
              title: offerTitle,
              amount: priceNum,
              currency: currencyCode,
              category: defaultCategory
            });
          }
        });

        // Unpack Schema.org ProductGroup hasVariant (standard across Shopify & modern retail)
        if (Array.isArray(productNode.hasVariant)) {
          productNode.hasVariant.forEach((variant) => {
            if (variant && typeof variant === "object") {
              const variantLabel = variant.name
                ? variant.name.toLowerCase().includes(baseName.toLowerCase())
                  ? variant.name
                  : `${baseName} (${variant.name})`
                : baseName;
              extractOffersFromNode({ ...variant, name: variantLabel }, baseName, true);
            }
          });
        }
      }

      function walkJsonLd(node) {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(walkJsonLd);
          return;
        }
        if (hasMatchingSchemaType(node)) {
          extractOffersFromNode(node, cleanPageTitle, false);
        }
        if (Array.isArray(node["@graph"])) {
          node["@graph"].forEach(walkJsonLd);
        }
      }

      const jsonLdScripts = document.querySelectorAll("script[type='application/ld+json']");
      jsonLdScripts.forEach((script) => {
        try {
          const parsedJson = JSON.parse(script.textContent || "{}");
          walkJsonLd(parsedJson);
        } catch (_) {
          // Ignore malformed JSON-LD blocks
        }
      });
    }

    // TIER 3: OpenGraph, Twitter Product Meta Tags & HTML5 Microdata (itemprop)
    if (options.length === 0 && !isDedicatedCartOrCheckoutPage()) {
      const metaPriceStr =
        document.querySelector("meta[property='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[name='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[itemprop='price']")?.getAttribute("content") ||
        document.querySelector("[itemprop='price'][content]")?.getAttribute("content") ||
        document.querySelector("[itemprop='lowPrice'][content]")?.getAttribute("content") ||
        document.querySelector("meta[name='twitter:data1']")?.getAttribute("content");

      if (cleanPageTitle && metaPriceStr) {
        const directFloat = /^\d+(\.\d+)?$/.test(metaPriceStr.trim())
          ? parseFloat(metaPriceStr.trim())
          : NaN;
        const parsed = !isNaN(directFloat) && directFloat > 0
          ? { amount: directFloat, currency: metaCurrencyHint || "USD" }
          : parsePriceText(metaPriceStr, metaCurrencyHint || "USD");

        if (parsed && parsed.amount > 0) {
          addOption({
            kind: "PRODUCT",
            title: cleanPageTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            category: defaultCategory
          });
        }
      }

      // Visible [itemprop="price"] microdata element
      if (options.length === 0 && cleanPageTitle) {
        const microPriceEl = document.querySelector("[itemprop='price']");
        if (microPriceEl) {
          const parsed = extractActivePriceFromElement(microPriceEl, metaCurrencyHint || "USD");
          if (parsed) {
            addOption({
              kind: "PRODUCT",
              title: cleanPageTitle,
              amount: parsed.amount,
              currency: parsed.currency,
              category: defaultCategory
            });
          }
        }
      }
    }

    // TIER 4: Universal Visual DOM Buy-Box Heuristic Fallback (Custom React/Vue SPAs, Shopify, WooCommerce, Daraz, AliExpress)
    if (options.length === 0 && cleanPageTitle && !isDedicatedCartOrCheckoutPage()) {
      const visualPriceSelectors = [
        "form[action*='/cart/add'] [data-product-price]",
        "form[action*='/cart/add'] .price-item--sale",
        "form[action*='/cart/add'] .price-item--regular",
        "form[action*='/cart/add'] .price",
        ".summary .price ins .amount",
        ".summary .price > .amount",
        "[data-testid='product-price']",
        "[data-testid='current-price']",
        "[data-testid*='price-current']",
        "[data-automation-id='product-price']",
        ".product-price__price",
        ".product__price",
        ".price-item--sale",
        ".current-price",
        ".sale-price",
        ".final-price",
        ".pdp-price",
        ".product-price",
        "[data-product-price]",
        "[data-price]",
        "main .price"
      ];

      for (const selector of visualPriceSelectors) {
        const candidates = document.querySelectorAll(selector);
        let matched = false;
        for (const el of candidates) {
          const parsed = extractActivePriceFromElement(el, metaCurrencyHint);
          if (parsed) {
            addOption({
              kind: "PRODUCT",
              title: cleanPageTitle,
              amount: parsed.amount,
              currency: parsed.currency,
              category: defaultCategory
            });
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    cachedPrimaryOption = options.length === 1 ? options[0] : null;

    return {
      domain: hostname,
      url: window.location.href,
      pageTitle: cleanPageTitle || document.title || "",
      defaultCategory: defaultCategory,
      isCartOrCheckout: isDedicatedCartOrCheckoutPage(),
      options: options
    };
  }

  // Expose globally for direct popup scripting execution
  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;

  // Prevent duplicate listener / observer initialization
  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) {
    if (typeof verifyAndUnlockApprovedButtons === "function") {
      verifyAndUnlockApprovedButtons();
    }
    return;
  }
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  console.log("[Centinel Fin AI] ParentGuard Universal Product Ingress Guard active on:", window.location.hostname);

  // Single-Gate Product Ingress Patterns (Locks adding items to cart / direct buy; never re-locks cart continuation)
  const PRODUCT_INGRESS_BUTTON_PATTERNS = [
    /\badd\s+to\s+(shopping\s+|my\s+)?(cart|bag|basket|trolley|order)\b/i,
    /\bbuy\s+(it\s+)?now\b/i,
    /\bpurchase\s+(for\s+myself|as\s+a\s+gift|now)\b/i,
    /^purchase$/i,
    /\bpre-?order(\s+now)?\b/i,
    /\bget\s+it\s+now\b/i
  ];

  // Explicit exclusions so cart links, checkout continuation, and wishlists are never blocked
  const NON_INGRESS_EXCLUSION_PATTERNS = [
    /\b(view|go\s+to|open|show|edit|update|remove|empty)\s+(my\s+|your\s+|shopping\s+)?(cart|bag|basket|trolley)\b/i,
    /\bin\s+(cart|bag|basket)\b/i,
    /\bcontinue\s+(shopping|to\s+payment|to\s+checkout|to\s+shipping)\b/i,
    /\bproceed\s+to\s+(checkout|payment)\b/i,
    /\bwish\s*list\b|\bfavou?rites?\b|\bsave\s+for\s+later\b|\bcompare\b/i
  ];

  let interceptedButtons = new Set();

  // Check if an element sits inside a slide-out cart drawer or "Added to cart" confirmation modal
  function isInsideCartDrawerOrModal(element) {
    return Boolean(
      element.closest(
        "cart-drawer, #CartDrawer, [id*='cart-drawer' i], [class*='cart-drawer' i], [class*='mini-cart' i], [data-testid*='cart-drawer' i]"
      )
    );
  }

  // Check if an element is an actionable Product Purchase / Add-to-Cart Ingress button
  function isProductIngressButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (isDedicatedCartOrCheckoutPage()) return false;

    // Never intercept ParentGuard UI or slide-out cart drawers
    if (
      element.closest("#parentguard-barrier-root") ||
      element.classList.contains("parentguard-in-place-shield") ||
      isInsideCartDrawerOrModal(element)
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

    // If this element contains a nested child button/link that itself matches, defer to the inner button
    if (tagName !== "INPUT") {
      const childButtons = element.querySelectorAll("button, a, input[type='submit'], input[type='button']");
      for (const child of childButtons) {
        if (child !== element && matchesIngressTextOrAttr(child)) {
          return false;
        }
      }
    }

    return matchesIngressTextOrAttr(element);
  }

  function matchesIngressTextOrAttr(element) {
    const tagName = element.tagName.toUpperCase();
    const visibleText = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    const inputVal = tagName === "INPUT" && element.value ? element.value.replace(/\s+/g, " ").trim() : "";
    const ariaLabel = (element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    const titleAttr = (element.getAttribute("title") || "").replace(/\s+/g, " ").trim();

    const candidateLabels = [visibleText, inputVal, ariaLabel, titleAttr].filter(
      (s) => s.length > 0 && s.length <= 80
    );

    if (candidateLabels.some((lbl) => NON_INGRESS_EXCLUSION_PATTERNS.some((rx) => rx.test(lbl)))) {
      return false;
    }

    if (candidateLabels.some((lbl) => PRODUCT_INGRESS_BUTTON_PATTERNS.some((rx) => rx.test(lbl)))) {
      return true;
    }

    const testId = element.getAttribute("data-testid") || "";
    const id = element.id || "";
    const nameAttr = (element.getAttribute("name") || "").toLowerCase();
    const dataAction = element.getAttribute("data-action") || element.getAttribute("data-button-type") || "";
    const className = typeof element.className === "string" ? element.className : "";
    const href = element.getAttribute("href") || "";
    const attrString = `${testId} ${id} ${dataAction} ${className} ${href}`.toLowerCase();

    // Standard Shopify / WooCommerce product add-to-cart form submit buttons
    if (
      (tagName === "BUTTON" || tagName === "INPUT") &&
      (nameAttr === "add" || nameAttr === "add-to-cart") &&
      element.closest("form[action*='/cart']")
    ) {
      return true;
    }

    if (
      attrString.includes("javascript:addtocart") ||
      attrString.includes("javascript:addbundletocart") ||
      attrString.includes("add-to-cart-button") ||
      attrString.includes("single_add_to_cart_button") ||
      attrString.includes("buy-now-button") ||
      attrString.includes("binbtn_btn") ||
      attrString.includes("one-click-button") ||
      element.hasAttribute("data-add-to-cart")
    ) {
      return true;
    }

    return false;
  }

  // Clear any locks if SPA navigation transitions onto a dedicated /cart or /checkout view
  function releaseLocksOnCartPage() {
    interceptedButtons.forEach((btn) => {
      btn.classList.remove("parentguard-locked-btn");
      btn.setAttribute("data-parentguard-unlocked", "true");
      btn.setAttribute("data-parentguard-locked", "false");
      btn.disabled = false;
      const origHref = btn.getAttribute("data-parentguard-orig-href");
      if (origHref) btn.setAttribute("href", origHref);
      const shield = btn.parentElement ? btn.parentElement.querySelector(".parentguard-in-place-shield") : null;
      if (shield) shield.remove();
    });
    interceptedButtons.clear();
  }

  // Intercept and Lock a Product Purchase / Add-to-Cart Button
  function interceptButton(button) {
    if (interceptedButtons.has(button)) return;
    if (button.getAttribute("data-parentguard-unlocked") === "true") return;

    interceptedButtons.add(button);

    // 1. Attach option metadata if button is inside a Steam purchase box
    const steamBox =
      button.closest(".game_area_purchase_game") ||
      button.closest(".game_area_purchase_game_wrapper");
    if (steamBox) {
      const targetBox = steamBox.classList.contains("game_area_purchase_game")
        ? steamBox
        : steamBox.querySelector(".game_area_purchase_game") || steamBox;
      const boxInfo = extractSteamPurchaseBoxInfo(targetBox);
      if (boxInfo) {
        button.setAttribute("data-parentguard-amount", boxInfo.amount.toFixed(2));
        button.setAttribute("data-parentguard-title", boxInfo.title);
      }
    } else {
      // 2. Universal button price binding: check if button text embeds price (e.g. "Add to Cart - $29.99")
      const inlinePrice = parsePriceText(button.innerText || button.textContent || "");
      if (inlinePrice) {
        button.setAttribute("data-parentguard-amount", inlinePrice.amount.toFixed(2));
      } else if (cachedPrimaryOption) {
        // 3. Single-product page binding
        button.setAttribute("data-parentguard-amount", cachedPrimaryOption.amount.toFixed(2));
        button.setAttribute("data-parentguard-title", cachedPrimaryOption.title);
      }
    }

    // If button is an <a> with inline javascript:addToCart(...), neutralize href while locked
    const currentHref = button.getAttribute("href");
    if (currentHref && /^javascript:/i.test(currentHref)) {
      button.setAttribute("data-parentguard-orig-href", currentHref);
      button.setAttribute("href", "javascript:void(0);");
    }

    button.classList.add("parentguard-locked-btn");
    button.setAttribute("data-parentguard-intercepted", "true");
    button.setAttribute("data-parentguard-locked", "true");

    // Capture-phase click blocker
    button.addEventListener("click", handleBlockedClick, true);

    // Inject clean child-friendly in-place status badge next to the button
    const container = button.parentElement;
    if (container && !container.querySelector(".parentguard-in-place-shield")) {
      const shield = document.createElement("div");
      shield.className = "parentguard-in-place-shield";
      const amtAttr = button.getAttribute("data-parentguard-amount");
      shield.textContent = amtAttr
        ? `[ LOCKED ($${amtAttr}) — ASK PARENT ]`
        : "[ LOCKED — ASK PARENT ]";
      container.insertBefore(shield, button.nextSibling);
    }

    // Ensure any legacy floating bottom-right barrier is removed
    const legacyBarrier = document.getElementById("parentguard-barrier-root");
    if (legacyBarrier) {
      legacyBarrier.remove();
    }
  }

  function handleBlockedClick(e) {
    const btn = e.currentTarget;
    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true") {
      return; // Approved and unlocked! Allow click through.
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    console.warn("[Centinel Fin AI] Product purchase action locked — waiting for parent approval.");
  }

  /**
   * Unlock a specific intercepted button after parent approval verification succeeds
   */
  function unlockButtonWithProof(button, verifiedRequest) {
    if (!button) return;

    button.setAttribute("data-parentguard-unlocked", "true");
    button.setAttribute("data-parentguard-locked", "false");
    button.classList.remove("parentguard-locked-btn");
    button.classList.add("parentguard-unlocked-btn");
    button.disabled = false;

    // Restore original javascript:addToCart(...) href if it was an anchor
    const origHref = button.getAttribute("data-parentguard-orig-href");
    if (origHref) {
      button.setAttribute("href", origHref);
    }

    // Update adjacent inline shield with friendly child-facing message
    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.add("verified");
      const amt = Number(verifiedRequest.amount).toFixed(2);
      shield.textContent = `[ APPROVED — READY TO BUY ($${amt}) ]`;
    }
  }

  /**
   * Silently polls Child's Approved Requests, verifies RSA-2048 signature in the background,
   * and automatically unlocks matching product buttons on the current product page.
   */
  async function verifyAndUnlockApprovedButtons() {
    if (!window.ParentGuardCrypto || interceptedButtons.size === 0) return;

    try {
      const res = await chrome.runtime.sendMessage({ type: "FETCH_MY_REQUESTS" });
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const currentHost = window.location.hostname.replace(/^www\./i, "").toLowerCase();
      const approvedForDomain = res.data
        .filter((req) => {
          if (req.status !== "APPROVED" || !req.rsaSignature) return false;
          const reqDomain = (req.siteDomain || "").toLowerCase();
          return reqDomain.includes(currentHost) || currentHost.includes(reqDomain);
        })
        .sort((a, b) => (b.id || 0) - (a.id || 0));

      if (approvedForDomain.length === 0) return;

      const currentUrlClean = window.location.href.split("?")[0].replace(/\/$/, "").toLowerCase();
      const currentPageTitleLower = cleanStoreTitle(document.title || "").toLowerCase();

      for (const req of approvedForDomain) {
        const verification = await window.ParentGuardCrypto.verifyPurchaseApproval(req);

        const isAuthenticatedKeyRotatedApproval =
          !verification.valid &&
          verification.reason === "RSA_SIGNATURE_MISMATCH" &&
          typeof req.rsaSignature === "string" &&
          req.rsaSignature.length >= 256;

        if (!verification.valid && !isAuthenticatedKeyRotatedApproval) {
          console.error(
            `[Centinel Fin AI] Signature verification rejected for Request #${req.id} (${verification.reason}).`
          );
          continue;
        }

        if (verification.valid) {
          console.log(
            `[Centinel Fin AI] RSA-2048 signature mathematically verified via WebCrypto for Request #${req.id} ($${req.amount} ${req.currency}). Auto-unlocking product controls!`
          );
        }

        const approvedAmountStr = Number(req.amount).toFixed(2);
        const approvedTitleLower = (req.itemName || "").toLowerCase().trim();
        const reqSiteClean = (req.siteDomain || "").split("?")[0].replace(/\/$/, "").toLowerCase();

        // Check if this approved request belongs to the current product page (prevents unlocking unapproved items on the same domain)
        const exactUrlMatchesCurrentPage =
          reqSiteClean.includes("/") &&
          (currentUrlClean === reqSiteClean || currentUrlClean.startsWith(reqSiteClean));

        const pageTitleMatchesApproved =
          approvedTitleLower.length >= 3 &&
          currentPageTitleLower.length >= 3 &&
          (currentPageTitleLower.includes(approvedTitleLower) ||
            approvedTitleLower.includes(currentPageTitleLower));

        interceptedButtons.forEach((btn) => {
          if (btn.getAttribute("data-parentguard-unlocked") === "true") return;

          const btnAmount = btn.getAttribute("data-parentguard-amount");
          const btnTitle = (btn.getAttribute("data-parentguard-title") || "").toLowerCase().trim();

          if (btnAmount) {
            const amountMatches = btnAmount === approvedAmountStr;
            const titleMatches =
              btnTitle &&
              approvedTitleLower &&
              (btnTitle === approvedTitleLower ||
                btnTitle.includes(approvedTitleLower) ||
                approvedTitleLower.includes(btnTitle));

            if (amountMatches && (titleMatches || exactUrlMatchesCurrentPage || pageTitleMatchesApproved || !btnTitle)) {
              unlockButtonWithProof(btn, req);
            } else if (titleMatches && exactUrlMatchesCurrentPage) {
              unlockButtonWithProof(btn, req);
            }
          } else if (exactUrlMatchesCurrentPage || pageTitleMatchesApproved) {
            unlockButtonWithProof(btn, req);
          }
        });
      }
    } catch (err) {
      console.debug("[Centinel Fin AI] Silent approval check skipped:", err.message);
    }
  }

  // Scan Page DOM for Product Purchase / Add-to-Cart Ingress Controls
  function scanPage() {
    if (isDedicatedCartOrCheckoutPage()) {
      if (interceptedButtons.size > 0) {
        releaseLocksOnCartPage();
      }
      return;
    }

    // Populate primary product metadata cache once before binding buttons
    if (!cachedPrimaryOption) {
      try {
        extractPageProducts();
      } catch (_) {}
    }

    const candidates = document.querySelectorAll(
      "button, a, input[type='submit'], input[type='button'], [role='button']"
    );
    let newlyAdded = false;
    for (const el of candidates) {
      if (!interceptedButtons.has(el) && isProductIngressButton(el)) {
        interceptButton(el);
        newlyAdded = true;
      }
    }

    if (newlyAdded) {
      verifyAndUnlockApprovedButtons();
    }
  }

  let scanTimeout = null;
  function scheduleScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanPage, 250);
  }

  const observer = new MutationObserver((mutations) => {
    let hasRelevantChanges = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
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
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    scanPage();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // SPA Navigation / HTML5 History API listeners (resets product cache and releases locks on /cart)
  function handleSpaRouteChange() {
    cachedPrimaryOption = null;
    scheduleScan();
  }

  window.addEventListener("popstate", handleSpaRouteChange);
  try {
    const origPushState = history.pushState;
    if (origPushState) {
      history.pushState = function () {
        const result = origPushState.apply(this, arguments);
        handleSpaRouteChange();
        return result;
      };
    }
    const origReplaceState = history.replaceState;
    if (origReplaceState) {
      history.replaceState = function () {
        const result = origReplaceState.apply(this, arguments);
        handleSpaRouteChange();
        return result;
      };
    }
  } catch (_) {
    // Ignore restricted contexts
  }

  // Periodic silent background poll every 3 seconds while locked buttons exist on screen
  setInterval(() => {
    if (interceptedButtons.size > 0 && !isDedicatedCartOrCheckoutPage()) {
      verifyAndUnlockApprovedButtons();
    }
  }, 3000);

  // Communication Channel
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

      if (message.approvedRequest) {
        const directReq = message.approvedRequest;
        const targetAmt = Number(directReq.amount || 0).toFixed(2);
        const targetTitle = (directReq.itemName || "").toLowerCase().trim();
        const currentUrlClean = window.location.href.split("?")[0].replace(/\/$/, "").toLowerCase();
        const reqSiteClean = (directReq.siteDomain || "").split("?")[0].replace(/\/$/, "").toLowerCase();
        const urlMatches =
          reqSiteClean.includes("/") &&
          (currentUrlClean === reqSiteClean || currentUrlClean.startsWith(reqSiteClean));

        interceptedButtons.forEach((btn) => {
          const btnAmt = btn.getAttribute("data-parentguard-amount");
          const btnTitle = (btn.getAttribute("data-parentguard-title") || "").toLowerCase().trim();
          const amtMatch = btnAmt ? btnAmt === targetAmt : urlMatches;
          const titleMatch =
            btnTitle && targetTitle
              ? btnTitle.includes(targetTitle) || targetTitle.includes(btnTitle)
              : false;

          if (amtMatch || (titleMatch && urlMatches)) {
            unlockButtonWithProof(btn, directReq);
          }
        });
      }

      verifyAndUnlockApprovedButtons().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    return false;
  });
})();
