/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Checkout Detection, DOM Overlay Lock & Multi-Option Product Scraper
 *
 * Responsibilities:
 * - Detects checkout pages via URL patterns and DOM heuristics
 * - Extracts all available purchase options, editions, and bundles (with prices & discounts)
 * - Intercepts "Pay Now", "Place Order", and checkout action buttons
 * - Injects the Neo-Brutalist [ PARENTGUARD: APPROVAL REQUIRED ] barrier
 * - Observes DOM mutations for dynamically rendered SPAs (e.g. Steam, Roblox, Amazon)
 * - Supports cryptographic unlock via runtime messages
 */

(function () {
  "use strict";

  // Helper: Parse a raw price text (e.g. "$8.99 USD", "€14,99", "£19.99") into { amount, currency, formatted }
  function parsePriceText(rawText) {
    if (!rawText || typeof rawText !== "string") return null;
    const text = rawText.replace(/\s+/g, " ").trim();

    if (/free/i.test(text) && !/\d/.test(text)) {
      return null;
    }

    let currency = "USD";
    if (/\bEUR\b|€/i.test(text)) currency = "EUR";
    else if (/\bGBP\b|£/i.test(text)) currency = "GBP";
    else if (/\bCAD\b|CDN\$/i.test(text)) currency = "CAD";
    else if (/\bAUD\b|A\$/i.test(text)) currency = "AUD";
    else if (/\bJPY\b|¥/i.test(text)) currency = "JPY";
    else if (/\bINR\b|₹/i.test(text)) currency = "INR";
    else if (/\bBRL\b|R\$/i.test(text)) currency = "BRL";
    else if (/\bNZD\b|NZ\$/i.test(text)) currency = "NZD";
    else if (/\bCHF\b/i.test(text)) currency = "CHF";
    else if (/\bPLN\b|zł/i.test(text)) currency = "PLN";
    else if (/\bSEK\b|\bkr\b/i.test(text)) currency = "SEK";
    else if (/\bUSD\b|\$/i.test(text)) currency = "USD";

    // Match decimal price like 8.99 or 12,99
    const priceMatch = text.match(/(\d{1,5}(?:[.,]\d{2}))/);
    if (!priceMatch) return null;

    const normalizedNum = parseFloat(priceMatch[1].replace(",", "."));
    if (isNaN(normalizedNum) || normalizedNum <= 0) return null;

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
      h.includes("itch.io")
    ) {
      return "GAMING";
    }
    if (
      h.includes("netflix") ||
      h.includes("spotify") ||
      h.includes("twitch") ||
      h.includes("youtube") ||
      h.includes("disney")
    ) {
      return "ENTERTAINMENT";
    }
    if (
      h.includes("udemy") ||
      h.includes("coursera") ||
      h.includes("edx") ||
      h.includes("khanacademy")
    ) {
      return "EDUCATION";
    }
    return "SHOPPING";
  }

  /**
   * Multi-Tier DOM Product, Edition & Bundle Extractor
   * Extracts all buyable options and their exact live prices from the active page.
   */
  function extractPageProducts() {
    const hostname = window.location.hostname || "";
    const options = [];
    const seenKeys = new Set();

    function addOption(item) {
      if (!item || !item.title || typeof item.amount !== "number" || isNaN(item.amount) || item.amount <= 0) {
        return;
      }
      const cleanTitle = item.title.replace(/\s+/g, " ").trim();
      if (!cleanTitle) return;

      const dedupeKey = `${cleanTitle.toLowerCase()}|${item.amount.toFixed(2)}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);

      options.push({
        id: `opt_${options.length + 1}`,
        kind: item.kind || "PRODUCT",
        title: cleanTitle,
        amount: Number(item.amount.toFixed(2)),
        currency: item.currency || "USD",
        discountPct: item.discountPct || null,
        originalPrice: item.originalPrice || null,
        category: item.category || inferMerchantCategory(hostname)
      });
    }

    // TIER 0: Explicit ParentGuard Annotated Options (Demo Store & Partner Sites)
    const annotatedNodes = document.querySelectorAll("[data-parentguard-option]");
    annotatedNodes.forEach((node) => {
      const title = node.getAttribute("data-title") || node.getAttribute("data-parentguard-option");
      const priceVal = parseFloat(node.getAttribute("data-price") || "");
      const currency = node.getAttribute("data-currency") || "USD";
      const kind = node.getAttribute("data-kind") || "GAME";
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
          category: node.getAttribute("data-category") || inferMerchantCategory(hostname)
        });
      }
    });

    // TIER 1: Steam Store & Bundle Scraper (store.steampowered.com)
    if (hostname.includes("steampowered.com")) {
      const purchaseBoxes = document.querySelectorAll(".game_area_purchase_game");
      purchaseBoxes.forEach((box) => {
        const headingEl = box.querySelector("h1, h2");
        if (!headingEl) return;

        // Clone heading to strip noisy sub-nodes like (?) tooltip or promotion countdown
        const clonedHeading = headingEl.cloneNode(true);
        clonedHeading.querySelectorAll(".bundle_label, p, .game_purchase_discount_countdown").forEach((n) => n.remove());

        let rawTitle = (clonedHeading.textContent || "").replace(/\s+/g, " ").trim();
        // Remove leading "Buy " prefix
        rawTitle = rawTitle.replace(/^Buy\s+/i, "").trim();
        // Remove trailing "(?)" if still present
        rawTitle = rawTitle.replace(/\(\?\)\s*$/, "").trim();

        // Skip free demos
        if (/^Download\s+.*\s+Demo$/i.test(rawTitle)) return;

        // Determine if Bundle, DLC, or Base Game
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

        // Extract final price inside this purchase box
        let priceContainer =
          box.querySelector(".discount_final_price") ||
          box.querySelector(".game_purchase_price.price") ||
          box.querySelector(".your_price div:last-child") ||
          box.querySelector(".game_area_purchase_game_dropdown_selection");

        let parsedPrice = priceContainer ? parsePriceText(priceContainer.textContent) : null;

        // Fallback: scan action bar inside box for any currency pattern
        if (!parsedPrice) {
          const actionBg = box.querySelector(".game_purchase_action_bg, .game_purchase_action");
          if (actionBg) {
            parsedPrice = parsePriceText(actionBg.textContent);
          }
        }

        if (!parsedPrice) return;

        const discountEl = box.querySelector(".discount_pct");
        const originalEl = box.querySelector(".discount_original_price");

        const discountPct = discountEl ? discountEl.textContent.trim() : null;
        const originalPrice = originalEl ? originalEl.textContent.trim() : null;

        addOption({
          kind,
          title: rawTitle,
          amount: parsedPrice.amount,
          currency: parsedPrice.currency,
          discountPct,
          originalPrice,
          category: "GAMING"
        });
      });
    }

    // TIER 2: Amazon Product & Edition Twister Scraper
    if (hostname.includes("amazon.")) {
      const mainTitleEl = document.getElementById("productTitle");
      const mainTitle = mainTitleEl ? mainTitleEl.textContent.replace(/\s+/g, " ").trim() : "";

      // Check main buybox price
      const mainPriceEl =
        document.querySelector("#corePrice_feature_div .a-price .a-offscreen") ||
        document.querySelector("#corePriceDisplay_desktop_feature_div .a-price .a-offscreen") ||
        document.querySelector(".a-price .a-offscreen") ||
        document.getElementById("priceblock_ourprice");

      if (mainTitle && mainPriceEl) {
        const parsed = parsePriceText(mainPriceEl.textContent);
        if (parsed) {
          addOption({
            kind: "PRODUCT",
            title: mainTitle,
            amount: parsed.amount,
            currency: parsed.currency,
            category: "SHOPPING"
          });
        }
      }

      // Check edition/variant swatches if present
      const swatches = document.querySelectorAll("#twister li, .swatchElement");
      swatches.forEach((swatch) => {
        const text = (swatch.textContent || "").replace(/\s+/g, " ").trim();
        const parsed = parsePriceText(text);
        if (parsed && mainTitle) {
          const lines = text.split(" ").filter(Boolean);
          const editionName = lines.slice(0, 3).join(" ");
          addOption({
            kind: "OPTION",
            title: `${mainTitle} (${editionName})`,
            amount: parsed.amount,
            currency: parsed.currency,
            category: "SHOPPING"
          });
        }
      });
    }

    // TIER 3: Schema.org JSON-LD & OpenGraph Product Metadata
    const jsonLdScripts = document.querySelectorAll("script[type='application/ld+json']");
    jsonLdScripts.forEach((script) => {
      try {
        const rawJson = JSON.parse(script.textContent || "{}");
        const nodes = Array.isArray(rawJson)
          ? rawJson
          : rawJson["@graph"] && Array.isArray(rawJson["@graph"])
          ? rawJson["@graph"]
          : [rawJson];

        nodes.forEach((node) => {
          if (!node || !node["@type"]) return;
          const isProduct =
            node["@type"] === "Product" ||
            node["@type"] === "VideoGame" ||
            node["@type"] === "SoftwareApplication";
          if (!isProduct) return;

          const baseName = node.name || document.title;
          const offers = Array.isArray(node.offers)
            ? node.offers
            : node.offers
            ? [node.offers]
            : [];

          offers.forEach((offer) => {
            const priceNum = parseFloat(offer.price || offer.lowPrice || "");
            if (!isNaN(priceNum) && priceNum > 0) {
              addOption({
                kind: offers.length > 1 ? "OPTION" : "PRODUCT",
                title: offer.name ? `${baseName} - ${offer.name}` : baseName,
                amount: priceNum,
                currency: (offer.priceCurrency || "USD").toUpperCase(),
                category: inferMerchantCategory(hostname)
              });
            }
          });
        });
      } catch (_) {
        // Ignore malformed JSON-LD blocks on third-party sites
      }
    });

    // OpenGraph fallback if no options found yet
    if (options.length === 0) {
      const ogTitle = document.querySelector("meta[property='og:title']")?.getAttribute("content");
      const ogPrice =
        document.querySelector("meta[property='product:price:amount']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:amount']")?.getAttribute("content");
      const ogCurrency =
        document.querySelector("meta[property='product:price:currency']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:price:currency']")?.getAttribute("content") ||
        "USD";

      if (ogTitle && ogPrice) {
        const priceNum = parseFloat(ogPrice);
        if (!isNaN(priceNum) && priceNum > 0) {
          addOption({
            kind: "PRODUCT",
            title: ogTitle,
            amount: priceNum,
            currency: ogCurrency.toUpperCase(),
            category: inferMerchantCategory(hostname)
          });
        }
      }
    }

    // Clean page title fallback
    let cleanPageTitle = (document.title || "")
      .replace(/^Save\s+\d+%\s+on\s+/i, "")
      .replace(/\s+on\s+Steam$/i, "")
      .replace(/\s+-\s+Steam$/i, "")
      .replace(/\s+\|\s+Roblox$/i, "")
      .replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, "")
      .trim();

    const apphubTitle = document.querySelector(".apphub_AppName");
    if (apphubTitle && apphubTitle.textContent.trim()) {
      cleanPageTitle = apphubTitle.textContent.trim();
    }

    return {
      domain: hostname,
      url: window.location.href,
      pageTitle: cleanPageTitle || document.title || "",
      defaultCategory: inferMerchantCategory(hostname),
      options: options
    };
  }

  // Expose globally so chrome.scripting.executeScript can also invoke it directly
  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;

  // Prevent duplicate content script initialization
  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) return;
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  console.log("[Centinel Fin AI] ParentGuard content script active on:", window.location.hostname);

  // Configuration & Heuristics
  const CHECKOUT_URL_PATTERNS = [
    /checkout/i,
    /cart/i,
    /billing/i,
    /\/pay/i,
    /purchase/i,
    /order/i,
    /demo-checkout/i
  ];

  const PAYMENT_BUTTON_TEXT_PATTERNS = [
    /pay\s*now/i,
    /place\s*order/i,
    /complete\s*purchase/i,
    /proceed\s*to\s*checkout/i,
    /buy\s*now/i,
    /submit\s*order/i,
    /continue\s*to\s*payment/i,
    /authorise\s*payment/i,
    /authorize\s*payment/i,
    /confirm\s*(and\s*)?pay/i
  ];

  let interceptedButtons = new Set();
  let isLocked = true;

  // 1. URL Checkout Detection
  function isCheckoutUrl() {
    const currentUrl = window.location.href;
    return CHECKOUT_URL_PATTERNS.some(pattern => pattern.test(currentUrl));
  }

  // 2. Button Identification Heuristic
  function isPaymentButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toUpperCase();
    if (tagName !== "BUTTON" && tagName !== "A" && tagName !== "INPUT") return false;

    // Check inner text
    const text = (element.innerText || element.textContent || "").trim();
    if (PAYMENT_BUTTON_TEXT_PATTERNS.some(regex => regex.test(text))) {
      return true;
    }

    // Check input value (e.g. <input type="submit" value="Pay Now">)
    if (tagName === "INPUT" && element.value) {
      if (PAYMENT_BUTTON_TEXT_PATTERNS.some(regex => regex.test(element.value))) {
        return true;
      }
    }

    // Check common checkout attributes
    const testId = element.getAttribute("data-testid") || "";
    const id = element.id || "";
    const className = element.className || "";
    const attrString = `${testId} ${id} ${className}`.toLowerCase();

    if (attrString.includes("pay-button") || attrString.includes("checkout-submit") || attrString.includes("place-order")) {
      return true;
    }

    return false;
  }

  // 3. Intercept & Lock Payment Buttons
  function interceptButton(button) {
    if (interceptedButtons.has(button)) return;
    interceptedButtons.add(button);

    console.log("[Centinel Fin AI] Intercepting checkout payment button:", button);

    // Apply locked visual styles
    button.classList.add("parentguard-locked-btn");
    button.setAttribute("data-parentguard-intercepted", "true");

    // Intercept click events in the capture phase (before host page handlers)
    button.addEventListener("click", handleBlockedClick, true);

    // Inject in-place inline badge if parent container permits
    if (button.parentElement && !button.parentElement.querySelector(".parentguard-in-place-shield")) {
      const shield = document.createElement("div");
      shield.className = "parentguard-in-place-shield";
      shield.textContent = "[ PARENTGUARD: APPROVAL REQUIRED ]";
      button.parentElement.insertBefore(shield, button.nextSibling);
    }

    // Ensure the floating barrier card is rendered on the page
    injectFloatingBarrier(button);
  }

  function handleBlockedClick(e) {
    if (!isLocked) return; // Allow click if cryptographically unlocked

    e.preventDefault();
    e.stopImmediatePropagation();
    console.warn("[Centinel Fin AI] Payment click blocked — Parent approval required!");

    highlightFloatingBarrier();
  }

  // 4. Inject Floating Barrier Card
  function injectFloatingBarrier(targetButton) {
    let barrierRoot = document.getElementById("parentguard-barrier-root");
    if (barrierRoot) return; // Already present

    barrierRoot = document.createElement("div");
    barrierRoot.id = "parentguard-barrier-root";

    const domain = window.location.hostname;
    const buttonText = (targetButton.innerText || targetButton.value || "Checkout").trim();

    barrierRoot.innerHTML = `
      <div class="parentguard-barrier-card" id="parentguard-barrier-card">
        <div class="parentguard-barrier-header">
          <div class="parentguard-header-brand">
            <div class="parentguard-badge-c">C</div>
            <div class="parentguard-brand-text">
              <span class="parentguard-brand-title">CENTINEL FIN AI // PARENTGUARD</span>
              <span class="parentguard-brand-sub">CHECKOUT INTERCEPTED</span>
            </div>
          </div>
          <span class="parentguard-status-badge" id="parentguard-status-pill">[ LOCKED ]</span>
        </div>

        <div class="parentguard-barrier-body">
          <div class="parentguard-detected-info">
            <span class="parentguard-domain-label">${escapeHtml(domain)}</span>
            <span class="parentguard-target-tag">${escapeHtml(buttonText.toUpperCase())}</span>
          </div>

          <p class="parentguard-message-text">
            To prevent unmonitored browser spending, this payment button has been paused.
            Open the <strong>Centinel Fin AI</strong> extension in your toolbar to request parent approval.
          </p>

          <div class="parentguard-actions-row">
            <button class="parentguard-action-btn" id="parentguard-action-instructions">
              HOW TO UNLOCK &rarr;
            </button>
            <button class="parentguard-minimize-btn" id="parentguard-minimize-btn" title="Minimize notification">
              &times;
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(barrierRoot);

    // Setup action listeners
    const instructionsBtn = document.getElementById("parentguard-action-instructions");
    if (instructionsBtn) {
      instructionsBtn.addEventListener("click", () => {
        alert(
          "Centinel Fin AI ParentGuard\n\n" +
          "1. Click the Centinel Fin AI extension icon in your Chrome toolbar.\n" +
          "2. Select the game or bundle option from the dropdown (price auto-fills).\n" +
          "3. Click [ Send to Parent for Approval ].\n" +
          "4. Once your parent approves on their dashboard, this checkout unlocks automatically!"
        );
      });
    }

    const minimizeBtn = document.getElementById("parentguard-minimize-btn");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => {
        const card = document.getElementById("parentguard-barrier-card");
        if (card) {
          card.style.display = card.style.display === "none" ? "block" : "none";
        }
      });
    }
  }

  function highlightFloatingBarrier() {
    const card = document.getElementById("parentguard-barrier-card");
    if (!card) return;
    card.style.display = "block";
    card.style.transform = "scale(1.03)";
    card.style.boxShadow = "6px 6px 0px #EF4444";
    setTimeout(() => {
      card.style.transform = "none";
      card.style.boxShadow = "5px 5px 0px #151515";
    }, 400);
  }

  // 5. Scan Page DOM for Checkout Controls
  function scanPage() {
    const urlMatches = isCheckoutUrl();

    const candidates = document.querySelectorAll("button, a, input[type='submit'], input[type='button']");
    for (const el of candidates) {
      if (isPaymentButton(el)) {
        interceptButton(el);
      }
    }

    if (urlMatches && interceptedButtons.size === 0) {
      const forms = document.querySelectorAll("form");
      forms.forEach(form => {
        const submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
        if (submitBtn) {
          interceptButton(submitBtn);
        }
      });
    }
  }

  let scanTimeout = null;
  function scheduleScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanPage, 250);
  }

  // 6. Observe Dynamic SPAs with MutationObserver
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

  // 7. Communication Channel (Product Extraction + Cryptographic Unlock)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    if (message.type === "UNLOCK_CHECKOUT") {
      console.log("[Centinel Fin AI] Unlocking checkout via cryptographic approval token!");
      isLocked = false;

      interceptedButtons.forEach(btn => {
        btn.classList.remove("parentguard-locked-btn");
        btn.disabled = false;
      });

      document.querySelectorAll(".parentguard-in-place-shield").forEach(shield => {
        shield.style.backgroundColor = "#CCFF00";
        shield.style.color = "#151515";
        shield.textContent = "[ PARENTGUARD: RSA APPROVED & UNLOCKED ]";
      });

      const statusPill = document.getElementById("parentguard-status-pill");
      if (statusPill) {
        statusPill.textContent = "[ APPROVED & UNLOCKED ]";
        statusPill.classList.add("unlocked");
      }

      sendResponse({ success: true });
      return false;
    }

    return false;
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }
})();
