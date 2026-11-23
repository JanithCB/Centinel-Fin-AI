/**
 * Centinel Fin AI – ParentGuard
 * Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Coordinates state between extension popup and content scripts
 * - Persists authentication tokens and configuration in chrome.storage.local
 * - Relays API requests to Spring Boot backend (http://localhost:8080) to avoid HTTPS->HTTP mixed-content blocks on external stores
 */

const DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
  version: "1.0.0"
};

// Lifecycle: Installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Centinel Fin AI] Extension installed. Reason:", details.reason);

  const current = await chrome.storage.local.get(["apiBaseUrl", "childToken"]);
  if (!current.apiBaseUrl) {
    await chrome.storage.local.set({ apiBaseUrl: DEFAULT_CONFIG.apiBaseUrl });
  }
  console.log("[Centinel Fin AI] Service worker initialized with API:", current.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl);
});

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

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
