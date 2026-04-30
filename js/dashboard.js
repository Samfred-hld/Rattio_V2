function loadDashboardSections() {
  if (!dashboardSections) {
    try {
      const saved = localStorage.getItem(LS + 'dashSections');
      dashboardSections = saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_SECTIONS.map(s => ({...s}));
    } catch(e) {
      dashboardSections = DEFAULT_DASHBOARD_SECTIONS.map(s => ({...s}));
    }
  }
  return dashboardSections;
}

function saveDashboardSections() {
  localStorage.setItem(LS + 'dashSections', JSON.stringify(dashboardSections));
}

function renderDashboard() {
  const page = document.getElementById('dashboardPage');
  page.innerHTML = '';
  const sections = loadDashboardSections();

  let prevM = currentMonth - 1, prevY = currentYear;
  if (prevM < 0) { prevM = 11; prevY--; }
  const cur  = getMonthlyTotals(currentMonth, currentYear);
  const prev = getMonthlyTotals(prevM, prevY);
  const monthTxs = getFilteredByMonth(currentYear, currentMonth);
  const patrimonioTotal = getOverallBalance(currentYear, currentMonth);

  // Section renderers
  const sectionMap = {
    resumo:   () => renderDashSectionResumo(cur, prev, patrimonioTotal, monthTxs),
    graficos: () => renderDashSectionGraficos(monthTxs),
    gastos:   () => renderDashSectionGastos(monthTxs),
    metas:    () => renderDashSectionMetas(),
    parcelas: () => renderDashSectionParcelas(monthTxs),
    planejado:() => renderDashSectionPlanejado(cur),
  };

  sections.filter(s => s.visible).forEach(s => {
    const el = document.createElement('div');
    el.id = `dashSection_${s.id}`;
    el.innerHTML = sectionMap[s.id] ? sectionMap[s.id]() : '';
    if (el.innerHTML.trim()) page.appendChild(el);
  });

  // Customize button - rendered inline in page header, not appended as fixed child

  // Initialize charts (async — loads Chart.js on demand)
  initDashCharts(monthTxs);
}

function renderDashSectionResumo(cur, prev, patrimonio, txs) {
  const cards = loadData('cards');
  const cardTotal = txs.filter(t => t.cardId && t.value < 0).reduce((s,t) => s + Math.abs(t.value), 0);
  const alerts = buildDashAlerts(txs);
  const alertsHtml = alerts.length
    ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
        ${alerts.map(a => `<div class="alert-item ${a.type}" data-action="switch-tab" data-tab="${a.tab||'dashboard'}" role="button" tabindex="0" aria-label="${a.msg.replace(/<[^>]+>/g, '')}" style="cursor:pointer;">
          <i class="fas ${a.icon}" aria-hidden="true"></i> <span>${a.msg}</span>
        </div>`).join('')}
       </div>` : '';

  const dashHeaderHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
    <div>
      <div class="u-section-label">${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}</div>
    </div>
    <button class="dash-customize-btn" data-action="dash-customize">
      <i class="fas fa-sliders-h"></i> Personalizar
    </button>
  </div>`;

  return `${dashHeaderHtml}${alertsHtml}
    <div class="cards-grid-3" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:18px;">
      <div class="insight-card income">
        <div class="ic-label"><i class="fas fa-arrow-up"></i> Receitas</div>
        <div class="ic-value">${fmt(cur.income)}</div>
        ${getDeltaHTML(cur.income, prev.income, false)} <span class="u-label-sm" style="margin-left:4px">vs mês ant.</span>
      </div>
      <div class="insight-card expense">
        <div class="ic-label"><i class="fas fa-arrow-down"></i> Despesas</div>
        <div class="ic-value">${fmt(Math.abs(cur.expenses))}</div>
        ${getDeltaHTML(Math.abs(cur.expenses), Math.abs(prev.expenses), true)} <span class="u-label-sm" style="margin-left:4px">vs mês ant.</span>
      </div>
      <div class="insight-card balance">
        <div class="ic-label"><i class="fas fa-wallet"></i> Saldo do Mês</div>
        <div class="ic-value" style="color:${cur.balance<0?'var(--danger)':'var(--text-main)'};">${fmt(cur.balance)}</div>
        ${getDeltaHTML(cur.balance, prev.balance, false)} <span class="u-label-sm" style="margin-left:4px">vs mês ant.</span>
      </div>
      <div class="insight-card" style="border-top-color:var(--warning);">
        <div class="ic-label"><i class="fas fa-piggy-bank" style="background:var(--warning-light);color:var(--warning);"></i> Patrimônio Líquido</div>
        <div class="ic-value" style="color:${patrimonio<0?'var(--danger)':'#b45309'};">${fmt(patrimonio)}</div>
        <span style="font-size:11px;color:var(--text-muted);margin-top:6px;display:block;">Saldo acumulado total</span>
      </div>
    </div>`;
}

