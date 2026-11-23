/**
 * Centinel Fin AI – ParentGuard
 * Child Extension Popup Controller
 *
 * Responsibilities:
 * - Authenticate child via Supabase Auth
 * - Auto-detect active browser tab (domain, URL, title)
 * - Submit purchase requests with SHA-256 idempotency hashes to Spring Boot
 * - Fetch and display submitted requests with live parent approval statuses
 */

const CONFIG = {
  apiBaseUrl: "http://localhost:8080/api/v1",
  supabaseAuthUrl: "https://bllntgtyksncfahhdxga.supabase.co/auth/v1/token?grant_type=password",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbG50Z3R5a3NuY2ZhaGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODY4NjIsImV4cCI6MjEwMzA2Mjg2Mn0.OdpZ7VfSTgbIfAyzPfFnhv_JOY5rrT9CqVuMXhLTpM0"
};

// State
let currentTabInfo = {
  url: "https://store.steampowered.com",
  domain: "store.steampowered.com",
  title: ""
};
let childSession = {
  token: null,
  email: null
};

// DOM Elements
const authSection = document.getElementById("authSection");
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

const detectedDomainDisplay = document.getElementById("detectedDomainDisplay");
const detectedUrlDisplay = document.getElementById("detectedUrlDisplay");
const refreshTabBtn = document.getElementById("refreshTabBtn");

const purchaseForm = document.getElementById("purchaseForm");
const itemNameInput = document.getElementById("itemNameInput");
const amountInput = document.getElementById("amountInput");
const currencySelect = document.getElementById("currencySelect");
const categorySelect = document.getElementById("categorySelect");
const reasonInput = document.getElementById("reasonInput");
const submitRequestBtn = document.getElementById("submitRequestBtn");
const submissionAlert = document.getElementById("submissionAlert");

const requestsListContainer = document.getElementById("requestsListContainer");
const refreshRequestsBtn = document.getElementById("refreshRequestsBtn");

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await detectActiveTab();
  await loadAuthState();
});

// Event Listeners
function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  refreshTabBtn.addEventListener("click", detectActiveTab);
  purchaseForm.addEventListener("submit", handlePurchaseSubmit);
  refreshRequestsBtn.addEventListener("click", () => fetchMyRequests(true));

  // Navigation tab switching
  tabNewRequest.addEventListener("click", () => switchTab("newRequestView"));
  tabMyRequests.addEventListener("click", () => {
    switchTab("myRequestsView");
    fetchMyRequests();
  });
}

// Tab Switching
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

// Active Browser Tab Auto-Detection
async function detectActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      const urlString = activeTab.url || "";

      if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
        const parsedUrl = new URL(urlString);
        currentTabInfo.url = urlString;
        currentTabInfo.domain = parsedUrl.hostname;
        
        // Clean title
        let cleanTitle = activeTab.title || "";
        cleanTitle = cleanTitle.replace(/ - Steam$/i, "")
                               .replace(/ on Steam$/i, "")
                               .replace(/ \| Roblox$/i, "")
                               .replace(/ : Amazon\.[a-z.]+$/i, "");
        currentTabInfo.title = cleanTitle.trim();

        detectedDomainDisplay.textContent = currentTabInfo.domain;
        detectedUrlDisplay.textContent = currentTabInfo.url;

        // Auto-fill item name if blank
        if (!itemNameInput.value.trim() && currentTabInfo.title) {
          itemNameInput.value = currentTabInfo.title;
        }
      } else {
        // Non-http page (e.g. chrome://, new tab)
        currentTabInfo.url = "https://store.steampowered.com";
        currentTabInfo.domain = "store.steampowered.com";
        currentTabInfo.title = "Steam Store";
        detectedDomainDisplay.textContent = "store.steampowered.com (SIMULATED)";
        detectedUrlDisplay.textContent = "Active tab is not a web store. Simulated merchant set.";
      }
    }
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to read active tab:", err);
    detectedDomainDisplay.textContent = "store.steampowered.com";
    detectedUrlDisplay.textContent = "https://store.steampowered.com";
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

// Logout Handler
async function handleLogout() {
  await chrome.storage.local.remove(["childToken", "childEmail"]);
  childSession.token = null;
  childSession.email = null;
  showLoggedOutState();
}

// Compute SHA-256 idempotency hash using Web Crypto API
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
    const siteDomain = currentTabInfo.domain || "store.steampowered.com";
    const idempotencyRaw = `${childSession.email || "child"}:${siteDomain}:${itemName}:${amount.toFixed(2)}`;
    const idempotencyKey = await computeSha256(idempotencyRaw);

    const payload = {
      siteDomain: siteDomain,
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

    const result = await response.json();

    if (response.status === 201) {
      showAlert("Request submitted! Your parent will review it shortly.", "success");
      // Clear specific fields
      amountInput.value = "";
      reasonInput.value = "";
      fetchMyRequests();
    } else if (response.status === 409) {
      showAlert("Duplicate request detected. This item is already in your parent's queue.", "error");
    } else if (response.status === 401 || response.status === 403) {
      showAlert("Session expired. Please sign in again.", "error");
      handleLogout();
    } else {
      showAlert(result.message || "Failed to submit request to parent.", "error");
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
  } catch (err) {
    console.error("[Centinel Fin AI] Failed to fetch requests:", err);
  } finally {
    if (manualRefresh) {
      refreshRequestsBtn.disabled = false;
      refreshRequestsBtn.textContent = "REFRESH";
    }
  }
}

// Render Requests in List View
function renderRequestsList(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    requestCountBadge.textContent = "0";
    requestsListContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-title">NO REQUESTS YET</span>
        <span class="empty-sub">When you submit requests on game or store pages, they will appear here.</span>
      </div>
    `;
    return;
  }

  requestCountBadge.textContent = requests.length.toString();
  requestsListContainer.innerHTML = "";

  // Sort descending by id
  requests.sort((a, b) => b.id - a.id);

  requests.forEach(req => {
    const card = document.createElement("div");
    card.className = "request-item-card";

    let statusClass = "status-pending";
    let statusText = "PENDING REVIEW";

    if (req.status === "APPROVED") {
      statusClass = "status-approved";
      statusText = "APPROVED";
    } else if (req.status === "DENIED") {
      statusClass = "status-denied";
      statusText = "DENIED";
    }

    const formattedAmount = `${req.currency === "USD" ? "$" : req.currency + " "}${parseFloat(req.amount).toFixed(2)}`;

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-item-title">${escapeHtml(req.itemName || "Item Request")}</span>
        <span class="card-amount-badge">${escapeHtml(formattedAmount)}</span>
      </div>
      <div class="card-middle-row">
        <span class="card-domain-tag">${escapeHtml(req.siteDomain || "Merchant")}</span>
        <span class="card-status-badge ${statusClass}">[ ${statusText} ]</span>
      </div>
      ${req.note ? `<div class="card-note-row">"${escapeHtml(req.note)}"</div>` : ""}
    `;

    requestsListContainer.appendChild(card);
  });
}

// Helper: Alert Display
function showAlert(message, type) {
  submissionAlert.textContent = message;
  submissionAlert.className = `alert-box alert-${type}`;
  submissionAlert.classList.remove("hidden");
}

function hideAlert() {
  submissionAlert.classList.add("hidden");
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}
