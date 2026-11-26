/**
 * Centinel Fin AI – ParentGuard
 * Child Extension Popup Controller (Universal E-Commerce Edition)
 *
 * Responsibilities:
 * - Authenticate child via Supabase Auth
 * - Auto-detect active browser tab (domain, URL, title, category) on ANY e-commerce platform
 * - Extract all purchase options, variants, editions, and bundles with live prices from the store DOM
 * - Auto-populate and tamper-lock title, price, currency, category, and discount context
 * - Recognize approved merchant items seamlessly on /cart and /checkout pages without requiring duplicate approval
 * - Submit purchase requests with SHA-256 idempotency hashes to Spring Boot
 * - Fetch and display submitted requests with live parent approval statuses
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

// State (Platform-agnostic defaults — zero hardcoded store domains)
let currentTabInfo = {
  url: "",
  domain: "",
  title: "",
  isCartOrCheckout: false,
  detectedOptions: []
};
let childSession = {
  token: null,
  email: null
};
let activeTrackedRequestId = null;
let userDismissedTrackerForForm = false;
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

const detectedDomainDisplay = document.getElementById("detectedDomainDisplay");
const detectedUrlDisplay = document.getElementById("detectedUrlDisplay");
const optionsCountBadge = document.getElementById("optionsCountBadge");
const refreshTabBtn = document.getElementById("refreshTabBtn");

const productOptionGroup = document.getElementById("productOptionGroup");
const productOptionSelect = document.getElementById("productOptionSelect");
const priceVerifiedTag = document.getElementById("priceVerifiedTag");
const selectedOptionDiscountBar = document.getElementById("selectedOptionDiscountBar");
const discountPctBadge = document.getElementById("discountPctBadge");
const discountContextText = document.getElementById("discountContextText");

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

// Helper: Check if a URL is a dedicated Shopping Cart or Checkout page
function isCartOrCheckoutUrl(urlString) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    const pathname = (parsed.pathname || "").toLowerCase();
    const search = (parsed.search || "").toLowerCase();
    if (/\/(cart|shopping-cart|viewcart|basket|bag|checkout|checkouts|onepagecheckout)(\/|$)/i.test(pathname)) {
      return true;
    }
    if (pathname.includes("/gp/cart") || pathname.includes("/gp/buy") || search.includes("step=contact_information")) {
      return true;
    }
  } catch (_) {}
  return false;
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await detectActiveTab();
  await loadAuthState();
  startLivePolling();

  // Proactively purge any legacy floating barrier from the active tab immediately
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
  livePollInterval = setInterval(() => {
    if (childSession.token) {
      fetchMyRequests(false);
    }
  }, 3000);
}

// Event Listeners
function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  refreshTabBtn.addEventListener("click", () => detectActiveTab(true));
  purchaseForm.addEventListener("submit", handlePurchaseSubmit);
  refreshRequestsBtn.addEventListener("click", () => fetchMyRequests(true));

  if (showFormAgainBtn) {
    showFormAgainBtn.addEventListener("click", () => {
      userDismissedTrackerForForm = true;
      activeTrackedRequestId = null;
      hideLiveApprovalTracker();
    });
  }

  productOptionSelect.addEventListener("change", (e) => {
    applySelectedOption(e.target.value);
  });

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
  trackerItemTitle.textContent = req.itemName || itemNameInput.value || "Selected Product";
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
    trackerHeadline.textContent = "APPROVED — YOU CAN BUY NOW!";
    trackerSubtext.textContent =
      "Your parent approved this purchase! Continue to Payment / Checkout is unlocked on this page.";
    trackerAutoSyncTag.textContent = "CHECKOUT UNLOCKED";

    triggerDirectTabUnlock(req);
  } else if (req.status === "DENIED") {
    liveApprovalTracker.classList.add("state-denied");
    trackerStatusBadge.classList.add("denied");
    trackerStatusBadge.textContent = "[ DECLINED BY PARENT ]";
    trackerLoaderAnim.classList.add("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.remove("hidden");
    trackerHeadline.textContent = "REQUEST NOT APPROVED";
    trackerSubtext.textContent =
      "Your parent declined this request. You can talk with your parent or select a different product below.";
    trackerAutoSyncTag.textContent = "STORE REMAINS LOCKED";
  } else {
    trackerStatusBadge.classList.add("pending");
    trackerStatusBadge.textContent = "[ WAITING FOR PARENT ]";
    trackerLoaderAnim.classList.remove("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.add("hidden");
    trackerHeadline.textContent = "WAITING FOR PARENT APPROVAL...";
    trackerSubtext.textContent =
      "Sent to your parent! Keep this page open — Add to Cart / Buy Now will unlock automatically as soon as they approve.";
    trackerAutoSyncTag.textContent = "CHECKING FOR APPROVAL...";
  }
}

function hideLiveApprovalTracker() {
  if (!liveApprovalTracker || !requestFormContainer) return;
  liveApprovalTracker.classList.add("hidden");
  requestFormContainer.classList.remove("hidden");
}

async function triggerDirectTabUnlock(approvedReq) {
  if (!approvedReq) return;
  const amtStr = Number(approvedReq.amount || 0).toFixed(2);
  const titleStr = approvedReq.itemName || "";
  const reqSiteClean = (approvedReq.siteDomain || "").split("?")[0].replace(/\/$/, "").toLowerCase();

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0] || !tabs[0].id) return;
    const tabId = tabs[0].id;

    // 1. Message content script
    chrome.tabs.sendMessage(tabId, {
      type: "VERIFY_AND_UNLOCK_TAB",
      approvedRequest: approvedReq
    }).catch(() => {});

    // 2. Direct DOM execution via chrome.scripting for instant unlocking on the matching product page
    if (chrome.scripting) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (amt, title, approvedUrl) => {
          const barrier = document.getElementById("parentguard-barrier-root");
          if (barrier) barrier.remove();

          const currentUrl = window.location.href.split("?")[0].replace(/\/$/, "").toLowerCase();
          const urlMatches =
            approvedUrl &&
            approvedUrl.includes("/") &&
            (currentUrl === approvedUrl || currentUrl.startsWith(approvedUrl));

          const lockedBtns = document.querySelectorAll(
            ".parentguard-locked-btn, [data-parentguard-locked='true'], [data-parentguard-intercepted='true']"
          );
          lockedBtns.forEach((btn) => {
            const btnAmt = btn.getAttribute("data-parentguard-amount");
            const amtMatch = !btnAmt || btnAmt === amt;

            if (amtMatch) {
              btn.classList.remove("parentguard-locked-btn");
              btn.classList.add("parentguard-unlocked-btn");
              btn.setAttribute("data-parentguard-unlocked", "true");
              btn.setAttribute("data-parentguard-locked", "false");
              btn.disabled = false;

              const origHref = btn.getAttribute("data-parentguard-orig-href");
              if (origHref) {
                btn.setAttribute("href", origHref);
              }

              const container = btn.parentElement;
              const shield = container ? container.querySelector(".parentguard-in-place-shield") : null;
              if (shield) {
                shield.classList.add("verified");
                shield.textContent = `[ APPROVED — READY TO PAY ($${amt}) ]`;
              }
            }
          });
        },
        args: [amtStr, titleStr, reqSiteClean]
      });
    }
  } catch (err) {
    console.debug("[Centinel Fin AI] Direct tab unlock error:", err);
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
 * Query active tab and extract all product/variant/bundle options + live prices from its DOM
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
        detectedOptions: []
      };
      detectedDomainDisplay.textContent = "NO STORE TAB ACTIVE";
      detectedUrlDisplay.textContent = "Open any online store product page to auto-detect item & price.";
      optionsCountBadge.classList.add("hidden");
      productOptionGroup.classList.add("hidden");
      enableManualInputs();
      return;
    }

    const parsedUrl = new URL(urlString);
    currentTabInfo.url = urlString;
    currentTabInfo.domain = parsedUrl.hostname;
    currentTabInfo.isCartOrCheckout = isCartOrCheckoutUrl(urlString);

    let cleanTitle = (activeTab.title || "")
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
    currentTabInfo.title = cleanTitle;

    categorySelect.value = inferCategoryFromHostname(parsedUrl.hostname);
    detectedDomainDisplay.textContent = currentTabInfo.domain;
    detectedUrlDisplay.textContent = currentTabInfo.isCartOrCheckout
      ? `${currentTabInfo.domain} (Shopping Cart / Checkout)`
      : currentTabInfo.url;

    const extraction = await scrapeProductsFromTab(activeTab.id);

    if (extraction && typeof extraction.isCartOrCheckout === "boolean") {
      currentTabInfo.isCartOrCheckout = extraction.isCartOrCheckout;
    }

    if (extraction && Array.isArray(extraction.options) && extraction.options.length > 0) {
      currentTabInfo.detectedOptions = extraction.options;
      if (extraction.pageTitle) {
        currentTabInfo.title = extraction.pageTitle;
      }
      renderProductOptionsDropdown(extraction.options);
    } else {
      currentTabInfo.detectedOptions = [];
      optionsCountBadge.classList.add("hidden");
      productOptionGroup.classList.add("hidden");
      enableManualInputs();

      if (extraction && extraction.defaultCategory) {
        categorySelect.value = extraction.defaultCategory;
      }

      if (!currentTabInfo.isCartOrCheckout && (forceRescan || !itemNameInput.value.trim()) && currentTabInfo.title) {
        itemNameInput.value = currentTabInfo.title;
      }
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to read active tab:", err);
    detectedDomainDisplay.textContent = "MANUAL ENTRY MODE";
    detectedUrlDisplay.textContent = "Enter store product details below.";
    enableManualInputs();
  }
}

/**
 * Communicates with content.js in the active tab to extract products/variants/bundles.
 */
