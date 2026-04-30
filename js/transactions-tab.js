function renderTransactionsTab() {
  const page = document.getElementById('transactionsPage');
  // ── Skeleton loading ──
  page.innerHTML = `<div style="padding:24px;">
    <div class="skeleton skeleton-card" style="height:60px;"></div>
    <div class="skeleton skeleton-card" style="height:80px;"></div>
    <div class="skeleton skeleton-card" style="height:220px;"></div>
    <div style="padding:18px 20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border-color);">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text" style="width:90%;"></div>
      <div class="skeleton skeleton-text" style="width:75%;"></div>
      <div class="skeleton skeleton-text" style="width:85%;"></div>
      <div class="skeleton skeleton-text" style="width:60%;"></div>
      <div class="skeleton skeleton-text" style="width:70%;"></div>
    </div>
  </div>`;
  // Use requestAnimationFrame to allow skeleton to paint before heavy render
  requestAnimationFrame(() => { _renderTransactionsTabContent(page); });
}

function buildSuggestionBannerHTML(mk, st) {
  const sugg = (st.suggestionsLog || {})[mk] || {};
  const financings = (st.financings || []).filter(f => !f.done);
  const hasFinancings = financings.length > 0;
  const showBanner = !sugg.salaryApplied || !sugg.fixedApplied || (hasFinancings && !sugg.financingApplied);

  if (!showBanner) return '';

  const finBtn = hasFinancings && !sugg.financingApplied
    ? `<button class="btn small" style="background:#d97706;" id="btnApplyFinancing">Financiamento</button>` : '';
  return `<div class="banner" id="suggestionBanner">
    <div><strong style="font-size:15px;">Sugestões do mês</strong>
    <div class="hint" style="color:#b45309;margin-top:3px;">Adicione rapidamente seu salário, despesas fixas e financiamentos.</div></div>
    <div class="row">
      ${!sugg.salaryApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplySalary">Salário (${fmt(st.salaryValue||0)})</button>` : ''}
      ${!sugg.fixedApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplyFixed">Despesas Fixas</button>` : ''}
      ${finBtn}
      <button class="btn small secondary" id="btnDismissSugg" style="border-color:#d97706;color:#d97706;"><i class="fas fa-times"></i></button>
    </div>
  </div>`;
}

function buildQuickEntryFormHTML(cats, cards, paymentMethods) {
  const PM_ICONS = { 'PIX':'fa-qrcode', 'Débito':'fa-credit-card', 'Crédito':'fa-credit-card', 'Dinheiro':'fa-money-bill-wave', 'Cheque':'fa-file-alt', 'Boleto':'fa-barcode', 'Transferência':'fa-exchange-alt' };
  const DEFAULT_PMS = ['PIX','Débito','Crédito','Dinheiro','Cheque','Boleto'];
  const pmList = DEFAULT_PMS;
  const cardOptHtml = cards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const pmBtns = pmList.map(pm => {
    const icon = PM_ICONS[pm] || 'fa-money-bill';
    return `<button type="button" class="qe-pm-btn" data-pm="${escapeHtml(pm)}">
      <i class="fas ${icon}"></i><span>${pm}</span>
    </button>`;
  }).join('');

  const catOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  return `
    <div class="quick-entry-card" id="quickEntryCard">
      <div style="font-weight:800;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <div class="u-icon-btn-sm">
          <i class="fas fa-plus" style="color:var(--info);font-size:12px;"></i>
        </div>
        Novo Lançamento
      </div>
      <div class="qe-type-btns">
        <button type="button" class="qe-type-btn expense" id="qeBtnExpense" data-action="qe-set-type" data-type="expense">
          <i class="fas fa-arrow-trend-down"></i> Despesa
        </button>
        <button type="button" class="qe-type-btn income inactive" id="qeBtnIncome" data-action="qe-set-type" data-type="income">
          <i class="fas fa-arrow-trend-up"></i> Receita
        </button>
      </div>
      <div class="qe-fields">
        <input type="number" class="qe-input" id="qeValue" placeholder="R$ 0,00" step="0.01" min="0.01" aria-label="Valor">
        <input type="text" class="qe-input qe-desc" id="qeDesc" placeholder="Descrição (opcional)" maxlength="100" aria-label="Descrição">
        <input type="date" class="qe-input" id="qeDate" value="${fmtDateISO(new Date())}" aria-label="Data">
      </div>
      <div class="u-section-label u-mb-10">Forma de Pagamento</div>
      <div class="qe-pm-grid" id="qePmGrid">${pmBtns}</div>
      <select class="qe-card-select" id="qeCardSelect">
        <option value="">— Selecione o cartão —</option>
        ${cardOptHtml}
      </select>
      <div class="u-form-row">
        <label for="qeCat" class="u-section-label">Categoria</label>
        <button type="button" data-action="switch-tab" data-tab="configurations" style="background:none;border:1px solid var(--border-color);border-radius:2px;padding:4px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;">
          <i class="fas fa-cog"></i> Gerenciar Categorias
        </button>
      </div>
      <div class="qe-cat-row">
        <select class="qe-cat-select" id="qeCat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
        <button type="button" id="qeCatRecent" title="Última categoria usada" style="width:44px;height:44px;border-radius:1px;border:1.5px solid var(--border-color);background:var(--bg-light);cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0;">
          <i class="fas fa-history"></i>
        </button>
      </div>
      <div id="qeTemplateBar" class="u-mb-14">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="u-pill-label"><i class="fas fa-clock-rotate-left" style="margin-right:4px"></i> Templates</span>
          <button type="button" id="qeSaveAsTemplate" style="border:none;background:var(--info-light);color:var(--info);padding:4px 10px;border-radius:2px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all .18s;" title="Salvar campos atuais como template">
            <i class="fas fa-bookmark"></i> Salvar como template
          </button>
        </div>
        <div id="qeTemplateChips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <button type="button" class="qe-submit-btn expense" id="qeSubmit" data-action="qe-submit">
        <i class="fas fa-plus"></i> Lançar Despesa
      </button>
    </div>`;
}

function buildSummaryCardsHTML(cur, cdsTotal) {
  return `
    <div class="qe-summary-grid">
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-up" style="color:var(--success);margin-right:4px;"></i> Receitas</div>
        <div class="qs-val" class="u-text-success">${fmt(cur.income)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-down" style="color:var(--danger);margin-right:4px;"></i> Despesas</div>
        <div class="qs-val" class="u-text-danger">${fmt(Math.abs(cur.expenses))}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-wallet" style="color:var(--info);margin-right:4px;"></i> Saldo em Conta</div>
        <div class="qs-val" style="color:${(cur.income + cur.expenses) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${fmt(cur.income + cur.expenses)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-credit-card" style="color:#7c3aed;margin-right:4px;"></i> Fatura Cartão</div>
        <div class="qs-val" style="color:#7c3aed;">${fmt(cdsTotal)}</div>
      </div>
    </div>`;
}

function buildListHeaderHTML(cats, cards, paymentMethods) {
  const catFilterOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const pmFilterOpts = paymentMethods.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const cardFilterOpts = cards.map(c => `<option value="Crédito - ${escapeHtml(c.name)}">💳 ${escapeHtml(c.name)}</option>`).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button data-action="change-month" data-delta="-1" class="u-icon-btn"><i class="fas fa-chevron-left"></i></button>
        <span class="u-text-lg u-font-bold">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button data-action="change-month" data-delta="1" class="u-icon-btn"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="u-relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
          <input type="text" id="qeSearch" placeholder="Buscar..." aria-label="Buscar transações" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 12px 0 30px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;width:180px;" oninput="qeFilterList(this.value)">
        </div>
        <select id="qeFilterType" aria-label="Filtrar por tipo" onchange="qeFilterList()" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 10px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <button id="qeAdvFilterToggle" class="qe-adv-filter-toggle" aria-label="Filtros avançados" aria-expanded="false">
          <i class="fas fa-sliders-h"></i> Filtros <span id="qeAdvFilterBadge" class="qe-adv-filter-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
    <div id="qeAdvFilterPanel" class="qe-adv-filter-panel">
      <div class="qe-adv-filter-row">
        <div class="qe-adv-filter-group">
          <label for="qeFilterCat">Categoria</label>
          <select id="qeFilterCat" onchange="qeFilterList()">
            <option value="">Todas</option>
            ${catFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label for="qeFilterPM">Pagamento</label>
          <select id="qeFilterPM" onchange="qeFilterList()">
            <option value="">Todos</option>
            ${pmFilterOpts}
            ${cardFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label>Valor (R$)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="qeFilterValMin" placeholder="Mín" step="0.01" style="width:90px;" oninput="qeFilterList()">
            <span style="color:var(--text-muted);font-size:12px;">—</span>
            <input type="number" id="qeFilterValMax" placeholder="Máx" step="0.01" style="width:90px;" oninput="qeFilterList()">
          </div>
        </div>
        <div class="qe-adv-filter-group" style="align-self:flex-end;">
          <button id="qeAdvFilterReset" class="qe-adv-filter-reset" type="button"><i class="fas fa-undo"></i> Limpar</button>
        </div>
      </div>
      <div id="qeAdvFilterSummary" class="qe-adv-filter-summary" style="display:none;"></div>
    </div>
    <div id="qeExpenseTypeFilters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="qe-exp-type-btn active" data-exp-type="all"><i class="fas fa-list"></i> Todas</button>
      <button class="qe-exp-type-btn" data-exp-type="fixed"><i class="fas fa-toggle-on"></i> Fixas</button>
      <button class="qe-exp-type-btn" data-exp-type="variable"><i class="fas fa-random"></i> Variáveis</button>
      <button class="qe-exp-type-btn" data-exp-type="installment"><i class="fas fa-layer-group"></i> Parceladas</button>
    </div>
    <div id="qeExpenseBreakdown" style="display:none;margin-bottom:14px;padding:12px 16px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:2px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;" id="qeBreakdownContent"></div>
    </div>`;
}

function buildSuggestionBannerHTML(mk, st) {
  const sugg = (st.suggestionsLog || {})[mk] || {};
  const financings = (st.financings || []).filter(f => !f.done);
  const hasFinancings = financings.length > 0;
  const showBanner = !sugg.salaryApplied || !sugg.fixedApplied || (hasFinancings && !sugg.financingApplied);

  if (!showBanner) return '';

  const finBtn = hasFinancings && !sugg.financingApplied
    ? `<button class="btn small" style="background:#d97706;" id="btnApplyFinancing">Financiamento</button>` : '';
  return `<div class="banner" id="suggestionBanner">
    <div><strong style="font-size:15px;">Sugestões do mês</strong>
    <div class="hint" style="color:#b45309;margin-top:3px;">Adicione rapidamente seu salário, despesas fixas e financiamentos.</div></div>
    <div class="row">
      ${!sugg.salaryApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplySalary">Salário (${fmt(st.salaryValue||0)})</button>` : ''}
      ${!sugg.fixedApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplyFixed">Despesas Fixas</button>` : ''}
      ${finBtn}
      <button class="btn small secondary" id="btnDismissSugg" style="border-color:#d97706;color:#d97706;"><i class="fas fa-times"></i></button>
    </div>
  </div>`;
}

function buildQuickEntryFormHTML(cats, cards, paymentMethods) {
  const PM_ICONS = { 'PIX':'fa-qrcode', 'Débito':'fa-credit-card', 'Crédito':'fa-credit-card', 'Dinheiro':'fa-money-bill-wave', 'Cheque':'fa-file-alt', 'Boleto':'fa-barcode', 'Transferência':'fa-exchange-alt' };
  const DEFAULT_PMS = ['PIX','Débito','Crédito','Dinheiro','Cheque','Boleto'];
  const pmList = DEFAULT_PMS;
  const cardOptHtml = cards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const pmBtns = pmList.map(pm => {
    const icon = PM_ICONS[pm] || 'fa-money-bill';
    return `<button type="button" class="qe-pm-btn" data-pm="${escapeHtml(pm)}">
      <i class="fas ${icon}"></i><span>${pm}</span>
    </button>`;
  }).join('');

  const catOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  return `
    <div class="quick-entry-card" id="quickEntryCard">
      <div style="font-weight:800;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <div class="u-icon-btn-sm">
          <i class="fas fa-plus" style="color:var(--info);font-size:12px;"></i>
        </div>
        Novo Lançamento
      </div>
      <div class="qe-type-btns">
        <button type="button" class="qe-type-btn expense" id="qeBtnExpense" data-action="qe-set-type" data-type="expense">
          <i class="fas fa-arrow-trend-down"></i> Despesa
        </button>
        <button type="button" class="qe-type-btn income inactive" id="qeBtnIncome" data-action="qe-set-type" data-type="income">
          <i class="fas fa-arrow-trend-up"></i> Receita
        </button>
      </div>
      <div class="qe-fields">
        <input type="number" class="qe-input" id="qeValue" placeholder="R$ 0,00" step="0.01" min="0.01" aria-label="Valor">
        <input type="text" class="qe-input qe-desc" id="qeDesc" placeholder="Descrição (opcional)" maxlength="100" aria-label="Descrição">
        <input type="date" class="qe-input" id="qeDate" value="${fmtDateISO(new Date())}" aria-label="Data">
      </div>
      <div class="u-section-label u-mb-10">Forma de Pagamento</div>
      <div class="qe-pm-grid" id="qePmGrid">${pmBtns}</div>
      <select class="qe-card-select" id="qeCardSelect">
        <option value="">— Selecione o cartão —</option>
        ${cardOptHtml}
      </select>
      <div class="u-form-row">
        <label for="qeCat" class="u-section-label">Categoria</label>
        <button type="button" data-action="switch-tab" data-tab="configurations" style="background:none;border:1px solid var(--border-color);border-radius:2px;padding:4px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;">
          <i class="fas fa-cog"></i> Gerenciar Categorias
        </button>
      </div>
      <div class="qe-cat-row">
        <select class="qe-cat-select" id="qeCat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
        <button type="button" id="qeCatRecent" title="Última categoria usada" style="width:44px;height:44px;border-radius:1px;border:1.5px solid var(--border-color);background:var(--bg-light);cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0;">
          <i class="fas fa-history"></i>
        </button>
      </div>
      <div id="qeTemplateBar" class="u-mb-14">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="u-pill-label"><i class="fas fa-clock-rotate-left" style="margin-right:4px"></i> Templates</span>
          <button type="button" id="qeSaveAsTemplate" style="border:none;background:var(--info-light);color:var(--info);padding:4px 10px;border-radius:2px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all .18s;" title="Salvar campos atuais como template">
            <i class="fas fa-bookmark"></i> Salvar como template
          </button>
        </div>
        <div id="qeTemplateChips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <button type="button" class="qe-submit-btn expense" id="qeSubmit" data-action="qe-submit">
        <i class="fas fa-plus"></i> Lançar Despesa
      </button>
    </div>`;
}

function buildSummaryCardsHTML(cur, cdsTotal) {
  return `
    <div class="qe-summary-grid">
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-up" style="color:var(--success);margin-right:4px;"></i> Receitas</div>
        <div class="qs-val" class="u-text-success">${fmt(cur.income)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-down" style="color:var(--danger);margin-right:4px;"></i> Despesas</div>
        <div class="qs-val" class="u-text-danger">${fmt(Math.abs(cur.expenses))}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-wallet" style="color:var(--info);margin-right:4px;"></i> Saldo em Conta</div>
        <div class="qs-val" style="color:${(cur.income + cur.expenses) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${fmt(cur.income + cur.expenses)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-credit-card" style="color:#7c3aed;margin-right:4px;"></i> Fatura Cartão</div>
        <div class="qs-val" style="color:#7c3aed;">${fmt(cdsTotal)}</div>
      </div>
    </div>`;
}

function buildListHeaderHTML(cats, cards, paymentMethods) {
  const catFilterOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const pmFilterOpts = paymentMethods.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const cardFilterOpts = cards.map(c => `<option value="Crédito - ${escapeHtml(c.name)}">💳 ${escapeHtml(c.name)}</option>`).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button data-action="change-month" data-delta="-1" class="u-icon-btn"><i class="fas fa-chevron-left"></i></button>
        <span class="u-text-lg u-font-bold">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button data-action="change-month" data-delta="1" class="u-icon-btn"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="u-relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
          <input type="text" id="qeSearch" placeholder="Buscar..." aria-label="Buscar transações" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 12px 0 30px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;width:180px;" oninput="qeFilterList(this.value)">
        </div>
        <select id="qeFilterType" aria-label="Filtrar por tipo" onchange="qeFilterList()" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 10px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <button id="qeAdvFilterToggle" class="qe-adv-filter-toggle" aria-label="Filtros avançados" aria-expanded="false">
          <i class="fas fa-sliders-h"></i> Filtros <span id="qeAdvFilterBadge" class="qe-adv-filter-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
    <div id="qeAdvFilterPanel" class="qe-adv-filter-panel">
      <div class="qe-adv-filter-row">
        <div class="qe-adv-filter-group">
          <label for="qeFilterCat">Categoria</label>
          <select id="qeFilterCat" onchange="qeFilterList()">
            <option value="">Todas</option>
            ${catFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label for="qeFilterPM">Pagamento</label>
          <select id="qeFilterPM" onchange="qeFilterList()">
            <option value="">Todos</option>
            ${pmFilterOpts}
            ${cardFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label>Valor (R$)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="qeFilterValMin" placeholder="Mín" step="0.01" style="width:90px;" oninput="qeFilterList()">
            <span style="color:var(--text-muted);font-size:12px;">—</span>
            <input type="number" id="qeFilterValMax" placeholder="Máx" step="0.01" style="width:90px;" oninput="qeFilterList()">
          </div>
        </div>
        <div class="qe-adv-filter-group" style="align-self:flex-end;">
          <button id="qeAdvFilterReset" class="qe-adv-filter-reset" type="button"><i class="fas fa-undo"></i> Limpar</button>
        </div>
      </div>
      <div id="qeAdvFilterSummary" class="qe-adv-filter-summary" style="display:none;"></div>
    </div>
    <div id="qeExpenseTypeFilters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="qe-exp-type-btn active" data-exp-type="all"><i class="fas fa-list"></i> Todas</button>
      <button class="qe-exp-type-btn" data-exp-type="fixed"><i class="fas fa-toggle-on"></i> Fixas</button>
      <button class="qe-exp-type-btn" data-exp-type="variable"><i class="fas fa-random"></i> Variáveis</button>
      <button class="qe-exp-type-btn" data-exp-type="installment"><i class="fas fa-layer-group"></i> Parceladas</button>
    </div>
    <div id="qeExpenseBreakdown" style="display:none;margin-bottom:14px;padding:12px 16px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:2px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;" id="qeBreakdownContent"></div>
    </div>`;
}

function buildSuggestionBannerHTML(mk, st) {
  const sugg = (st.suggestionsLog || {})[mk] || {};
  const financings = (st.financings || []).filter(f => !f.done);
  const hasFinancings = financings.length > 0;
  const showBanner = !sugg.salaryApplied || !sugg.fixedApplied || (hasFinancings && !sugg.financingApplied);

  if (!showBanner) return '';

  const finBtn = hasFinancings && !sugg.financingApplied
    ? `<button class="btn small" style="background:#d97706;" id="btnApplyFinancing">Financiamento</button>` : '';
  return `<div class="banner" id="suggestionBanner">
    <div><strong style="font-size:15px;">Sugestões do mês</strong>
    <div class="hint" style="color:#b45309;margin-top:3px;">Adicione rapidamente seu salário, despesas fixas e financiamentos.</div></div>
    <div class="row">
      ${!sugg.salaryApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplySalary">Salário (${fmt(st.salaryValue||0)})</button>` : ''}
      ${!sugg.fixedApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplyFixed">Despesas Fixas</button>` : ''}
      ${finBtn}
      <button class="btn small secondary" id="btnDismissSugg" style="border-color:#d97706;color:#d97706;"><i class="fas fa-times"></i></button>
    </div>
  </div>`;
}

function buildQuickEntryFormHTML(cats, cards, paymentMethods) {
  const PM_ICONS = { 'PIX':'fa-qrcode', 'Débito':'fa-credit-card', 'Crédito':'fa-credit-card', 'Dinheiro':'fa-money-bill-wave', 'Cheque':'fa-file-alt', 'Boleto':'fa-barcode', 'Transferência':'fa-exchange-alt' };
  const DEFAULT_PMS = ['PIX','Débito','Crédito','Dinheiro','Cheque','Boleto'];
  const pmList = DEFAULT_PMS;
  const cardOptHtml = cards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const pmBtns = pmList.map(pm => {
    const icon = PM_ICONS[pm] || 'fa-money-bill';
    return `<button type="button" class="qe-pm-btn" data-pm="${escapeHtml(pm)}">
      <i class="fas ${icon}"></i><span>${pm}</span>
    </button>`;
  }).join('');

  const catOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  return `
    <div class="quick-entry-card" id="quickEntryCard">
      <div style="font-weight:800;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <div class="u-icon-btn-sm">
          <i class="fas fa-plus" style="color:var(--info);font-size:12px;"></i>
        </div>
        Novo Lançamento
      </div>
      <div class="qe-type-btns">
        <button type="button" class="qe-type-btn expense" id="qeBtnExpense" data-action="qe-set-type" data-type="expense">
          <i class="fas fa-arrow-trend-down"></i> Despesa
        </button>
        <button type="button" class="qe-type-btn income inactive" id="qeBtnIncome" data-action="qe-set-type" data-type="income">
          <i class="fas fa-arrow-trend-up"></i> Receita
        </button>
      </div>
      <div class="qe-fields">
        <input type="number" class="qe-input" id="qeValue" placeholder="R$ 0,00" step="0.01" min="0.01" aria-label="Valor">
        <input type="text" class="qe-input qe-desc" id="qeDesc" placeholder="Descrição (opcional)" maxlength="100" aria-label="Descrição">
        <input type="date" class="qe-input" id="qeDate" value="${fmtDateISO(new Date())}" aria-label="Data">
      </div>
      <div class="u-section-label u-mb-10">Forma de Pagamento</div>
      <div class="qe-pm-grid" id="qePmGrid">${pmBtns}</div>
      <select class="qe-card-select" id="qeCardSelect">
        <option value="">— Selecione o cartão —</option>
        ${cardOptHtml}
      </select>
      <div class="u-form-row">
        <label for="qeCat" class="u-section-label">Categoria</label>
        <button type="button" data-action="switch-tab" data-tab="configurations" style="background:none;border:1px solid var(--border-color);border-radius:2px;padding:4px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;">
          <i class="fas fa-cog"></i> Gerenciar Categorias
        </button>
      </div>
      <div class="qe-cat-row">
        <select class="qe-cat-select" id="qeCat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
        <button type="button" id="qeCatRecent" title="Última categoria usada" style="width:44px;height:44px;border-radius:1px;border:1.5px solid var(--border-color);background:var(--bg-light);cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0;">
          <i class="fas fa-history"></i>
        </button>
      </div>
      <div id="qeTemplateBar" class="u-mb-14">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="u-pill-label"><i class="fas fa-clock-rotate-left" style="margin-right:4px"></i> Templates</span>
          <button type="button" id="qeSaveAsTemplate" style="border:none;background:var(--info-light);color:var(--info);padding:4px 10px;border-radius:2px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all .18s;" title="Salvar campos atuais como template">
            <i class="fas fa-bookmark"></i> Salvar como template
          </button>
        </div>
        <div id="qeTemplateChips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <button type="button" class="qe-submit-btn expense" id="qeSubmit" data-action="qe-submit">
        <i class="fas fa-plus"></i> Lançar Despesa
      </button>
    </div>`;
}

function buildSummaryCardsHTML(cur, cdsTotal) {
  return `
    <div class="qe-summary-grid">
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-up" style="color:var(--success);margin-right:4px;"></i> Receitas</div>
        <div class="qs-val" class="u-text-success">${fmt(cur.income)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-down" style="color:var(--danger);margin-right:4px;"></i> Despesas</div>
        <div class="qs-val" class="u-text-danger">${fmt(Math.abs(cur.expenses))}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-wallet" style="color:var(--info);margin-right:4px;"></i> Saldo em Conta</div>
        <div class="qs-val" style="color:${(cur.income + cur.expenses) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${fmt(cur.income + cur.expenses)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-credit-card" style="color:#7c3aed;margin-right:4px;"></i> Fatura Cartão</div>
        <div class="qs-val" style="color:#7c3aed;">${fmt(cdsTotal)}</div>
      </div>
    </div>`;
}

function buildListHeaderHTML(cats, cards, paymentMethods) {
  const catFilterOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const pmFilterOpts = paymentMethods.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const cardFilterOpts = cards.map(c => `<option value="Crédito - ${escapeHtml(c.name)}">💳 ${escapeHtml(c.name)}</option>`).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button data-action="change-month" data-delta="-1" class="u-icon-btn"><i class="fas fa-chevron-left"></i></button>
        <span class="u-text-lg u-font-bold">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button data-action="change-month" data-delta="1" class="u-icon-btn"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="u-relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
          <input type="text" id="qeSearch" placeholder="Buscar..." aria-label="Buscar transações" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 12px 0 30px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;width:180px;" oninput="qeFilterList(this.value)">
        </div>
        <select id="qeFilterType" aria-label="Filtrar por tipo" onchange="qeFilterList()" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 10px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <button id="qeAdvFilterToggle" class="qe-adv-filter-toggle" aria-label="Filtros avançados" aria-expanded="false">
          <i class="fas fa-sliders-h"></i> Filtros <span id="qeAdvFilterBadge" class="qe-adv-filter-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
    <div id="qeAdvFilterPanel" class="qe-adv-filter-panel">
      <div class="qe-adv-filter-row">
        <div class="qe-adv-filter-group">
          <label for="qeFilterCat">Categoria</label>
          <select id="qeFilterCat" onchange="qeFilterList()">
            <option value="">Todas</option>
            ${catFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label for="qeFilterPM">Pagamento</label>
          <select id="qeFilterPM" onchange="qeFilterList()">
            <option value="">Todos</option>
            ${pmFilterOpts}
            ${cardFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label>Valor (R$)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="qeFilterValMin" placeholder="Mín" step="0.01" style="width:90px;" oninput="qeFilterList()">
            <span style="color:var(--text-muted);font-size:12px;">—</span>
            <input type="number" id="qeFilterValMax" placeholder="Máx" step="0.01" style="width:90px;" oninput="qeFilterList()">
          </div>
        </div>
        <div class="qe-adv-filter-group" style="align-self:flex-end;">
          <button id="qeAdvFilterReset" class="qe-adv-filter-reset" type="button"><i class="fas fa-undo"></i> Limpar</button>
        </div>
      </div>
      <div id="qeAdvFilterSummary" class="qe-adv-filter-summary" style="display:none;"></div>
    </div>
    <div id="qeExpenseTypeFilters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="qe-exp-type-btn active" data-exp-type="all"><i class="fas fa-list"></i> Todas</button>
      <button class="qe-exp-type-btn" data-exp-type="fixed"><i class="fas fa-toggle-on"></i> Fixas</button>
      <button class="qe-exp-type-btn" data-exp-type="variable"><i class="fas fa-random"></i> Variáveis</button>
      <button class="qe-exp-type-btn" data-exp-type="installment"><i class="fas fa-layer-group"></i> Parceladas</button>
    </div>
    <div id="qeExpenseBreakdown" style="display:none;margin-bottom:14px;padding:12px 16px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:2px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;" id="qeBreakdownContent"></div>
    </div>`;
}

function buildSuggestionBannerHTML(mk, st) {
  const sugg = (st.suggestionsLog || {})[mk] || {};
  const financings = (st.financings || []).filter(f => !f.done);
  const hasFinancings = financings.length > 0;
  const showBanner = !sugg.salaryApplied || !sugg.fixedApplied || (hasFinancings && !sugg.financingApplied);

  if (!showBanner) return '';

  const finBtn = hasFinancings && !sugg.financingApplied
    ? `<button class="btn small" style="background:#d97706;" id="btnApplyFinancing">Financiamento</button>` : '';
  return `<div class="banner" id="suggestionBanner">
    <div><strong style="font-size:15px;">Sugestões do mês</strong>
    <div class="hint" style="color:#b45309;margin-top:3px;">Adicione rapidamente seu salário, despesas fixas e financiamentos.</div></div>
    <div class="row">
      ${!sugg.salaryApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplySalary">Salário (${fmt(st.salaryValue||0)})</button>` : ''}
      ${!sugg.fixedApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplyFixed">Despesas Fixas</button>` : ''}
      ${finBtn}
      <button class="btn small secondary" id="btnDismissSugg" style="border-color:#d97706;color:#d97706;"><i class="fas fa-times"></i></button>
    </div>
  </div>`;
}

function buildQuickEntryFormHTML(cats, cards, paymentMethods) {
  const PM_ICONS = { 'PIX':'fa-qrcode', 'Débito':'fa-credit-card', 'Crédito':'fa-credit-card', 'Dinheiro':'fa-money-bill-wave', 'Cheque':'fa-file-alt', 'Boleto':'fa-barcode', 'Transferência':'fa-exchange-alt' };
  const DEFAULT_PMS = ['PIX','Débito','Crédito','Dinheiro','Cheque','Boleto'];
  const pmList = DEFAULT_PMS;
  const cardOptHtml = cards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const pmBtns = pmList.map(pm => {
    const icon = PM_ICONS[pm] || 'fa-money-bill';
    return `<button type="button" class="qe-pm-btn" data-pm="${escapeHtml(pm)}">
      <i class="fas ${icon}"></i><span>${pm}</span>
    </button>`;
  }).join('');

  const catOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  return `
    <div class="quick-entry-card" id="quickEntryCard">
      <div style="font-weight:800;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <div class="u-icon-btn-sm">
          <i class="fas fa-plus" style="color:var(--info);font-size:12px;"></i>
        </div>
        Novo Lançamento
      </div>
      <div class="qe-type-btns">
        <button type="button" class="qe-type-btn expense" id="qeBtnExpense" data-action="qe-set-type" data-type="expense">
          <i class="fas fa-arrow-trend-down"></i> Despesa
        </button>
        <button type="button" class="qe-type-btn income inactive" id="qeBtnIncome" data-action="qe-set-type" data-type="income">
          <i class="fas fa-arrow-trend-up"></i> Receita
        </button>
      </div>
      <div class="qe-fields">
        <input type="number" class="qe-input" id="qeValue" placeholder="R$ 0,00" step="0.01" min="0.01" aria-label="Valor">
        <input type="text" class="qe-input qe-desc" id="qeDesc" placeholder="Descrição (opcional)" maxlength="100" aria-label="Descrição">
        <input type="date" class="qe-input" id="qeDate" value="${fmtDateISO(new Date())}" aria-label="Data">
      </div>
      <div class="u-section-label u-mb-10">Forma de Pagamento</div>
      <div class="qe-pm-grid" id="qePmGrid">${pmBtns}</div>
      <select class="qe-card-select" id="qeCardSelect">
        <option value="">— Selecione o cartão —</option>
        ${cardOptHtml}
      </select>
      <div class="u-form-row">
        <label for="qeCat" class="u-section-label">Categoria</label>
        <button type="button" data-action="switch-tab" data-tab="configurations" style="background:none;border:1px solid var(--border-color);border-radius:2px;padding:4px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;">
          <i class="fas fa-cog"></i> Gerenciar Categorias
        </button>
      </div>
      <div class="qe-cat-row">
        <select class="qe-cat-select" id="qeCat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
        <button type="button" id="qeCatRecent" title="Última categoria usada" style="width:44px;height:44px;border-radius:1px;border:1.5px solid var(--border-color);background:var(--bg-light);cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0;">
          <i class="fas fa-history"></i>
        </button>
      </div>
      <div id="qeTemplateBar" class="u-mb-14">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="u-pill-label"><i class="fas fa-clock-rotate-left" style="margin-right:4px"></i> Templates</span>
          <button type="button" id="qeSaveAsTemplate" style="border:none;background:var(--info-light);color:var(--info);padding:4px 10px;border-radius:2px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all .18s;" title="Salvar campos atuais como template">
            <i class="fas fa-bookmark"></i> Salvar como template
          </button>
        </div>
        <div id="qeTemplateChips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <button type="button" class="qe-submit-btn expense" id="qeSubmit" data-action="qe-submit">
        <i class="fas fa-plus"></i> Lançar Despesa
      </button>
    </div>`;
}

function buildSummaryCardsHTML(cur, cdsTotal) {
  return `
    <div class="qe-summary-grid">
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-up" style="color:var(--success);margin-right:4px;"></i> Receitas</div>
        <div class="qs-val" class="u-text-success">${fmt(cur.income)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-down" style="color:var(--danger);margin-right:4px;"></i> Despesas</div>
        <div class="qs-val" class="u-text-danger">${fmt(Math.abs(cur.expenses))}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-wallet" style="color:var(--info);margin-right:4px;"></i> Saldo em Conta</div>
        <div class="qs-val" style="color:${(cur.income + cur.expenses) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${fmt(cur.income + cur.expenses)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-credit-card" style="color:#7c3aed;margin-right:4px;"></i> Fatura Cartão</div>
        <div class="qs-val" style="color:#7c3aed;">${fmt(cdsTotal)}</div>
      </div>
    </div>`;
}

function buildListHeaderHTML(cats, cards, paymentMethods) {
  const catFilterOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const pmFilterOpts = paymentMethods.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const cardFilterOpts = cards.map(c => `<option value="Crédito - ${escapeHtml(c.name)}">💳 ${escapeHtml(c.name)}</option>`).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button data-action="change-month" data-delta="-1" class="u-icon-btn"><i class="fas fa-chevron-left"></i></button>
        <span class="u-text-lg u-font-bold">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button data-action="change-month" data-delta="1" class="u-icon-btn"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="u-relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
          <input type="text" id="qeSearch" placeholder="Buscar..." aria-label="Buscar transações" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 12px 0 30px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;width:180px;" oninput="qeFilterList(this.value)">
        </div>
        <select id="qeFilterType" aria-label="Filtrar por tipo" onchange="qeFilterList()" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 10px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <button id="qeAdvFilterToggle" class="qe-adv-filter-toggle" aria-label="Filtros avançados" aria-expanded="false">
          <i class="fas fa-sliders-h"></i> Filtros <span id="qeAdvFilterBadge" class="qe-adv-filter-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
    <div id="qeAdvFilterPanel" class="qe-adv-filter-panel">
      <div class="qe-adv-filter-row">
        <div class="qe-adv-filter-group">
          <label for="qeFilterCat">Categoria</label>
          <select id="qeFilterCat" onchange="qeFilterList()">
            <option value="">Todas</option>
            ${catFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label for="qeFilterPM">Pagamento</label>
          <select id="qeFilterPM" onchange="qeFilterList()">
            <option value="">Todos</option>
            ${pmFilterOpts}
            ${cardFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label>Valor (R$)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="qeFilterValMin" placeholder="Mín" step="0.01" style="width:90px;" oninput="qeFilterList()">
            <span style="color:var(--text-muted);font-size:12px;">—</span>
            <input type="number" id="qeFilterValMax" placeholder="Máx" step="0.01" style="width:90px;" oninput="qeFilterList()">
          </div>
        </div>
        <div class="qe-adv-filter-group" style="align-self:flex-end;">
          <button id="qeAdvFilterReset" class="qe-adv-filter-reset" type="button"><i class="fas fa-undo"></i> Limpar</button>
        </div>
      </div>
      <div id="qeAdvFilterSummary" class="qe-adv-filter-summary" style="display:none;"></div>
    </div>
    <div id="qeExpenseTypeFilters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="qe-exp-type-btn active" data-exp-type="all"><i class="fas fa-list"></i> Todas</button>
      <button class="qe-exp-type-btn" data-exp-type="fixed"><i class="fas fa-toggle-on"></i> Fixas</button>
      <button class="qe-exp-type-btn" data-exp-type="variable"><i class="fas fa-random"></i> Variáveis</button>
      <button class="qe-exp-type-btn" data-exp-type="installment"><i class="fas fa-layer-group"></i> Parceladas</button>
    </div>
    <div id="qeExpenseBreakdown" style="display:none;margin-bottom:14px;padding:12px 16px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:2px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;" id="qeBreakdownContent"></div>
    </div>`;
}

function buildSuggestionBannerHTML(mk, st) {
  const sugg = (st.suggestionsLog || {})[mk] || {};
  const financings = (st.financings || []).filter(f => !f.done);
  const hasFinancings = financings.length > 0;
  const showBanner = !sugg.salaryApplied || !sugg.fixedApplied || (hasFinancings && !sugg.financingApplied);

  if (!showBanner) return '';

  const finBtn = hasFinancings && !sugg.financingApplied
    ? `<button class="btn small" style="background:#d97706;" id="btnApplyFinancing">Financiamento</button>` : '';
  return `<div class="banner" id="suggestionBanner">
    <div><strong style="font-size:15px;">Sugestões do mês</strong>
    <div class="hint" style="color:#b45309;margin-top:3px;">Adicione rapidamente seu salário, despesas fixas e financiamentos.</div></div>
    <div class="row">
      ${!sugg.salaryApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplySalary">Salário (${fmt(st.salaryValue||0)})</button>` : ''}
      ${!sugg.fixedApplied ? `<button class="btn small" style="background:#d97706;" id="btnApplyFixed">Despesas Fixas</button>` : ''}
      ${finBtn}
      <button class="btn small secondary" id="btnDismissSugg" style="border-color:#d97706;color:#d97706;"><i class="fas fa-times"></i></button>
    </div>
  </div>`;
}

function buildQuickEntryFormHTML(cats, cards, paymentMethods) {
  const PM_ICONS = { 'PIX':'fa-qrcode', 'Débito':'fa-credit-card', 'Crédito':'fa-credit-card', 'Dinheiro':'fa-money-bill-wave', 'Cheque':'fa-file-alt', 'Boleto':'fa-barcode', 'Transferência':'fa-exchange-alt' };
  const DEFAULT_PMS = ['PIX','Débito','Crédito','Dinheiro','Cheque','Boleto'];
  const pmList = DEFAULT_PMS;
  const cardOptHtml = cards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

  const pmBtns = pmList.map(pm => {
    const icon = PM_ICONS[pm] || 'fa-money-bill';
    return `<button type="button" class="qe-pm-btn" data-pm="${escapeHtml(pm)}">
      <i class="fas ${icon}"></i><span>${pm}</span>
    </button>`;
  }).join('');

  const catOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  return `
    <div class="quick-entry-card" id="quickEntryCard">
      <div style="font-weight:800;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
        <div class="u-icon-btn-sm">
          <i class="fas fa-plus" style="color:var(--info);font-size:12px;"></i>
        </div>
        Novo Lançamento
      </div>
      <div class="qe-type-btns">
        <button type="button" class="qe-type-btn expense" id="qeBtnExpense" data-action="qe-set-type" data-type="expense">
          <i class="fas fa-arrow-trend-down"></i> Despesa
        </button>
        <button type="button" class="qe-type-btn income inactive" id="qeBtnIncome" data-action="qe-set-type" data-type="income">
          <i class="fas fa-arrow-trend-up"></i> Receita
        </button>
      </div>
      <div class="qe-fields">
        <input type="number" class="qe-input" id="qeValue" placeholder="R$ 0,00" step="0.01" min="0.01" aria-label="Valor">
        <input type="text" class="qe-input qe-desc" id="qeDesc" placeholder="Descrição (opcional)" maxlength="100" aria-label="Descrição">
        <input type="date" class="qe-input" id="qeDate" value="${fmtDateISO(new Date())}" aria-label="Data">
      </div>
      <div class="u-section-label u-mb-10">Forma de Pagamento</div>
      <div class="qe-pm-grid" id="qePmGrid">${pmBtns}</div>
      <select class="qe-card-select" id="qeCardSelect">
        <option value="">— Selecione o cartão —</option>
        ${cardOptHtml}
      </select>
      <div class="u-form-row">
        <label for="qeCat" class="u-section-label">Categoria</label>
        <button type="button" data-action="switch-tab" data-tab="configurations" style="background:none;border:1px solid var(--border-color);border-radius:2px;padding:4px 10px;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;">
          <i class="fas fa-cog"></i> Gerenciar Categorias
        </button>
      </div>
      <div class="qe-cat-row">
        <select class="qe-cat-select" id="qeCat">
          <option value="">Selecione uma categoria</option>
          ${catOpts}
        </select>
        <button type="button" id="qeCatRecent" title="Última categoria usada" style="width:44px;height:44px;border-radius:1px;border:1.5px solid var(--border-color);background:var(--bg-light);cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0;">
          <i class="fas fa-history"></i>
        </button>
      </div>
      <div id="qeTemplateBar" class="u-mb-14">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span class="u-pill-label"><i class="fas fa-clock-rotate-left" style="margin-right:4px"></i> Templates</span>
          <button type="button" id="qeSaveAsTemplate" style="border:none;background:var(--info-light);color:var(--info);padding:4px 10px;border-radius:2px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all .18s;" title="Salvar campos atuais como template">
            <i class="fas fa-bookmark"></i> Salvar como template
          </button>
        </div>
        <div id="qeTemplateChips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <button type="button" class="qe-submit-btn expense" id="qeSubmit" data-action="qe-submit">
        <i class="fas fa-plus"></i> Lançar Despesa
      </button>
    </div>`;
}

function buildSummaryCardsHTML(cur, cdsTotal) {
  return `
    <div class="qe-summary-grid">
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-up" style="color:var(--success);margin-right:4px;"></i> Receitas</div>
        <div class="qs-val" class="u-text-success">${fmt(cur.income)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-arrow-trend-down" style="color:var(--danger);margin-right:4px;"></i> Despesas</div>
        <div class="qs-val" class="u-text-danger">${fmt(Math.abs(cur.expenses))}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-wallet" style="color:var(--info);margin-right:4px;"></i> Saldo em Conta</div>
        <div class="qs-val" style="color:${(cur.income + cur.expenses) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${fmt(cur.income + cur.expenses)}</div>
      </div>
      <div class="qe-summary-card">
        <div class="qs-label"><i class="fas fa-credit-card" style="color:#7c3aed;margin-right:4px;"></i> Fatura Cartão</div>
        <div class="qs-val" style="color:#7c3aed;">${fmt(cdsTotal)}</div>
      </div>
    </div>`;
}

function buildListHeaderHTML(cats, cards, paymentMethods) {
  const catFilterOpts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const pmFilterOpts = paymentMethods.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  const cardFilterOpts = cards.map(c => `<option value="Crédito - ${escapeHtml(c.name)}">💳 ${escapeHtml(c.name)}</option>`).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button data-action="change-month" data-delta="-1" class="u-icon-btn"><i class="fas fa-chevron-left"></i></button>
        <span class="u-text-lg u-font-bold">${MONTH_NAMES[currentMonth]} ${currentYear}</span>
        <button data-action="change-month" data-delta="1" class="u-icon-btn"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <div class="u-relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none;"></i>
          <input type="text" id="qeSearch" placeholder="Buscar..." aria-label="Buscar transações" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 12px 0 30px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;width:180px;" oninput="qeFilterList(this.value)">
        </div>
        <select id="qeFilterType" aria-label="Filtrar por tipo" onchange="qeFilterList()" style="height:36px;border:1.5px solid var(--border-color);border-radius:2px;padding:0 10px;font-size:13px;font-family:inherit;background:var(--bg-light);color:var(--text-primary);outline:none;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <button id="qeAdvFilterToggle" class="qe-adv-filter-toggle" aria-label="Filtros avançados" aria-expanded="false">
          <i class="fas fa-sliders-h"></i> Filtros <span id="qeAdvFilterBadge" class="qe-adv-filter-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
    <div id="qeAdvFilterPanel" class="qe-adv-filter-panel">
      <div class="qe-adv-filter-row">
        <div class="qe-adv-filter-group">
          <label for="qeFilterCat">Categoria</label>
          <select id="qeFilterCat" onchange="qeFilterList()">
            <option value="">Todas</option>
            ${catFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label for="qeFilterPM">Pagamento</label>
          <select id="qeFilterPM" onchange="qeFilterList()">
            <option value="">Todos</option>
            ${pmFilterOpts}
            ${cardFilterOpts}
          </select>
        </div>
        <div class="qe-adv-filter-group">
          <label>Valor (R$)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="qeFilterValMin" placeholder="Mín" step="0.01" style="width:90px;" oninput="qeFilterList()">
            <span style="color:var(--text-muted);font-size:12px;">—</span>
            <input type="number" id="qeFilterValMax" placeholder="Máx" step="0.01" style="width:90px;" oninput="qeFilterList()">
          </div>
        </div>
        <div class="qe-adv-filter-group" style="align-self:flex-end;">
          <button id="qeAdvFilterReset" class="qe-adv-filter-reset" type="button"><i class="fas fa-undo"></i> Limpar</button>
        </div>
      </div>
      <div id="qeAdvFilterSummary" class="qe-adv-filter-summary" style="display:none;"></div>
    </div>
    <div id="qeExpenseTypeFilters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="qe-exp-type-btn active" data-exp-type="all"><i class="fas fa-list"></i> Todas</button>
      <button class="qe-exp-type-btn" data-exp-type="fixed"><i class="fas fa-toggle-on"></i> Fixas</button>
      <button class="qe-exp-type-btn" data-exp-type="variable"><i class="fas fa-random"></i> Variáveis</button>
      <button class="qe-exp-type-btn" data-exp-type="installment"><i class="fas fa-layer-group"></i> Parceladas</button>
    </div>
    <div id="qeExpenseBreakdown" style="display:none;margin-bottom:14px;padding:12px 16px;background:var(--bg-light);border:1px solid var(--border-color);border-radius:2px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;" id="qeBreakdownContent"></div>
    </div>`;
}

function _renderTransactionsTabContent(page) {
  const st = loadData('settings');
  const mk = `${currentYear}-${currentMonth}`;
  const cards = loadData('cards');
  const cats = loadData('categories');
  const paymentMethods  = loadData('paymentMethods');

  // ── Monthly summary ──
  const monthTxsCached = getFilteredByMonth(currentYear, currentMonth);
  const cur  = getMonthlyTotals(currentMonth, currentYear);
  const cdsTotal = monthTxsCached.filter(t => t.cardId && t.value < 0).reduce((s,t) => s + Math.abs(t.value), 0);
  const nonCreditExpenses = monthTxsCached.filter(t => !t.cardId && t.value < 0).reduce((s,t) => s + t.value, 0);

  const bannerHtml = buildSuggestionBannerHTML(mk, st);
  const tabsHtml = ''; // Tabs removed per design
  const quickFormHtml = buildQuickEntryFormHTML(cats, cards, paymentMethods);
  const summaryHtml = buildSummaryCardsHTML(cur, cdsTotal);

  // Group debts (financings)
  const financingsData = (st.financings || []).filter(f => !f.done);
  let debtHtml = '';
  if (financingsData.length) {
    debtHtml = `<div class="section" style="padding:16px 18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:800;font-size:15px;">
        <i class="fas fa-credit-card" class="u-text-danger"></i> Dívidas
      </div>
      ${financingsData.map(f => {
        const paid = (f.paidCount || 0), total = f.installmentCount || 1;
        const pct = Math.round(paid / total * 100);
        return `<div class="debt-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="debt-name">${escapeHtml(f.description)}</div>
            <div style="font-weight:700;font-size:13px;color:var(--text-muted);">${fmt(f.totalValue || 0)}</div>
          </div>
          <div class="debt-bar"><div class="debt-bar-fill" style="width:${pct}%;"></div></div>
          <div class="u-label-sm">${paid}/${total} parcelas pagas</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  const listHeaderHtml = buildListHeaderHTML(cats, cards, paymentMethods);

  // ── Transactions list ──
  const txsSorted = [...monthTxsCached].sort((a,b) => parseDateISO(b.date) - parseDateISO(a.date));

  // Render list items
  function makeTxItem(t) {
    const isIncome = t.value > 0;
    const isCard = !!t.cardId;
    const iconClass = isCard ? 'card' : (isIncome ? 'income' : 'expense');
    const icon = isCard ? 'fa-credit-card' : (isIncome ? 'fa-arrow-up' : 'fa-arrow-down');
    const cardLabel = isCard ? getCardLabel(t.cardId) : '';
    const metaStr = [t.category, cardLabel || t.paymentMethod, fmtDate(t.date)].filter(Boolean).join(' • ');
    const instLabel = t.isInstallment ? ` <span style="font-size:11px;background:var(--info-light);color:var(--info);border-radius:2px;padding:1px 6px;font-weight:700;">${t.installmentIndex}/${t.installmentCount}</span>` : '';
    const recLabel = t.recurring ? ` <span style="font-size:10px;background:#ede9fe;color:#7c3aed;border-radius:2px;padding:1px 6px;font-weight:700;" title="Recorrente: ${t.recurring==='monthly'?'mensal':t.recurring==='weekly'?'semanal':'anual'}"><i class="fas fa-repeat"></i> ${t.recurring==='monthly'?'M':t.recurring==='weekly'?'S':'A'}</span>` : '';
    return `<div class="tx-list-item" id="txitem_${t.id}" data-tx-id="${t.id}" role="listitem" tabindex="0" aria-label="${isIncome ? 'Receita' : 'Despesa'}: ${escapeHtml(t.description||'Sem descrição')}, ${fmt(Math.abs(t.value))}, ${t.category}, ${fmtDate(t.date)}">
      <div class="tx-list-icon ${iconClass}" aria-hidden="true"><i class="fas ${icon}"></i></div>
      <div class="tx-list-body">
        <div class="tx-list-desc">${escapeHtml(t.description||'Sem descrição')}${instLabel}${recLabel}</div>
        <div class="tx-list-meta">${escapeHtml(metaStr)}</div>
      </div>
      <div class="tx-list-val ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${fmt(Math.abs(t.value))}</div>
      <div class="tx-list-actions">
        <button data-action="edit-tx" data-id="${t.id}" data-type="${isIncome?'income':'expense'}" style="border:none;background:var(--info-light);color:var(--info);width:30px;height:30px;border-radius:2px;cursor:pointer;font-size:12px;" title="Editar" aria-label="Editar ${escapeHtml(t.description||'transação')}"><i class="fas fa-pen" aria-hidden="true"></i></button>
        <button data-action="delete-tx" data-id="${t.id}" style="border:none;background:var(--danger-light);color:var(--danger);width:30px;height:30px;border-radius:2px;cursor:pointer;font-size:12px;" title="Excluir" aria-label="Excluir ${escapeHtml(t.description||'transação')}"><i class="fas fa-trash" aria-hidden="true"></i></button>
      </div>
    </div>`;
  }

  // Store makeTxItem, filter state, and pagination config for filter use
  page._makeTxItem = makeTxItem;
  page._allTxs = txsSorted;
  page._txPerPage = 50;
  page._txPage = 1;

  // Insert DOM shell first (without transaction list content)
  page.innerHTML = bannerHtml + tabsHtml + quickFormHtml + summaryHtml + debtHtml +
    `<div class="section" style="padding:18px 20px;">
      ${listHeaderHtml}
      <div id="qeTxList" role="list" aria-label="Lista de transações"></div>
    </div>`;

  // QC-01: Paginação unificada para lista de transações
  page._txState = { page: page._txPage || 1 };
  page._allTxsFiltered = txsSorted;

  function renderCurrentTxPage() {
    const items = page._allTxsFiltered || page._allTxs;
    paginate({
      items,
      containerId: 'qeTxList',
      state: page._txState,
      perPage: page._txPerPage || CONFIG.TX_PER_PAGE,
      renderRow: (t) => makeTxItem(t),
      onPageChange: (p) => {
        page._txPage = p;
        setupSwipeToDelete('#qeTxList', '.tx-list-item', el => el.dataset.txId);
      },
      emptyText: '<i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>Nenhum lançamento neste mês',
      isTable: false
    });
  }

  renderCurrentTxPage();
  // Swipe-to-delete is called inside paginate callback for each page render

  // ── Bind quick-entry form events ──
  // PM buttons
  let qeSelectedPM = 'PIX';
  let qeSelectedCardId = null;
  const pmBtnEls = page.querySelectorAll('.qe-pm-btn');
  pmBtnEls.forEach(btn => {
    btn.addEventListener('click', () => {
      qeSelectedPM = btn.dataset.pm;
      pmBtnEls.forEach(b => b.classList.remove('active','credit-active'));
      const isCredit = qeSelectedPM === 'Crédito';
      btn.classList.add(isCredit ? 'credit-active' : 'active');
      const cardSel = document.getElementById('qeCardSelect');
      if (isCredit) {
        cardSel.classList.add('show');
        qeSelectedCardId = cardSel.value || null;
      } else {
        cardSel.classList.remove('show');
        qeSelectedCardId = null;
      }
    });
  });
  // Default first PM active
  pmBtnEls[0]?.classList.add('active');

  // Card select
  document.getElementById('qeCardSelect').addEventListener('change', e => {
    qeSelectedCardId = e.target.value || null;
  });

  // Recent cat button
  document.getElementById('qeCatRecent')?.addEventListener('click', () => {
    const txs = loadData('transactions');
    const last = [...txs].sort((a,b) => parseDateISO(b.date)-parseDateISO(a.date)).find(t => t.category);
    if (last) { document.getElementById('qeCat').value = last.category; }
  });

  // Autocomplete on description
  const qeDescEl = document.getElementById('qeDesc');
  qeDescEl.addEventListener('input', () => {
    const val = qeDescEl.value;
    if (val.length >= 2) {
      const cat = autoCategorize(val, -1);
      if (cat && cat !== 'Outros') document.getElementById('qeCat').value = cat;
    }
  });

  // Store qe state on page for quickEntrySubmit
  page._qeState = () => ({ pm: qeSelectedPM, cardId: qeSelectedCardId });

  // ── Transaction Templates ──
  function getTxTemplates() {
    try { return JSON.parse(localStorage.getItem(LS + 'txTemplates') || '[]'); } catch(e) { return []; }
  }
  function saveTxTemplates(tpls) {
    try { localStorage.setItem(LS + 'txTemplates', JSON.stringify(tpls)); } catch(e) {}
  }
  function renderTemplateChips() {
    const container = document.getElementById('qeTemplateChips');
    if (!container) return;
    const tpls = getTxTemplates();
    if (!tpls.length) {
      container.innerHTML = '<span class="u-text-sm-muted">Nenhum template salvo.</span>';
      return;
    }
    container.innerHTML = tpls.map((t, i) => `
      <button type="button" class="qe-tpl-chip" data-tpl-idx="${i}" title="${escapeHtml(t.desc || 'Sem descrição')} · ${t.cat || 'Sem categoria'}" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:2px;border:1.5px solid var(--border-color);background:var(--card-bg);cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;color:var(--text-main);transition:all .18s;">
        <span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.desc || 'Sem desc.')}</span>
        <span style="font-weight:800;color:${t.type==='income'?'var(--success)':'var(--danger)'};">${fmt(t.val || 0)}</span>
        <button type="button" class="qe-tpl-delete" data-tpl-idx="${i}" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:10px;padding:0 2px;" title="Excluir template"><i class="fas fa-times"></i></button>
      </button>
    `).join('');
    container.querySelectorAll('.qe-tpl-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.qe-tpl-delete')) return;
        const idx = parseInt(chip.dataset.tplIdx);
        const tpl = getTxTemplates()[idx];
        if (!tpl) return;
        document.getElementById('qeValue').value = tpl.val || '';
        document.getElementById('qeDesc').value = tpl.desc || '';
        document.getElementById('qeCat').value = tpl.cat || '';
        if (tpl.type) qeSetType(tpl.type);
        // Set PM
        const pmBtn = page.querySelector(`.qe-pm-btn[data-pm="${tpl.pm || 'PIX'}"]`);
        if (pmBtn) pmBtn.click();
        saveQuickDraft();
        showToast(`Template "${tpl.desc}" aplicado!`);
      });
    });
    container.querySelectorAll('.qe-tpl-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.tplIdx);
        const tpls = getTxTemplates();
        const name = tpls[idx]?.desc || 'template';
        tpls.splice(idx, 1);
        saveTxTemplates(tpls);
        renderTemplateChips();
        showToast(`Template "${name}" excluído.`);
      });
    });
  }
  // Save as template
  document.getElementById('qeSaveAsTemplate')?.addEventListener('click', () => {
    const val = parseFloat(document.getElementById('qeValue')?.value);
    const desc = document.getElementById('qeDesc')?.value?.trim();
    const cat = document.getElementById('qeCat')?.value || '';
    const isBtnExpActive = !document.getElementById('qeBtnExpense')?.classList.contains('inactive');
    const type = isBtnExpActive ? 'expense' : 'income';
    if (!val || val <= 0) { showToast('Informe um valor para salvar como template.', 'error'); return; }
    const tpls = getTxTemplates();
    if (tpls.length >= 10) { showToast('Máximo de 10 templates. Exclua um antes.', 'error'); return; }
    tpls.push({ desc: desc || 'Sem descrição', val, cat, pm: page._qeState?.()?.pm || 'PIX', type });
    saveTxTemplates(tpls);
    renderTemplateChips();
    showToast(`Template "${desc || 'Sem descrição'}" salvo!`);
  });
  renderTemplateChips();

  // Bind suggestion buttons
  bindSuggestionBtns(mk, st);

  // Expense type filter buttons
  page.querySelectorAll('.qe-exp-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('.qe-exp-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateExpenseBreakdown();
      qeFilterList();
    });
  });

  // Advanced filter toggle
  const advToggle = document.getElementById('qeAdvFilterToggle');
  const advPanel = document.getElementById('qeAdvFilterPanel');
  if (advToggle && advPanel) {
    advToggle.addEventListener('click', () => {
      const isOpen = advPanel.classList.toggle('open');
      advToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Advanced filter reset
  const advReset = document.getElementById('qeAdvFilterReset');
  if (advReset) {
    advReset.addEventListener('click', () => {
      const catSel = document.getElementById('qeFilterCat');
      const pmSel = document.getElementById('qeFilterPM');
      const valMin = document.getElementById('qeFilterValMin');
      const valMax = document.getElementById('qeFilterValMax');
      if (catSel) catSel.value = '';
      if (pmSel) pmSel.value = '';
      if (valMin) valMin.value = '';
      if (valMax) valMax.value = '';
      qeFilterList();
    });
  }

  function updateExpenseBreakdown() {
    const expTypeBtn = page.querySelector('.qe-exp-type-btn.active');
    const expType = expTypeBtn ? expTypeBtn.dataset.expType : 'all';
    const bd = document.getElementById('qeExpenseBreakdown');
    const content = document.getElementById('qeBreakdownContent');
    if (!bd || !content) return;

    if (expType === 'all') {
      bd.style.display = 'none';
      return;
    }

    const allExpenses = (page._allTxs || []).filter(t => t.value < 0);
    const totalFixed = allExpenses.filter(t => t.isFixedExpense).reduce((s, t) => s + Math.abs(t.value), 0);
    const totalVar = allExpenses.filter(t => !t.isFixedExpense && !t.isInstallment).reduce((s, t) => s + Math.abs(t.value), 0);
    const totalInst = allExpenses.filter(t => t.isInstallment).reduce((s, t) => s + Math.abs(t.value), 0);
    const totalAll = totalFixed + totalVar + totalInst;

    const pctFixed = totalAll > 0 ? (totalFixed / totalAll * 100).toFixed(0) : 0;
    const pctVar = totalAll > 0 ? (totalVar / totalAll * 100).toFixed(0) : 0;
    const pctInst = totalAll > 0 ? (totalInst / totalAll * 100).toFixed(0) : 0;

    content.innerHTML = `
      <div style="flex:1;min-width:100px;"><div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Fixas</div><div style="font-weight:800;font-size:15px;color:#7c3aed;">${fmt(totalFixed)}</div><div class="u-label-sm">${pctFixed}%</div></div>
      <div style="flex:1;min-width:100px;"><div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Variáveis</div><div style="font-weight:800;font-size:15px;color:var(--warning);">${fmt(totalVar)}</div><div class="u-label-sm">${pctVar}%</div></div>
      <div style="flex:1;min-width:100px;"><div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Parceladas</div><div style="font-weight:800;font-size:15px;color:var(--info);">${fmt(totalInst)}</div><div class="u-label-sm">${pctInst}%</div></div>
      <div style="flex:0;"><div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Total</div><div style="font-weight:800;font-size:17px;color:var(--danger);">${fmt(totalAll)}</div></div>
      <div style="flex:2;min-width:120px;height:8px;background:var(--border-color);border-radius:4px;overflow:hidden;display:flex;gap:1px;">
        <div style="width:${pctFixed}%;background:#7c3aed;border-radius:4px 0 0 4px;transition:width .4s;"></div>
        <div style="width:${pctVar}%;background:var(--warning);transition:width .4s;"></div>
        <div style="width:${pctInst}%;background:var(--info);border-radius:0 4px 4px 0;transition:width .4s;"></div>
      </div>`;
    bd.style.display = 'block';
  }

  // Store makeTxItem for filter use
  page._makeTxItem = makeTxItem;
  page._allTxs = txsSorted;

  // UX-03: Restaurar rascunho e salvar rascunho em input changes
  restoreQuickDraft();
  ['qeValue','qeDesc','qeDate','qeCat'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', saveQuickDraft);
    document.getElementById(id)?.addEventListener('change', saveQuickDraft);
  });
}

function qeSwitchTab(tab) {
  // Tabs removed; kept as no-op to avoid onclick errors
}

// UX-03: Rascunho do formulário rápido
function saveQuickDraft() {
  try {
    const draft = {
      value: document.getElementById('qeValue')?.value || '',
      desc: document.getElementById('qeDesc')?.value || '',
      date: document.getElementById('qeDate')?.value || '',
      cat: document.getElementById('qeCat')?.value || '',
    };
    if (draft.value || draft.desc) sessionStorage.setItem('rattio_qe_draft', JSON.stringify(draft));
  } catch(e) {}
}
function restoreQuickDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem('rattio_qe_draft'));
    if (!d) return;
    const v = document.getElementById('qeValue'), desc = document.getElementById('qeDesc');
    const dt = document.getElementById('qeDate'), cat = document.getElementById('qeCat');
    if (v && d.value) v.value = d.value;
    if (desc && d.desc) desc.value = d.desc;
    if (dt && d.date) dt.value = d.date;
    if (cat && d.cat) cat.value = d.cat;
  } catch(e) {}
}
function clearQuickDraft() {
  try { sessionStorage.removeItem('rattio_qe_draft'); } catch(e) {}
}

