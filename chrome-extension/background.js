/**
 * Centinel Fin AI – ParentGuard
 * Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Coordinates state between extension popup and content scripts
 * - Persists authentication tokens and configuration in chrome.storage.local
 * - Relays authenticated API requests to Spring Boot backend (http://localhost:8080)
 */

const DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
  version: "1.0.0"
};

// Lifecycle: Installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Centinel Fin AI] Extension installed. Reason:", details.reason);
  
  // Initialize storage defaults if not already set
  const current = await chrome.storage.local.get(["apiBaseUrl", "childToken"]);
  if (!current.apiBaseUrl) {
    await chrome.storage.local.set({ apiBaseUrl: DEFAULT_CONFIG.apiBaseUrl });
  }
  console.log("[Centinel Fin AI] Service worker initialized with API:", current.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl);
});

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Centinel Fin AI] Received background message:", message.type);

  if (message.type === "PING") {
    sendResponse({ status: "OK", timestamp: Date.now() });
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
    return true; // Keep channel open for async response
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

  return false;
});