async function scrapeProductsFromTab(tabId) {
  if (!tabId) return null;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE_PRODUCTS" });
    if (response && response.success && response.data) {
      return response.data;
    }
  } catch (_) {
    // Content script not running in this tab yet; proceed to Attempt 2
  }

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

/**
 * Populate the Smart Option / Variant / Bundle Selector Dropdown and auto-fill the first option.
 */
function renderProductOptionsDropdown(options) {
  const count = options.length;
  optionsCountBadge.textContent = `${count} ${count === 1 ? "OPTION" : "OPTIONS"} FOUND`;
  optionsCountBadge.classList.remove("hidden");

  productOptionGroup.classList.remove("hidden");
  productOptionSelect.innerHTML = "";

  options.forEach((opt, index) => {
    const optionEl = document.createElement("option");
    optionEl.value = String(index);

    const symbol = CURRENCY_SYMBOLS[opt.currency] || (opt.currency + " ");
    const priceStr = `${symbol}${opt.amount.toFixed(2)}`;
    const discountStr = opt.discountPct ? ` (${opt.discountPct})` : "";

    const maxTitleLen = 22;
    const shortTitle = opt.title.length > maxTitleLen ? opt.title.substring(0, maxTitleLen - 2) + ".." : opt.title;
    optionEl.textContent = `[${opt.kind}] ${shortTitle} \u2014 ${priceStr}${discountStr}`;
    productOptionSelect.appendChild(optionEl);
  });

  const manualOptionEl = document.createElement("option");
  manualOptionEl.value = "MANUAL";
  manualOptionEl.textContent = "[MANUAL] Custom / Enter Title & Price...";
  productOptionSelect.appendChild(manualOptionEl);

  productOptionSelect.value = "0";
  applySelectedOption("0");
}

