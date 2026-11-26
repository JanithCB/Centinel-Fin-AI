/**
 * Centinel Fin AI – ParentGuard
 * Child Extension Popup Controller (Smart Cart Manifest & 4-Layer Anti-Tamper Edition)
 *
 * Responsibilities:
 * - Authenticate child via Supabase Auth
 * - Align exclusively with Shopping Cart / Checkout pages (zero product dropdowns)
 * - Render live itemized Shopping Cart Manifest receipt (all items, discounts, quantities, and verified cart total)
 * - Detect post-approval cart tampering (added items or equal-price item swaps) and require fresh approval
 * - Submit cart requests with SHA-256 manifest idempotency hashes to Spring Boot
 * - Verify parent RSA-2048 signatures and coordinate live cart auto-unlock
 */

const CONFIG = {
  apiBaseUrl: "http://localhost:8080/api/v1",
  supabaseAuthUrl: "https://bllntgtyksncfahhdxga.supabase.co/auth/v1/token?grant_type=password",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbG50Z3R5a3NuY2ZhaGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODY4NjIsImV4cCI6MjEwMzA2Mjg2Mn0.OdpZ7VfSTgbIfAyzPfFnhv_JOY5rrT9CqVuMXhLTpM0"
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  CAD: "$",
  AUD: "$",
  NZD: "$",
  SGD: "S$",
  JPY: "\u00A5",
  INR: "\u20B9",
  LKR: "Rs.",
  MYR: "RM",
  AED: "AED ",
  BRL: "R$",
  CHF: "CHF",
  PLN: "z\u0142",
  SEK: "kr"
};

// State
let currentTabInfo = {
  url: "",
  domain: "",
  title: "",
  isCartOrCheckout: false,
  cartManifest: null,
  selectedProductUrl: null
};
let childSession = {
  token: null,
  email: null
};
let activeTrackedRequestId = null;
let userDismissedTrackerForForm = false;
let manualFallbackActive = false;
let livePollInterval = null;

// DOM Elements
const loggedOutView = document.getElementById("loggedOutView");
const loggedInView = document.getElementById("loggedInView");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginErrorMsg = document.getElementById("loginErrorMsg");

const appNav = document.getElementById("appNav");
const tabNewRequest = document.getElementById("tabNewRequest");
const tabMyRequests = document.getElementById("tabMyRequests");
const requestCountBadge = document.getElementById("requestCountBadge");
const newRequestView = document.getElementById("newRequestView");
const myRequestsView = document.getElementById("myRequestsView");

const liveApprovalTracker = document.getElementById("liveApprovalTracker");
const requestFormContainer = document.getElementById("requestFormContainer");
const trackerStatusBadge = document.getElementById("trackerStatusBadge");
const trackerRequestId = document.getElementById("trackerRequestId");
const trackerLoaderAnim = document.getElementById("trackerLoaderAnim");
const trackerApprovedIcon = document.getElementById("trackerApprovedIcon");
const trackerDeniedIcon = document.getElementById("trackerDeniedIcon");
const trackerHeadline = document.getElementById("trackerHeadline");
const trackerSubtext = document.getElementById("trackerSubtext");
const trackerItemTitle = document.getElementById("trackerItemTitle");
const trackerItemAmount = document.getElementById("trackerItemAmount");
const trackerItemDomain = document.getElementById("trackerItemDomain");
const trackerAutoSyncTag = document.getElementById("trackerAutoSyncTag");
const showFormAgainBtn = document.getElementById("showFormAgainBtn");

const detectedModeLabel = document.getElementById("detectedModeLabel");
const detectedDomainDisplay = document.getElementById("detectedDomainDisplay");
const detectedUrlDisplay = document.getElementById("detectedUrlDisplay");
const cartItemCountBadge = document.getElementById("cartItemCountBadge");
const refreshTabBtn = document.getElementById("refreshTabBtn");

const cartTamperAlert = document.getElementById("cartTamperAlert");
const cartTamperText = document.getElementById("cartTamperText");

const browsingModeCard = document.getElementById("browsingModeCard");
const browsingModeTag = document.getElementById("browsingModeTag");
const browsingModeHeadline = document.getElementById("browsingModeHeadline");
const browsingModeSubtext = document.getElementById("browsingModeSubtext");
const manualCheckoutFallbackBtn = document.getElementById("manualCheckoutFallbackBtn");

const cartManifestCard = document.getElementById("cartManifestCard");
const cartItemsList = document.getElementById("cartItemsList");
const manifestTotalValue = document.getElementById("manifestTotalValue");

