/**
 * Centinel Fin AI - Sovereign Hub Frontend Client Engine
 * Connects Stitch UI to Spring Boot Backend
 */

const CONFIG = {
  get apiBase() {
    return localStorage.getItem('centinel_api_base') || (window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8080');
  },
  set apiBase(val) {
    localStorage.setItem('centinel_api_base', val.trim());
  },
  get apiKey() {
    return localStorage.getItem('centinel_api_key') || 'local-dev-ingestion-secret-2026';
  },
  set apiKey(val) {
    localStorage.setItem('centinel_api_key', val.trim());
  },
  get userPhone() {
    return localStorage.getItem('centinel_user_phone') || '+94771234567';
  },
  set userPhone(val) {
    localStorage.setItem('centinel_user_phone', val.trim());
  }
};

let isConnected = false;

// -------------------------------------------------------------
// Initialization & Health
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initSettingsUI();
  initModalListeners();
  checkBackendHealth();
  // Poll summary periodically
  setInterval(checkBackendHealth, 15000);
});

async function checkBackendHealth() {
  const syncBadge = document.getElementById('enclave-sync-status');
  const syncDot = document.getElementById('enclave-sync-dot');
  const t0 = performance.now();

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/summary?phone=${encodeURIComponent(CONFIG.userPhone)}&period=monthly`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const latency = Math.round(performance.now() - t0);

    if (res.ok) {
      isConnected = true;
      if (syncBadge) syncBadge.textContent = `${latency}ms Realtime Enclave Sync`;
      if (syncDot) {
        syncDot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]';
      }
      const data = await res.json();
      renderSummaryData(data);
    } else {
      markDegraded(`HTTP ${res.status} Connected`);
    }
  } catch (err) {
    isConnected = false;
    if (syncBadge) syncBadge.textContent = `Offline Demo Mode (Local)`;
    if (syncDot) {
      syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]';
    }
  }
}

function markDegraded(msg) {
  const syncBadge = document.getElementById('enclave-sync-status');
  const syncDot = document.getElementById('enclave-sync-dot');
  if (syncBadge) syncBadge.textContent = msg;
  if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-400';
}

// -------------------------------------------------------------
// Summary Data Rendering
// -------------------------------------------------------------
function renderSummaryData(data) {
  if (!data) return;

  // 1. Calculate Total Spent from totalsPerPeriod or totalsByCategory
  let total = 0;
  if (data.totalsByCategory) {
    for (const cat in data.totalsByCategory) {
      total += Number(data.totalsByCategory[cat]) || 0;
    }
  } else if (data.totalsPerPeriod) {
    for (const p in data.totalsPerPeriod) {
      total += Number(data.totalsPerPeriod[p]) || 0;
    }
  }

  const totalSpentEl = document.getElementById('kpi-total-spent');
  if (totalSpentEl && total > 0) {
    totalSpentEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // 2. Identify top category
  if (data.totalsByCategory && Object.keys(data.totalsByCategory).length > 0) {
    let topCat = 'General';
    let topAmount = 0;
    for (const [cat, val] of Object.entries(data.totalsByCategory)) {
      const amt = Number(val);
      if (amt > topAmount) {
        topAmount = amt;
        topCat = cat;
      }
    }
    const topCatNameEl = document.getElementById('kpi-top-category-name');
    const topCatAmtEl = document.getElementById('kpi-top-category-amount');
    const topCatPctEl = document.getElementById('kpi-top-category-pct');

    if (topCatNameEl) topCatNameEl.textContent = topCat;
    if (topCatAmtEl) topCatAmtEl.textContent = `$${topAmount.toFixed(2)}`;
    if (topCatPctEl && total > 0) {
      topCatPctEl.textContent = `${Math.round((topAmount / total) * 100)}% of total`;
    }
  }
}

// -------------------------------------------------------------
// Ingestion Simulation (Phone Mirror)
// -------------------------------------------------------------
async function simulateSMS(smsText, merchantName, amount, category, icon) {
  const smsBubble = document.getElementById('current-sms-alert');
  const smsTextEl = document.getElementById('sms-text-content');
  const timeEl = document.getElementById('sms-timestamp');
  const speedEl = document.getElementById('parser-speed');
  const jsonPreview = document.getElementById('json-preview');
  const statusLine = document.getElementById('ingestion-endpoint-status');

  if (smsBubble) {
    smsBubble.classList.add('scale-95', 'opacity-70');
  }

  const extMessageId = 'msg-' + Date.now();
  const requestPayload = {
    source: 'SMS_SIMULATOR',
    externalMessageId: extMessageId,
    userReference: CONFIG.userPhone,
    messageText: smsText,
    receivedAt: new Date().toISOString()
  };

  let responseData = null;
  let responseStatus = 202;
  const t0 = performance.now();

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/v1/ingestion/transaction-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INGESTION-API-KEY': CONFIG.apiKey
      },
      body: JSON.stringify(requestPayload)
    });

    responseStatus = res.status;
    responseData = await res.json().catch(() => null);
  } catch (err) {
    // Fallback in demo mode if backend is not currently running
    responseData = {
      status: 'ACCEPTED',
      simulated: true,
      messageId: Math.floor(Math.random() * 1000) + 1,
      externalMessageId: extMessageId,
      message: 'Simulated on-device enclave ingest (Backend offline)'
    };
  }

  const elapsed = Math.round(performance.now() - t0);

  setTimeout(() => {
    if (smsTextEl) smsTextEl.textContent = smsText;
    if (timeEl) timeEl.textContent = 'Just now';
    if (speedEl) speedEl.textContent = `${elapsed}ms latency`;

    if (smsBubble) {
      smsBubble.classList.remove('scale-95', 'opacity-70');
      smsBubble.classList.add('border-emerald-500');
    }

    if (statusLine) {
      statusLine.textContent = `${responseStatus} ${responseData?.status || 'ACCEPTED'}`;
      statusLine.className = responseStatus === 202 ? 'text-[10px] text-emerald-400 font-mono' : 'text-[10px] text-amber-400 font-mono';
    }

    if (jsonPreview) {
      jsonPreview.textContent = JSON.stringify({
        enclave_ingress: requestPayload,
        response: responseData
      }, null, 2);
    }

    // Prepend to transaction stream
    addTransactionToFeed(merchantName, amount, category, icon, 'Live Ingest (202 Accepted)');

    // Refresh ledger summary from backend
    checkBackendHealth();

    setTimeout(() => {
      if (smsBubble) smsBubble.classList.remove('border-emerald-500');
    }, 2000);
  }, 120);
}

// -------------------------------------------------------------
// Transaction Feed Helper
// -------------------------------------------------------------
function addTransactionToFeed(merchantName, amount, category, icon, subtext) {
  const list = document.getElementById('live-transaction-list');
  if (!list) return;

  const newItem = document.createElement('div');
  const isPositive = String(amount).startsWith('+');
  newItem.className = 'py-3.5 flex items-center justify-between bg-emerald-500/5 px-2 rounded-xl transition-all border border-emerald-500/30 animate-pulse';
  newItem.innerHTML = `
    <div class="flex items-center gap-3.5">
      <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 text-lg border border-slate-700">
        ${icon || '💳'}
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-white">${escapeHtml(merchantName)}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">${escapeHtml(category)}</span>
        </div>
        <div class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
          <span>Just Now</span>
          <span>•</span>
          <span class="font-mono text-slate-500">${escapeHtml(subtext || 'Manual')}</span>
          <span>•</span>
          <span class="text-emerald-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Enclave Verified
          </span>
        </div>
      </div>
    </div>
    <div class="text-right">
      <div class="text-sm font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-white'}">${escapeHtml(amount)}</div>
      <div class="text-[11px] font-mono text-slate-400">Settled</div>
    </div>
  `;

  list.insertBefore(newItem, list.firstChild);

  setTimeout(() => {
    newItem.classList.remove('bg-emerald-500/5', 'animate-pulse', 'border-emerald-500/30');
  }, 2200);
}

// -------------------------------------------------------------
// Manual Transaction Entry Modal
// -------------------------------------------------------------
function initModalListeners() {
  const openBtn = document.getElementById('btn-open-manual-modal');
  const closeBtn = document.getElementById('btn-close-manual-modal');
  const cancelBtn = document.getElementById('btn-cancel-manual-modal');
  const modal = document.getElementById('manual-entry-modal');
  const form = document.getElementById('manual-transaction-form');

  function openModal() {
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      // Populate defaults
      const phoneInput = document.getElementById('manual-phone');
      if (phoneInput && !phoneInput.value) phoneInput.value = CONFIG.userPhone;
      const dateInput = document.getElementById('manual-date');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 16);
      }
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-manual-tx');
      const originalText = submitBtn ? submitBtn.textContent : 'Save';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting to Ledger...';
      }

      const phone = document.getElementById('manual-phone').value.trim();
      const rawMessage = document.getElementById('manual-raw-message').value.trim();
      const amount = parseFloat(document.getElementById('manual-amount').value);
      const currency = document.getElementById('manual-currency').value;
      const dateVal = document.getElementById('manual-date').value;

      const payload = {
        userPhone: phone,
        rawMessage: rawMessage,
        amount: amount,
        currency: currency,
        transactionDate: dateVal ? new Date(dateVal).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19)
      };

      try {
        const res = await fetch(`${CONFIG.apiBase}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Server returned ${res.status}`);
        }

        const savedTx = await res.json();
        addTransactionToFeed(
          savedTx.merchant || 'Manual Entry',
          `-${currency} ${amount.toFixed(2)}`,
          savedTx.category || 'Uncategorized',
          '✍️',
          'POST /api/transactions'
        );

        showToast('Transaction logged successfully in Sovereign Ledger!', 'success');
        form.reset();
        closeModal();
        checkBackendHealth();
      } catch (err) {
        showToast(`Failed to post transaction: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

// -------------------------------------------------------------
// Settings Drawer / Modal
// -------------------------------------------------------------
function initSettingsUI() {
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const saveSettingsBtn = document.getElementById('btn-save-settings');

  const inputApiBase = document.getElementById('settings-api-base');
  const inputApiKey = document.getElementById('settings-api-key');
  const inputUserPhone = document.getElementById('settings-user-phone');

  function openSettings() {
    if (inputApiBase) inputApiBase.value = CONFIG.apiBase;
    if (inputApiKey) inputApiKey.value = CONFIG.apiKey;
    if (inputUserPhone) inputUserPhone.value = CONFIG.userPhone;
    if (settingsModal) {
      settingsModal.classList.remove('hidden');
      settingsModal.classList.add('flex');
    }
  }

  function closeSettings() {
    if (settingsModal) {
      settingsModal.classList.add('hidden');
      settingsModal.classList.remove('flex');
    }
  }

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      if (inputApiBase) CONFIG.apiBase = inputApiBase.value;
      if (inputApiKey) CONFIG.apiKey = inputApiKey.value;
      if (inputUserPhone) CONFIG.userPhone = inputUserPhone.value;
      closeSettings();
      showToast('Enclave Node settings saved!', 'success');
      checkBackendHealth();
    });
  }
}

// -------------------------------------------------------------
// Toast Alerts
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colorClass = type === 'success' 
    ? 'border-emerald-500/50 text-emerald-300 bg-slate-900/95' 
    : type === 'error'
    ? 'border-rose-500/50 text-rose-300 bg-slate-900/95'
    : 'border-slate-700 text-slate-200 bg-slate-900/95';

  toast.className = `px-4 py-3 rounded-xl border text-xs font-mono shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto transform translate-y-4 opacity-0 flex items-center gap-2 ${colorClass}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Global scope export for inline onclick handlers
window.simulateSMS = simulateSMS;
