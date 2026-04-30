var _txFormDirty = false;
function markTxClean() { _txFormDirty = false; }
function markTxDirty() { _txFormDirty = true; }
function isTxDirty() { return _txFormDirty; }

function openModal(id) {
  const m=document.getElementById(id);
  m.classList.add('open');
  m.removeAttribute('aria-hidden');
  trapFocus(m);
}
function closeModal(id) {
  // UX-02: Confirm before closing dirty transaction modal
  if (id === 'transactionModal' && _txFormDirty) {
    showConfirm('Você tem alterações não salvas. <b>Descartar?</b>', () => {
      _txFormDirty = false;
      closeModal('transactionModal');
    });
    return;
  }
  const m=document.getElementById(id);
  m.classList.remove('open');
  m.setAttribute('aria-hidden','true');
  releaseFocus(m);
  // Return focus to trigger element if available
  const trigger = document.querySelector('[data-open="'+id+'"]') || document.querySelector('[onclick*="'+id+'"]');
  if(trigger) trigger.focus();
}

// ============================
// HEADER
// ============================
function getDeltaHTML(cur, prev, isExpense) {
  if (!prev && prev !== 0) return '';
  const pct = prev !== 0 ? ((cur - prev) / Math.abs(prev) * 100) : 0;
  if (Math.abs(pct) < 0.5) return '<span class="delta-pill neutral">≈0%</span>';
  const up = cur > prev;
  const good = isExpense ? !up : up;
  const cls = good ? 'positive' : 'negative';
  const icon = up ? '▲' : '▼';
  return `<span class="delta-pill ${cls}">${icon}${Math.abs(pct).toFixed(0)}%</span>`;
}
function updateHeader() {
  const t = getMonthlyTotals(currentMonth, currentYear);
  let prevM = currentMonth-1, prevY = currentYear;
  if (prevM < 0) { prevM = 11; prevY--; }
  const prev = getMonthlyTotals(prevM, prevY);
  
  document.getElementById('headerIncome').innerHTML = fmt(t.income) + getDeltaHTML(t.income, prev.income, false);
  document.getElementById('headerExpense').innerHTML = fmt(Math.abs(t.expenses)) + getDeltaHTML(Math.abs(t.expenses), Math.abs(prev.expenses), true);
  document.getElementById('headerBalance').innerHTML = fmt(t.balance) + getDeltaHTML(t.balance, prev.balance, false);
  document.getElementById('monthName').textContent = `${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}`;
  announce(`${MONTH_NAMES[currentMonth]} ${currentYear}. Receitas: ${fmt(t.income)}. Despesas: ${fmt(Math.abs(t.expenses))}.`);
  const pill = document.getElementById('headerBalancePill');
  pill.className = `summary-pill ${t.balance<0?'balance-neg':'balance-pos'}`;
}

// ============================
// PAGINATION
// ============================
function resetPagination() { for (let k in paginationState) paginationState[k]=1; }
/**
 * Wrapper legacy: delega para paginate() unificada.
 * Mantém compatibilidade com todas as chamadas existentes.
 */