function qeSetType(type) {
  const btnExp = document.getElementById('qeBtnExpense');
  const btnInc = document.getElementById('qeBtnIncome');
  const submit = document.getElementById('qeSubmit');
  if (type === 'expense') {
    btnExp?.classList.remove('inactive');
    btnExp?.classList.add('expense');
    btnInc?.classList.add('inactive');
    btnInc?.classList.remove('income');
    if (submit) { submit.className = 'qe-submit-btn expense'; submit.innerHTML = '<i class="fas fa-plus"></i> Lançar Despesa'; }
  } else {
    btnInc?.classList.remove('inactive');
    btnInc?.classList.add('income');
    btnExp?.classList.add('inactive');
    btnExp?.classList.remove('expense');
    if (submit) { submit.className = 'qe-submit-btn income'; submit.innerHTML = '<i class="fas fa-plus"></i> Lançar Receita'; }
  }
}

function quickEntrySubmit() {
  const valEl  = document.getElementById('qeValue');
  const descEl = document.getElementById('qeDesc');
  const dateEl = document.getElementById('qeDate');
  const catEl  = document.getElementById('qeCat');
  const page   = document.getElementById('transactionsPage');
  const state  = page._qeState ? page._qeState() : { pm:'PIX', cardId:null };

  const rawVal = parseFloat(valEl.value);
  if (!rawVal || rawVal <= 0) { valEl.focus(); showToast('Informe um valor válido.','error'); return; }

  const isBtnExpActive = !document.getElementById('qeBtnExpense').classList.contains('inactive');
  const type = isBtnExpActive ? 'expense' : 'income';
  const description = descEl.value.trim() || 'Sem descrição';
  const date = dateEl.value || fmtDateISO(new Date());
  const category = catEl.value || 'Outros';
  const pm = state.cardId ? `Crédito - ${(loadData('cards').find(c=>c.id===state.cardId)||{}).name||''}` : state.pm;
  const cardId = state.cardId || null;

  // Keep original purchase date; invoice month is computed dynamically via getCardInvoiceMonth()
  const effectiveDate = date;

  const rr = applyRules(description, category, type, false);
  const finalCat = rr.category;

  const txs = loadData('transactions');
  const o = buildTxObj({ id:genId(), date:effectiveDate, description, value: type==='income' ? Math.abs(rawVal) : -Math.abs(rawVal), category:finalCat, paymentMethod:pm, isFixedExpense:rr.isFixedExpense, isInstallment:false, cardId, goalId:null });
  txs.push(o);
  logChange('transaction', o.id, 'CREATE', null, o);
  saveAll(); invalidateCalcCache(); updateAutocompleteList();

  // Clear form and draft
  valEl.value = '';
  descEl.value = '';
  catEl.value = '';
  clearQuickDraft();
  showToast('Lançamento salvo!');
  renderTransactionsTab();
}

