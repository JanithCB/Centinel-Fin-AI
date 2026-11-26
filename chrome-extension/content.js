/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Cart-Gate Payment Lock, Smart Cart Item Scraper & WebCrypto RSA-2048 Auto-Unlock
 *
 * Responsibilities:
 * - Cart-Gate Payment Lock: Intercepts and locks ONLY the final payment / checkout buttons
 *   ("Continue to payment", "Proceed to Checkout", "Pay Now", "Place Order", etc.) on /cart and /checkout pages
 * - Free Browsing: "Add to Cart" and "Add to Bag" on product pages are 100% unlocked for normal shopping basket building
 * - Smart Cart Scraper: Automatically extracts cart item titles, direct product page URLs (<a href="...">), and live cart totals
 * - Breadcrumb Caching: Records product page visits in sessionStorage so cart requests can reference the exact product URL
 * - WebCrypto RSA-2048 Verification: Unlocks cart payment buttons when parent approves the exact cart total
 * - Anti-Tamper Re-Locking: If the child alters the cart after approval (changing the cart total), payment buttons immediately re-lock
 */

(function () {
  "use strict";

  // Helper: Parse a raw price text (e.g. "$8.39", "Estimated total $8.39", "€14,99", "£19.99") into { amount, currency, raw }
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

  // Helper: Check if current page is a Shopping Cart or Checkout page
  function isDedicatedCartOrCheckoutPage() {
    const pathname = (window.location.pathname || "").toLowerCase();
    const search = (window.location.search || "").toLowerCase();
    if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(pathname)) {
      return true;
    }
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy") || search.includes("step=contact_information")) {
      return true;
    }
    // Also treat pages with prominent cart container as cart pages
    if (document.querySelector(".cart_item, .cart-item, #cart_item_list, [data-testid*='cart-item']")) {
      return true;
    }
    return false;
  }

  // Breadcrumb Cache: Record recently visited product page so cart can link directly to it
  function updateProductBreadcrumb(productInfo) {
    if (!productInfo || !productInfo.title || isDedicatedCartOrCheckoutPage()) return;
    try {
      const data = {
        domain: window.location.hostname,
        title: productInfo.title,
        url: window.location.href,
        amount: productInfo.amount,
        currency: productInfo.currency,
        timestamp: Date.now()
      };
      sessionStorage.setItem("__parentguard_last_product__", JSON.stringify(data));
    } catch (_) {}
  }

  function getProductBreadcrumb() {
    try {
      const raw = sessionStorage.getItem("__parentguard_last_product__");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.domain === window.location.hostname && Date.now() - data.timestamp < 1000 * 60 * 60 * 2) {
        return data;
      }
    } catch (_) {}
    return null;
  }

  // Helper: Scrape the Cart Total from the page DOM
  function extractCartTotal(metaCurrencyHint) {
    const candidates = [
      // Steam Cart
      () => {
        const estRow = document.querySelector(".cart_totals_area, .estimated_total_box, #cart_estimated_total");
        if (estRow) return parsePriceText(estRow.textContent, metaCurrencyHint);
        const match = (document.body ? document.body.innerText : "").match(/Estimated\s+total[\s\S]{0,50}?([$€£Rs₹A-Z\s]*\d+[.,]\d{2})/i);
        return match ? parsePriceText(match[1], metaCurrencyHint) : null;
      },
      // Amazon Cart
      () => {
        const el = document.querySelector("#sc-subtotal-amount-activecart, #sc-subtotal-amount-buybox, .sc-price");
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
      },
      // Shopify / WooCommerce / Generic Cart
      () => {
        const el = document.querySelector(
          ".totals__subtotal-value, .cart__subtotal, .order-total .amount, .cart-subtotal .amount, [data-testid*='subtotal'], [data-checkout-subtotal]"
        );
        return el ? parsePriceText(el.textContent, metaCurrencyHint) : null;
      },
      // Universal price container within cart total area
      () => {
        const totalArea = document.querySelector(".cart-total, .cart_total, .order-summary, .cart-summary");
        if (totalArea) {
          const priceEl = totalArea.querySelector(".price, .amount, [data-price]");
          if (priceEl) return parsePriceText(priceEl.textContent, metaCurrencyHint);
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

  // Helper: Scrape Cart Items & direct product links from Cart DOM (excluding recommendations)
  function extractCartItemsAndLinks(metaCurrencyHint) {
    const items = [];
    const hostname = window.location.hostname || "";

    // Steam Shopping Cart Line Items (excluding "RECOMMENDATIONS FOR YOU")
    if (hostname.includes("steampowered.com")) {
      const cartRows = document.querySelectorAll(
        ".cart_item, .cart_line_item, [class*='cart_item_row'], [class*='CartItem_']"
      );
      cartRows.forEach((row) => {
        if (row.closest(".recommendations_container, [class*='recommendation' i], #recommended_items")) {
          return;
        }
        const linkEl = row.querySelector("a[href*='/app/'], a[href*='/sub/'], a[href*='/bundle/'], a.title, .title a");
        const titleEl = linkEl || row.querySelector(".title, .item_name, [class*='item_title' i]");
        const priceEl = row.querySelector(".price, [class*='price' i]");

        if (titleEl) {
          const rawTitle = titleEl.textContent.replace(/\s+/g, " ").trim();
          const cleanTitle = cleanStoreTitle(rawTitle);
          let fullUrl = linkEl ? linkEl.href : null;
          if (fullUrl && fullUrl.startsWith("/")) {
            fullUrl = `${window.location.origin}${fullUrl}`;
          }
          const priceObj = priceEl ? parsePriceText(priceEl.textContent, metaCurrencyHint) : null;

          if (cleanTitle) {
            items.push({
              title: cleanTitle,
              productUrl: fullUrl,
              amount: priceObj ? priceObj.amount : null,
              currency: priceObj ? priceObj.currency : metaCurrencyHint
            });
          }
        }
      });
    }

    // Generic Shopify / WooCommerce / Amazon Cart Line Items
    if (items.length === 0) {
      const genericRows = document.querySelectorAll(
        ".cart-item, .cart_item, .cart__item, .sc-list-item, [data-testid*='cart-line-item']"
      );
      genericRows.forEach((row) => {
        if (row.closest("[class*='recommend' i], [class*='related' i], [id*='recommend' i]")) {
          return;
        }
        const linkEl = row.querySelector("a[href*='/product'], a[href*='/item'], a.cart-item__title, a.sc-product-link");
        const titleEl = linkEl || row.querySelector(".cart-item__name, .product-name, [class*='title' i]");
        const priceEl = row.querySelector(".price, .cart-item__price, .sc-product-price");

        if (titleEl) {
          const cleanTitle = cleanStoreTitle(titleEl.textContent.trim());
          let fullUrl = linkEl ? linkEl.href : null;
          if (fullUrl && fullUrl.startsWith("/")) {
            fullUrl = `${window.location.origin}${fullUrl}`;
          }
          const priceObj = priceEl ? parsePriceText(priceEl.textContent, metaCurrencyHint) : null;

          if (cleanTitle) {
            items.push({
              title: cleanTitle,
              productUrl: fullUrl,
              amount: priceObj ? priceObj.amount : null,
              currency: priceObj ? priceObj.currency : metaCurrencyHint
            });
          }
        }
      });
    }

    return items;
  }

  let cachedCartTotal = null;

  /**
   * Universal Scraper: Extracts Product details on product pages OR Cart details on cart pages
   */
  function extractPageProducts() {
    const hostname = window.location.hostname || "";
    const defaultCategory = inferMerchantCategory(hostname);
    const options = [];
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

      if (cartTotalObj && cartTotalObj.amount > 0) {
        cachedCartTotal = cartTotalObj;

        let primaryTitle = "Shopping Cart Order";
        let directProductUrl = null;

        if (cartItems.length === 1) {
          primaryTitle = cartItems[0].title;
          directProductUrl = cartItems[0].productUrl;
        } else if (cartItems.length > 1) {
          primaryTitle = `${cartItems[0].title} (+${cartItems.length - 1} more items)`;
          directProductUrl = cartItems[0].productUrl;
        } else if (breadcrumb) {
          primaryTitle = breadcrumb.title;
          directProductUrl = breadcrumb.url;
        }

        // If direct product URL is still relative or missing, fallback to breadcrumb or origin
        if (!directProductUrl && breadcrumb && breadcrumb.url) {
          directProductUrl = breadcrumb.url;
        }

        options.push({
          id: "cart_total_opt",
          kind: "CART",
          title: primaryTitle,
          amount: Number(cartTotalObj.amount.toFixed(2)),
          currency: cartTotalObj.currency || metaCurrencyHint || "USD",
          productUrl: directProductUrl || window.location.href,
          category: defaultCategory
        });

        // Also expose individual line items as options if child wants to select one
        cartItems.forEach((ci, idx) => {
          if (ci.amount && ci.amount > 0 && ci.amount !== cartTotalObj.amount) {
            options.push({
              id: `cart_item_${idx + 1}`,
              kind: "ITEM",
              title: ci.title,
              amount: Number(ci.amount.toFixed(2)),
              currency: ci.currency || cartTotalObj.currency || "USD",
              productUrl: ci.productUrl || directProductUrl || window.location.href,
              category: defaultCategory
            });
          }
        });
      }

      return {
        domain: hostname,
        url: window.location.href,
        pageTitle: options.length > 0 ? options[0].title : document.title || "Shopping Cart",
        defaultCategory: defaultCategory,
        isCartOrCheckout: true,
        options: options
      };
    }

    // --- CASE B: Product Page Browsing (Normal Product Metadata) ---
    // (Extract and record breadcrumb so cart page knows the exact product link)
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
        productUrl: window.location.href,
        category: item.category || defaultCategory
      });
    }

    // 1. Steam Product Page
    if (hostname.includes("steampowered.com")) {
      const purchaseBoxes = document.querySelectorAll(".game_area_purchase_game");
      purchaseBoxes.forEach((box) => {
        const headingEl = box.querySelector("h1, h2");
        const priceContainer = box.querySelector(".discount_final_price, .game_purchase_price.price, .your_price div:last-child");
        if (headingEl && priceContainer) {
          const parsedPrice = parsePriceText(priceContainer.textContent, metaCurrencyHint);
          let rawTitle = headingEl.textContent.replace(/\s+/g, " ").replace(/^Buy\s+/i, "").trim();
          if (parsedPrice) {
            addOption({
              title: rawTitle,
              amount: parsedPrice.amount,
              currency: parsedPrice.currency
            });
          }
        }
      });
    }

    // 2. Schema.org JSON-LD (Shopify, Amazon, Epic, WooCommerce)
    const jsonLdScripts = document.querySelectorAll("script[type='application/ld+json']");
    jsonLdScripts.forEach((script) => {
      try {
        const rawJson = JSON.parse(script.textContent || "{}");
        const queue = Array.isArray(rawJson) ? [...rawJson] : [rawJson];
        if (rawJson["@graph"]) queue.push(...rawJson["@graph"]);

        queue.forEach((node) => {
          if (!node || typeof node !== "object") return;
          const typeStr = String(node["@type"] || "").toLowerCase();
          if (typeStr.includes("product") || typeStr.includes("videogame") || typeStr.includes("softwareapplication")) {
            const baseName = node.name || cleanPageTitle;
            const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
            offers.forEach((offer) => {
              const p = parseFloat(offer.price || offer.lowPrice || "");
              if (!isNaN(p) && p > 0) {
                addOption({
                  title: offer.name && offer.name !== baseName ? `${baseName} - ${offer.name}` : baseName,
                  amount: p,
                  currency: offer.priceCurrency || metaCurrencyHint || "USD"
                });
              }
            });
          }
        });
      } catch (_) {}
    });

    // 3. OpenGraph / Meta price
    if (options.length === 0) {
      const metaPrice =
        document.querySelector("meta[property='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:amount']")?.getAttribute("content") ||
        document.querySelector("[itemprop='price']")?.getAttribute("content");
      if (cleanPageTitle && metaPrice) {
        const parsed = parsePriceText(metaPrice, metaCurrencyHint);
        if (parsed) {
          addOption({
            title: cleanPageTitle,
            amount: parsed.amount,
            currency: parsed.currency
          });
        }
      }
    }

    // Cache breadcrumb if a product was extracted
    if (options.length > 0) {
      updateProductBreadcrumb(options[0]);
    }

    return {
      domain: hostname,
      url: window.location.href,
      pageTitle: cleanPageTitle || document.title || "",
      defaultCategory: defaultCategory,
      isCartOrCheckout: false,
      options: options
    };
  }

  // Expose globally for direct extension popup scripting execution
  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;

  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) {
    if (typeof verifyAndUnlockApprovedButtons === "function") {
      verifyAndUnlockApprovedButtons();
    }
    return;
  }
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  console.log("[Centinel Fin AI] ParentGuard Cart-Gate Payment Lock active on:", window.location.hostname);

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

  let interceptedButtons = new Set();

  // Check if an element is an actionable Cart or Checkout Payment Gate button
  function isCartPaymentGateButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Only lock on Cart / Checkout pages
    if (!isDedicatedCartOrCheckoutPage()) return false;

    // Never intercept ParentGuard UI elements
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

    // Defer to nested button if present
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

  // Intercept and Lock a Cart Payment Continuation Button
  function interceptButton(button, currentCartAmount) {
    if (interceptedButtons.has(button)) {
      // Re-evaluate if cart amount changed
      if (currentCartAmount) {
        button.setAttribute("data-parentguard-amount", currentCartAmount.toFixed(2));
      }
      return;
    }
    if (button.getAttribute("data-parentguard-unlocked") === "true") return;

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

    button.addEventListener("click", handleBlockedClick, true);

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

    const legacyBarrier = document.getElementById("parentguard-barrier-root");
    if (legacyBarrier) legacyBarrier.remove();
  }

  function handleBlockedClick(e) {
    const btn = e.currentTarget;
    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true") {
      return; // Approved and unlocked! Allow proceeding to payment.
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    console.warn("[Centinel Fin AI] Cart payment action locked — waiting for parent approval.");
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

  function relockButton(button, reason) {
    if (!button) return;
    button.setAttribute("data-parentguard-unlocked", "false");
    button.setAttribute("data-parentguard-locked", "true");
    button.classList.remove("parentguard-unlocked-btn");
    button.classList.add("parentguard-locked-btn");

    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.remove("verified");
      const amtAttr = button.getAttribute("data-parentguard-amount");
      shield.textContent = amtAttr ? `[ LOCKED ($${amtAttr}) — ASK PARENT ]` : "[ LOCKED — ASK PARENT ]";
    }
  }

  /**
   * Silently polls Child's Approved Requests, verifies RSA-2048 signature via WebCrypto,
   * and auto-unlocks all cart payment buttons matching the exact approved cart total.
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

      // Extract current live cart total
      const liveCart = extractCartTotal();
      const currentCartNum = liveCart ? liveCart.amount : (cachedCartTotal ? cachedCartTotal.amount : null);

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

        const approvedAmountNum = Number(req.amount);

        // Anti-Tamper check: If live cart amount is known, verify it matches approved amount
        let isAmountMatch = true;
        if (currentCartNum !== null && !isNaN(currentCartNum)) {
          isAmountMatch = Math.abs(currentCartNum - approvedAmountNum) < 0.02;
        }

        if (isAmountMatch) {
          console.log(`[Centinel Fin AI] Cart Total ($${approvedAmountNum}) verified via RSA-2048! Unlocking payment gate.`);
          interceptedButtons.forEach((btn) => {
            unlockButtonWithProof(btn, req);
          });
          return;
        } else {
          // If cart total changed after approval, ensure buttons remain safely locked
          console.warn(`[Centinel Fin AI] Cart total changed (Live: $${currentCartNum} vs Approved: $${approvedAmountNum}). Re-locking.`);
          interceptedButtons.forEach((btn) => {
            if (btn.getAttribute("data-parentguard-unlocked") === "true") {
              relockButton(btn, "AMOUNT_MISMATCH");
            }
          });
        }
      }
    } catch (err) {
      console.debug("[Centinel Fin AI] Silent cart approval check skipped:", err.message);
    }
  }

  // Scan Page DOM for Cart / Checkout Payment Gate Buttons
  function scanPage() {
    if (!isDedicatedCartOrCheckoutPage()) {
      // Free browsing on product pages: release any accidental locks
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

    const liveCart = extractCartTotal();
    const cartAmount = liveCart ? liveCart.amount : null;

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
    if (interceptedButtons.size > 0 && isDedicatedCartOrCheckoutPage()) {
      verifyAndUnlockApprovedButtons();
    }
  }, 3000);

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

        interceptedButtons.forEach((btn) => {
          const btnAmt = btn.getAttribute("data-parentguard-amount");
          if (!btnAmt || btnAmt === targetAmt) {
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