const purchaseForm = document.getElementById("purchaseForm");
const itemNameInput = document.getElementById("itemNameInput");
const titleLockStatus = document.getElementById("titleLockStatus");
const amountInput = document.getElementById("amountInput");
const amountLockStatus = document.getElementById("amountLockStatus");
const currencyPrefixSymbol = document.getElementById("currencyPrefixSymbol");
const currencySelect = document.getElementById("currencySelect");
const currencyLockStatus = document.getElementById("currencyLockStatus");
const categorySelect = document.getElementById("categorySelect");
const reasonInput = document.getElementById("reasonInput");
const submitRequestBtn = document.getElementById("submitRequestBtn");
const submissionAlert = document.getElementById("submissionAlert");

const requestsListContainer = document.getElementById("requestsListContainer");
const refreshRequestsBtn = document.getElementById("refreshRequestsBtn");

// Helper: Infer category from store hostname
function inferCategoryFromHostname(hostname) {
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
    h.includes("humblebundle")
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

// Helper: Check if URL is a dedicated Shopping Cart or Checkout page
function isCartOrCheckoutUrl(urlString) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    const pathname = (parsed.pathname || "").toLowerCase();
    const search = (parsed.search || "").toLowerCase();

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
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy") || search.includes("step=contact_information")) {
      return true;
    }
  } catch (_) {}
  return false;
}

// Helper: Normalize item title for anti-tamper manifest comparison
function normalizeManifestTitle(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/^Save\s+\d+%\s+on\s+/i, "")
    .replace(/\s+on\s+Steam$/i, "")
    .replace(/\(\s*[$€£₹RsA-Z.\s]*\d+[.,]\d{2}\s*\)\s*$/i, "")
    .replace(/\[\s*\d+\s*items?\s*\]\s*$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Verify if a live Cart Manifest matches an existing Request (Amount + Currency + Item Titles)
 */
function doesCartManifestMatchRequest(liveManifest, req) {
  if (!liveManifest || !req) return { match: false, reason: "MISSING_DATA" };

  const reqAmount = Number(req.amount);
  if (isNaN(reqAmount) || Math.abs(liveManifest.totalAmount - reqAmount) >= 0.02) {
    return {
      match: false,
      reason: "AMOUNT_MISMATCH",
      liveAmount: liveManifest.totalAmount,
      approvedAmount: reqAmount
    };
  }

  if (
    liveManifest.currency &&
    req.currency &&
    liveManifest.currency.toUpperCase() !== req.currency.toUpperCase()
  ) {
    return { match: false, reason: "CURRENCY_MISMATCH" };
  }

  const rawApprovedName = String(req.itemName || "").trim();
  if (rawApprovedName && Array.isArray(liveManifest.items) && liveManifest.items.length > 0) {
    const hasTruncatedTail = /\+\s*\d+\s+more\s+items$/i.test(rawApprovedName);
    const cleanedTail = rawApprovedName.replace(/\s*\+\s*\d+\s+more\s+items$/i, "");
    const approvedSegments = cleanedTail
      .split(/\s+\+\s+/)
      .map((seg) => normalizeManifestTitle(seg.replace(/\s+x\d+\b/i, "")))
      .filter((s) => s.length > 0 && s !== "shopping cart order");

    if (approvedSegments.length > 0) {
      if (!hasTruncatedTail && liveManifest.items.length !== approvedSegments.length) {
        return { match: false, reason: "ITEM_COUNT_MISMATCH" };
      }

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

  return { match: true, reason: "MATCH" };
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await detectActiveTab();
  await loadAuthState();
  startLivePolling();

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].id && chrome.scripting) {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const barrier = document.getElementById("parentguard-barrier-root");
          if (barrier) barrier.remove();
        }
      }).catch(() => {});
    }
  } catch (_) {}
});

function startLivePolling() {
  if (livePollInterval) clearInterval(livePollInterval);
  livePollInterval = setInterval(async () => {
    if (childSession.token) {
      await detectActiveTab(false);
      await fetchMyRequests(false);
    }
  }, 2500);
}

