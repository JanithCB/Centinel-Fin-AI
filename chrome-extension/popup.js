/**
 * Centinel Fin AI – ParentGuard
 * Child Extension Popup Controller (Product-Page Lock & Smart Saved Combo Cart)
 *
 * Responsibilities:
 * - Authenticate child via Supabase Auth
 * - Auto-detect active product page (canonical product URL preserving variant/item IDs, editions, live prices, .lk LKR support)
 * - Allow child to save products into the SAVED COMBO CART tab and either visit them later, request a single item,
 *   or combine multiple saved items into ONE Combo Request with all itemized prices and direct product URLs
 * - Track live parent approval status and unlock approved single or combo items on their respective product pages
 */

const CONFIG = {
  apiBaseUrl: "http://localhost:8080/api/v1",
  supabaseAuthUrl: "https://bllntgtyksncfahhdxga.supabase.co/auth/v1/token?grant_type=password",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbG50Z3R5a3NuY2ZhaGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODY4NjIsImV4cCI6MjEwMzA2Mjg2Mn0.OdpZ7VfSTgbIfAyzPfFnhv_JOY5rrT9CqVuMXhLTpM0"
};

const SAVED_ITEMS_KEY_PREFIX = "parentguard_saved_items";

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
  detectedOptions: [],
  selectedProductUrl: null,
  selectedDiscountPct: null,
  selectedOriginalPrice: null
};
let childSession = {
  token: null,
  email: null
};
let savedProductsList = [];
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
const tabSavedItems = document.getElementById("tabSavedItems");
const tabMyRequests = document.getElementById("tabMyRequests");
const savedCountBadge = document.getElementById("savedCountBadge");
const requestCountBadge = document.getElementById("requestCountBadge");
const newRequestView = document.getElementById("newRequestView");
const savedItemsView = document.getElementById("savedItemsView");
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
const optionsCountBadge = document.getElementById("optionsCountBadge");
const refreshTabBtn = document.getElementById("refreshTabBtn");

const cartPageGuidanceCard = document.getElementById("cartPageGuidanceCard");
const goToSavedFromCartBtn = document.getElementById("goToSavedFromCartBtn");
const goToHistoryFromCartBtn = document.getElementById("goToHistoryFromCartBtn");

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
const saveForLaterBtn = document.getElementById("saveForLaterBtn");
const submitRequestBtn = document.getElementById("submitRequestBtn");
const submissionAlert = document.getElementById("submissionAlert");

const savedItemsListContainer = document.getElementById("savedItemsListContainer");
const selectAllSavedBtn = document.getElementById("selectAllSavedBtn");
const clearSavedItemsBtn = document.getElementById("clearSavedItemsBtn");
const savedComboCheckoutBox = document.getElementById("savedComboCheckoutBox");
const comboSelectedCountLabel = document.getElementById("comboSelectedCountLabel");
const comboTotalBadge = document.getElementById("comboTotalBadge");
const comboPreviewTitleBox = document.getElementById("comboPreviewTitleBox");
const comboReasonInput = document.getElementById("comboReasonInput");
const comboSubmissionAlert = document.getElementById("comboSubmissionAlert");
const submitComboRequestBtn = document.getElementById("submitComboRequestBtn");

const requestsListContainer = document.getElementById("requestsListContainer");
const refreshRequestsBtn = document.getElementById("refreshRequestsBtn");

// Helper: Infer regional currency from country TLD (.lk -> LKR, .uk -> GBP, etc.)
function inferTldCurrency(hostname) {
  const h = (hostname || "").toLowerCase().trim();
  if (h.endsWith(".lk")) return "LKR";
  if (h.endsWith(".uk") || h.endsWith(".co.uk")) return "GBP";
  if (h.endsWith(".in") || h.endsWith(".co.in")) return "INR";
  if (h.endsWith(".au") || h.endsWith(".com.au")) return "AUD";
  if (h.endsWith(".ca")) return "CAD";
  if (h.endsWith(".sg") || h.endsWith(".com.sg")) return "SGD";
  if (h.endsWith(".jp") || h.endsWith(".co.jp")) return "JPY";
  if (/\.(de|fr|it|es|nl|be|at|ie|pt|fi|eu)$/.test(h)) return "EUR";
  return null;
}

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

function getCanonicalProductUrl(urlString) {
  if (!urlString) return "";
  try {
    const withScheme = /^https?:\/\//i.test(urlString) ? urlString : `https://${urlString}`;
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
    return urlString;
  }
}

