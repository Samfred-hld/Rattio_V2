function renderCalendarTab() {
  const page = document.getElementById('calendarPage');
  page.innerHTML = '';

  const monthTxs = getFilteredByMonth(currentYear, currentMonth);
  const cards = loadData('cards');
  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // ── Monthly summary for calendar ──
  const calTotals = calcTotals(monthTxs);

  page.innerHTML = `
    <div class="section">
      <div class="section-header">
        <div class="section-header-left">
          <div class="section-icon"><i class="far fa-calendar-alt"></i></div>
          <h2>Calendário — ${MONTH_NAMES[currentMonth]} ${currentYear}</h2>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;background:var(--accent-light);color:var(--accent-dark-green);">+${fmt(calTotals.income)}</span>
          <span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;background:var(--danger-light);color:var(--danger);">-${fmt(calTotals.expense)}</span>
          <span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;background:var(--info-light);color:var(--info);">${calTotals.balance>=0?'+':''}${fmt(calTotals.balance)}</span>
          <button class="btn secondary small" id="btnExportCal"><i class="fas fa-download"></i> CSV</button>
        </div>
      </div>
      <div class="calendar-grid" id="calGrid"></div>
    </div>`;

  const grid = document.getElementById('calGrid');

  // Day headers
  DAY_NAMES.forEach(dn => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = dn;
    grid.appendChild(h);
  });

  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'calendar-day empty';
    grid.appendChild(e);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    // For non-card transactions: filter by actual date
    // For card transactions: they appear in the day they were purchased (real date)
    const allTxs = loadData('transactions');
    const dayTxs = allTxs.filter(t => {
      // Card expenses: show on their real purchase date in calendar
      return t.date === iso;
    });

    const dayTotals = calcTotals(dayTxs);
    const isToday = today.getDate()===d && today.getMonth()===currentMonth && today.getFullYear()===currentYear;

    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.style.cursor = 'pointer';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    const txCount = dayTxs.length;
    const dayLabel = `${d} de ${MONTH_NAMES[currentMonth]}. ${txCount ? txCount + ' transação' + (txCount > 1 ? 'ões' : 'ão') : 'Sem transações'}. ${dayTotals.income > 0 ? 'Entradas: ' + fmt(dayTotals.income) + '. ' : ''}${dayTotals.expense > 0 ? 'Saídas: ' + fmt(dayTotals.expense) + '.' : ''}`;
    div.setAttribute('aria-label', dayLabel);
    div.title = txCount ? `${txCount} transação(ões) — clique para ver` : 'Clique para adicionar transação';

    const handleDayActivation = () => {
      if (txCount === 0) {
        openTransactionModal('expense');
        setTimeout(() => {
          const el = document.getElementById('transactionDate');
          if (el) { el.value = iso; validateForm(); }
        }, 50);
      } else {
        showDayDetail(iso, dayTxs);
      }
    };
    div.addEventListener('click', handleDayActivation);
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDayActivation(); }
    });

    const dateEl = document.createElement('div');
    dateEl.className = `calendar-date${isToday ? ' today' : ''}`;
    dateEl.textContent = d;
    div.appendChild(dateEl);

    const eventsWrap = document.createElement('div');
    eventsWrap.className = 'calendar-day-events';

    if (dayTotals.income > 0) {
      const e = document.createElement('div');
      e.className = 'event-item income';
      e.textContent = `+${fmt(dayTotals.income)}`;
      eventsWrap.appendChild(e);
    }
    if (dayTotals.expense > 0) {
      const e = document.createElement('div');
      e.className = 'event-item expense';
      e.textContent = `-${fmt(dayTotals.expense)}`;
      eventsWrap.appendChild(e);
    }

    // Card events: closing day and due day — clicáveis
    cards.forEach(c => {
      if (c.dueDay === d) {
        const e = document.createElement('div');
        e.className = 'event-item due';
        e.style.cursor = 'pointer';
        e.title = `Ver fatura do ${c.name}`;
        e.textContent = `📅 Fatura ${c.name}`;
        e.addEventListener('click', ev => {
          ev.stopPropagation();
          viewCardStatement(c.id);
        });
        eventsWrap.appendChild(e);
      }
      if (c.closingDay === d) {
        const e = document.createElement('div');
        e.className = 'event-item';
        e.style.cssText = 'background:#f3e8ff;color:#6b21a8;cursor:pointer;';
        e.title = `Fechamento da fatura do ${c.name}`;
        e.textContent = `✂️ Fecha ${c.name}`;
        e.addEventListener('click', ev => {
          ev.stopPropagation();
          viewCardStatement(c.id);
        });
        eventsWrap.appendChild(e);
      }
    });

    if (eventsWrap.childElementCount === 0 && dayTxs.length === 0) {
      const e = document.createElement('span');
      e.style.cssText = 'font-size:11px;color:var(--text-muted);';
      e.textContent = 'Sem lançamentos';
      eventsWrap.appendChild(e);
    }

    div.appendChild(eventsWrap);
    grid.appendChild(div);
  }

  page.querySelector('#btnExportCal').addEventListener('click', () =>
    exportCSV(monthTxs, `calendario_${MONTH_SHORT[currentMonth]}_${currentYear}`)
  );
}