// Event Listeners
function setupEventListeners() {
  const devReloadBtn = document.getElementById("devReloadBtn");
  if (devReloadBtn) {
    devReloadBtn.addEventListener("click", () => {
      chrome.runtime.reload();
      window.close();
    });
  }

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  refreshTabBtn.addEventListener("click", async () => {
    userDismissedTrackerForForm = false;
    await detectActiveTab(true);
    await fetchMyRequests(false);
  });
  purchaseForm.addEventListener("submit", handlePurchaseSubmit);
  refreshRequestsBtn.addEventListener("click", () => fetchMyRequests(true));

  if (showFormAgainBtn) {
    showFormAgainBtn.addEventListener("click", () => {
      userDismissedTrackerForForm = true;
      activeTrackedRequestId = null;
      hideLiveApprovalTracker();
    });
  }

  if (manualCheckoutFallbackBtn) {
    manualCheckoutFallbackBtn.addEventListener("click", () => {
      manualFallbackActive = true;
      browsingModeCard.classList.add("hidden");
      cartManifestCard.classList.add("hidden");
      purchaseForm.classList.remove("hidden");
      enableManualInputs();
      itemNameInput.focus();
    });
  }

  currencySelect.addEventListener("change", () => {
    updateCurrencySymbol(currencySelect.value);
  });

  tabNewRequest.addEventListener("click", () => switchTab("newRequestView"));
  tabMyRequests.addEventListener("click", () => {
    switchTab("myRequestsView");
    fetchMyRequests();
  });
}

function showLiveApprovalTracker(req) {
  if (!req || !liveApprovalTracker || !requestFormContainer) return;

  activeTrackedRequestId = req.id || activeTrackedRequestId;
  requestFormContainer.classList.add("hidden");
  liveApprovalTracker.classList.remove("hidden");

  const symbol = CURRENCY_SYMBOLS[req.currency] || ((req.currency || "USD") + " ");
  const formattedAmount = `${symbol}${parseFloat(req.amount || 0).toFixed(2)} ${req.currency || "USD"}`;
  const cleanDomain = getCleanDomainLabel(req.siteDomain || currentTabInfo.domain);

  trackerRequestId.textContent = req.id ? `REQ #${req.id}` : "SENT JUST NOW";
  trackerItemTitle.textContent = req.itemName || itemNameInput.value || "Shopping Cart Order";
  trackerItemAmount.textContent = formattedAmount;
  trackerItemDomain.textContent = cleanDomain;

  liveApprovalTracker.classList.remove("state-approved", "state-denied");
  trackerStatusBadge.classList.remove("pending", "approved", "denied");

  if (req.status === "APPROVED") {
    liveApprovalTracker.classList.add("state-approved");
    trackerStatusBadge.classList.add("approved");
    trackerStatusBadge.textContent = "[ APPROVED BY PARENT ]";
    trackerLoaderAnim.classList.add("hidden");
    trackerApprovedIcon.classList.remove("hidden");
    trackerDeniedIcon.classList.add("hidden");
    trackerHeadline.textContent = "CART APPROVED — READY TO PAY!";
    trackerSubtext.textContent =
      "Your parent approved this exact cart manifest! Continue to Payment is unlocked. Adding or swapping items will re-lock checkout.";
    trackerAutoSyncTag.textContent = "CHECKOUT UNLOCKED";

    triggerDirectTabUnlock();
  } else if (req.status === "DENIED") {
    liveApprovalTracker.classList.add("state-denied");
    trackerStatusBadge.classList.add("denied");
    trackerStatusBadge.textContent = "[ DECLINED BY PARENT ]";
    trackerLoaderAnim.classList.add("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.remove("hidden");
    trackerHeadline.textContent = "CART REQUEST DECLINED";
    trackerSubtext.textContent =
      "Your parent declined this cart. You can remove items in your cart and submit a revised cart request below.";
    trackerAutoSyncTag.textContent = "PAYMENT GATE LOCKED";
  } else {
    trackerStatusBadge.classList.add("pending");
    trackerStatusBadge.textContent = "[ WAITING FOR PARENT ]";
    trackerLoaderAnim.classList.remove("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.add("hidden");
    trackerHeadline.textContent = "WAITING FOR PARENT APPROVAL...";
    trackerSubtext.textContent =
      "Cart details sent to your parent! Keep your cart open — Continue to Payment will unlock automatically once approved.";
    trackerAutoSyncTag.textContent = "CHECKING APPROVAL...";
  }
}

function hideLiveApprovalTracker() {
  if (!liveApprovalTracker || !requestFormContainer) return;
  liveApprovalTracker.classList.add("hidden");
  requestFormContainer.classList.remove("hidden");
}

async function triggerDirectTabUnlock() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0] || !tabs[0].id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "VERIFY_AND_UNLOCK_TAB"
    }).catch(() => {});
  } catch (err) {
    console.debug("[Centinel Fin AI] Tab unlock message skipped:", err);
  }
}

function updateCurrencySymbol(currencyCode) {
  if (currencyPrefixSymbol) {
    currencyPrefixSymbol.textContent = CURRENCY_SYMBOLS[currencyCode] || "$";
  }
}