function getSavedItemsStorageKey() {
  const emailScope = (childSession.email || "guest").trim().toLowerCase();
  return `${SAVED_ITEMS_KEY_PREFIX}_${emailScope}`;
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadAuthState();
  await loadSavedProducts();
  await detectActiveTab();
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
  refreshTabBtn.addEventListener("click", () => {
    userDismissedTrackerForForm = false;
    detectActiveTab(true);
  });
  purchaseForm.addEventListener("submit", handlePurchaseSubmit);
  saveForLaterBtn.addEventListener("click", handleSaveForLater);
  clearSavedItemsBtn.addEventListener("click", handleClearAllSavedItems);
  if (selectAllSavedBtn) {
    selectAllSavedBtn.addEventListener("click", handleToggleSelectAllSaved);
  }
  if (submitComboRequestBtn) {
    submitComboRequestBtn.addEventListener("click", handleComboPurchaseSubmit);
  }
  refreshRequestsBtn.addEventListener("click", () => fetchMyRequests(true));

  if (goToSavedFromCartBtn) {
    goToSavedFromCartBtn.addEventListener("click", () => {
      switchTab("savedItemsView");
      renderSavedProductsList();
    });
  }
  if (goToHistoryFromCartBtn) {
    goToHistoryFromCartBtn.addEventListener("click", () => {
      switchTab("myRequestsView");
      fetchMyRequests();
    });
  }

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
  tabSavedItems.addEventListener("click", () => {
    switchTab("savedItemsView");
    renderSavedProductsList();
  });
  tabMyRequests.addEventListener("click", () => {
    switchTab("myRequestsView");
    fetchMyRequests();
  });
}

function switchTab(viewId) {
  tabNewRequest.classList.toggle("active", viewId === "newRequestView");
  tabSavedItems.classList.toggle("active", viewId === "savedItemsView");
  tabMyRequests.classList.toggle("active", viewId === "myRequestsView");

  newRequestView.classList.toggle("hidden", viewId !== "newRequestView");
  savedItemsView.classList.toggle("hidden", viewId !== "savedItemsView");
  myRequestsView.classList.toggle("hidden", viewId !== "myRequestsView");
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
    trackerHeadline.textContent = "APPROVED — YOU CAN ADD TO CART!";
    trackerSubtext.textContent =
      "Your parent approved this request! Add to Cart is now unlocked on the approved product page(s).";
    trackerAutoSyncTag.textContent = "READY TO BUY";

    triggerDirectTabUnlock();
  } else if (req.status === "DENIED") {
    liveApprovalTracker.classList.add("state-denied");
    trackerStatusBadge.classList.add("denied");
    trackerStatusBadge.textContent = "[ DECLINED BY PARENT ]";
    trackerLoaderAnim.classList.add("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.remove("hidden");
    trackerHeadline.textContent = "REQUEST NOT APPROVED";
    trackerSubtext.textContent =
      "Your parent declined this request. You can talk with your parent or choose a different item below.";
    trackerAutoSyncTag.textContent = "REMAINS LOCKED";
  } else {
    trackerStatusBadge.classList.add("pending");
    trackerStatusBadge.textContent = "[ WAITING FOR PARENT ]";
    trackerLoaderAnim.classList.remove("hidden");
    trackerApprovedIcon.classList.add("hidden");
    trackerDeniedIcon.classList.add("hidden");
    trackerHeadline.textContent = "WAITING FOR PARENT APPROVAL...";
    trackerSubtext.textContent =
      "Sent to your parent! Keep your store tab open — Add to Cart will unlock automatically as soon as they approve.";
    trackerAutoSyncTag.textContent = "WAITING FOR RESPONSE";
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
  } catch (_) {}
}

function updateCurrencySymbol(currencyCode) {
  if (currencyPrefixSymbol) {
    currencyPrefixSymbol.textContent = CURRENCY_SYMBOLS[currencyCode] || "$";
  }
}

