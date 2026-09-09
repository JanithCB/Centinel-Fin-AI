/**
 * Centinel Fin AI - Client Application Engine
 * Connects UI directly to Spring Boot Backend APIs:
 * - GET /health
 * - GET /api/summary
 * - POST /api/transactions
 * - POST /api/v1/ingestion/transaction-messages
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

let currentPeriod = 'monthly';
let isConnected = false;
let sessionTransactions = [];

// -------------------------------------------------------------
// Category SVG Icons
// -------------------------------------------------------------
const categoryIcons = {
  groceries: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>',
  grocery: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>',
  dining: '<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18 0V11.25c0-.621-.504-1.125-1.125-1.125H4.125C3.504 10.125 3 10.629 3 11.25V16.5"/></svg>',
  food: '<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18 0V11.25c0-.621-.504-1.125-1.125-1.125H4.125C3.504 10.125 3 10.629 3 11.25V16.5"/></svg>',
  transit: '<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625h-9.75A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5"/></svg>',
  transport: '<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625h-9.75A1.125 1.125 0 002.25 3.75v10.5c0 .621.504 1.125 1.125 1.125h1.5"/></svg>',
  travel: '<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>',
  utilities: '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>',
  utility: '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>',
  income: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6H2.25m0 0v10.5m0-10.5h1.5A2.25 2.25 0 016 8.25v7.5A2.25 2.25 0 013.75 18H2.25m16.5-10.5a2.25 2.25 0 00-2.25-2.25H6m12.75 2.25v7.5a2.25 2.25 0 01-2.25 2.25H6"/></svg>',
  payroll: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>',
  default: '<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>'
};

function getCategoryIcon(catName) {
  if (!catName) return categoryIcons.default;
  const key = catName.toLowerCase().trim();
  for (const [k, svg] of Object.entries(categoryIcons)) {
    if (key.includes(k)) return svg;
  }
  return categoryIcons.default;
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateUserPhoneDisplays();
  initSettingsUI();
  initModalListeners();
  initIngestionConsole();
  initPeriodSelector();
  initExportCSV();
  initRefreshButton();

  // Initial load
  fetchSummaryData();

  // Recurring refresh every 20s
  setInterval(fetchSummaryData, 20000);
});

function updateUserPhoneDisplays() {
  const headerPhone = document.getElementById('header-user-phone');
  const bannerPhone = document.getElementById('banner-user-phone');
  if (headerPhone) headerPhone.textContent = CONFIG.userPhone;
  if (bannerPhone) bannerPhone.textContent = CONFIG.userPhone;
}

function initRefreshButton() {
  const btn = document.getElementById('btn-refresh-summary');
  if (btn) {
    btn.addEventListener('click', () => {
      fetchSummaryData();
      showToast('Refreshing ledger analytics...', 'info');
    });
  }
}

// -------------------------------------------------------------
// Period Selector (Monthly vs Daily)
// -------------------------------------------------------------
function initPeriodSelector() {
  const btnMonthly = document.getElementById('btn-period-monthly');
  const btnDaily = document.getElementById('btn-period-daily');

  if (btnMonthly && btnDaily) {
    btnMonthly.addEventListener('click', () => {
      if (currentPeriod === 'monthly') return;
      currentPeriod = 'monthly';
      btnMonthly.className = 'px-3 py-1.5 rounded-md font-medium text-xs bg-slate-800 text-white shadow-xs border border-white/[0.06] cursor-pointer';
      btnDaily.className = 'px-3 py-1.5 rounded-md font-medium text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer';
      fetchSummaryData();
    });

    btnDaily.addEventListener('click', () => {
      if (currentPeriod === 'daily') return;
      currentPeriod = 'daily';
      btnDaily.className = 'px-3 py-1.5 rounded-md font-medium text-xs bg-slate-800 text-white shadow-xs border border-white/[0.06] cursor-pointer';
      btnMonthly.className = 'px-3 py-1.5 rounded-md font-medium text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer';
      fetchSummaryData();
    });
  }
}

// -------------------------------------------------------------
// Fetch & Render Summary Data (GET /api/summary)
// -------------------------------------------------------------
async function fetchSummaryData() {
  const syncDot = document.getElementById('enclave-sync-dot');
  const syncStatus = document.getElementById('enclave-sync-status');
  const t0 = performance.now();

  try {
    const url = `${CONFIG.apiBase}/api/summary?phone=${encodeURIComponent(CONFIG.userPhone)}&period=${encodeURIComponent(currentPeriod)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const latency = Math.round(performance.now() - t0);

    if (res.ok) {
      isConnected = true;
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]';
      if (syncStatus) syncStatus.textContent = `${latency}ms • Backend Connected`;

      const data = await res.json();
      renderSummaryData(data);
    } else {
      isConnected = false;
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      if (syncStatus) syncStatus.textContent = `HTTP ${res.status} Connected`;
    }
  } catch (err) {
    isConnected = false;
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
    if (syncStatus) syncStatus.textContent = `Offline (Cannot reach ${CONFIG.apiBase})`;
  }
}

function renderSummaryData(data) {
  if (!data) return;

  const totalsByCategory = data.totalsByCategory || {};
  const totalsPerPeriod = data.totalsPerPeriod || {};

  // 1. Calculate Total Spent from totalsByCategory or totalsPerPeriod
  let totalSpent = 0;
  const categoriesList = Object.entries(totalsByCategory);
  
  if (categoriesList.length > 0) {
    for (const [, amt] of categoriesList) {
      totalSpent += Number(amt) || 0;
    }
  } else {
    for (const [, amt] of Object.entries(totalsPerPeriod)) {
      totalSpent += Number(amt) || 0;
    }
  }

  // Update Total Spent KPI
  const kpiTotalSpent = document.getElementById('kpi-total-spent');
  const kpiPeriodLabel = document.getElementById('kpi-period-label');
  if (kpiTotalSpent) {
    kpiTotalSpent.textContent = `$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (kpiPeriodLabel) {
    kpiPeriodLabel.textContent = `Active Period (${currentPeriod.toUpperCase()})`;
  }

  // 2. Identify Top Category
  let topCatName = '—';
  let topCatAmount = 0;
  for (const [cat, amt] of categoriesList) {
    const num = Number(amt) || 0;
    if (num > topCatAmount) {
      topCatAmount = num;
      topCatName = cat;
    }
  }

  const kpiTopName = document.getElementById('kpi-top-category-name');
  const kpiTopAmount = document.getElementById('kpi-top-category-amount');
  const kpiTopPct = document.getElementById('kpi-top-category-pct');

  if (kpiTopName) kpiTopName.textContent = topCatName;
  if (kpiTopAmount) kpiTopAmount.textContent = `$${topCatAmount.toFixed(2)}`;
  if (kpiTopPct) {
    const pct = totalSpent > 0 ? Math.round((topCatAmount / totalSpent) * 100) : 0;
    kpiTopPct.textContent = `${pct}% of spend`;
  }

  // 3. Update Categories Count KPI
  const kpiCategoriesCount = document.getElementById('kpi-categories-count');
  const categoryBadge = document.getElementById('category-count-badge');
  if (kpiCategoriesCount) kpiCategoriesCount.textContent = categoriesList.length;
  if (categoryBadge) categoryBadge.textContent = `${categoriesList.length} Categories`;

  // 4. Render Dynamic Category Breakdown List
  renderCategoryBreakdown(categoriesList, totalSpent);

  // 5. Render Dynamic Period Breakdown List
  renderPeriodBreakdown(totalsPerPeriod, totalSpent);
}

function renderCategoryBreakdown(categoriesList, totalSpent) {
  const container = document.getElementById('category-breakdown-list');
  if (!container) return;

  if (categoriesList.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-500 text-xs font-mono">
        No category records found for ${escapeHtml(CONFIG.userPhone)}.<br/>
        Use "Add Transaction" or the Ingestion Console to record entries.
      </div>
    `;
    return;
  }

  // Sort descending by amount
  categoriesList.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));

  let html = '';
  for (const [cat, amt] of categoriesList) {
    const num = Number(amt) || 0;
    const pct = totalSpent > 0 ? ((num / totalSpent) * 100).toFixed(1) : '0.0';
    const iconSvg = getCategoryIcon(cat);

    html += `
      <div class="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-800 border border-white/[0.06] flex items-center justify-center">
              ${iconSvg}
            </div>
            <div>
              <div class="text-sm font-medium text-slate-200">${escapeHtml(cat)}</div>
              <div class="text-[11px] text-slate-500 font-mono">${pct}% of total expenditure</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-mono font-semibold text-white tabular-nums">$${num.toFixed(2)}</div>
          </div>
        </div>
        <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-emerald-400 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderPeriodBreakdown(totalsPerPeriod, totalSpent) {
  const container = document.getElementById('period-breakdown-list');
  if (!container) return;

  const periodsList = Object.entries(totalsPerPeriod);

  if (periodsList.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-500 text-xs font-mono">
        No ${currentPeriod} breakdown records found for this phone number.
      </div>
    `;
    return;
  }

  // Sort periods chronologically descending
  periodsList.sort((a, b) => b[0].localeCompare(a[0]));

  let html = '';
  for (const [periodKey, amt] of periodsList) {
    const num = Number(amt) || 0;
    const pct = totalSpent > 0 ? ((num / totalSpent) * 100).toFixed(1) : '0.0';

    html += `
      <div class="p-3 rounded-xl bg-slate-900/60 border border-white/[0.05] flex items-center justify-between hover:bg-slate-900/90 transition-colors">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
          <span class="text-xs font-mono font-medium text-slate-200">${escapeHtml(periodKey)}</span>
          <span class="text-[10px] font-mono text-slate-500">(${pct}% of total)</span>
        </div>
        <div class="text-xs font-mono font-semibold text-white tabular-nums">
          $${num.toFixed(2)}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// -------------------------------------------------------------
// Message Ingestion Console (POST /api/v1/ingestion/transaction-messages)
// -------------------------------------------------------------
function initIngestionConsole() {
  const form = document.getElementById('form-ingest-message');
  const extIdInput = document.getElementById('ingest-ext-id');
  const btnGenId = document.getElementById('btn-generate-id');
  const msgTextInput = document.getElementById('ingest-text');
  const jsonInspector = document.getElementById('json-inspector');
  const httpBadge = document.getElementById('ingestion-http-badge');
  const presetBtns = document.querySelectorAll('.preset-btn');

  function generateNewMessageId() {
    if (extIdInput) extIdInput.value = `msg-${Date.now()}`;
  }

  generateNewMessageId();

  if (btnGenId) {
    btnGenId.addEventListener('click', generateNewMessageId);
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (msgTextInput && text) {
        msgTextInput.value = text;
      }
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-ingest');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Send Ingestion Request';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin w-4 h-4 text-slate-950 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Posting to Ingress API...
        `;
      }

      const source = document.getElementById('ingest-source').value;
      const externalMessageId = extIdInput.value.trim();
      const messageText = msgTextInput.value.trim();
      const receivedAt = new Date().toISOString();

      const requestPayload = {
        source: source,
        externalMessageId: externalMessageId,
        userReference: CONFIG.userPhone,
        messageText: messageText,
        receivedAt: receivedAt
      };

      try {
        const res = await fetch(`${CONFIG.apiBase}/api/v1/ingestion/transaction-messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-INGESTION-API-KEY': CONFIG.apiKey
          },
          body: JSON.stringify(requestPayload)
        });

        const responseData = await res.json().catch(() => null);

        if (httpBadge) {
          httpBadge.textContent = `HTTP ${res.status} ${res.statusText || (res.status === 202 ? 'ACCEPTED' : res.status === 200 ? 'DUPLICATE' : '')}`;
          httpBadge.className = res.status === 202
            ? 'px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : res.status === 200
            ? 'px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }

        if (jsonInspector) {
          jsonInspector.textContent = JSON.stringify({
            request: {
              url: `${CONFIG.apiBase}/api/v1/ingestion/transaction-messages`,
              headers: {
                'Content-Type': 'application/json',
                'X-INGESTION-API-KEY': CONFIG.apiKey.substring(0, 6) + '...'
              },
              payload: requestPayload
            },
            response: {
              statusCode: res.status,
              statusText: res.statusText,
              body: responseData
            }
          }, null, 2);
        }

        if (res.ok) {
          const isDuplicate = responseData?.status === 'DUPLICATE';
          showToast(isDuplicate ? 'Duplicate message ignored (Idempotent)' : 'Transaction message accepted for processing!', isDuplicate ? 'info' : 'success');

          // Add to session feed
          addSessionActivityItem({
            title: source,
            subtitle: messageText,
            tag: isDuplicate ? 'Duplicate Ingest' : 'Ingested',
            status: `HTTP ${res.status}`,
            timestamp: new Date().toLocaleTimeString()
          });

          // Refresh summary data
          fetchSummaryData();
        } else {
          showToast(`Ingestion failed: HTTP ${res.status}`, 'error');
        }
      } catch (err) {
        if (httpBadge) {
          httpBadge.textContent = 'NETWORK ERROR';
          httpBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }
        if (jsonInspector) {
          jsonInspector.textContent = JSON.stringify({
            error: err.message,
            targetUrl: `${CONFIG.apiBase}/api/v1/ingestion/transaction-messages`
          }, null, 2);
        }
        showToast(`Network error: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
        generateNewMessageId();
      }
    });
  }
}

// -------------------------------------------------------------
// Manual Transaction Entry Modal (POST /api/transactions)
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

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-manual-tx');
      const originalText = submitBtn ? submitBtn.textContent : 'Save to Ledger';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
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
          throw new Error(errData.message || `Server returned HTTP ${res.status}`);
        }

        const savedTx = await res.json();

        addSessionActivityItem({
          title: savedTx.merchant || 'Manual Record',
          subtitle: rawMessage,
          tag: savedTx.category || 'Logged',
          amount: `-${currency} ${amount.toFixed(2)}`,
          status: 'Saved',
          timestamp: new Date().toLocaleTimeString()
        });

        showToast('Transaction logged successfully in database ledger!', 'success');
        form.reset();
        closeModal();
        fetchSummaryData();
      } catch (err) {
        showToast(`Failed to save transaction: ${err.message}`, 'error');
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
// Session Activity Feed Helper
// -------------------------------------------------------------
function addSessionActivityItem(item) {
  sessionTransactions.unshift(item);

  const list = document.getElementById('live-transaction-list');
  const emptyState = document.getElementById('session-empty-state');
  if (!list) return;

  if (emptyState) {
    emptyState.remove();
  }

  const el = document.createElement('div');
  el.className = 'py-3.5 flex items-center justify-between hover:bg-slate-900/40 px-2 rounded-lg transition-all border border-emerald-500/30 bg-white/[0.02]';
  
  el.innerHTML = `
    <div class="flex items-center gap-3.5">
      <div class="w-9 h-9 rounded-lg bg-slate-800 border border-white/[0.06] flex items-center justify-center text-emerald-400">
        ${getCategoryIcon(item.tag)}
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-white">${escapeHtml(item.title)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">${escapeHtml(item.tag)}</span>
        </div>
        <div class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
          <span>${escapeHtml(item.timestamp)}</span>
          <span>•</span>
          <span class="font-mono text-slate-500 truncate max-w-xs">${escapeHtml(item.subtitle)}</span>
        </div>
      </div>
    </div>
    <div class="text-right">
      <div class="text-sm font-mono font-semibold text-white tabular-nums">${escapeHtml(item.amount || item.status)}</div>
      <div class="text-[11px] font-mono text-slate-500">Active Session</div>
    </div>
  `;

  list.insertBefore(el, list.firstChild);

  setTimeout(() => {
    el.classList.remove('border-emerald-500/30', 'bg-white/[0.02]');
  }, 2500);
}

// -------------------------------------------------------------
// CSV Export (Session Ledger)
// -------------------------------------------------------------
function initExportCSV() {
  const btn = document.getElementById('btn-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (sessionTransactions.length === 0) {
      showToast('No session transactions to export yet.', 'info');
      return;
    }

    let csv = 'Timestamp,Title,Category,Details,Amount_or_Status\n';
    sessionTransactions.forEach(t => {
      csv += `"${t.timestamp}","${(t.title || '').replace(/"/g, '""')}","${(t.tag || '').replace(/"/g, '""')}","${(t.subtitle || '').replace(/"/g, '""')}","${(t.amount || t.status || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centinel_session_${CONFIG.userPhone}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Session records exported as CSV!', 'success');
  });
}

// -------------------------------------------------------------
// Settings Modal (Configuring API base, key, and user phone)
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
      updateUserPhoneDisplays();
      closeSettings();
      showToast('Configuration saved!', 'success');
      fetchSummaryData();
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
