function calcTotals(txs) {
  let income = 0, expense = 0;
  for (let i = 0; i < txs.length; i++) {
    if (txs[i].value > 0) income += txs[i].value;
    else expense += txs[i].value; // negative
  }
  return { income, expense: Math.abs(expense), balance: income + expense, count: txs.length };
}

// ══════════════════════════════════════════
// WITHDATA — cacheia loadData() por escopo
// ══════════════════════════════════════════
function withData(fn) {
  const _cache = {};
  const get = k => (_cache[k] ?? (_cache[k] = loadData(k)));
  return fn(get);
}

// ── Installment detection (Nubank, Itaú, generic) ──────────────────────────
function detectInstallment(description) {
  if (!description) return null;
  const s = description.trim();
  let m = s.match(/^(.*?)\s*[-–]\s*[Pp]arcela\s+(\d+)\/(\d+)$/);
  if (m) {
    const idx = parseInt(m[2]), total = parseInt(m[3]);
    if (total > 1 && idx >= 1 && idx <= total) return { isInstallment: true, index: idx, total, cleanTitle: m[1].trim() };
  }
  m = s.match(/^(.*?)\s+(\d{2})\/(\d{2})$/);
  if (m) {
    const idx = parseInt(m[2]), total = parseInt(m[3]);
    if (total > 1 && idx >= 1 && idx <= total) return { isInstallment: true, index: idx, total, cleanTitle: m[1].trim() };
  }
  m = s.match(/\((\d+)\/(\d+)\)\s*$/);
  if (m) {
    const idx = parseInt(m[1]), total = parseInt(m[2]);
    if (total > 1 && idx >= 1 && idx <= total) return { isInstallment: true, index: idx, total, cleanTitle: s.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() };
  }
  return null;
}

// ── Refund / payment detection ──────────────────────────────────────────────
function isRefundOrPayment(description, value) {
  if (value < 0) return true;
  if (!description) return false;
  const s = description.toLowerCase();
  if (/\b(pagamento|estorno|reembolso|cashback|iof)\b/.test(s)) return true;
  if (/^(pagamento efetuado|pagamento recebido)/.test(s)) return true;
  return false;
}

// Returns the invoice month/year [year, month] that a card transaction belongs to
// A purchase on or before closingDay → current month's invoice
// A purchase after closingDay → next month's invoice
function getCardInvoiceMonth(txDate, closingDay) {
  const d = parseDateISO(txDate);
  if (d.getDate() > closingDay) {
    // After closing → goes to next month's invoice
    let nm = d.getMonth() + 1, ny = d.getFullYear();
    if (nm > 11) { nm = 0; ny++; }
    return [ny, nm];
  }
  return [d.getFullYear(), d.getMonth()];
}

/**
 * Retorna transações filtradas por mês/ano.
 * Para despesas de cartão: usa lógica de fatura (getCardInvoiceMonth).
 * Para demais: filtra pela data real.
 * @param {number} y - Ano
 * @param {number} m - Mês (0-11)
 * @returns {Array} Transações do mês
 */
