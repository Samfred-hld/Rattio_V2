function loadData(key) {
  if (window._dataCache[key] !== undefined) return window._dataCache[key];
  let s = null;
  try { s = localStorage.getItem(LS + key); } catch(e) { /* storage blocked */ }
  if (s) {
    try { window._dataCache[key] = JSON.parse(s); }
    catch(e) {
      console.warn(`[Rattio] Dados corrompidos para "${key}". Backup salvo.`);
      try { localStorage.setItem(LS + key + '_corrupted_' + Date.now(), s); } catch(_) {}
      window._dataCache[key] = DEFAULTS[key] !== undefined ? JSON.parse(JSON.stringify(DEFAULTS[key])) : [];
      setTimeout(() => showToast(`⚠️ Dados de "${key}" corrompidos. Backup salvo.`, 'error'), 1000);
    }
  } else {
    window._dataCache[key] = DEFAULTS[key] !== undefined ? JSON.parse(JSON.stringify(DEFAULTS[key])) : [];
  }
  return window._dataCache[key];
}
function showQuotaErrorToast() {
  const msg = '⚠️ Armazenamento cheio! Exporte um backup e limpe dados antigos.';
  const extraHtml = `<button data-action="export-json" style="margin-left:10px;padding:4px 8px;background:var(--bg-light);color:var(--danger);border:none;border-radius:2px;font-weight:700;font-size:11px;cursor:pointer;">Exportar agora</button>`;
  showToast(msg, 'error', true, extraHtml);
}

var _storageWarned = false;
function checkStorageUsage() {
  if (_storageWarned) return;
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LS)) {
      totalBytes += (key.length + localStorage.getItem(key).length) * 2;
    }
  }
  const usageMB = totalBytes / (1024 * 1024);
  if (usageMB > 4.0) {
    showToast(`Aviso: Seu armazenamento local está quase cheio (${usageMB.toFixed(1)}MB). Considere exportar um backup e limpar transações antigas.`, 'warning', true);
    _storageWarned = true;
  }
}

function saveData(key) {
  if (window._dataCache[key] !== undefined) {
    try {
      localStorage.setItem(LS + key, JSON.stringify(window._dataCache[key]));
    } catch(e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        showQuotaErrorToast();
      }
    }
  }
}
var _dataDirty = false;
function saveAll() {
  try {
    Object.keys(DEFAULTS).forEach(k => {
      if (window._dataCache[k] !== undefined) {
        localStorage.setItem(LS + k, JSON.stringify(window._dataCache[k]));
      }
    });
  } catch(e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      showQuotaErrorToast();
    }
  }
  _dataDirty = true;
  // NOTE: cache is intentionally NOT cleared here - use clearCache() explicitly when needed
  checkStorageUsage();
}
function clearCache() { window._dataCache = {}; invalidateCalcCache(); }

// ============================
// CALC CACHE
// ============================
var calcCache = { monthly:{}, category:{}, monthTxs:{}, ready: false };
function invalidateCalcCache() { calcCache.monthly={}; calcCache.category={}; calcCache.monthTxs={}; calcCache.ready=true; }

// ============================
// DEBOUNCE UTILITY
// ============================
function debounce(fn, delay) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

// ============================
// TOAST & CONFIRM
// ============================
function showToast(msg, type='success', persistent=false, extraHtml='') {
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle');
  el.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i> <span style="flex:1;"></span>${extraHtml}`;
  el.querySelector('span').textContent = msg;
  if (persistent) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = 'margin-left:8px;background:none;border:none;color:inherit;cursor:pointer;opacity:0.7;';
    closeBtn.onclick = () => el.remove();
    el.appendChild(closeBtn);
  }
  tc.appendChild(el);
  if (!persistent) {
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 400); }, CONFIG.TOAST_DURATION_MS);
  }
}

var confirmCallback = null;
function showConfirm(text, cb) {
  const el = document.getElementById('confirm-text');
  if (typeof text === 'string' && (text.includes('<b>') || text.includes('<i>'))) {
    // Permitir apenas <b>, <i>, </b>, </i> — bloquear todo o resto
    el.innerHTML = text
      .replace(/<\/?(?![bi]>)[a-z][^>]*>/gi, '')  // remove tags que não são <b>/<i>
      .replace(/\bon\w+\s*=/gi, 'data-blocked=');  // remove event handlers
  } else {
    el.textContent = String(text);
  }
  confirmCallback = cb;
  document.getElementById('confirm-overlay').classList.add('active');
}
document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.remove('active');
  confirmCallback = null;
});
document.getElementById('confirm-ok-btn').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.remove('active');
  if (confirmCallback) { confirmCallback(); confirmCallback = null; }
});

// ============================
// UTILS
// ============================
var fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
var fmtDate = s => { const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
var fmtDateISO = d => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };
var parseDateISO = s => new Date(s+'T00:00:00');
var safeDate = (y,m,d) => new Date(y, m, Math.min(d, new Date(y,m+1,0).getDate()));
var addMonthsISO = (iso, n) => { const d=parseDateISO(iso); return fmtDateISO(safeDate(d.getFullYear(), d.getMonth()+n, d.getDate())); };
var genId = () => String(Date.now())+Math.random().toString(16).slice(2);
var withInstSuffix = (desc,i,c) => `${desc} (${i}/${c})`;

// ══════════════════════════════════════════
// CALC TOTALS — elimina duplicação de income/expense/balance
// ══════════════════════════════════════════