function switchTab(viewId) {
  if (viewId === "newRequestView") {
    tabNewRequest.classList.add("active");
    tabMyRequests.classList.remove("active");
    newRequestView.classList.remove("hidden");
    myRequestsView.classList.add("hidden");
  } else {
    tabMyRequests.classList.add("active");
    tabNewRequest.classList.remove("active");
    myRequestsView.classList.remove("hidden");
    newRequestView.classList.add("hidden");
  }
}

/**
 * Inspect active tab and render either the Live Cart Manifest Receipt or Free Browsing Guidance
 */
async function detectActiveTab(forceRescan = false) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const activeTab = tabs[0];
    const urlString = activeTab.url || "";

    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      currentTabInfo = {
        url: "",
        domain: "",
        title: "",
        isCartOrCheckout: false,
        cartManifest: null,
        selectedProductUrl: null
      };
      detectedModeLabel.textContent = "NO STORE ACTIVE";
      detectedDomainDisplay.textContent = "BROWSER TAB";
      detectedUrlDisplay.textContent = "Open any online store and add items to your cart.";
      cartItemCountBadge.classList.add("hidden");
      showBrowsingGuidanceState(false, "OPEN AN ONLINE STORE", "Browse any online store, add items to your cart, and open your Shopping Cart page to request approval.");
      return;
    }

    const parsedUrl = new URL(urlString);
    currentTabInfo.url = urlString;
    currentTabInfo.domain = parsedUrl.hostname;
    currentTabInfo.isCartOrCheckout = isCartOrCheckoutUrl(urlString);

    if (forceRescan || !categorySelect.dataset.userEdited) {
      categorySelect.value = inferCategoryFromHostname(parsedUrl.hostname);
    }

    const extraction = await scrapeProductsFromTab(activeTab.id);

    if (extraction && typeof extraction.isCartOrCheckout === "boolean") {
      currentTabInfo.isCartOrCheckout = extraction.isCartOrCheckout;
    }

    detectedDomainDisplay.textContent = currentTabInfo.domain;

    // --- CASE A: Active Tab IS a Shopping Cart / Checkout Page ---
    if (currentTabInfo.isCartOrCheckout) {
      detectedModeLabel.textContent = "SHOPPING CART GATE";
      detectedUrlDisplay.textContent = `${currentTabInfo.domain} (Shopping Cart / Checkout)`;

      const manifest = extraction ? extraction.cartManifest : null;
      currentTabInfo.cartManifest = manifest;

      if (manifest && manifest.totalAmount > 0) {
        manualFallbackActive = false;
        renderCartManifestReceipt(manifest, extraction.defaultCategory);
      } else if (!manualFallbackActive) {
        cartItemCountBadge.textContent = "0 ITEMS";
        cartItemCountBadge.classList.remove("hidden");
        showBrowsingGuidanceState(
          true,
          "YOUR SHOPPING CART IS EMPTY",
          "There are currently no priced items detected in your cart. Add products to your cart first, then click RE-SCAN CART."
        );
      }
      return;
    }

    // --- CASE B: Active Tab is a Normal Product / Storefront Page (Free Browsing) ---
    currentTabInfo.cartManifest = null;
    detectedModeLabel.textContent = "PRODUCT BROWSING MODE";
    const pageTitle = (extraction && extraction.pageTitle) || activeTab.title || currentTabInfo.domain;
    detectedUrlDisplay.textContent = pageTitle;
    cartItemCountBadge.textContent = "UNLOCKED";
    cartItemCountBadge.classList.remove("hidden");
    cartTamperAlert.classList.add("hidden");

    if (!manualFallbackActive) {
      showBrowsingGuidanceState(
        false,
        "ADD ITEMS TO YOUR CART FIRST",
        "Product pages and Add to Cart buttons are unlocked! Add all desired items to your shopping cart, then open your Cart page to send the full basket to your parent."
      );
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to inspect active tab:", err);
  }
}

function showBrowsingGuidanceState(isEmptyCart, headline, subtext) {
  cartManifestCard.classList.add("hidden");
  purchaseForm.classList.add("hidden");
  browsingModeCard.classList.remove("hidden");

  if (isEmptyCart) {
    browsingModeTag.textContent = "[ EMPTY CART ]";
    browsingModeTag.classList.add("empty-cart");
  } else {
    browsingModeTag.textContent = "[ FREE BROWSING UNLOCKED ]";
    browsingModeTag.classList.remove("empty-cart");
  }

  browsingModeHeadline.textContent = headline;
  browsingModeSubtext.textContent = subtext;
}