function renderDashSectionGraficos(txs) {
  return `<div class="section" style="padding:20px 22px;margin-bottom:18px;">
    <div class="section-header"><div class="section-header-left"><div class="section-icon"><i class="fas fa-chart-bar"></i></div><h2>Gráficos</h2></div></div>
    <div class="dashboard-grid-2" style="margin-top:0;">
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div data-action="switch-tab" data-tab="transactions" style="cursor:pointer;" role="button" tabindex="0" aria-label="Ver transações recentes">${makeSectionHTML('<i class="fas fa-list-ul"></i>','Transações Recentes', makeRecentTxsHtml(txs))}</div>
        ${makeSectionHTML('<i class="fas fa-chart-line"></i>','Previsão Mês Seguinte', makeForecastHtml())}
      </div>
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div data-action="switch-tab" data-tab="budgets" style="cursor:pointer;" role="button" tabindex="0" aria-label="Ver orçamentos">${makeSectionHTML('<i class="fas fa-chart-pie"></i>','Orçamentos', makeBudgetsPreviewHtml())}</div>
        ${makeSectionHTML('<i class="fas fa-calendar-check" style="color:var(--warning)"></i>','Próximos Vencimentos', makeUpcomingHtml())}
      </div>
    </div>
  </div>`;
}

function renderDashSectionGastos(txs) {
  const st = loadData('settings');
  const templates = (st.fixedTemplates || []).slice(0, 6);
  if (!templates.length) return '';
  const mk = `${currentYear}-${currentMonth}`;
  const applied = templates.filter(tpl =>
    txs.some(t => t.description === tpl.description && t.value < 0)
  );
  const tplHtml = templates.map(t => {
    const done = txs.some(tx => tx.description === t.description && tx.value < 0);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-light);border-radius:1px;border:1px solid var(--border-color);gap:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${done?'var(--success)':'var(--border-color)'};flex-shrink:0;"></div>
        <span class="u-text-sm-bold">${escapeHtml(t.description)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:13px;font-weight:700;color:var(--danger);">${fmt(t.value)}</span>
        ${!done ? `<button data-tpl-id="${t.id}" style="padding:4px 10px;border-radius:2px;border:none;background:var(--info-light);color:var(--info);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Lançar</button>` : `<span style="font-size:11px;color:var(--success);font-weight:700;">✓ Lançado</span>`}
      </div>
    </div>`;
  }).join('');

  return `<div class="section" style="padding:20px 22px;margin-bottom:18px;">
    <div class="section-header"><div class="section-header-left"><div class="section-icon" style="background:#fef3c7;color:#b45309;"><i class="fas fa-thumbtack"></i></div><h2>Gastos Fixos</h2></div>
    <span class="u-text-sm-muted">${applied.length}/${templates.length} lançados</span></div>
    <div style="display:flex;flex-direction:column;gap:8px;">${tplHtml}</div>
  </div>`;
}

function renderDashSectionMetas() {
  const goals = loadData('goals');
  const txs   = loadData('transactions');
  if (!goals.length) return '';
  const goalsCardsHtml = goals.slice(0, 4).map(g => {
    const current = getGoalCurrent(g, txs);
    const valorAtual = g.currentValue || current;
    const target  = g.targetAmount || 0;
    const pct     = target > 0 ? Math.min(100, current / target * 100) : 0;
    const rendimento = valorAtual - current;
    const hasCv = !!g.currentValue;
    const rendClr = rendimento >= 0 ? 'var(--success)' : 'var(--danger)';
    return `<div class="goal-card" style="cursor:pointer;" data-action="switch-tab" data-tab="goals" role="button" tabindex="0" aria-label="Meta: ${escapeHtml(g.name)}, ${fmt(current)} de ${fmt(target)}">
      <div class="goal-header"><div class="goal-name">${escapeHtml(g.name)}</div>
      ${g.investmentType ? `<span style="font-size:10px;padding:2px 8px;border-radius:2px;background:var(--info-light);color:var(--info);font-weight:700;">${g.investmentType}</span>` : ''}
      </div>
      <div class="goal-values"><div><div class="hint">${hasCv ? 'Atual' : 'Investido'}</div><div class="goal-current">${fmt(valorAtual)}</div></div>
      ${target>0?`<div style="text-align:right;"><div class="hint">Meta</div><div class="u-font-bold">${fmt(target)}</div></div>`:''}
      </div>
      ${hasCv ? `<div style="font-size:11px;font-weight:700;color:${rendClr};margin-top:4px;">${rendimento >= 0 ? '+' : ''}${fmt(Math.abs(rendimento))} de rendimento</div>` : ''}
      ${target>0?`<div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%;"></div></div>`:''}</div>`;
  }).join('');
  return `<div class="section" style="padding:20px 22px;margin-bottom:18px;cursor:pointer;" data-action="switch-tab" data-tab="goals" role="button" tabindex="0" aria-label="Ver metas e investimentos">
    <div class="section-header"><div class="section-header-left"><div class="section-icon" style="background:#ede9fe;color:#7c3aed;"><i class="fas fa-chart-line"></i></div><h2>Metas e Investimentos</h2></div></div>
    <div class="goals-grid">${goalsCardsHtml}</div>
  </div>`;
}

function renderDashSectionParcelas(txs) {
  const installTxs = txs.filter(t => t.isInstallment);
  if (!installTxs.length) return '';
  const total = installTxs.reduce((s,t) => s + Math.abs(t.value), 0);
  const rows = installTxs.slice(0,6).map(t =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
      <div><div class="u-text-sm-bold">${escapeHtml(t.description)}</div>
      <div class="u-label-sm">${t.installmentIndex}/${t.installmentCount} parcelas</div></div>
      <div style="font-weight:700;color:var(--danger);">${fmt(Math.abs(t.value))}</div>
    </div>`).join('');
  return `<div class="section" style="padding:20px 22px;margin-bottom:18px;">
    <div class="section-header"><div class="section-header-left"><div class="section-icon" style="background:#fce7f3;color:#be185d;"><i class="fas fa-layer-group"></i></div><h2>Projeção de Parcelas</h2></div>
    <span style="font-size:13px;font-weight:700;color:var(--danger);">${fmt(total)}</span></div>
    ${rows}
  </div>`;
}

function renderDashSectionPlanejado(cur) {
  const budgets = loadData('budgets');
  if (!budgets.length) return '';
  const rows = budgets.map(b => {
    const spent = getCatTotal(b.category, currentMonth, currentYear);
    const pct   = b.limit > 0 ? Math.min(100, spent / b.limit * 100) : 0;
    const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
    return `<div class="u-mb-10">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span style="font-weight:600;">${escapeHtml(b.category)}</span>
        <span style="color:${color};font-weight:700;">${fmt(spent)} / ${fmt(b.limit)}</span>
      </div>
      <div style="height:6px;border-radius:2px;background:var(--border-color);overflow:hidden;">
        <div style="height:100%;border-radius:2px;background:${color};width:${pct}%;transition:width .4s;"></div>
      </div>
    </div>`;
  }).join('');
  return `<div class="section" style="padding:20px 22px;margin-bottom:18px;cursor:pointer;" data-action="switch-tab" data-tab="budgets" role="button" tabindex="0" aria-label="Ver planejado versus gasto">
    <div class="section-header"><div class="section-header-left"><div class="section-icon" style="background:#dcfce7;color:#15803d;"><i class="fas fa-bullseye"></i></div><h2>Planejado x Gasto</h2></div></div>
    ${rows}
  </div>`;
}

function buildDashAlerts(txs) {
  const alerts = [];
  const budgets = loadData('budgets');
  budgets.forEach(b => {
    const spent = getCatTotal(b.category, currentMonth, currentYear);
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    if (pct >= 100) alerts.push({type:'danger',icon:'fa-exclamation-circle',msg:`Orçamento de <b>${b.category}</b> estourado! (${pct.toFixed(0)}%)`,tab:'budgets'});
    else if (pct >= 80) alerts.push({type:'warning-alert',icon:'fa-exclamation-triangle',msg:`Orçamento de <b>${b.category}</b> em ${pct.toFixed(0)}%.`,tab:'budgets'});
  });
  const {predictions:fcPred} = forecastCashFlow(1, 3);
  if (fcPred[0]?.isDeficit) alerts.push({type:'danger',icon:'fa-arrow-trend-down',msg:'Previsão indica déficit para o próximo mês!',tab:'reports'});
  return alerts;
}

function makeRecentTxsHtml(txs) {
  const recent = [...txs].sort((a,b) => parseDateISO(b.date)-parseDateISO(a.date)).slice(0,5);
  if (!recent.length) return '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px;">Nenhuma transação.</div>';
  return recent.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
    <div><div class="u-text-sm-bold">${escapeHtml(t.description||'Sem descrição')}</div>
    <div class="u-label-sm">${t.category} • ${fmtDate(t.date)}</div></div>
    <span style="font-weight:700;color:${t.value>0?'var(--success)':'var(--danger)'};">${t.value>0?'+':''}${fmt(t.value)}</span>
  </div>`).join('');
}

function makeForecastHtml() {
  try {
    const {predictions} = forecastCashFlow(1, 3);
    if (!predictions.length) return '<div style="color:var(--text-muted);font-size:13px;">Sem dados suficientes.</div>';
    return predictions.slice(0,1).map(p =>
      `<div style="padding:12px 0;"><div class="u-text-sm-bold">${p.monthName} ${p.year}</div>
      <div style="display:flex;gap:16px;margin-top:8px;">
        <div><div class="u-label-sm">Receita prev.</div><div style="font-weight:700;color:var(--success);">${fmt(p.income)}</div></div>
        <div><div class="u-label-sm">Despesa prev.</div><div style="font-weight:700;color:var(--danger);">${fmt(Math.abs(p.expenses))}</div></div>
        <div><div class="u-label-sm">Saldo prev.</div><div style="font-weight:700;color:${p.balance<0?'var(--danger)':'var(--success)'};">${fmt(p.balance)}</div></div>
      </div></div>`
    ).join('');
  } catch(e) { return '<div style="color:var(--text-muted);font-size:13px;">Sem previsão disponível.</div>'; }
}

function makeBudgetsPreviewHtml() {
  const budgets = loadData('budgets');
  if (!budgets.length) return '<div style="color:var(--text-muted);font-size:13px;">Nenhum orçamento definido.</div>';
  return budgets.slice(0,4).map(b => {
    const spent = getCatTotal(b.category, currentMonth, currentYear);
    const pct = b.limit > 0 ? Math.min(100, spent / b.limit * 100) : 0;
    const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
    return `<div class="u-mb-10">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
        <span>${escapeHtml(b.category)}</span>
        <span style="color:${color};font-weight:700;">${pct.toFixed(0)}%</span>
      </div>
      <div style="height:5px;border-radius:2px;background:var(--border-color);overflow:hidden;">
        <div style="height:100%;border-radius:2px;background:${color};width:${pct}%;"></div>
      </div>
    </div>`;
  }).join('');
}

function makeUpcomingHtml() {
  const cards = loadData('cards'), st = loadData('settings');
  const items = [];
  const today = new Date();
  cards.forEach(c => {
    const diff = c.dueDay - today.getDate();
    if (diff >= 0 && diff <= CONFIG.UPCOMING_DAYS_THRESHOLD) {
      const txs2 = getFilteredByMonth(currentYear, currentMonth);
      const total = txs2.filter(t => t.cardId === c.id && t.value < 0).reduce((s,t) => s + Math.abs(t.value), 0);
      items.push({label:`Fatura ${c.name}`, date:`dia ${c.dueDay}`, val:total, color:'var(--danger)'});
    }
  });
  const salaryDay = st.salaryDay || 5;
  const salaryDiff = salaryDay - today.getDate();
  if (salaryDiff >= 0 && salaryDiff <= 7) items.push({label:'Salário', date:`dia ${salaryDay}`, val:st.salaryValue||0, color:'var(--success)'});
  if (!items.length) return '<div style="color:var(--text-muted);font-size:13px;">Nenhum vencimento nos próximos 7 dias.</div>';
  return items.map(i => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
    <div><div class="u-text-sm-bold">${escapeHtml(i.label)}</div>
    <div class="u-label-sm">${i.date}</div></div>
    <span style="font-weight:700;color:${i.color};">${fmt(i.val)}</span>
  </div>`).join('');
}

