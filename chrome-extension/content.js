/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Dual-Stage Cart/Checkout DOM Lock, Multi-Option Product Scraper & WebCrypto RSA-2048 Auto-Unlock
 *
 * Responsibilities:
 * - Stage 1 Lock: Intercepts "Add to Cart", "Add to Bag", and "Buy Now" buttons on product pages
 * - Stage 2 Lock: Intercepts "Continue to payment", "Proceed to Checkout", "Pay Now", and "Place Order" buttons
 * - Extracts all available purchase options, editions, and bundles (with prices & discounts)
 * - Injects the Neo-Brutalist [ PARENTGUARD: APPROVAL REQUIRED ] barrier
 * - Uses window.ParentGuardCrypto (WebCrypto RSASSA-PKCS1-v1_5 / SHA-256) to verify parent RSA-2048 signatures
 *   before unlocking "Add to Cart" and "Continue to payment" buttons
 */

(function () {
  "use strict";

  // Helper: Parse a raw price text (e.g. "$8.99 USD", "€14,99", "£19.99") into { amount, currency, raw }
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

    let priceContainer =
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

  /**
   * Multi-Tier DOM Product, Edition & Bundle Extractor
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

    // TIER 0: Explicit ParentGuard Annotated Options
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
        const info = extractSteamPurchaseBoxInfo(box);
        if (info) {
          addOption(info);
        }
      });

      // Also check Steam Shopping Cart if on /cart
      if (options.length === 0 && /\/cart/i.test(window.location.pathname)) {
        const bodyText = document.body ? document.body.innerText : "";
        const estMatch = bodyText.match(/Estimated\s+total[\s\S]{0,40}?([$€£]\s*\d+[.,]\d{2})/i);
        if (estMatch) {
          const parsed = parsePriceText(estMatch[1]);
          if (parsed) {
            addOption({
              kind: "CART",
              title: "Steam Shopping Cart Total",
              amount: parsed.amount,
              currency: parsed.currency,
              category: "GAMING"
            });
          }
        }
      }
    }

    // TIER 2: Amazon Product & Edition Twister Scraper
    if (hostname.includes("amazon.")) {
      const mainTitleEl = document.getElementById("productTitle");
      const mainTitle = mainTitleEl ? mainTitleEl.textContent.replace(/\s+/g, " ").trim() : "";

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
        // Ignore malformed JSON-LD blocks
      }
    });

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

  window.__PARENTGUARD_EXTRACT_PRODUCTS__ = extractPageProducts;

  if (window.__PARENTGUARD_CONTENT_INITIALIZED__) {
    // If already initialized on this tab, rescan immediately (e.g. after SPA navigation or URL update)
    if (typeof scanPage === "function") {
      scanPage();
    }
    return;
  }
  window.__PARENTGUARD_CONTENT_INITIALIZED__ = true;

  console.log("[Centinel Fin AI] ParentGuard Dual-Stage Cart & Checkout Guard active on:", window.location.hostname);

  // Dual-Stage Action Button Patterns (Stage 1: Add to Cart / Buy Now, Stage 2: Cart & Checkout Payment)
  const CART_AND_PAYMENT_BUTTON_PATTERNS = [
    // Stage 1: Product Page Cart Ingress
    /^add\s*to\s*cart$/i,
    /^add\s*to\s*bag$/i,
    /^add\s*to\s*basket$/i,
    /^in\s*cart$/i,
    /^buy\s*now$/i,
    /^pre-?order(\s*now)?$/i,
    // Stage 2: Cart & Checkout Finalization
    /continue\s*to\s*payment/i,
    /proceed\s*to\s*checkout/i,
    /continue\s*to\s*checkout/i,
    /proceed\s*to\s*payment/i,
    /purchase\s*for\s*myself/i,
    /purchase\s*as\s*a\s*gift/i,
    /^checkout(\s*now)?$/i,
    /pay\s*now/i,
    /place\s*order/i,
    /complete\s*purchase/i,
    /submit\s*order/i,
    /authori[sz]e\s*payment/i,
    /confirm\s*(and\s*)?pay/i
  ];

  let interceptedButtons = new Set();

  // Check if an element is an actionable Cart or Payment button
  function isCartOrPaymentButton(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Never intercept our own ParentGuard UI elements
    if (element.closest("#parentguard-barrier-root") || element.classList.contains("parentguard-in-place-shield")) {
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
        if (child !== element && matchesActionTextOrAttr(child)) {
          return false;
        }
      }
    }

    return matchesActionTextOrAttr(element);
  }

  function matchesActionTextOrAttr(element) {
    const tagName = element.tagName.toUpperCase();
    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();

    if (text.length > 0 && text.length <= 45) {
      if (CART_AND_PAYMENT_BUTTON_PATTERNS.some((regex) => regex.test(text))) {
        return true;
      }
    }

    if (tagName === "INPUT" && element.value) {
      const val = element.value.trim();
      if (CART_AND_PAYMENT_BUTTON_PATTERNS.some((regex) => regex.test(val))) {
        return true;
      }
    }

    const testId = element.getAttribute("data-testid") || "";
    const id = element.id || "";
    const className = typeof element.className === "string" ? element.className : "";
    const href = element.getAttribute("href") || "";
    const attrString = `${testId} ${id} ${className} ${href}`.toLowerCase();

    if (
      attrString.includes("javascript:addtocart") ||
      attrString.includes("javascript:addbundletocart") ||
      attrString.includes("add-to-cart-button") ||
      attrString.includes("buy-now-button") ||
      attrString.includes("pay-button") ||
      attrString.includes("checkout-submit") ||
      attrString.includes("place-order")
    ) {
      return true;
    }

    return false;
  }

  // Intercept and Lock a Cart or Checkout Button
  function interceptButton(button) {
    if (interceptedButtons.has(button)) return;
    if (button.getAttribute("data-parentguard-unlocked") === "true") return;

    interceptedButtons.add(button);

    // Attach option metadata if button is inside a Steam purchase box
    const steamBox = button.closest(".game_area_purchase_game");
    if (steamBox) {
      const boxInfo = extractSteamPurchaseBoxInfo(steamBox);
      if (boxInfo) {
        button.setAttribute("data-parentguard-amount", boxInfo.amount.toFixed(2));
        button.setAttribute("data-parentguard-title", boxInfo.title);
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

    // Inject in-place inline shield next to the button
    const container = button.parentElement;
    if (container && !container.querySelector(".parentguard-in-place-shield")) {
      const shield = document.createElement("div");
      shield.className = "parentguard-in-place-shield";
      const amtAttr = button.getAttribute("data-parentguard-amount");
      shield.textContent = amtAttr
        ? `[ PARENTGUARD LOCKED ($${amtAttr}) ]`
        : "[ PARENTGUARD: APPROVAL REQUIRED ]";
      container.insertBefore(shield, button.nextSibling);
    }

    injectFloatingBarrier(button);
  }

  function handleBlockedClick(e) {
    const btn = e.currentTarget;
    if (btn && btn.getAttribute("data-parentguard-unlocked") === "true") {
      return; // Cryptographically unlocked! Allow click through.
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    console.warn("[Centinel Fin AI] Cart/Payment action blocked — Parent RSA-2048 approval required!");
    highlightFloatingBarrier();
  }

  /**
   * Unlock a specific intercepted button after WebCrypto RSA-2048 signature verification succeeds
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

    // Update adjacent inline shield
    const container = button.parentElement;
    const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
    if (shield) {
      shield.classList.add("verified");
      const amt = Number(verifiedRequest.amount).toFixed(2);
      shield.textContent = `[ RSA-2048 VERIFIED & UNLOCKED ($${amt}) ]`;
    }
  }

  /**
   * Polls Child's Approved Requests and runs WebCrypto RSA-2048 Signature Verification (Task 3.4)
   */
  async function verifyAndUnlockApprovedButtons() {
    if (!window.ParentGuardCrypto || interceptedButtons.size === 0) return;

    try {
      const res = await chrome.runtime.sendMessage({ type: "FETCH_MY_REQUESTS" });
      if (!res || !res.success || !Array.isArray(res.data)) return;

      const currentHost = window.location.hostname.replace(/^www\./i, "").toLowerCase();
      const approvedForDomain = res.data.filter((req) => {
        if (req.status !== "APPROVED" || !req.rsaSignature) return false;
        const reqDomain = (req.siteDomain || "").toLowerCase();
        return reqDomain.includes(currentHost) || currentHost.includes(reqDomain);
      });

      if (approvedForDomain.length === 0) return;

      let anyUnlocked = false;
      let latestVerifiedReq = null;
      let latestCanonicalPayload = "";

      for (const req of approvedForDomain) {
        const verification = await window.ParentGuardCrypto.verifyPurchaseApproval(req);

        if (!verification.valid) {
          console.error(
            `[Centinel Fin AI] SECURITY ALERT: RSA-2048 signature verification FAILED for Request #${req.id} (${verification.reason}). Keeping checkout locked!`
          );
          continue;
        }

        console.log(
          `[Centinel Fin AI] RSA-2048 signature mathematically verified via WebCrypto for Request #${req.id} ($${req.amount} ${req.currency})!`
        );

        const approvedAmountStr = Number(req.amount).toFixed(2);
        const approvedTitleLower = (req.itemName || "").toLowerCase().trim();

        interceptedButtons.forEach((btn) => {
          const btnAmount = btn.getAttribute("data-parentguard-amount");
          const btnTitle = (btn.getAttribute("data-parentguard-title") || "").toLowerCase().trim();

          if (btnAmount) {
            // Product page button tied to a specific game/bundle box: match exact price or title
            if (btnAmount === approvedAmountStr || (btnTitle && btnTitle === approvedTitleLower)) {
              unlockButtonWithProof(btn, req);
              anyUnlocked = true;
              latestVerifiedReq = req;
              latestCanonicalPayload = verification.canonicalPayload;
            }
          } else {
            // Cart / Checkout button (e.g., "Continue to payment" on /cart): unlock for verified store approval
            unlockButtonWithProof(btn, req);
            anyUnlocked = true;
            latestVerifiedReq = req;
            latestCanonicalPayload = verification.canonicalPayload;
          }
        });
      }

      if (anyUnlocked && latestVerifiedReq) {
        updateFloatingBarrierAsVerified(latestVerifiedReq, latestCanonicalPayload);
      }
    } catch (err) {
      console.debug("[Centinel Fin AI] Approval check skipped:", err.message);
    }
  }

  function updateFloatingBarrierAsVerified(verifiedReq, canonicalPayload) {
    const statusPill = document.getElementById("parentguard-status-pill");
    if (statusPill) {
      statusPill.textContent = "[ RSA-2048 VERIFIED ]";
      statusPill.classList.add("unlocked");
    }

    const msgEl = document.getElementById("parentguard-barrier-message");
    if (msgEl) {
      const amt = Number(verifiedReq.amount).toFixed(2);
      msgEl.innerHTML = `Parent approval for <strong>${escapeHtml(verifiedReq.itemName)} ($${amt} ${escapeHtml(verifiedReq.currency)})</strong> has been mathematically verified via <strong>WebCrypto RSA-2048</strong>. Cart and payment buttons are now unlocked!`;
    }

    const proofBox = document.getElementById("parentguard-crypto-proof-box");
    if (proofBox) {
      const shortSig = (verifiedReq.rsaSignature || "").substring(0, 44) + "...";
      proofBox.innerHTML = `RSA-2048 SHA256withRSA VALIDATED // REQ #${verifiedReq.id}<br>SIG: ${escapeHtml(shortSig)}`;
      proofBox.style.display = "block";
    }

    const verifyBtn = document.getElementById("parentguard-verify-now-btn");
    if (verifyBtn) {
      verifyBtn.textContent = "RSA-2048 SIGNATURE VERIFIED";
    }
  }

  // Inject Floating Barrier Card
  function injectFloatingBarrier(targetButton) {
    let barrierRoot = document.getElementById("parentguard-barrier-root");
    if (barrierRoot) return;

    barrierRoot = document.createElement("div");
    barrierRoot.id = "parentguard-barrier-root";

    const domain = window.location.hostname;
    const buttonText = (targetButton.innerText || targetButton.value || "Add to Cart / Pay").replace(/\s+/g, " ").trim();

    barrierRoot.innerHTML = `
      <div class="parentguard-barrier-card" id="parentguard-barrier-card">
        <div class="parentguard-barrier-header">
          <div class="parentguard-header-brand">
            <div class="parentguard-badge-c">C</div>
            <div class="parentguard-brand-text">
              <span class="parentguard-brand-title">CENTINEL FIN AI // PARENTGUARD</span>
              <span class="parentguard-brand-sub">CART &amp; CHECKOUT GUARDRAIL</span>
            </div>
          </div>
          <span class="parentguard-status-badge" id="parentguard-status-pill">[ LOCKED ]</span>
        </div>

        <div class="parentguard-barrier-body">
          <div class="parentguard-detected-info">
            <span class="parentguard-domain-label">${escapeHtml(domain)}</span>
            <span class="parentguard-target-tag">${escapeHtml(buttonText.toUpperCase())}</span>
          </div>

          <p class="parentguard-message-text" id="parentguard-barrier-message">
            <strong>Add to Cart</strong> &amp; <strong>Checkout</strong> actions on this store are protected.
            Select your game/bundle in the <strong>Centinel Fin AI</strong> toolbar popup to request parent approval.
          </p>

          <div class="parentguard-crypto-proof-box" id="parentguard-crypto-proof-box" style="display: none;"></div>

          <div class="parentguard-actions-row">
            <button class="parentguard-action-btn" id="parentguard-verify-now-btn">
              VERIFY PARENT APPROVAL (RSA-2048)
            </button>
            <button class="parentguard-minimize-btn" id="parentguard-minimize-btn" title="Minimize notification">
              &times;
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(barrierRoot);

    const verifyBtn = document.getElementById("parentguard-verify-now-btn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", async () => {
        const prevText = verifyBtn.textContent;
        verifyBtn.textContent = "VERIFYING RSA-2048 SIGNATURE...";
        await verifyAndUnlockApprovedButtons();
        setTimeout(() => {
          if (verifyBtn.textContent === "VERIFYING RSA-2048 SIGNATURE...") {
            verifyBtn.textContent = prevText;
          }
        }, 900);
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

  // Scan Page DOM for "Add to Cart" and "Checkout / Pay Now" Controls
  function scanPage() {
    const candidates = document.querySelectorAll(
      "button, a, input[type='submit'], input[type='button'], [role='button']"
    );
    let newlyAdded = false;
    for (const el of candidates) {
      if (!interceptedButtons.has(el) && isCartOrPaymentButton(el)) {
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

  // SPA Navigation / HTML5 History API listeners (handles client-side store page changes, e.g. Steam /cart, Amazon)
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
  } catch (_) {
    // Ignore restricted contexts
  }

  // Periodic background poll every 5 seconds while locked buttons exist on screen
  setInterval(() => {
    if (interceptedButtons.size > 0) {
      verifyAndUnlockApprovedButtons();
    }
  }, 5000);

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
      verifyAndUnlockApprovedButtons().then(() => {
        sendResponse({ success: true });
      });
      return true;
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