/**
 * Auto-populate and tamper-lock Title, Amount, Currency, and Category
 * when the child chooses a product or variant from the dropdown.
 */
function applySelectedOption(selectedValue) {
  if (selectedValue === "MANUAL") {
    enableManualInputs();
    priceVerifiedTag.textContent = "MANUAL ENTRY";
    selectedOptionDiscountBar.classList.add("hidden");
    itemNameInput.focus();
    return;
  }

  const index = parseInt(selectedValue, 10);
  const opt = currentTabInfo.detectedOptions[index];
  if (!opt) return;

  currentTabInfo.selectedProductUrl = opt.productUrl || null;

  priceVerifiedTag.textContent = "LIVE STORE PRICE";

  itemNameInput.value = opt.title;
  itemNameInput.readOnly = true;
  itemNameInput.classList.add("neo-input-locked");
  if (titleLockStatus) {
    titleLockStatus.textContent = "[ VERIFIED ]";
    titleLockStatus.className = "locked-badge";
  }

  amountInput.value = opt.amount.toFixed(2);
  amountInput.readOnly = true;
  amountInput.classList.add("neo-input-locked");
  if (amountLockStatus) {
    amountLockStatus.textContent = "[ STORE LOCKED ]";
    amountLockStatus.className = "locked-badge";
  }

  if (opt.currency) {
    const cur = opt.currency.toUpperCase();
    if (!currencySelect.querySelector(`option[value="${cur}"]`)) {
      const optEl = document.createElement("option");
      optEl.value = cur;
      const sym = CURRENCY_SYMBOLS[cur] || cur;
      optEl.textContent = `${cur} (${sym})`;
      currencySelect.appendChild(optEl);
    }
    currencySelect.value = cur;
    updateCurrencySymbol(cur);
  }
  currencySelect.disabled = true;
  currencySelect.classList.add("neo-select-locked");
  if (currencyLockStatus) {
    currencyLockStatus.textContent = "[ STORE ]";
    currencyLockStatus.className = "locked-badge";
  }

  if (opt.category) {
    categorySelect.value = opt.category;
  }

  if (opt.discountPct) {
    discountPctBadge.textContent = opt.discountPct;
    discountContextText.textContent = opt.originalPrice
      ? `Discounted Deal (Original: ${opt.originalPrice})`
      : `Special Promotion Active (${opt.discountPct})`;
    selectedOptionDiscountBar.classList.remove("hidden");
  } else {
    selectedOptionDiscountBar.classList.add("hidden");
  }
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
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Submit Purchase Request
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
    showAlert("Please fill in all required fields marked with *.", "error");
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showAlert("Please enter a valid amount greater than 0.", "error");
    return;
  }

  submitRequestBtn.disabled = true;
  submitRequestBtn.textContent = "SUBMITTING TO PARENT...";

  try {
    let siteTarget = currentTabInfo.selectedProductUrl || currentTabInfo.domain || "online-store";
    if (!currentTabInfo.selectedProductUrl && currentTabInfo.url && currentTabInfo.url.startsWith("http")) {
      try {
        const cleanUrlObj = new URL(currentTabInfo.url);
        const originAndPath = `${cleanUrlObj.origin}${cleanUrlObj.pathname}`;
        siteTarget = originAndPath.length <= 250 ? originAndPath : cleanUrlObj.hostname;
      } catch (_) {
        siteTarget = currentTabInfo.domain || "online-store";
      }
    }

    const idempotencyRaw = `${childSession.email || "child"}:${siteTarget}:${itemName}:${amount.toFixed(2)}`;
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
    submitRequestBtn.textContent = "[ SEND TO PARENT FOR APPROVAL ]";
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

function syncLiveTrackerWithRequests(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return;

  // Sort newest first so the most recent request takes priority
  const sortedRequests = [...requests].sort((a, b) => (b.id || 0) - (a.id || 0));

  // 1. If we are already tracking a specific request ID, keep its live status updated
  if (activeTrackedRequestId) {
    const tracked = sortedRequests.find((r) => r.id === activeTrackedRequestId);
    if (tracked) {
      showLiveApprovalTracker(tracked);
      return;
    }
  }

  if (userDismissedTrackerForForm) return;

  // 2. If the child is on a Shopping Cart / Checkout page, recognize their approved/pending item for this merchant domain & amount
  if (currentTabInfo.isCartOrCheckout && currentTabInfo.domain) {
    const currentHostClean = currentTabInfo.domain.replace(/^www\./i, "").toLowerCase();
    const activeCartAmount = currentTabInfo.detectedOptions[0] ? currentTabInfo.detectedOptions[0].amount : null;
    const matchingDomainReq = sortedRequests.find((r) => {
      if (r.status !== "APPROVED" && r.status !== "PENDING") return false;
      const reqHost = getCleanDomainLabel(r.siteDomain).replace(/^www\./i, "").toLowerCase();
      const domainMatches = reqHost === currentHostClean || reqHost.includes(currentHostClean) || currentHostClean.includes(reqHost);
      if (!domainMatches) return false;
      if (activeCartAmount !== null && r.amount) {
        return Math.abs(Number(r.amount) - activeCartAmount) < 0.02;
      }
      return true;
    });
    if (matchingDomainReq) {
      showLiveApprovalTracker(matchingDomainReq);
      return;
    }
  }

  // 3. On a Product Page, check if this exact product URL or product title already has a PENDING or APPROVED request
  const currentUrlClean = (currentTabInfo.url || "").split("?")[0].replace(/\/$/, "").toLowerCase();
  const currentTitleClean = (itemNameInput.value || currentTabInfo.title || "").trim().toLowerCase();

  const matchingForPage = sortedRequests.find((r) => {
    if (r.status !== "PENDING" && r.status !== "APPROVED") return false;
    const reqSiteClean = (r.siteDomain || "").split("?")[0].replace(/\/$/, "").toLowerCase();
    const reqTitleClean = (r.itemName || "").trim().toLowerCase();

    const exactPageUrlMatch =
      currentUrlClean &&
      reqSiteClean &&
      reqSiteClean.includes("/") &&
      (currentUrlClean === reqSiteClean || currentUrlClean.startsWith(reqSiteClean));

    const exactItemTitleMatch =
      currentTitleClean &&
      reqTitleClean &&
      currentTitleClean === reqTitleClean;

    return exactPageUrlMatch || exactItemTitleMatch;
  });

  if (matchingForPage) {
    showLiveApprovalTracker(matchingForPage);
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
        <span class="empty-sub">When you submit requests on any online store, they will appear here.</span>
      </div>
    `;
    return;
  }

  requestCountBadge.textContent = requests.length.toString();
  requestsListContainer.innerHTML = "";

  requests.sort((a, b) => b.id - a.id);

  requests.forEach(req => {
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
        <span class="card-item-title">${escapeHtml(req.itemName || "Product Request")}</span>
        <span class="card-amount-badge">${escapeHtml(formattedAmount)}</span>
      </div>
      <div class="card-middle-row">
        <span class="card-domain-tag">${escapeHtml(cleanDomain)}</span>
        <span class="card-status-badge ${statusClass}">[ ${statusText} ]</span>
      </div>
      ${showCryptoRow ? `<div id="${proofRowId}" class="crypto-proof-row verified"><span>PARENT APPROVAL</span><span>[ READY TO BUY ]</span></div>` : ""}
      ${req.note ? `<div class="card-note-row">"${escapeHtml(req.note)}"</div>` : ""}
    `;

    requestsListContainer.appendChild(card);

    if (showCryptoRow && window.ParentGuardCrypto) {
      window.ParentGuardCrypto.verifyPurchaseApproval(req, CONFIG.apiBaseUrl).then((res) => {
        const proofEl = document.getElementById(proofRowId);
        if (!proofEl) return;
        if (res.valid) {
          proofEl.className = "crypto-proof-row verified";
          proofEl.innerHTML = `<span>PARENT APPROVAL</span><span>[ UNLOCKED &amp; READY ]</span>`;
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