// ============================
// ADVANCED REPORTS TAB (v6)
// ============================
var chartInst = { pie:null, line:null, bar:null, forecast:null, netWorth:null, catBar:null, mainChart:null, invDonut:null, invEvolution:null };
var reportsYear = new Date().getFullYear();

// ── Advanced Report State ──
var advReport = {
  period: 'monthly',          // monthly | quarterly | annual | custom
  customStart: '',
  customEnd: '',
  categories: [],             // [] = all
  types: 'all',               // all | income | expense
  chartView: 'bar-cat',       // bar-cat | net-worth | doughnut | trend
};

function getAdvancedTxs() {
  const allTxs = loadData('transactions');
  const allCats = loadData('categories');
  const cards = loadData('cards');
  const cardMap = {};
  cards.forEach(c => { cardMap[c.id] = c; });
  let txs = allTxs;

  // ── Filter by period ──
  // For monthly/quarterly: use card invoice logic for card expenses (same as dashboard)
  // For annual/custom: use raw date filter
  const now = new Date();
  let startDate, endDate;
  let useInvoiceLogic = false;
  if (advReport.period === 'monthly') {
    startDate = new Date(currentYear, currentMonth, 1);
    endDate   = new Date(currentYear, currentMonth + 1, 0);
    useInvoiceLogic = true;
  } else if (advReport.period === 'quarterly') {
    const q = Math.floor(currentMonth / 3);
    startDate = new Date(currentYear, q * 3, 1);
    endDate   = new Date(currentYear, q * 3 + 3, 0);
    useInvoiceLogic = true;
  } else if (advReport.period === 'annual') {
    startDate = new Date(reportsYear, 0, 1);
    endDate   = new Date(reportsYear, 11, 31);
  } else if (advReport.period === 'custom' && advReport.customStart && advReport.customEnd) {
    startDate = new Date(advReport.customStart + 'T00:00:00');
    endDate   = new Date(advReport.customEnd + 'T23:59:59');
  }
  if (startDate && endDate) {
    if (useInvoiceLogic) {
      // FIX BUG 1: For monthly/quarterly, apply invoice month logic for card expenses
      const targetY = currentYear;
      const targetM = currentMonth;
      txs = txs.filter(t => {
        if (t.cardId && t.value < 0) {
          const card = cardMap[t.cardId];
          if (card && card.closingDay) {
            const [iy, im] = getCardInvoiceMonth(t.date, card.closingDay);
            if (advReport.period === 'monthly') {
              return iy === targetY && im === targetM;
            } else {
              // quarterly: check if invoice month falls in the quarter
              const q = Math.floor(targetM / 3);
              return iy === targetY && Math.floor(im / 3) === q;
            }
          }
        }
        const d = parseDateISO(t.date);
        return d >= startDate && d <= endDate;
      });
    } else {
      txs = txs.filter(t => {
        const d = parseDateISO(t.date);
        return d >= startDate && d <= endDate;
      });
    }
  }

  // ── Filter by type ──
  if (advReport.types === 'income')  txs = txs.filter(t => t.value > 0);
  if (advReport.types === 'expense') txs = txs.filter(t => t.value < 0);

  // ── Filter by categories ──
  // FIX BUG 6: only filter if not ALL categories are selected
  if (advReport.categories.length > 0 && advReport.categories.length < allCats.length) {
    txs = txs.filter(t => advReport.categories.includes(t.category));
  }
  return txs;
}

function getPeriodLabel() {
  if (advReport.period === 'monthly')   return MONTH_NAMES[currentMonth] + ' ' + currentYear;
  if (advReport.period === 'quarterly') {
    const q = Math.floor(currentMonth / 3) + 1;
    return `T${q} ${currentYear}`;
  }
  if (advReport.period === 'annual')    return `Ano ${reportsYear}`;
  if (advReport.customStart && advReport.customEnd) {
    return `${fmtDate(advReport.customStart)} – ${fmtDate(advReport.customEnd)}`;
  }
  return 'Período Personalizado';
}

function destroyAllCharts() {
  Object.keys(chartInst).forEach(k => { if(chartInst[k]) { try { chartInst[k].destroy(); } catch(e){} chartInst[k]=null; } });
}