/**
 * Render the Live Itemized Shopping Cart Receipt & Tamper-Lock Form Inputs
 */
function renderCartManifestReceipt(manifest, defaultCategory) {
  browsingModeCard.classList.add("hidden");
  purchaseForm.classList.remove("hidden");
  cartManifestCard.classList.remove("hidden");

  const count = manifest.itemCount || manifest.items.length || 1;
  cartItemCountBadge.textContent = `${count} ${count === 1 ? "ITEM" : "ITEMS"} IN CART`;
  cartItemCountBadge.classList.remove("hidden");

  const cur = (manifest.currency || "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] || (cur + " ");

  cartItemsList.innerHTML = "";

  if (Array.isArray(manifest.items) && manifest.items.length > 0) {
    manifest.items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "cart-item-row";

      const indexStr = String(idx + 1).padStart(2, "0");
      const qtyBadge = item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : "";
      const priceText = typeof item.amount === "number" ? `${sym}${item.amount.toFixed(2)}` : "Included";
      const discountHtml = item.discountPct
        ? `<span class="cart-item-discount">${escapeHtml(item.discountPct)}</span>`
        : "";

      row.innerHTML = `
        <div class="cart-item-left">
          <span class="cart-item-index">${indexStr}</span>
          <span class="cart-item-name" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}${escapeHtml(qtyBadge)}</span>
        </div>
        <div class="cart-item-right">
          ${discountHtml}
          <span class="cart-item-price">${escapeHtml(priceText)}</span>
        </div>
      `;
      cartItemsList.appendChild(row);
    });
  } else {
    const fallbackRow = document.createElement("div");
    fallbackRow.className = "cart-item-row";
    fallbackRow.innerHTML = `
      <div class="cart-item-left">
        <span class="cart-item-index">01</span>
        <span class="cart-item-name">${escapeHtml(manifest.summaryTitle)}</span>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">${escapeHtml(sym + manifest.totalAmount.toFixed(2))}</span>
      </div>
    `;
    cartItemsList.appendChild(fallbackRow);
  }

  manifestTotalValue.textContent = `${sym}${manifest.totalAmount.toFixed(2)} ${cur}`;

  currentTabInfo.selectedProductUrl = manifest.primaryUrl || currentTabInfo.url;

  // Lock Cart Summary Title
  itemNameInput.value = manifest.summaryTitle;
  itemNameInput.readOnly = true;
  itemNameInput.classList.add("neo-input-locked");
  if (titleLockStatus) {
    titleLockStatus.textContent = "[ CART LOCKED ]";
    titleLockStatus.className = "locked-badge";
  }

  // Lock Cart Total Amount
  amountInput.value = manifest.totalAmount.toFixed(2);
  amountInput.readOnly = true;
  amountInput.classList.add("neo-input-locked");
  if (amountLockStatus) {
    amountLockStatus.textContent = "[ CART LOCKED ]";
    amountLockStatus.className = "locked-badge";
  }

  // Lock Store Currency
  if (!currencySelect.querySelector(`option[value="${cur}"]`)) {
    const optEl = document.createElement("option");
    optEl.value = cur;
    optEl.textContent = `${cur} (${sym.trim()})`;
    currencySelect.appendChild(optEl);
  }
  currencySelect.value = cur;
  updateCurrencySymbol(cur);
  currencySelect.disabled = true;
  currencySelect.classList.add("neo-select-locked");
  if (currencyLockStatus) {
    currencyLockStatus.textContent = "[ STORE ]";
    currencyLockStatus.className = "locked-badge";
  }

  if (defaultCategory) {
    categorySelect.value = defaultCategory;
  }
}

/**
 * Communicate with content.js in active tab to extract live Cart Manifest
 */
async function scrapeProductsFromTab(tabId) {
  if (!tabId) return null;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE_PRODUCTS" });
    if (response && response.success && response.data) {
      return response.data;
    }
  } catch (_) {}

  try {
    if (chrome.scripting) {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ["overlay.css"]
        });
      } catch (_) {}

      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["crypto-verifier.js", "content.js"]
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          if (typeof window.__PARENTGUARD_EXTRACT_PRODUCTS__ === "function") {
            return window.__PARENTGUARD_EXTRACT_PRODUCTS__();
          }
          return null;
        }
      });

      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    }
  } catch (err) {
    console.warn("[Centinel Fin AI] Dynamic script extraction fallback skipped:", err);
  }

  return null;
}

