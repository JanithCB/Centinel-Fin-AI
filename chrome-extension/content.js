/**
 * Centinel Fin AI – ParentGuard
 * Content Script: Checkout Detection & DOM Overlay Lock
 *
 * Responsibilities:
 * - Detects checkout pages via URL patterns and DOM heuristics
 * - Intercepts "Pay Now", "Place Order", and checkout action buttons
 * - Injects the Neo-Brutalist [ PARENTGUARD: APPROVAL REQUIRED ] barrier
 * - Observes DOM mutations for dynamically rendered SPAs (e.g. Steam, Roblox, Amazon)
 * - Supports cryptographic unlock via runtime messages
 */

(function () {
  "use strict";

  // Prevent multiple injections
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
          "2. Review the detected item title and price.\n" +
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
    // If not a checkout URL, only scan if page contains payment forms
    const urlMatches = isCheckoutUrl();

    // Query candidate buttons and links
    const candidates = document.querySelectorAll("button, a, input[type='submit'], input[type='button']");
    for (const el of candidates) {
      if (isPaymentButton(el)) {
        interceptButton(el);
      }
    }

    // If URL matches checkout keywords and no specific button matched yet, scan form submit buttons
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

  // Debounced scanning to protect browser performance
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

  // Start initial scan and observer
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

  // 7. Communication Channel (Support for Task 3.4 Cryptographic Unlock)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

      // Unlock all intercepted buttons
      interceptedButtons.forEach(btn => {
        btn.classList.remove("parentguard-locked-btn");
        btn.disabled = false;
      });

      // Update in-place shields
      document.querySelectorAll(".parentguard-in-place-shield").forEach(shield => {
        shield.style.backgroundColor = "#CCFF00";
        shield.style.color = "#151515";
        shield.textContent = "[ PARENTGUARD: RSA APPROVED & UNLOCKED ]";
      });

      // Update floating barrier status pill
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