async function initDashCharts(txs) {
  await ensureChartJS();
  // Bind quick launch tpl buttons
  document.querySelectorAll('[data-tpl-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = (loadData('settings').fixedTemplates||[]).find(t=>t.id===btn.dataset.tplId);
      if (!tpl) return;
      const txsList = loadData('transactions');
      const o = buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,1)),description:tpl.description,value:-Math.abs(tpl.value),category:tpl.category,paymentMethod:tpl.paymentMethod,isFixedExpense:true,isInstallment:false});
      txsList.push(o); logChange('transaction',o.id,'CREATE',null,o);
      saveAll(); invalidateCalcCache();
      showToast(`"${tpl.description}" lançado!`);
      renderActiveTab();
    });
  });
}

// ── Dashboard Customization Modal ──────────────────────────────────────────
function openDashCustomize() {
  let existing = document.getElementById('dashCustomModal');
  if (existing) existing.remove();
  const sections = loadDashboardSections();

  const itemsHtml = sections.map((s,i) => `
    <div class="dash-customize-item" data-idx="${i}" draggable="true">
      <span class="dash-section-handle"><i class="fas fa-grip-vertical"></i></span>
      <span style="flex:1;font-size:14px;font-weight:600;">${s.label}</span>
      <button class="dash-move-btn" data-action="dash-move-section-up" data-id="${i}" title="Mover para cima">↑</button>
      <button class="dash-move-btn" data-action="dash-move-section-down" data-id="${i}" title="Mover para baixo">↓</button>
      <button class="dash-vis-btn ${s.visible?'':'hidden-section'}" title="${s.visible?'Ocultar':'Mostrar'}" data-action="dash-toggle-section" data-id="${i}">
        <i class="fas ${s.visible?'fa-eye':'fa-eye-slash'}"></i>
      </button>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'dashCustomModal'; modal.className = 'modal open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'dashCustomModalTitle');
  modal.innerHTML = `<div class="modal-content" style="max-width:440px;">
    <button class="modal-close" data-action="remove-dynamic-modal" data-id="dashCustomModal" aria-label="Fechar"><i class="fas fa-times"></i></button>
    <h3 class="modal-title" id="dashCustomModalTitle"><i class="fas fa-sliders-h" style="color:var(--info)"></i> Personalizar Dashboard</h3>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Escolha quais seções exibir e arraste para reordenar.</p>
    <div id="dashCustomList">${itemsHtml}</div>
    <button class="btn secondary" data-action="dash-reset-sections" style="width:100%;justify-content:center;margin-top:16px;">
      <i class="fas fa-rotate-left"></i> Restaurar Padrão
    </button>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function dashMoveSection(idx, dir) {
  const sections = loadDashboardSections();
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= sections.length) return;
  [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
  dashboardSections = sections;
  saveDashboardSections();
  openDashCustomize(); // re-render modal
  renderDashboard();
}

function dashToggleSection(idx) {
  const sections = loadDashboardSections();
  sections[idx].visible = !sections[idx].visible;
  dashboardSections = sections;
  saveDashboardSections();
  openDashCustomize();
  renderDashboard();
}

function dashResetSections() {
  dashboardSections = DEFAULT_DASHBOARD_SECTIONS.map(s => ({...s}));
  saveDashboardSections();
  openDashCustomize();
  renderDashboard();
}

window.switchTab = function(tab) {
  activeTab=tab; resetPagination();
  if(tab!=='reports') reportsYear=new Date().getFullYear();
  renderActiveTab();
  const mc = document.querySelector('.main-content');
  if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });
  if (typeof updateAlertBadges === 'function') updateAlertBadges();
};
window.toggleConfigSection = function(id) {
  const header=document.querySelector(`#csec-${id} .config-section-header`);
  const body=document.getElementById('cbody-'+id);
  const chev=document.getElementById('cchev-'+id);
  if(!header||!body) return;
  const isOpen=body.classList.contains('open');
  body.classList.toggle('open',!isOpen);
  header.classList.toggle('open',!isOpen);
};
window.deleteGoalDash = function(id) {
  const goals=loadData('goals'), g=goals.find(x=>x.id===id); if(!g) return;
  showConfirm(`Excluir meta "<b>${g.name}</b>"?`, ()=>{ window._dataCache['goals']=goals.filter(x=>x.id!==id); saveAll(); invalidateCalcCache(); renderActiveTab(); });
};
// ============================
// TRANSACTIONS TAB
// ============================
function getCardLabel(cardId) {
  if (!cardId) return '';
  const c = loadData('cards').find(x => x.id === cardId);
  return c ? `Crédito - ${c.name}` : '';
}