/**
 * Filtra e pagina a lista de transações (QC-01: usa paginate unificada).
 */
function qeFilterList(val) {
  const page = document.getElementById('transactionsPage');
  if (!page._allTxs || !page._makeTxItem) return;
  const search = (typeof val === 'string' ? val : (document.getElementById('qeSearch')?.value || '')).toLowerCase();
  const typeFilter = document.getElementById('qeFilterType')?.value || '';
  const expTypeBtn = document.querySelector('.qe-exp-type-btn.active');
  const expTypeFilter = expTypeBtn ? expTypeBtn.dataset.expType : 'all';
  const catFilter = document.getElementById('qeFilterCat')?.value || '';
  const pmFilter = document.getElementById('qeFilterPM')?.value || '';
  const valMin = parseFloat(document.getElementById('qeFilterValMin')?.value);
  const valMax = parseFloat(document.getElementById('qeFilterValMax')?.value);
  const hasValMin = !isNaN(valMin);
  const hasValMax = !isNaN(valMax);

  let filtered = page._allTxs;
  if (search) filtered = filtered.filter(t => (t.description||'').toLowerCase().includes(search) || (t.category||'').toLowerCase().includes(search));
  if (typeFilter === 'income')  filtered = filtered.filter(t => t.value > 0);
  if (typeFilter === 'expense') filtered = filtered.filter(t => t.value < 0);
  // Expense type sub-filter
  if (expTypeFilter === 'fixed') filtered = filtered.filter(t => t.value < 0 && t.isFixedExpense);
  if (expTypeFilter === 'variable') filtered = filtered.filter(t => t.value < 0 && !t.isFixedExpense && !t.isInstallment);
  if (expTypeFilter === 'installment') filtered = filtered.filter(t => t.value < 0 && t.isInstallment);
  // Advanced filters
  if (catFilter) filtered = filtered.filter(t => t.category === catFilter);
  if (pmFilter) {
    filtered = filtered.filter(t => {
      if (pmFilter.startsWith('Crédito - ')) return t.paymentMethod === pmFilter || (t.cardId && getCardLabel(t.cardId) === pmFilter);
      return t.paymentMethod === pmFilter;
    });
  }
  if (hasValMin) filtered = filtered.filter(t => Math.abs(t.value) >= valMin);
  if (hasValMax) filtered = filtered.filter(t => Math.abs(t.value) <= valMax);

  page._allTxsFiltered = filtered;
  if (!page._txState) page._txState = { page: 1 };
  page._txState.page = 1; // reset to page 1 on filter change

  paginate({
    items: filtered,
    containerId: 'qeTxList',
    state: page._txState,
    perPage: page._txPerPage || CONFIG.TX_PER_PAGE,
    renderRow: (t) => page._makeTxItem(t),
    onPageChange: (p) => {
      page._txPage = p;
      setupSwipeToDelete('#qeTxList', '.tx-list-item', el => el.dataset.txId);
    },
    emptyText: 'Nenhum resultado encontrado.',
    isTable: false
  });

  // Update filter badge and summary
  updateAdvFilterUI();
}

