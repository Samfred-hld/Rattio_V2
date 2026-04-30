'use strict';

// ══════════════════════════════════════════
// BUILD INFO
// ══════════════════════════════════════════
var BUILD_INFO = { version: '3.1.0', date: '2026-04-29', hash: 'local-dev' };

// ══════════════════════════════════════════
// GLOBAL ERROR HANDLER (JS-02)
// ══════════════════════════════════════════
window.addEventListener('error', e => {
  console.error('[Rattio]', e.error || e.message, e.filename);
});
window.addEventListener('unhandledrejection', e => {
  console.error('[Rattio] Unhandled promise rejection:', e.reason);
});

// ══════════════════════════════════════════
// XSS HELPER — usar em TODOS os innerHTML (S-01)
// ══════════════════════════════════════════
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
/** Alias curto para uso em templates HTML */
var h = s => escapeHtml(String(s ?? ''));

// ══════════════════════════════════════════
// ACCESSIBILITY ANNOUNCER (AA-03)
// ══════════════════════════════════════════
function announce(msg) {
  const el = document.getElementById('a11yAnnouncer');
  if (el) el.textContent = '';
  requestAnimationFrame(() => { if (el) el.textContent = msg; });
}

// ══════════════════════════════════════════
// CONSTANTES E DEFAULTS
// ══════════════════════════════════════════
var LS = 'gcn_';

// ══════════════════════════════════════════
// CONFIG CONSTANTS (QC-03 — magic numbers)
// ══════════════════════════════════════════
var CONFIG = {
  MAX_CHANGELOG_ENTRIES: 1000,
  TOAST_DURATION_MS: 3000,
  UNDO_DURATION_MS: 4500,
  BACKUP_INTERVAL_MS: 300000,
  MAX_BACKUPS_KEPT: 5,
  UPCOMING_DAYS_THRESHOLD: 7,
  SEARCH_MIN_LENGTH: 2,
  AUTOCOMPLETE_MAX_ITEMS: 8,
  DESCRIPTION_MAX_LENGTH: 100,
  TX_PER_PAGE: 50,
  DEBOUNCE_DELAY_MS: 200,
};

// ══════════════════════════════════════════
// SCHEMA VERSIONING (M-02)
// ══════════════════════════════════════════
var SCHEMA_VERSION = 3;
function migrateIfNeeded() {
  const stored = parseInt(localStorage.getItem(LS + 'schemaVersion') || '0');
  if (stored >= SCHEMA_VERSION) return;
  try {
    if (stored < 1) {
      const txs = JSON.parse(localStorage.getItem(LS + 'transactions') || '[]');
      txs.forEach(t => { if (t.isFixedExpense === undefined) t.isFixedExpense = false; });
      localStorage.setItem(LS + 'transactions', JSON.stringify(txs));
    }
    if (stored < 2) {
      const txs = JSON.parse(localStorage.getItem(LS + 'transactions') || '[]');
      txs.forEach(t => { if (t.goalId === undefined) t.goalId = null; });
      localStorage.setItem(LS + 'transactions', JSON.stringify(txs));
    }
    if (stored < 3) {
      const goals = JSON.parse(localStorage.getItem(LS + 'goals') || '[]');
      goals.forEach(g => { if (g.currentValue === undefined) g.currentValue = null; });
      localStorage.setItem(LS + 'goals', JSON.stringify(goals));
    }
    localStorage.setItem(LS + 'schemaVersion', SCHEMA_VERSION);
  } catch(e) { console.warn('[Rattio] Migration error:', e); }
}

var DEFAULTS = {
  transactions: [],
  categories: ['Salário','Alimentação','Transporte','Moradia','Saúde','Educação','Lazer','Investimentos','Contas','Outros'],
  paymentMethods: ['Débito','Dinheiro','Pix','Transferência'],
  budgets: [], goals: [], cards: [], rules: [], changelog: [],
  settings: { salaryValue: 3500.00, salaryDay: 5, fixedTemplates: [], suggestionsLog: {} }
};
var MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MONTH_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
var DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var CAT_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#6366f1','#ec4899','#14b8a6','#eab308','#84cc16','#0ea5e9','#d946ef','#f43f5e'];

// Gemini API
// ⚠️ SECURITY WARNING: Never commit a real API key here. Use a backend proxy to protect your key.
var GEMINI_API_KEY = "";

// ============================
// STATE
// ============================
var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  invalidateCalcCache();
  renderActiveTab();
}
var activeTab = 'dashboard';
var sidebarCollapsed = false;
var transactionFilters = { active: false, desc: '', cat: '', type: '', start: '', end: '' };
var DEFAULT_DASHBOARD_SECTIONS = [
  { id: 'resumo',      label: 'Resumo Financeiro',   visible: true },
  { id: 'graficos',    label: 'Gráficos',             visible: true },
  { id: 'gastos',      label: 'Gastos Fixos',         visible: true },
  { id: 'metas',       label: 'Metas e Investimentos',visible: true },
  { id: 'parcelas',    label: 'Projeção de Parcelas', visible: true },
  { id: 'planejado',   label: 'Planejado x Gasto',    visible: true },
];
var dashboardSections = null; // loaded from localStorage in init
var autocompleteDescriptions = [];
var paginationState = { income:1, expense:1, fixed:1, var:1, inst:1, searchResults:1, budgets:1, goals:1, rules:1, cards:1, categories:1, pm:1, tpls:1, financings:1, backups:1, changelog:1 };

// ============================
// LAZY DATA CACHE
// ============================
window._dataCache = {};
/**
 * Carrega dados do localStorage com cache em memória.
 * Retorna deep copy de DEFAULTS se chave não existir.
 * Faz backup de dados corrompidos antes de resetar.
 * @param {string} key - Chave (transactions|categories|budgets|goals|cards|rules|settings|changelog)
 * @returns {Array|Object} Dados carregados
 */