function enableManualInputs() {
  itemNameInput.readOnly = false;
  itemNameInput.classList.remove("neo-input-locked");
  if (titleLockStatus) {
    titleLockStatus.textContent = "[ MANUAL ]";
    titleLockStatus.className = "locked-badge manual";
  }

  amountInput.readOnly = false;
  amountInput.classList.remove("neo-input-locked");
  if (amountLockStatus) {
    amountLockStatus.textContent = "[ MANUAL ]";
    amountLockStatus.className = "locked-badge manual";
  }

  currencySelect.disabled = false;
  currencySelect.classList.remove("neo-select-locked");
  if (currencyLockStatus) {
    currencyLockStatus.textContent = "[ MANUAL ]";
    currencyLockStatus.className = "locked-badge manual";
  }
}

// Auth State Management
async function loadAuthState() {
  const data = await chrome.storage.local.get(["childToken", "childEmail"]);
  if (data.childToken && data.childEmail) {
    childSession.token = data.childToken;
    childSession.email = data.childEmail;
    showLoggedInState();
    fetchMyRequests();
  } else {
    showLoggedOutState();
  }
}

function showLoggedInState() {
  loggedOutView.classList.add("hidden");
  loggedInView.classList.remove("hidden");
  appNav.classList.remove("hidden");
  userEmailDisplay.textContent = childSession.email;
  switchTab("newRequestView");
}

function showLoggedOutState() {
  loggedInView.classList.add("hidden");
  appNav.classList.add("hidden");
  newRequestView.classList.add("hidden");
  myRequestsView.classList.add("hidden");
  loggedOutView.classList.remove("hidden");
  childSession.token = null;
  childSession.email = null;
}

// Login Handler via Supabase Auth
async function handleLogin(e) {
  e.preventDefault();
  loginErrorMsg.classList.add("hidden");
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "AUTHENTICATING...";

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  try {
    const response = await fetch(CONFIG.supabaseAuthUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabaseAnonKey
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || "Authentication failed. Check credentials.");
    }

    if (data.access_token) {
      childSession.token = data.access_token;
      childSession.email = data.user ? data.user.email : email;

      await chrome.storage.local.set({
        childToken: childSession.token,
        childEmail: childSession.email
      });

      showLoggedInState();
      await detectActiveTab(true);
      fetchMyRequests();
    }
  } catch (err) {
    loginErrorMsg.textContent = err.message || "Unable to sign in. Please verify credentials.";
    loginErrorMsg.classList.remove("hidden");
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "SIGN IN AS CHILD \u2192";
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(["childToken", "childEmail"]);
  childSession.token = null;
  childSession.email = null;
  showLoggedOutState();
}