/**
 * Inspect active browser tab and extract product editions, live prices, and canonical URL
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
        detectedOptions: [],
        selectedProductUrl: null
      };
      detectedModeLabel.textContent = "NO STORE PAGE ACTIVE";
      detectedDomainDisplay.textContent = "OPEN A STORE PRODUCT";
      detectedUrlDisplay.textContent = "Visit any online store product page to auto-detect item & price.";
      optionsCountBadge.classList.add("hidden");
      productOptionGroup.classList.add("hidden");
      if (cartPageGuidanceCard) cartPageGuidanceCard.classList.add("hidden");
      purchaseForm.classList.remove("hidden");
      enableManualInputs();
      return;
    }

    const parsedUrl = new URL(urlString);
    const canonicalUrl = getCanonicalProductUrl(urlString);
    const isCartPage = isCartOrCheckoutUrl(urlString);

    currentTabInfo.url = canonicalUrl;
    currentTabInfo.domain = parsedUrl.hostname;
    currentTabInfo.isCartOrCheckout = isCartPage;
    currentTabInfo.selectedProductUrl = isCartPage ? null : canonicalUrl;

    let cleanTitle = (activeTab.title || "")
      .replace(/^Save\s+\d+%\s+on\s+/i, "")
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
    currentTabInfo.title = cleanTitle;

    categorySelect.value = inferCategoryFromHostname(parsedUrl.hostname);
    detectedDomainDisplay.textContent = currentTabInfo.domain;

    // Default currency from country TLD (.lk -> LKR, etc.) before scraping
    const tldCur = inferTldCurrency(parsedUrl.hostname);
    if (tldCur && currencySelect.querySelector(`option[value="${tldCur}"]`)) {
      currencySelect.value = tldCur;
      updateCurrencySymbol(tldCur);
    }

    const extraction = await scrapeProductsFromTab(activeTab.id);

    if (extraction && typeof extraction.isCartOrCheckout === "boolean") {
      currentTabInfo.isCartOrCheckout = extraction.isCartOrCheckout;
    }

    if (currentTabInfo.isCartOrCheckout) {
      currentTabInfo.selectedProductUrl = null;
      currentTabInfo.detectedOptions = [];
      detectedModeLabel.textContent = "SHOPPING CART PAGE";
      detectedUrlDisplay.textContent = `${currentTabInfo.domain} (Open a product page to save or request)`;
      optionsCountBadge.classList.add("hidden");
      productOptionGroup.classList.add("hidden");
      purchaseForm.classList.add("hidden");
      if (cartPageGuidanceCard) cartPageGuidanceCard.classList.remove("hidden");
      return;
    }

    if (cartPageGuidanceCard) cartPageGuidanceCard.classList.add("hidden");
    purchaseForm.classList.remove("hidden");
    detectedModeLabel.textContent = "ACTIVE STORE PAGE";
    detectedUrlDisplay.textContent = canonicalUrl;

    if (extraction && Array.isArray(extraction.options) && extraction.options.length > 0) {
      currentTabInfo.detectedOptions = extraction.options;
      if (extraction.pageTitle) {
        currentTabInfo.title = extraction.pageTitle;
      }
      renderProductOptionsDropdown(extraction.options);
      await syncSavedItemsWithLivePrices(canonicalUrl, extraction.options);
    } else {
      currentTabInfo.detectedOptions = [];
      optionsCountBadge.classList.add("hidden");
      productOptionGroup.classList.add("hidden");
      enableManualInputs();

      if (extraction && extraction.defaultCategory) {
        categorySelect.value = extraction.defaultCategory;
      }

      if ((forceRescan || !itemNameInput.value.trim()) && currentTabInfo.title) {
        itemNameInput.value = currentTabInfo.title;
      }
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to read active tab:", err);
    detectedDomainDisplay.textContent = "MANUAL ENTRY";
    detectedUrlDisplay.textContent = "Enter store product details below.";
    enableManualInputs();
  }
}

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
  } catch (_) {}

  return null;
}

function renderProductOptionsDropdown(options) {
  const count = options.length;
  optionsCountBadge.textContent = `${count} ${count === 1 ? "OPTION" : "OPTIONS"}`;
  optionsCountBadge.classList.remove("hidden");

  productOptionGroup.classList.remove("hidden");
  productOptionSelect.innerHTML = "";

  options.forEach((opt, index) => {
    const optionEl = document.createElement("option");
    optionEl.value = String(index);

    const symbol = CURRENCY_SYMBOLS[opt.currency] || (opt.currency + " ");
    const priceStr = `${symbol}${opt.amount.toFixed(2)}`;
    const discountStr = opt.discountPct ? ` (${opt.discountPct})` : "";

    const maxTitleLen = 26;
    const shortTitle = opt.title.length > maxTitleLen ? opt.title.substring(0, maxTitleLen - 2) + ".." : opt.title;
    optionEl.textContent = `${shortTitle} \u2014 ${priceStr}${discountStr}`;
    productOptionSelect.appendChild(optionEl);
  });

  const manualOptionEl = document.createElement("option");
  manualOptionEl.value = "MANUAL";
  manualOptionEl.textContent = "Custom / Enter Details Manually...";
  productOptionSelect.appendChild(manualOptionEl);

  productOptionSelect.value = "0";
  applySelectedOption("0");
}

function applySelectedOption(selectedValue) {
  if (selectedValue === "MANUAL") {
    enableManualInputs();
    priceVerifiedTag.textContent = "CUSTOM ENTRY";
    selectedOptionDiscountBar.classList.add("hidden");
    itemNameInput.focus();
    return;
  }

  const index = parseInt(selectedValue, 10);
  const opt = currentTabInfo.detectedOptions[index];
  if (!opt) return;

  currentTabInfo.selectedProductUrl = getCanonicalProductUrl(opt.productUrl || currentTabInfo.url);
  currentTabInfo.selectedDiscountPct = opt.discountPct || null;
  currentTabInfo.selectedOriginalPrice = opt.originalPrice || null;

  priceVerifiedTag.textContent = "STORE PRICE";

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
    amountLockStatus.textContent = "[ STORE PRICE ]";
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
      ? `On Sale (Original: ${opt.originalPrice})`
      : `Special Offer (${opt.discountPct})`;
    selectedOptionDiscountBar.classList.remove("hidden");
  } else {
    selectedOptionDiscountBar.classList.add("hidden");
  }
}

function enableManualInputs() {
  itemNameInput.readOnly = false;
  itemNameInput.classList.remove("neo-input-locked");
  if (titleLockStatus) {
    titleLockStatus.textContent = "[ CUSTOM ]";
    titleLockStatus.className = "locked-badge manual";
  }

  amountInput.readOnly = false;
  amountInput.classList.remove("neo-input-locked");
  if (amountLockStatus) {
    amountLockStatus.textContent = "[ CUSTOM ]";
    amountLockStatus.className = "locked-badge manual";
  }

  currencySelect.disabled = false;
  currencySelect.classList.remove("neo-select-locked");
  if (currencyLockStatus) {
    currencyLockStatus.textContent = "[ CUSTOM ]";
    currencyLockStatus.className = "locked-badge manual";
  }
}

// ============================================================================
// SMART SAVED COMBO CART (Save Product URLs & Combine Multiple Items into One Parent Request)
// ============================================================================

async function loadSavedProducts() {
  try {
    const scopedKey = getSavedItemsStorageKey();
    const data = await chrome.storage.local.get([scopedKey, SAVED_ITEMS_KEY_PREFIX]);
    if (Array.isArray(data[scopedKey])) {
      savedProductsList = data[scopedKey].map((it) => ({ ...it, selected: it.selected !== false }));
    } else if (childSession.email && Array.isArray(data[SAVED_ITEMS_KEY_PREFIX]) && data[SAVED_ITEMS_KEY_PREFIX].length > 0) {
      savedProductsList = data[SAVED_ITEMS_KEY_PREFIX].map((it) => ({ ...it, selected: it.selected !== false }));
      await chrome.storage.local.set({ [scopedKey]: savedProductsList });
      await chrome.storage.local.remove([SAVED_ITEMS_KEY_PREFIX]);
    } else {
      savedProductsList = [];
    }
  } catch (_) {
    savedProductsList = [];
  }
  updateSavedCountBadge();
  renderSavedProductsList();
}

async function persistSavedProducts() {
  try {
    const scopedKey = getSavedItemsStorageKey();
    await chrome.storage.local.set({ [scopedKey]: savedProductsList });
  } catch (_) {}
  updateSavedCountBadge();
  renderSavedProductsList();
}

function updateSavedCountBadge() {
  if (savedCountBadge) {
    savedCountBadge.textContent = String(savedProductsList.length);
  }
  if (clearSavedItemsBtn) {
    clearSavedItemsBtn.classList.toggle("hidden", savedProductsList.length === 0);
  }
  if (selectAllSavedBtn) {
    selectAllSavedBtn.classList.toggle("hidden", savedProductsList.length <= 1);
    const allSelected = savedProductsList.length > 0 && savedProductsList.every((it) => it.selected !== false);
    selectAllSavedBtn.textContent = allSelected ? "UNSELECT ALL" : "SELECT ALL";
  }
}

async function handleToggleSelectAllSaved() {
  const allSelected = savedProductsList.length > 0 && savedProductsList.every((it) => it.selected !== false);
  savedProductsList = savedProductsList.map((it) => ({ ...it, selected: !allSelected }));
  await persistSavedProducts();
}

async function syncSavedItemsWithLivePrices(canonicalUrl, liveOptions) {
  if (!canonicalUrl || !Array.isArray(liveOptions) || liveOptions.length === 0 || savedProductsList.length === 0) {
    return;
  }
  let updated = false;
  savedProductsList = savedProductsList.map((saved) => {
    if (getCanonicalProductUrl(saved.productUrl) !== canonicalUrl) return saved;
    const matchingOpt = liveOptions.find(
      (o) => o.title.toLowerCase() === (saved.title || "").toLowerCase()
    ) || (liveOptions.length === 1 ? liveOptions[0] : null);

    if (matchingOpt && Math.abs(matchingOpt.amount - Number(saved.amount)) >= 0.01) {
      updated = true;
      return {
        ...saved,
        amount: matchingOpt.amount,
        currency: matchingOpt.currency || saved.currency,
        discountPct: matchingOpt.discountPct || null
      };
    }
    return saved;
  });

  if (updated) {
    await persistSavedProducts();
  }
}

async function handleSaveForLater() {
  hideAlert();

  const title = itemNameInput.value.trim();
  const amountStr = amountInput.value.trim();
  const currency = currencySelect.value || "USD";
  const category = categorySelect.value || "SHOPPING";
  const productUrl = getCanonicalProductUrl(currentTabInfo.selectedProductUrl || currentTabInfo.url);

  if (!productUrl || !productUrl.startsWith("http") || isCartOrCheckoutUrl(productUrl)) {
    showAlert("Please save items directly from their product page so the product link can be reopened later.", "error");
    return;
  }

  if (!title) {
    showAlert("Please enter the product name in the PRODUCT NAME field before saving.", "error");
    itemNameInput.focus();
    return;
  }

  if (!amountStr) {
    showAlert("Could not auto-detect the price on this page. Please enter the product price in the PRICE box above, then click Add to Saved Cart.", "error");
    amountInput.focus();
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showAlert("Please enter a valid price greater than 0 in the PRICE box.", "error");
    amountInput.focus();
    return;
  }

  const domain = getCleanDomainLabel(productUrl);
  const existingIdx = savedProductsList.findIndex(
    (item) =>
      getCanonicalProductUrl(item.productUrl).toLowerCase() === productUrl.toLowerCase() &&
      (item.title || "").toLowerCase() === title.toLowerCase()
  );

  const savedEntry = {
    id: existingIdx !== -1 ? savedProductsList[existingIdx].id : `saved_${Date.now()}`,
    title: title,
    amount: Number(amount.toFixed(2)),
    currency: currency,
    category: category,
    discountPct: currentTabInfo.selectedDiscountPct || null,
    domain: domain,
    productUrl: productUrl,
    selected: true,
    savedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    savedProductsList[existingIdx] = savedEntry;
  } else {
    savedProductsList.unshift(savedEntry);
  }

  await persistSavedProducts();

  const origText = saveForLaterBtn.textContent;
  saveForLaterBtn.textContent = "[ ADDED TO SAVED CART ]";
  showAlert(`Added "${title}" to your SAVED CART (${savedProductsList.length} item${savedProductsList.length === 1 ? "" : "s"}). Open the SAVED tab to send a combined combo request!`, "success");
  setTimeout(() => {
    saveForLaterBtn.textContent = origText;
  }, 1800);
}

async function handleClearAllSavedItems() {
  savedProductsList = [];
  await persistSavedProducts();
}

async function removeSavedProductById(savedId) {
  savedProductsList = savedProductsList.filter((item) => item.id !== savedId);
  await persistSavedProducts();
}

async function toggleSavedProductSelection(savedId, isSelected) {
  savedProductsList = savedProductsList.map((item) =>
    item.id === savedId ? { ...item, selected: Boolean(isSelected) } : item
  );
  await persistSavedProducts();
}

async function openSavedProductPage(item) {
  if (!item || !item.productUrl) return;
  try {
    const targetUrl = getCanonicalProductUrl(item.productUrl);
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const existingTab = tabs.find(
      (t) => t.url && getCanonicalProductUrl(t.url).toLowerCase() === targetUrl.toLowerCase()
    );
    if (existingTab && existingTab.id) {
      await chrome.tabs.update(existingTab.id, { active: true });
    } else {
      await chrome.tabs.create({ url: item.productUrl, active: true });
    }
  } catch (_) {
    window.open(item.productUrl, "_blank");
  }
}

async function loadSavedProductIntoRequestForm(item) {
  if (!item || !item.productUrl) return;

  const savedCanonical = getCanonicalProductUrl(item.productUrl).toLowerCase();
  const activeCanonical = getCanonicalProductUrl(currentTabInfo.url).toLowerCase();

  if (!activeCanonical || activeCanonical !== savedCanonical) {
    await openSavedProductPage(item);
    return;
  }

  userDismissedTrackerForForm = true;
  activeTrackedRequestId = null;
  hideLiveApprovalTracker();
  hideAlert();

  if (cartPageGuidanceCard) cartPageGuidanceCard.classList.add("hidden");
  purchaseForm.classList.remove("hidden");

  await detectActiveTab(true);

  if (Array.isArray(currentTabInfo.detectedOptions) && currentTabInfo.detectedOptions.length > 0) {
    const matchIdx = currentTabInfo.detectedOptions.findIndex(
      (o) => o.title.toLowerCase() === (item.title || "").toLowerCase()
    );
    if (matchIdx !== -1) {
      productOptionSelect.value = String(matchIdx);
      applySelectedOption(String(matchIdx));
    }
  }

  switchTab("newRequestView");
  reasonInput.focus();
}

function buildComboSummaryFromItems(selectedItems) {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return {
      count: 0,
      totalAmount: 0,
      currency: "USD",
      hasMixedCurrencies: false,
      comboTitle: "",
      itemLinks: []
    };
  }

  const primaryCurrency = (selectedItems[0].currency || "USD").toUpperCase();
  const hasMixedCurrencies = selectedItems.some(
    (it) => (it.currency || "USD").toUpperCase() !== primaryCurrency
  );
  const sym = CURRENCY_SYMBOLS[primaryCurrency] || `${primaryCurrency} `;

  const totalAmount = Number(
    selectedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0).toFixed(2)
  );

  let comboTitle = "";
  if (selectedItems.length === 1) {
    comboTitle = selectedItems[0].title;
  } else {
    const parts = selectedItems.map((it) => `${it.title} (${sym}${Number(it.amount).toFixed(2)})`);
    const joined = parts.join(" + ");
    if (joined.length <= 460) {
      comboTitle = joined;
    } else {
      let acc = parts[0];
      let included = 1;
      for (let i = 1; i < parts.length; i++) {
        if ((acc + " + " + parts[i]).length > 420) break;
        acc += " + " + parts[i];
        included++;
      }
      const rem = parts.length - included;
      comboTitle = rem > 0 ? `${acc} + ${rem} more items` : acc;
    }
  }

  const itemLinks = selectedItems
    .map((it) => getCanonicalProductUrl(it.productUrl))
    .filter(Boolean);

  return {
    count: selectedItems.length,
    totalAmount,
    currency: primaryCurrency,
    hasMixedCurrencies,
    comboTitle,
    itemLinks
  };
}

function updateSavedComboCheckoutSummary() {
  if (!savedComboCheckoutBox) return;

  if (!Array.isArray(savedProductsList) || savedProductsList.length === 0) {
    savedComboCheckoutBox.classList.add("hidden");
    return;
  }

  savedComboCheckoutBox.classList.remove("hidden");
  const selectedItems = savedProductsList.filter((it) => it.selected !== false);
  const summary = buildComboSummaryFromItems(selectedItems);

  const sym = CURRENCY_SYMBOLS[summary.currency] || `${summary.currency} `;
  comboSelectedCountLabel.textContent = `${summary.count} ${summary.count === 1 ? "ITEM" : "ITEMS"} SELECTED FOR COMBO`;
  comboTotalBadge.textContent = `${sym}${summary.totalAmount.toFixed(2)} ${summary.currency}`;

  if (summary.count === 0) {
    comboPreviewTitleBox.textContent = "Check at least one item above to send a request to your parent.";
    submitComboRequestBtn.disabled = true;
    submitComboRequestBtn.textContent = "[ SELECT ITEMS ABOVE ]";
  } else {
    comboPreviewTitleBox.textContent = summary.comboTitle;
    submitComboRequestBtn.disabled = false;
    submitComboRequestBtn.textContent =
      summary.count === 1
        ? `[ SEND 1 ITEM TO PARENT (${sym}${summary.totalAmount.toFixed(2)}) ]`
        : `[ SEND COMBO TO PARENT (${summary.count} ITEMS \u2014 ${sym}${summary.totalAmount.toFixed(2)}) ]`;
  }
}

function showComboAlert(message, type) {
  if (!comboSubmissionAlert) return;
  comboSubmissionAlert.textContent = message;
  comboSubmissionAlert.className = `alert-box alert-${type}`;
  comboSubmissionAlert.classList.remove("hidden");
}

function hideComboAlert() {
  if (!comboSubmissionAlert) return;
  comboSubmissionAlert.classList.add("hidden");
}

async function handleComboPurchaseSubmit() {
  hideComboAlert();

  if (!childSession.token) {
    showComboAlert("Please sign in before sending a combo request.", "error");
    return;
  }

  const selectedItems = savedProductsList.filter((it) => it.selected !== false);
  if (selectedItems.length === 0) {
    showComboAlert("Please check at least one saved item to send to your parent.", "error");
    return;
  }

  const summary = buildComboSummaryFromItems(selectedItems);
  if (summary.hasMixedCurrencies) {
    showComboAlert("All items in a single combo request must use the same currency (e.g. all USD or all LKR). Uncheck items from other currencies.", "error");
    return;
  }

  const note = (comboReasonInput ? comboReasonInput.value : "").trim();
  if (!note) {
    showComboAlert("Please enter a short note for your parent explaining this combo.", "error");
    if (comboReasonInput) comboReasonInput.focus();
    return;
  }

  submitComboRequestBtn.disabled = true;
  submitComboRequestBtn.textContent = "SENDING COMBO TO PARENT...";

  try {
    let primarySiteTarget = summary.itemLinks[0] || selectedItems[0].domain || "online-store";
    if (primarySiteTarget.startsWith("http") && primarySiteTarget.length > 250) {
      primarySiteTarget = new URL(primarySiteTarget).hostname;
    }

    const enrichedNote =
      summary.itemLinks.length > 0
        ? `${note}\n[CART_LINKS]${summary.itemLinks.join("|")}[/CART_LINKS]`
        : note;

    const category = selectedItems[0].category || "SHOPPING";
    const idempotencyRaw = `${childSession.email || "child"}:${primarySiteTarget}:${summary.comboTitle.toLowerCase()}:${summary.totalAmount.toFixed(2)}:${summary.currency}`;
    const idempotencyKey = await computeSha256(idempotencyRaw);

    const payload = {
      siteDomain: primarySiteTarget,
      itemName: summary.comboTitle,
      amount: summary.totalAmount,
      currency: summary.currency,
      category: category,
      note: enrichedNote
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

    if (response.status === 201 || response.status === 200 || response.status === 409) {
      if (comboReasonInput) comboReasonInput.value = "";
      userDismissedTrackerForForm = false;
      const submittedReq = (result && result.id) ? result : {
        id: result.id || null,
        itemName: summary.comboTitle,
        amount: summary.totalAmount,
        currency: summary.currency,
        siteDomain: primarySiteTarget,
        status: "PENDING"
      };
      switchTab("newRequestView");
      showLiveApprovalTracker(submittedReq);
      fetchMyRequests();
    } else if (response.status === 401 || response.status === 403) {
      showComboAlert(result.message || "Your session has expired. Please sign in again.", "error");
      if (response.status === 401) {
        handleLogout();
      }
    } else {
      showComboAlert(result.message || "Could not send combo request right now. Please try again.", "error");
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Combo submit error:", err);
    showComboAlert("Unable to reach ParentGuard service. Please try again in a moment.", "error");
  } finally {
    updateSavedComboCheckoutSummary();
  }
}

function formatSavedTime(isoString) {
  if (!isoString) return "Saved recently";
  try {
    const d = new Date(isoString);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return "Saved just now";
    if (diffMins < 60) return `Saved ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Saved ${diffHours}h ago`;
    return `Saved ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  } catch (_) {
    return "Saved";
  }
}

function renderSavedProductsList() {
  if (!savedItemsListContainer) return;

  if (!Array.isArray(savedProductsList) || savedProductsList.length === 0) {
    savedItemsListContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-title">YOUR SAVED CART IS EMPTY</span>
        <span class="empty-sub">Click "+ ADD TO SAVED CART" on any product page to collect items here. You can visit them later or send them all together as one combo request to your parent!</span>
      </div>
    `;
    updateSavedComboCheckoutSummary();
    return;
  }

  savedItemsListContainer.innerHTML = "";

  savedProductsList.forEach((item) => {
    const isChecked = item.selected !== false;
    const card = document.createElement("div");
    card.className = `saved-item-card ${isChecked ? "selected-for-combo" : ""}`;

    const sym = CURRENCY_SYMBOLS[item.currency] || ((item.currency || "USD") + " ");
    const formattedPrice = `${sym}${Number(item.amount || 0).toFixed(2)}`;
    const discountHtml = item.discountPct
      ? `<span class="discount-pct-pill" style="margin-right: 4px;">${escapeHtml(item.discountPct)}</span>`
      : "";

    card.innerHTML = `
      <div class="card-top-row">
        <label class="saved-item-check-label">
          <input type="checkbox" class="saved-combo-checkbox" ${isChecked ? "checked" : ""}>
          <span class="card-item-title">${escapeHtml(item.title)}</span>
        </label>
        <div>
          ${discountHtml}
          <span class="card-amount-badge">${escapeHtml(formattedPrice)}</span>
        </div>
      </div>
      <div class="saved-item-meta-row">
        <span class="card-domain-tag">${escapeHtml(item.domain || getCleanDomainLabel(item.productUrl))}</span>
        <span>${escapeHtml(formatSavedTime(item.savedAt))}</span>
      </div>
      <div class="saved-item-url-preview" title="${escapeHtml(item.productUrl)}">${escapeHtml(item.productUrl)}</div>
      <div class="saved-item-actions">
        <button type="button" class="saved-action-btn visit" data-action="visit">[ OPEN PAGE &rarr; ]</button>
        <button type="button" class="saved-action-btn ask" data-action="ask">[ ASK SINGLE ]</button>
        <button type="button" class="saved-action-btn remove" data-action="remove" title="Remove from saved cart">REMOVE</button>
      </div>
    `;

    const checkbox = card.querySelector(".saved-combo-checkbox");
    const visitBtn = card.querySelector("[data-action='visit']");
    const askBtn = card.querySelector("[data-action='ask']");
    const removeBtn = card.querySelector("[data-action='remove']");

    if (checkbox) {
      checkbox.addEventListener("change", (e) => toggleSavedProductSelection(item.id, e.target.checked));
    }
    if (visitBtn) visitBtn.addEventListener("click", () => openSavedProductPage(item));
    if (askBtn) askBtn.addEventListener("click", () => loadSavedProductIntoRequestForm(item));
    if (removeBtn) removeBtn.addEventListener("click", () => removeSavedProductById(item.id));

    savedItemsListContainer.appendChild(card);
  });

  updateSavedComboCheckoutSummary();
}

// ============================================================================
// AUTHENTICATION & SINGLE PURCHASE REQUEST SUBMISSION
// ============================================================================

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
  savedItemsView.classList.add("hidden");
  myRequestsView.classList.add("hidden");
  loggedOutView.classList.remove("hidden");
  childSession.token = null;
  childSession.email = null;
}

async function handleLogin(e) {
  e.preventDefault();
  loginErrorMsg.classList.add("hidden");
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "SIGNING IN...";

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
      throw new Error(data.error_description || data.msg || "Sign in failed. Please check your email and password.");
    }

    if (data.access_token) {
      childSession.token = data.access_token;
      childSession.email = data.user ? data.user.email : email;

      await chrome.storage.local.set({
        childToken: childSession.token,
        childEmail: childSession.email
      });

      showLoggedInState();
      await loadSavedProducts();
      await detectActiveTab(true);
      fetchMyRequests();
    }
  } catch (err) {
    loginErrorMsg.textContent = err.message || "Unable to sign in. Please verify your account details.";
    loginErrorMsg.classList.remove("hidden");
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "SIGN IN \u2192";
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(["childToken", "childEmail"]);
  childSession.token = null;
  childSession.email = null;
  savedProductsList = [];
  updateSavedCountBadge();
  showLoggedOutState();
}

async function computeSha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handlePurchaseSubmit(e) {
  e.preventDefault();
  hideAlert();

  if (!childSession.token) {
    showAlert("Please sign in before sending a request.", "error");
    showLoggedOutState();
    return;
  }

  const targetCandidateUrl = currentTabInfo.selectedProductUrl || currentTabInfo.url || "";
  if (
    currentTabInfo.isCartOrCheckout ||
    !currentTabInfo.selectedProductUrl ||
    isCartOrCheckoutUrl(targetCandidateUrl)
  ) {
    showAlert("Please open the specific product page to send a request so your parent can view the item.", "error");
    return;
  }

  const itemName = itemNameInput.value.trim();
  const amountStr = amountInput.value.trim();
  const currency = currencySelect.value;
  const category = categorySelect.value;
  const note = reasonInput.value.trim();

  if (!itemName) {
    showAlert("Please enter the product name.", "error");
    itemNameInput.focus();
    return;
  }

  if (!amountStr) {
    showAlert("Please enter the product price in the PRICE box above.", "error");
    amountInput.focus();
    return;
  }

  if (!note) {
    showAlert("Please fill in a short note for your parent.", "error");
    reasonInput.focus();
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showAlert("Please enter a valid price greater than 0.", "error");
    return;
  }

  submitRequestBtn.disabled = true;
  submitRequestBtn.textContent = "SENDING TO PARENT...";

  try {
    let siteTarget = currentTabInfo.selectedProductUrl;
    if (siteTarget.startsWith("http")) {
      const canonical = getCanonicalProductUrl(siteTarget);
      siteTarget = canonical.length <= 250 ? canonical : new URL(siteTarget).hostname;
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
      showAlert(result.message || "Your session has expired. Please sign in again.", "error");
      if (response.status === 401) {
        handleLogout();
      }
    } else {
      showAlert(result.message || "Could not send request right now. Please try again.", "error");
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Purchase submit error:", err);
    showAlert("Unable to reach ParentGuard service. Please try again in a moment.", "error");
  } finally {
    submitRequestBtn.disabled = false;
    submitRequestBtn.textContent = "[ ASK PARENT FOR THIS ITEM ]";
  }
}

async function fetchMyRequests(manualRefresh = false) {
  if (!childSession.token) return;

  if (manualRefresh) {
    refreshRequestsBtn.disabled = true;
    refreshRequestsBtn.textContent = "UPDATING...";
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
  if (!Array.isArray(requests) || requests.length === 0 || currentTabInfo.isCartOrCheckout) return;

  const sortedRequests = [...requests].sort((a, b) => (b.id || 0) - (a.id || 0));

  if (activeTrackedRequestId) {
    const tracked = sortedRequests.find((r) => r.id === activeTrackedRequestId);
    if (tracked) {
      showLiveApprovalTracker(tracked);
      return;
    }
  }

  if (userDismissedTrackerForForm) return;

  const currentUrlClean = getCanonicalProductUrl(currentTabInfo.url || "").toLowerCase();
  const currentTitleClean = (itemNameInput.value || currentTabInfo.title || "").trim().toLowerCase();
  const currentAmount = parseFloat(amountInput.value || "0");

  const matchingForPage = sortedRequests.find((r) => {
    if (r.status !== "PENDING" && r.status !== "APPROVED") return false;
    const reqSiteClean = getCanonicalProductUrl(r.siteDomain || "").toLowerCase();
    const reqTitleClean = (r.itemName || "").trim().toLowerCase();
    const reqAmount = Number(r.amount);

    // Also check if this product URL is part of an approved/pending Combo Request ([CART_LINKS])
    const linkMatch = String(r.note || "").match(/\[CART_LINKS\]([\s\S]*?)\[\/CART_LINKS\]/i);
    if (linkMatch && linkMatch[1] && currentUrlClean) {
      const comboUrls = linkMatch[1].split("|").map((u) => getCanonicalProductUrl(u.trim()).toLowerCase());
      if (comboUrls.some((u) => u && u.split("?")[0] === currentUrlClean.split("?")[0])) {
        return true;
      }
    }

    const exactPageUrlMatch =
      currentUrlClean &&
      reqSiteClean &&
      reqSiteClean.includes("/") &&
      currentUrlClean.split("?")[0] === reqSiteClean.split("?")[0];

    const exactItemTitleMatch =
      currentTitleClean &&
      reqTitleClean &&
      currentTitleClean === reqTitleClean;

    const amountMatches = !currentAmount || isNaN(currentAmount) || Math.abs(reqAmount - currentAmount) < 0.02;

    if (reqSiteClean.includes("/")) {
      return exactPageUrlMatch && amountMatches;
    }
    return exactItemTitleMatch && amountMatches;
  });

  if (matchingForPage) {
    showLiveApprovalTracker(matchingForPage);
  }
}

function getCleanDomainLabel(siteDomainOrUrl) {
  if (!siteDomainOrUrl) return "Online Store";
  try {
    if (siteDomainOrUrl.startsWith("http://") || siteDomainOrUrl.startsWith("https://")) {
      return new URL(siteDomainOrUrl).hostname;
    }
  } catch (_) {}
  return siteDomainOrUrl;
}

function renderRequestsList(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    requestCountBadge.textContent = "0";
    requestsListContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-title">NO REQUESTS SENT YET</span>
        <span class="empty-sub">When you ask your parent to approve a product or combo, its status will appear here.</span>
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
    const showApprovedRow = req.status === "APPROVED";
    const cleanNoteText = req.note ? String(req.note).replace(/\s*\[CART_LINKS\][\s\S]*?\[\/CART_LINKS\]/gi, "").trim() : "";

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-item-title">${escapeHtml(req.itemName || "Product Request")}</span>
        <span class="card-amount-badge">${escapeHtml(formattedAmount)}</span>
      </div>
      <div class="card-middle-row">
        <span class="card-domain-tag">${escapeHtml(cleanDomain)}</span>
        <span class="card-status-badge ${statusClass}">[ ${statusText} ]</span>
      </div>
      ${showApprovedRow ? `<div id="${proofRowId}" class="crypto-proof-row verified"><span>PARENT APPROVAL</span><span>[ READY TO BUY ]</span></div>` : ""}
      ${cleanNoteText ? `<div class="card-note-row">"${escapeHtml(cleanNoteText)}"</div>` : ""}
    `;

    requestsListContainer.appendChild(card);

    if (showApprovedRow && window.ParentGuardCrypto) {
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
