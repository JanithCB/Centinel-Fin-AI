/**
 * Centinel Fin AI – ParentGuard
 * Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Coordinates state between extension popup and content scripts
 * - Persists authentication tokens and configuration in chrome.storage.local
 * - Relays API requests to Spring Boot backend (http://localhost:8080) to avoid HTTPS->HTTP mixed-content blocks on external stores
 */

const EXTENSION_BUILD_ID = "pg-universal-v3.0";

const DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
  version: "1.0.0",
  buildId: EXTENSION_BUILD_ID
};

// Helper: Ensure content script and CSS are injected into a tab
async function ensureContentScriptInTab(tabId, url) {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return;

  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "PING" }).catch(() => null);
    if (ping && (ping.status === "PONG" || ping.status === "OK")) {
      // Content script is already active in this tab
      return;
    }

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["overlay.css"]
    }).catch(() => {});

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["crypto-verifier.js", "content.js"]
    });
    console.log("[Centinel Fin AI] Auto-injected ParentGuard into tab:", tabId, url);
  } catch (err) {
    // Tab closed or restricted internal page (e.g. chrome://)
  }
}

// Lifecycle: Installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Centinel Fin AI] Extension installed/reloaded. Reason:", details.reason);

  const current = await chrome.storage.local.get(["apiBaseUrl", "childToken"]);
  if (!current.apiBaseUrl) {
    await chrome.storage.local.set({ apiBaseUrl: DEFAULT_CONFIG.apiBaseUrl });
  }
  console.log("[Centinel Fin AI] Service worker initialized with API:", current.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl);

  // If a reload was triggered from the popup header or build-sync, refresh that active tab cleanly
  try {
    const pending = await chrome.storage.local.get(["pendingReloadTabId"]);
    if (pending && pending.pendingReloadTabId) {
      const targetTabId = pending.pendingReloadTabId;
      await chrome.storage.local.remove(["pendingReloadTabId"]);
      chrome.tabs.reload(targetTabId).catch(() => {});
    }
  } catch (_) {}

  // Proactive auto-injection into all existing open web tabs upon installation or developer reload
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        ensureContentScriptInTab(tab.id, tab.url);
      }
    }
  } catch (err) {
    console.debug("[Centinel Fin AI] Auto-injection on install skipped:", err);
  }
});

// Tab Navigation / URL Update listener: Auto-injects whenever a web page navigates or completes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    if (tab && tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
      ensureContentScriptInTab(tabId, tab.url);
    }
  }
});

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === "PING") {
    sendResponse({ status: "OK", buildId: EXTENSION_BUILD_ID, timestamp: Date.now() });
    return false;
  }

  if (message.type === "GET_CONFIG") {
    chrome.storage.local.get(["apiBaseUrl", "childToken", "childEmail"]).then((data) => {
      sendResponse({
        apiBaseUrl: data.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
        hasToken: Boolean(data.childToken),
        childEmail: data.childEmail || null
      });
    });
    return true;
  }

  if (message.type === "SET_AUTH") {
    chrome.storage.local.set({
      childToken: message.token,
      childEmail: message.email || null
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(["childToken", "childEmail"]).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Relay: Fetch RSA-2048 Public Key from Spring Boot backend
  if (message.type === "FETCH_PUBLIC_KEY") {
    (async () => {
      try {
        const res = await fetch(`${DEFAULT_CONFIG.apiBaseUrl}/api/v1/security/public-key`);
        if (!res.ok) {
          throw new Error(`Public key fetch failed (HTTP ${res.status})`);
        }
        const data = await res.json();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Relay: Fetch Child's Purchase Requests from Spring Boot backend
  if (message.type === "FETCH_MY_REQUESTS") {
    (async () => {
      try {
        const stored = await chrome.storage.local.get(["childToken"]);
        if (!stored.childToken) {
          sendResponse({ success: false, error: "NOT_AUTHENTICATED" });
          return;
        }
        const res = await fetch(`${DEFAULT_CONFIG.apiBaseUrl}/api/v1/purchase-requests/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${stored.childToken}`
          }
        });
        if (!res.ok) {
          sendResponse({ success: false, status: res.status, error: `HTTP ${res.status}` });
          return;
        }
        const requests = await res.json();
        sendResponse({ success: true, data: requests });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  return false;
});
