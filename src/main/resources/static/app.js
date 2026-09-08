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
// SVG Icons for Transactions & Stream
// -------------------------------------------------------------
const iconSVGs = {
  dining: '<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18 0V11.25c0-.621-.504-1.125-1.125-1.125H4.125C3.504 10.125 3 10.629 3 11.25V16.5"/></svg>',
  grocery: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>',
  groceries: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>',
  payroll: '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>',
  income: '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>',
  travel: '<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>',
  transit: '<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625h-9.75A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5"/></svg>',
  utilities: '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>',
  manual: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>',
  default: '<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>'
};

// -------------------------------------------------------------
// Initialization & Health
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initSettingsUI();
  initModalListeners();
  initFilters();
  initExportCSV();
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
      if (syncBadge) syncBadge.textContent = `${latency}ms Real-time Bank Sync`;
      if (syncDot) {
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]';
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
      syncDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]';
    }
  }
}

function markDegraded(msg) {
  const syncBadge = document.getElementById('enclave-sync-status');
  const syncDot = document.getElementById('enclave-sync-dot');
  if (syncBadge) syncBadge.textContent = msg;
  if (syncDot) syncDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
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
      topCatPctEl.textContent = `${Math.round((topAmount / total) * 100)}% of spend`;
    }
  }
}

// -------------------------------------------------------------
// Ingestion Simulation (Phone Mirror)
// -------------------------------------------------------------
async function simulateSMS(smsText, merchantName, amount, category, iconKey) {
  const smsBubble = document.getElementById('current-sms-alert');
  const smsTextEl = document.getElementById('sms-text-content');
  const timeEl = document.getElementById('sms-timestamp');
  const speedEl = document.getElementById('parser-speed');
  const jsonPreview = document.getElementById('json-preview');
  const statusLine = document.getElementById('ingestion-endpoint-status');

  if (smsBubble) {
    smsBubble.classList.add('opacity-60');
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
    if (speedEl) speedEl.textContent = `${elapsed}ms`;

    if (smsBubble) {
      smsBubble.classList.remove('opacity-60');
      smsBubble.classList.add('border-emerald-500/40');
    }

    if (statusLine) {
      statusLine.textContent = `HTTP ${responseStatus} ${responseData?.status || 'ACCEPTED'}`;
      statusLine.className = responseStatus === 202 ? 'text-[10px] text-emerald-400 font-mono' : 'text-[10px] text-amber-400 font-mono';
    }

    if (jsonPreview) {
      jsonPreview.textContent = JSON.stringify({
        connection_id: "conn_chase_4821",
        source: "SMS_SIMULATOR",
        merchant: merchantName.toUpperCase(),
        amount: amount,
        currency: "USD",
        category_predicted: category,
        confidence: 0.992,
        backend_response: responseData,
        timestamp: new Date().toISOString()
      }, null, 2);
    }

    // Prepend to transaction stream
    addTransactionToFeed(merchantName, amount, category, iconKey, 'Live Webhook');

    // Refresh ledger summary from backend
    checkBackendHealth();

    setTimeout(() => {
      if (smsBubble) smsBubble.classList.remove('border-emerald-500/40');
    }, 2000);
  }, 120);
}

// -------------------------------------------------------------
// Transaction Feed Helper
// -------------------------------------------------------------
function addTransactionToFeed(merchantName, amount, category, iconKey, subtext) {
  const list = document.getElementById('live-transaction-list');
  if (!list) return;

  const key = (typeof iconKey === 'string' && iconSVGs[iconKey.toLowerCase()]) 
    ? iconKey.toLowerCase() 
    : (iconSVGs[category.toLowerCase()] ? category.toLowerCase() : 'default');
  const iconMarkup = iconSVGs[key] || iconSVGs['default'];

  const isPositive = String(amount).startsWith('+');
  const newItem = document.createElement('div');
  newItem.className = 'py-3.5 flex items-center justify-between hover:bg-slate-900/40 px-2 rounded-lg transition-all border border-emerald-500/30 bg-white/[0.02] group';
  newItem.setAttribute('data-category', category);
  newItem.innerHTML = `
    <div class="flex items-center gap-3.5">
      <div class="w-9 h-9 rounded-lg bg-slate-800 border border-white/[0.06] flex items-center justify-center">
        ${iconMarkup}
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-white">${escapeHtml(merchantName)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">${escapeHtml(category)}</span>
        </div>
        <div class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
          <span>Just now</span>
          <span>•</span>
          <span class="font-mono text-slate-500">${escapeHtml(subtext || 'Live Webhook')}</span>
          <span>•</span>
          <span class="text-emerald-400/90 text-[11px]">Categorized 99%</span>
        </div>
      </div>
    </div>
    <div class="text-right">
      <div class="text-sm font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-white'} tabular-nums">${escapeHtml(amount)}</div>
      <div class="text-[11px] font-mono text-slate-500">Cleared</div>
    </div>
  `;

  list.insertBefore(newItem, list.firstChild);

  setTimeout(() => {
    newItem.classList.remove('border-emerald-500/30', 'bg-white/[0.02]');
  }, 2000);
}

// -------------------------------------------------------------
// Transaction Category Filters
// -------------------------------------------------------------
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const list = document.getElementById('live-transaction-list');
  if (!filterBtns.length || !list) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCat = btn.getAttribute('data-category');
      filterBtns.forEach(b => {
        b.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition-colors filter-btn cursor-pointer';
      });
      btn.className = 'px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-white/[0.08] font-medium filter-btn cursor-pointer';

      const items = list.querySelectorAll('[data-category]');
      let visibleCount = 0;
      items.forEach(item => {
        const itemCat = item.getAttribute('data-category') || '';
        if (targetCat === 'ALL' || itemCat.toLowerCase() === targetCat.toLowerCase()) {
          item.style.display = 'flex';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });
      const indicator = document.getElementById('tx-count-indicator');
      if (indicator) {
        indicator.textContent = `Showing ${visibleCount} entry${visibleCount === 1 ? '' : 'ies'}`;
      }
    });
  });
}

// -------------------------------------------------------------
// CSV Export
// -------------------------------------------------------------
function initExportCSV() {
  const btn = document.getElementById('btn-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const list = document.getElementById('live-transaction-list');
    if (!list) return;

    const items = list.querySelectorAll('[data-category]');
    let csv = 'Merchant,Category,Amount,Status\n';
    items.forEach(item => {
      const merchant = item.querySelector('.text-sm')?.textContent.trim() || '';
      const category = item.getAttribute('data-category') || '';
      const amount = item.querySelector('.font-mono.font-semibold')?.textContent.trim() || '';
      csv += `"${merchant.replace(/"/g, '""')}","${category}","${amount}","Cleared"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centinel_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Transactions exported as CSV!', 'success');
  });
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
        // datetime-local gives "YYYY-MM-DDTHH:mm" — backend LocalDateTime needs "YYYY-MM-DDTHH:mm:ss"
        // Do NOT use new Date().toISOString() here as that shifts to UTC and corrupts the local time
        transactionDate: dateVal
          ? (dateVal.length === 16 ? dateVal + ':00' : dateVal)
          : new Date().toLocaleDateString('en-CA') + 'T' + new Date().toTimeString().slice(0, 8)
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
          'manual',
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