function updateAdvFilterUI() {
  const catFilter = document.getElementById('qeFilterCat')?.value || '';
  const pmFilter = document.getElementById('qeFilterPM')?.value || '';
  const valMin = document.getElementById('qeFilterValMin')?.value || '';
  const valMax = document.getElementById('qeFilterValMax')?.value || '';
  const activeCount = (catFilter ? 1 : 0) + (pmFilter ? 1 : 0) + (valMin ? 1 : 0) + (valMax ? 1 : 0);

  const toggle = document.getElementById('qeAdvFilterToggle');
  const badge = document.getElementById('qeAdvFilterBadge');
  const summary = document.getElementById('qeAdvFilterSummary');

  if (toggle) toggle.classList.toggle('has-filters', activeCount > 0);
  if (badge) {
    badge.style.display = activeCount > 0 ? '' : 'none';
    badge.textContent = activeCount;
  }

  if (summary) {
    if (activeCount === 0) {
      summary.style.display = 'none';
    } else {
      const tags = [];
      if (catFilter) tags.push(`<span class="qe-adv-filter-tag"><i class="fas fa-tag"></i> ${escapeHtml(catFilter)}</span>`);
      if (pmFilter) tags.push(`<span class="qe-adv-filter-tag"><i class="fas fa-credit-card"></i> ${escapeHtml(pmFilter)}</span>`);
      if (valMin) tags.push(`<span class="qe-adv-filter-tag">≥ ${fmt(parseFloat(valMin))}</span>`);
      if (valMax) tags.push(`<span class="qe-adv-filter-tag">≤ ${fmt(parseFloat(valMax))}</span>`);
      const count = document.getElementById('qeTxList_pag')?.querySelector('.pagination-info')?.textContent || '';
      summary.innerHTML = `<i class="fas fa-filter"></i> ${tags.join('')} <span style="margin-left:auto;color:var(--text-muted);font-weight:400;">${count}</span>`;
      summary.style.display = 'flex';
    }
  }
}