async function computeSha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Submit Shopping Cart Manifest Request
async function handlePurchaseSubmit(e) {
  e.preventDefault();
  hideAlert();

  if (!childSession.token) {
    showAlert("Please sign in as child before submitting requests.", "error");
    showLoggedOutState();
    return;
  }

  const itemName = itemNameInput.value.trim();
  const amountStr = amountInput.value.trim();
  const currency = currencySelect.value;
  const category = categorySelect.value;
  const note = reasonInput.value.trim();

  if (!itemName || !amountStr || !note) {
    showAlert("Please enter a note for your parent explaining this cart request.", "error");
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showAlert("Cart total must be greater than 0.", "error");
    return;
  }

  submitRequestBtn.disabled = true;
  submitRequestBtn.textContent = "SENDING CART TO PARENT...";

  try {
    let siteTarget = currentTabInfo.selectedProductUrl || currentTabInfo.domain || "online-store";
    if (siteTarget.startsWith("http")) {
      try {
        const cleanUrlObj = new URL(siteTarget);
        const originAndPath = `${cleanUrlObj.origin}${cleanUrlObj.pathname}`;
        siteTarget = originAndPath.length <= 250 ? originAndPath : cleanUrlObj.hostname;
      } catch (_) {
        siteTarget = currentTabInfo.domain || "online-store";
      }
    }

    const idempotencyRaw = `${childSession.email || "child"}:${siteTarget}:${itemName.toLowerCase()}:${amount.toFixed(2)}:${currency}`;
    const idempotencyKey = await computeSha256(idempotencyRaw);

    const payload = {
      siteDomain: siteTarget,
      itemName: itemName,
      amount: amount,
      currency: currency,
      category: category,
      note: note
    };

    const response = await fetch(`${CONFIG.apiBaseUrl}/purchase-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${childSession.token}`,
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    let result = {};
    const rawText = await response.text();
    if (rawText) {
      try {
        result = JSON.parse(rawText);
      } catch (_) {
        result = { message: rawText };
      }
    }

    if (response.status === 201 || response.status === 200) {
      reasonInput.value = "";
      userDismissedTrackerForForm = false;
      cartTamperAlert.classList.add("hidden");
      const submittedReq = (result && result.id) ? result : {
        id: result.id || null,
        itemName: itemName,
        amount: amount,
        currency: currency,
        siteDomain: siteTarget,
        status: "PENDING"
      };
      showLiveApprovalTracker(submittedReq);
      fetchMyRequests();
    } else if (response.status === 409) {
      userDismissedTrackerForForm = false;
      if (result && result.id) {
        showLiveApprovalTracker(result);
      }
      fetchMyRequests();
    } else if (response.status === 401 || response.status === 403) {
      showAlert(result.message || "Session expired or unauthorized. Please sign in again.", "error");
      if (response.status === 401) {
        handleLogout();
      }
    } else {
      showAlert(result.message || `Failed to submit request (HTTP ${response.status}).`, "error");
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Purchase submit error:", err);
    showAlert("Network error: Ensure Spring Boot backend is running on :8080.", "error");
  } finally {
    submitRequestBtn.disabled = false;
    submitRequestBtn.textContent = "[ SEND CART TO PARENT FOR APPROVAL ]";
  }
}

// Fetch Child's Purchase Requests
async function fetchMyRequests(manualRefresh = false) {
  if (!childSession.token) return;

  if (manualRefresh) {
    refreshRequestsBtn.disabled = true;
    refreshRequestsBtn.textContent = "SYNCING...";
  }

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/purchase-requests/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${childSession.token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      throw new Error("Failed to fetch requests.");
    }

    const requests = await response.json();
    renderRequestsList(requests);
    syncLiveTrackerWithRequests(requests);
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to fetch requests:", err);
  } finally {
    if (manualRefresh) {
      refreshRequestsBtn.disabled = false;
      refreshRequestsBtn.textContent = "REFRESH";
    }
  }
}

/**
 * Synchronize Popup Tracker with Live Cart Manifest & Detect Post-Approval Cart Tampering
 */
function syncLiveTrackerWithRequests(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    cartTamperAlert.classList.add("hidden");
    return;
  }

  const sortedRequests = [...requests].sort((a, b) => (b.id || 0) - (a.id || 0));
  const currentHostClean = (currentTabInfo.domain || "").replace(/^www\./i, "").toLowerCase();

  // Filter requests belonging to current store domain
  const domainRequests = sortedRequests.filter((r) => {
    if (!currentHostClean) return false;
    const reqHost = getCleanDomainLabel(r.siteDomain).replace(/^www\./i, "").toLowerCase();
    return reqHost === currentHostClean || reqHost.includes(currentHostClean) || currentHostClean.includes(reqHost);
  });

  // --- When on a Shopping Cart / Checkout Page with a Live Cart Manifest ---
  if (currentTabInfo.isCartOrCheckout && currentTabInfo.cartManifest) {
    const liveManifest = currentTabInfo.cartManifest;

    // 1. Check if any APPROVED or PENDING request matches the EXACT current Cart Manifest (Total + Items)
    const exactCartMatch = domainRequests.find((r) => {
      if (r.status !== "APPROVED" && r.status !== "PENDING") return false;
      return doesCartManifestMatchRequest(liveManifest, r).match;
    });

    if (exactCartMatch) {
      cartTamperAlert.classList.add("hidden");
      if (!userDismissedTrackerForForm) {
        showLiveApprovalTracker(exactCartMatch);
      }
      return;
    }

    // 2. No exact match! If we were previously showing a tracker for an older cart state, exit tracker immediately!
    if (activeTrackedRequestId) {
      const tracked = sortedRequests.find((r) => r.id === activeTrackedRequestId);
      // Only keep showing DENIED if the child hasn't changed the cart since denial
      if (tracked && tracked.status === "DENIED" && doesCartManifestMatchRequest(liveManifest, tracked).match) {
        if (!userDismissedTrackerForForm) {
          showLiveApprovalTracker(tracked);
        }
        return;
      }
      activeTrackedRequestId = null;
      hideLiveApprovalTracker();
    }

    // 3. Check if child had a recent APPROVED request for this store whose manifest no longer matches (Tamper / Cart Stuffing / Swap!)
    const previousApproved = domainRequests.find((r) => r.status === "APPROVED");
    if (previousApproved) {
      const check = doesCartManifestMatchRequest(liveManifest, previousApproved);
      if (!check.match) {
        const sym = CURRENCY_SYMBOLS[liveManifest.currency] || "$";
        if (check.reason === "UNAPPROVED_ITEM_SWAP" || check.reason === "ITEM_COUNT_MISMATCH") {
          cartTamperText.textContent = `Cart items changed since REQ #${previousApproved.id} was approved. Unapproved items cannot proceed to payment without fresh parent approval.`;
        } else {
          cartTamperText.textContent = `Cart total changed (${sym}${liveManifest.totalAmount.toFixed(2)} vs approved ${sym}${Number(previousApproved.amount).toFixed(2)}). Submit your updated cart for parent approval.`;
        }
        cartTamperAlert.classList.remove("hidden");
        return;
      }
    }

    cartTamperAlert.classList.add("hidden");
    return;
  }

  // --- Outside Cart Page: If tracking a just-submitted manual fallback request, keep updating ---
  if (activeTrackedRequestId && !userDismissedTrackerForForm) {
    const tracked = sortedRequests.find((r) => r.id === activeTrackedRequestId);
    if (tracked) {
      showLiveApprovalTracker(tracked);
    }
  }
}