function getFilteredByMonth(y, m) {
  const k = `${y}-${m}`;
  if (calcCache.ready && calcCache.monthTxs[k]) return calcCache.monthTxs[k];
  const txs = loadData('transactions');
  const cards = loadData('cards');
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });
  const r = txs.filter(t => {
    if (t.cardId && t.value < 0) {
      // For card expenses: use invoice month logic
      const card = cardMap[t.cardId];
      if (card && card.closingDay) {
        const [iy, im] = getCardInvoiceMonth(t.date, card.closingDay);
        return iy === y && im === m;
      }
    }
    // Non-card or income: use actual date
    const d = parseDateISO(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  calcCache.monthTxs[k] = r; return r;
}
/**
 * Calcula totais mensais (receitas, despesas, saldo).
 * Resultado é cacheado por mês/ano.
 * @param {number} m - Mês (0-11)
 * @param {number} y - Ano
 * @returns {{income: number, expenses: number, balance: number}}
 */
function getMonthlyTotals(m, y) {
  const k = `${y}-${m}`;
  if (calcCache.ready && calcCache.monthly[k]) return calcCache.monthly[k];
  const txs = getFilteredByMonth(y, m);
  const t = calcTotals(txs);
  const r = { income: t.income, expenses: -t.expense, balance: t.balance };
  calcCache.monthly[k] = r; return r;
}
function getCatTotal(cat, m, y) {
  const k = `${y}-${m}-${cat}`;
  if (calcCache.ready && calcCache.category[k]) return calcCache.category[k];
  const txs = getFilteredByMonth(y, m);
  const r = txs.filter(t=>t.category===cat && t.value<0).reduce((s,t)=>s+Math.abs(t.value),0);
  calcCache.category[k] = r; return r;
}
function getOverallBalance(y, m) {
  const txs = loadData('transactions');
  const target = new Date(y, m+1, 0, 23, 59, 59);
  return txs.reduce((s,t) => parseDateISO(t.date)<=target ? s+t.value : s, 0);
}
function forecastCashFlow(fMonths=3, hMonths=3) {
  let totalInc=0, totalExp=0;
  for (let i=0; i<hMonths; i++) {
    let m=currentMonth-i, y=currentYear;
    while(m<0){m+=12;y--;}
    getFilteredByMonth(y,m).forEach(t => { if(t.value>0) totalInc+=t.value; else totalExp+=Math.abs(t.value); });
  }
  const avgInc=totalInc/hMonths, avgExp=totalExp/hMonths;
  let bal = getOverallBalance(currentYear, currentMonth);
  const predictions = [];
  for (let i=1; i<=fMonths; i++) {
    let fm=currentMonth+i, fy=currentYear;
    while(fm>11){fm-=12;fy++;}
    bal += avgInc - avgExp;
    predictions.push({ label: `${MONTH_SHORT[fm]}/${fy}`, income: avgInc, expense: avgExp, balance: bal, isDeficit: bal<0||avgExp>avgInc });
  }
  return { predictions, avgInc, avgExp };
}
function applyRules(desc, cat, type, isFixed) {
  const rules = loadData('rules'); let c=cat, tp=type, fx=!!isFixed;
  for (const r of rules) { if (desc.toLowerCase().includes((r.keyword||'').toLowerCase())) { if(r.category) c=r.category; if(r.type) tp=r.type; if(r.isFixedExpense) fx=true; } }
  return { category:c, type:tp, isFixedExpense:fx };
}

// ============================
// AUDIT LOG
// ============================
function logChange(entityType, entityId, action, oldVal=null, newVal=null) {
  const log = loadData('changelog');
  log.unshift({ id:genId(), timestamp:Date.now(), entityType, entityId, action, oldValue: oldVal?JSON.parse(JSON.stringify(oldVal)):null, newValue: newVal?JSON.parse(JSON.stringify(newVal)):null });
  if (log.length > CONFIG.MAX_CHANGELOG_ENTRIES) log.length = CONFIG.MAX_CHANGELOG_ENTRIES;
  window._dataCache['changelog'] = log;
}
function formatLogDetails(l) {
  if (l.action==='CREATE') return 'Criado.';
  if (l.action==='DELETE') return 'Removido.';
  if (l.action==='UPDATE') {
    let ch=[];
    for (let k in l.newValue) if (l.oldValue && JSON.stringify(l.oldValue[k])!==JSON.stringify(l.newValue[k]) && k!=='id' && k!=='timestamp') ch.push(`<b>${k}</b>: ${l.oldValue[k]} → ${l.newValue[k]}`);
    return ch.length ? ch.join('<br>') : 'Sem alterações detectadas.';
  }
  return '-';
}
function viewEntityHistory(entityType, entityId) {
  const logs = loadData('changelog').filter(l=>l.entityType===entityType&&l.entityId===entityId);
  const tbody = document.getElementById('historyModalBody');
  tbody.innerHTML = logs.length ? logs.map(l=>`<tr><td style="white-space:nowrap;font-weight:600;">${new Date(l.timestamp).toLocaleString('pt-BR')}</td><td><span class="pill ${l.action.toLowerCase()}">${l.action}</span></td><td style="font-size:13px;color:var(--text-muted);">${formatLogDetails(l)}</td></tr>`).join('') : `<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum histórico.</td></tr>`;
  openModal('historyModal');
}
function bindHistoryButtons(containerId, entityType) {
  const c = document.getElementById(containerId); if(!c) return;
  c.querySelectorAll('.action-button.history').forEach(b => b.addEventListener('click', e => viewEntityHistory(entityType, e.currentTarget.dataset.id)));
}

// ============================
// GOAL HELPERS
// ============================
// getGoalCurrent: definida na seção Goals (QC-02 — duplicata removida)

// ============================
// MODAL HELPERS
// ============================
function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
  );
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeModal(modalEl.id);
      return;
    }
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  modalEl._trapHandler = handleKeydown;
  modalEl.addEventListener('keydown', handleKeydown);
  setTimeout(() => { if (first) first.focus(); }, 50);
}
function releaseFocus(modalEl) {
  if (modalEl._trapHandler) {
    modalEl.removeEventListener('keydown', modalEl._trapHandler);
    delete modalEl._trapHandler;
  }
}
// ============================
// DIRTY FORM TRACKING (UX-02)
// ============================