function bindSuggestionBtns(mk, st) {
  document.getElementById('btnApplySalary')?.addEventListener('click', () => {
    const txs=loadData('transactions'); const sugg=(st.suggestionsLog||{}); if(!sugg[mk]) sugg[mk]={}; sugg[mk].salaryApplied=true;
    const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,st.salaryDay||1)),description:'Salário',value:Math.abs(st.salaryValue||0),category:'Salário',paymentMethod:'Transferência',isFixedExpense:false,isInstallment:false});
    txs.push(o); logChange('transaction',o.id,'CREATE',null,o); st.suggestionsLog=sugg;
    window._dataCache['settings']=st; saveAll(); invalidateCalcCache(); renderTransactionsTab();
  });
  document.getElementById('btnApplyFixed')?.addEventListener('click', () => {
    const txs=loadData('transactions'); const sugg=(st.suggestionsLog||{}); if(!sugg[mk]) sugg[mk]={}; sugg[mk].fixedApplied=true;
    (st.fixedTemplates||[]).forEach(tpl=>{
      if(txs.some(t=>{ const d=parseDateISO(t.date); return d.getFullYear()===currentYear&&d.getMonth()===currentMonth&&t.description===tpl.description&&t.value<0; })) return;
      const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,1)),description:tpl.description,value:-Math.abs(tpl.value),category:tpl.category,paymentMethod:tpl.paymentMethod,isFixedExpense:true,isInstallment:false});
      txs.push(o); logChange('transaction',o.id,'CREATE',null,o);
    });
    st.suggestionsLog=sugg; window._dataCache['settings']=st; saveAll(); invalidateCalcCache(); renderTransactionsTab();
  });
  document.getElementById('btnApplyFinancing')?.addEventListener('click', () => {
    const txs=loadData('transactions'); const sugg=(st.suggestionsLog||{}); if(!sugg[mk]) sugg[mk]={}; sugg[mk].financingApplied=true;
    (st.financings||[]).filter(f=>!f.done).forEach(f=>{
      const inst=f.installmentCount||1, paid=f.paidCount||0, rem=inst-paid;
      if(rem<=0) return;
      const val=f.totalValue/(inst); const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,1)),description:`${f.description} - Parcela ${paid+1}/${inst}`,value:-Math.abs(val),category:'Outros',paymentMethod:'Transferência',isFixedExpense:true,isInstallment:false});
      txs.push(o); logChange('transaction',o.id,'CREATE',null,o); f.paidCount=(paid+1); if(f.paidCount>=inst) f.done=true;
    });
    st.suggestionsLog=sugg; window._dataCache['settings']=st; saveAll(); invalidateCalcCache(); renderTransactionsTab();
  });
  document.getElementById('btnDismissSugg')?.addEventListener('click', () => {
    const sugg=(st.suggestionsLog||{}); if(!sugg[mk]) sugg[mk]={}; sugg[mk].salaryApplied=true; sugg[mk].fixedApplied=true; sugg[mk].financingApplied=true;
    st.suggestionsLog=sugg; window._dataCache['settings']=st; saveAll(); renderTransactionsTab();
  });
}
// ============================
// BUDGETS TAB
// ============================