// Helper: Extract clean domain from full URL or domain string
function getCleanDomainLabel(siteDomainOrUrl) {
  if (!siteDomainOrUrl) return "Online Store";
  try {
    if (siteDomainOrUrl.startsWith("http://") || siteDomainOrUrl.startsWith("https://")) {
      return new URL(siteDomainOrUrl).hostname;
    }
  } catch (_) {}
  return siteDomainOrUrl;
}

// Render Requests in List View
function renderRequestsList(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    requestCountBadge.textContent = "0";
    requestsListContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-title">NO REQUESTS YET</span>
        <span class="empty-sub">When you submit a shopping cart for checkout approval, it will appear here.</span>
      </div>
    `;
    return;
  }

  requestCountBadge.textContent = requests.length.toString();
  requestsListContainer.innerHTML = "";

  requests.sort((a, b) => b.id - a.id);

  requests.forEach((req) => {
    const card = document.createElement("div");
    card.className = "request-item-card";

    let statusClass = "status-pending";
    let statusText = "WAITING FOR PARENT";

    if (req.status === "APPROVED") {
      statusClass = "status-approved";
      statusText = "APPROVED";
    } else if (req.status === "DENIED") {
      statusClass = "status-denied";
      statusText = "DECLINED";
    }

    const symbol = CURRENCY_SYMBOLS[req.currency] || (req.currency + " ");
    const formattedAmount = `${symbol}${parseFloat(req.amount).toFixed(2)}`;
    const cleanDomain = getCleanDomainLabel(req.siteDomain);

    const proofRowId = `crypto-proof-${req.id}`;
    const showCryptoRow = req.status === "APPROVED";

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-item-title">${escapeHtml(req.itemName || "Shopping Cart Order")}</span>
        <span class="card-amount-badge">${escapeHtml(formattedAmount)}</span>
      </div>
      <div class="card-middle-row">
        <span class="card-domain-tag">${escapeHtml(cleanDomain)}</span>
        <span class="card-status-badge ${statusClass}">[ ${statusText} ]</span>
      </div>
      ${showCryptoRow ? `<div id="${proofRowId}" class="crypto-proof-row verified"><span>RSA-2048 CART PROOF</span><span>[ VERIFYING... ]</span></div>` : ""}
      ${req.note ? `<div class="card-note-row">"${escapeHtml(req.note)}"</div>` : ""}
    `;

    requestsListContainer.appendChild(card);

    if (showCryptoRow && window.ParentGuardCrypto) {
      window.ParentGuardCrypto.verifyPurchaseApproval(req, CONFIG.apiBaseUrl).then((res) => {
        const proofEl = document.getElementById(proofRowId);
        if (!proofEl) return;
        if (res.valid) {
          proofEl.className = "crypto-proof-row verified";
          proofEl.innerHTML = `<span>RSA-2048 VERIFIED</span><span>[ EXACT CART UNLOCKED ]</span>`;
        } else {
          proofEl.className = "crypto-proof-row verified";
          proofEl.innerHTML = `<span>PARENT APPROVAL</span><span>[ EXACT CART UNLOCKED ]</span>`;
        }
      });
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "VERIFY_AND_UNLOCK_TAB" }).catch(() => {});
    }
  }).catch(() => {});
}

function showAlert(message, type) {
  submissionAlert.textContent = message;
  submissionAlert.className = `alert-box alert-${type}`;
  submissionAlert.classList.remove("hidden");
}

function hideAlert() {
  submissionAlert.classList.add("hidden");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}
