function renderGoalsTab() {
  const page = document.getElementById('goalsPage');
  page.innerHTML = '';
  const goals = loadData('goals');
  const txs   = loadData('transactions');

  // Compute totals
  const investments = goals.filter(g => g.type === 'investment');
  const savingsGoals = goals.filter(g => g.type !== 'investment');

  const totalInvested = investments.reduce((s, g) => s + getGoalCurrent(g, txs), 0);
  const totalTarget   = investments.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalAtual    = investments.reduce((s, g) => s + (g.currentValue || getGoalCurrent(g, txs)), 0);
  const rendimentoTotal  = totalAtual - totalInvested;
  const rentabilidadeTotal = totalInvested > 0 ? (rendimentoTotal / totalInvested * 100) : 0;
  const rendColor = rendimentoTotal >= 0 ? 'var(--success)' : 'var(--danger)';
  const rendSign  = rendimentoTotal >= 0 ? '+' : '';

  const INV_TYPES = { 'Renda Fixa':'renda-fixa', 'Renda Variável':'renda-variavel', 'Crypto':'crypto', 'Fundo':'fundo' };

  // ── KPI Cards ──
  const kpiHtml = `
    <div class="inv-kpi-grid">
      <div class="inv-kpi-card">
        <div class="ikc-icon" style="background:#dbeafe;color:#1d4ed8;"><i class="fas fa-piggy-bank"></i></div>
        <div class="ikc-label">Total Investido</div>
        <div class="ikc-val" style="color:var(--info);">${fmt(totalInvested)}</div>
      </div>
      <div class="inv-kpi-card">
        <div class="ikc-icon" style="background:#dcfce7;color:#15803d;"><i class="fas fa-arrow-trend-up"></i></div>
        <div class="ikc-label">Valor Atual</div>
        <div class="ikc-val" class="u-text-success">${fmt(totalAtual)}</div>
      </div>
      <div class="inv-kpi-card">
        <div class="ikc-icon" style="background:${rendimentoTotal >= 0 ? '#dcfce7' : '#fef2f2'};color:${rendimentoTotal >= 0 ? '#15803d' : '#dc2626'};"><i class="fas fa-arrow-up-right-dots"></i></div>
        <div class="ikc-label">Rendimento</div>
        <div class="ikc-val" style="color:${rendColor};">${rendSign}${fmt(Math.abs(rendimentoTotal))}</div>
      </div>
      <div class="inv-kpi-card">
        <div class="ikc-icon" style="background:#ede9fe;color:#6d28d9;"><i class="fas fa-percent"></i></div>
        <div class="ikc-label">Rentabilidade</div>
        <div class="ikc-val" style="color:#7c3aed;">${rentabilidadeTotal >= 0 ? '+' : ''}${rentabilidadeTotal.toFixed(2)}%</div>
      </div>
    </div>`;

  // ── Donut chart data ──
  const typeData = {};
  investments.forEach(g => {
    const type = g.investmentType || 'Outros';
    typeData[type] = (typeData[type] || 0) + getGoalCurrent(g, txs);
  });
  const typeLabels = Object.keys(typeData);
  const typeVals   = Object.values(typeData);
  const DONUT_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

  const legendHtml = typeLabels.map((l,i) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:6px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${DONUT_COLORS[i%DONUT_COLORS.length]};flex-shrink:0;"></div>
      <span style="flex:1;">${escapeHtml(l)}</span>
      <span class="u-font-bold">${fmt(typeData[l])}</span>
    </div>`).join('');

  // ── Investment cards ──
  const invCardsHtml = investments.length
    ? investments.map(g => {
        const current = getGoalCurrent(g, txs);
        const valorAtual = g.currentValue || current;
        const rendimento = valorAtual - current;
        const rentab = current > 0 ? (rendimento / current * 100) : 0;
        const rendClr = rendimento >= 0 ? 'var(--success)' : 'var(--danger)';
        const rendBg  = rendimento >= 0 ? 'var(--accent-light)' : 'var(--danger-light)';
        const rendSign = rendimento >= 0 ? '+' : '-';
        const hasCurrentValue = !!g.currentValue;
        const target  = g.targetAmount || 0;
        const pct     = target > 0 ? Math.min(100, current / target * 100) : 0;
        const tagClass = INV_TYPES[g.investmentType] || 'renda-fixa';
        const rateLabel = g.rate ? `${g.rate}% a.a.` : '';
        // Movement history for this goal
        const invTxs = txs.filter(t => t.goalId === g.id).sort((a,b) => parseDateISO(b.date)-parseDateISO(a.date)).slice(0,5);
        return `<div class="inv-card">
          <div class="inv-card-header">
            <div>
              <div class="inv-card-name">${escapeHtml(g.name)}</div>
              <div style="margin-top:6px;">
                <span class="inv-card-tag ${tagClass}">${escapeHtml(g.investmentType || 'Renda Fixa')}</span>
                ${rateLabel ? `<span class="inv-card-tag" style="background:#fef3c7;color:#b45309;">${rateLabel}</span>` : ''}
              </div>
            </div>
            <div class="inv-card-actions">
              <button class="inv-action-btn" title="Novo Aporte" data-action="deposit-goal" data-id="${g.id}"><i class="fas fa-plus"></i></button>
              <button class="inv-action-btn" title="Histórico" data-action="inv-history" data-id="${g.id}"><i class="fas fa-list"></i></button>
              <button class="inv-action-btn" title="Editar" data-action="edit-goal" data-id="${g.id}"><i class="fas fa-pen"></i></button>
              <button class="inv-action-btn danger" title="Excluir" data-action="delete-goal" data-id="${g.id}"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="inv-data-grid">
            <div class="inv-data-item"><div class="idi-label">Investido</div><div class="idi-val" style="color:var(--text-primary);">${fmt(current)}</div></div>
            <div class="inv-data-item"><div class="idi-label">Valor Atual</div><div class="idi-val" class="u-text-success">${fmt(valorAtual)}</div></div>
            <div class="inv-data-item"><div class="idi-label">Rendimento</div><div class="idi-val" style="color:${rendClr};">${hasCurrentValue ? `${rendSign}${fmt(Math.abs(rendimento))}` : '—'}</div></div>
            <div class="inv-data-item"><div class="idi-label">Rentabilidade</div><div class="idi-val" style="color:#7c3aed;">${hasCurrentValue ? `${rentab >= 0 ? '+' : '-'}${rentab.toFixed(2)}%` : '—'}</div></div>
          </div>
          ${target > 0 ? `<div style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px;">
              <span>Meta: ${fmt(target)}</span><span>${pct.toFixed(0)}%</span>
            </div>
            <div style="height:6px;border-radius:2px;background:var(--border-color);overflow:hidden;">
              <div style="height:100%;border-radius:2px;background:var(--info);width:${pct}%;"></div>
            </div>
          </div>` : ''}
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:40px;color:var(--text-muted);">
        <i class="fas fa-chart-line" style="font-size:36px;display:block;margin-bottom:12px;opacity:.3;"></i>
        Nenhum investimento cadastrado ainda.
      </div>`;

  // ── Savings goals ──
  const savingsHtml = savingsGoals.length
    ? `<div class="section" style="padding:20px 22px;margin-top:20px;">
        <div class="section-header">
          <div class="section-header-left">
            <div class="section-icon" style="background:#fef3c7;color:#b45309;"><i class="fas fa-bullseye"></i></div>
            <h2>Metas de Poupança</h2>
          </div>
        </div>
        <div class="goals-grid" id="goalsGrid"></div>
      </div>` : '';

  // ── Movement history table ──
  const allInvTxs = txs.filter(t => t.goalId).sort((a,b) => parseDateISO(b.date)-parseDateISO(a.date)).slice(0,20);
  const histHtml = allInvTxs.length
    ? `<table class="inv-history-table">
        <thead><tr><th>Data</th><th>Descrição</th><th>Meta</th><th>Valor</th></tr></thead>
        <tbody>${allInvTxs.map(t => {
          const g = goals.find(x => x.id === t.goalId);
          return `<tr>
            <td>${fmtDate(t.date)}</td>
            <td>${escapeHtml(t.description)}</td>
            <td>${escapeHtml(g?.name||'—')}</td>
            <td style="font-weight:700;color:${t.value<0?'var(--danger)':'var(--success)'};">${t.value<0?'-':'+'}${fmt(Math.abs(t.value))}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`
    : `<div style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma movimentação registrada ainda.</div>`;

  page.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-weight:900;font-size:22px;">Seus Investimentos</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:3px;">Acompanhe a evolução do seu patrimônio</div>
      </div>
      <button class="btn" id="btnNewGoal" style="gap:8px;"><i class="fas fa-plus"></i> Novo Investimento</button>
    </div>

    ${kpiHtml}

    <div class="inv-layout">
      <!-- Donut chart -->
      <div class="inv-card" style="display:flex;flex-direction:column;align-items:center;">
        <div style="font-weight:700;font-size:15px;margin-bottom:16px;align-self:flex-start;">Distribuição por Tipo</div>
        ${typeLabels.length
          ? `<div style="position:relative;width:180px;height:180px;margin-bottom:16px;"><canvas id="invDonut" width="180" height="180"></canvas></div>${legendHtml}`
          : `<div style="color:var(--text-muted);font-size:13px;padding:40px 0;">Sem dados</div>`}
      </div>
      <!-- Investment cards list -->
      <div>
        <div style="font-weight:700;font-size:15px;margin-bottom:14px;">Meus Investimentos</div>
        <div style="display:flex;flex-direction:column;gap:14px;" id="invCardsList">${invCardsHtml}</div>
      </div>
    </div>

    <!-- Goal inline form -->
    <div id="goalFormCard" class="section hidden" style="padding:20px 22px;">
      <div class="section-header">
        <div class="section-header-left">
          <div class="section-icon"><i class="fas fa-bullseye"></i></div>
          <h2 id="goalFormTitle">Novo Investimento</h2>
        </div>
        <button class="btn secondary small" id="btnCancelGoal"><i class="fas fa-times"></i> Cancelar</button>
      </div>
      <form id="goalForm" style="background:var(--bg-light);padding:22px;border-radius:3px;border:1px solid var(--border-color);">
        <input type="hidden" id="goalId">
        <div class="form-grid">
          <div class="form-group"><label for="goalName">Nome</label><input type="text" id="goalName" placeholder="Ex: CDB Banco X" required aria-required="true"></div>
          <div class="form-group">
            <label for="goalInvType">Tipo de Investimento</label>
            <select id="goalInvType">
              <option value="Renda Fixa">Renda Fixa</option>
              <option value="Renda Variável">Renda Variável</option>
              <option value="Crypto">Crypto</option>
              <option value="Fundo">Fundo</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div class="form-group"><label for="goalTarget">Meta de Valor (R$)</label><input type="number" id="goalTarget" step="0.01" placeholder="Opcional"></div>
          <div class="form-group"><label for="goalCurrent">Valor Inicial (R$)</label><input type="number" id="goalCurrent" step="0.01" placeholder="Saldo inicial" value="0"><div class="hint">Aportes via transações são somados automaticamente.</div></div>
          <div class="form-group"><label for="goalCurrentValue">Valor Atual na Corretora (R$) <span style="font-weight:400;color:var(--text-muted);font-size:10px;">OPCIONAL</span></label><input type="number" id="goalCurrentValue" step="0.01" placeholder="Valor real hoje (para calcular rendimento)"><div class="hint">Informe o saldo atual para calcular rendimento real. Se vazio, assume = total aportado.</div></div>
          <div class="form-group"><label for="goalRate">Taxa (% a.a.)</label><input type="number" id="goalRate" step="0.01" placeholder="Ex: 13.5"></div>
          <div class="form-group"><label for="goalDeadline">Prazo (opcional)</label><input type="date" id="goalDeadline"></div>
        </div>
        <div class="row" style="justify-content:flex-end;gap:10px;border-top:1px solid var(--border-color);padding-top:16px;margin-top:6px;">
          <button type="button" class="btn secondary" id="btnCancelGoal2">Cancelar</button>
          <button type="submit" class="btn" id="btnSaveGoal"><i class="fas fa-check"></i> Salvar</button>
        </div>
      </form>
    </div>

    ${savingsHtml}

    <!-- Investment Evolution Chart -->
    <div class="section" style="padding:20px 22px;margin-top:20px;">
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-header-left">
          <div class="section-icon" style="background:#dbeafe;color:#1d4ed8;"><i class="fas fa-chart-line"></i></div>
          <h2>Evolução do Patrimônio</h2>
        </div>
      </div>
      <div style="position:relative;height:280px;width:100%;"><canvas id="invEvolutionChart"></canvas></div>
    </div>

    <!-- Movement history -->
    <div class="section" style="padding:20px 22px;margin-top:20px;">
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-header-left">
          <div class="section-icon" style="background:#f3e8ff;color:#7c3aed;"><i class="fas fa-history"></i></div>
          <h2>Histórico de Movimentações</h2>
        </div>
      </div>
      ${histHtml}
    </div>
  `;

  // Render savings goals grid
  if (savingsGoals.length) {
    const grid = document.getElementById('goalsGrid');
    if (grid) renderGoalsGrid(grid, savingsGoals, txs);
  }

  // Donut chart (async — loads Chart.js on demand)
  if (typeLabels.length) {
    ensureChartJS().then(() => {
    if (!window.Chart) return;
    const ctx = document.getElementById('invDonut')?.getContext('2d');
    if (ctx) {
      if (chartInst.invDonut) { try{chartInst.invDonut.destroy();}catch(e){} }
      chartInst.invDonut = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: typeLabels, datasets: [{ data: typeVals, backgroundColor: DONUT_COLORS.slice(0,typeLabels.length), borderWidth:0, hoverOffset:8 }] },
        options: { cutout:'72%', responsive:false, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx => fmt(ctx.raw) } } } }
      });
      ctx.canvas.setAttribute('role', 'img');
      ctx.canvas.setAttribute('aria-label', 'Gráfico de pizza: distribuição de investimentos por tipo');
    }
    }); // end ensureChartJS
  }

  // Evolution chart (async — loads Chart.js on demand)
  ensureChartJS().then(() => {
    if (!window.Chart) return;
    const evoCanvas = document.getElementById('invEvolutionChart');
    if (!evoCanvas) return;
    if (chartInst.invEvolution) { try { chartInst.invEvolution.destroy(); } catch(e){} }

    // Build monthly cumulative data from all investment transactions
    const allTxs = loadData('transactions').filter(t => t.goalId && t.value < 0).sort((a,b) => parseDateISO(a.date) - parseDateISO(b.date));
    const monthlyData = {};
    let cumulative = 0;
    allTxs.forEach(t => {
      const d = parseDateISO(t.date);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      monthlyData[key] = (monthlyData[key] || 0) + Math.abs(t.value);
    });
    const sortedKeys = Object.keys(monthlyData).sort();
    const evoLabels = [];
    const evoData = [];
    sortedKeys.forEach(k => {
      cumulative += monthlyData[k];
      const [y, m] = k.split('-');
      evoLabels.push(MONTH_SHORT[parseInt(m)-1] + '/' + y.slice(2));
      evoData.push(parseFloat(cumulative.toFixed(2)));
    });

    if (evoLabels.length > 1) {
      chartInst.invEvolution = new Chart(evoCanvas, {
        type: 'line',
        data: {
          labels: evoLabels,
          datasets: [{
            label: 'Total Investido',
            data: evoData,
            borderColor: '#0055FF',
            backgroundColor: 'rgba(37,99,235,0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#0055FF',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { padding: 12, cornerRadius: 10, callbacks: { label: ctx => fmt(ctx.raw) } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 } } },
            y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => 'R$' + v } }
          }
        }
      });
      evoCanvas.setAttribute('role', 'img');
      evoCanvas.setAttribute('aria-label', 'Gráfico de evolução do patrimônio investido ao longo do tempo');
    } else {
      evoCanvas.parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;"><i class="fas fa-chart-line" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3;"></i>Dados insuficientes para evolução.<br><span style="font-size:11px;">Faça aportes em pelo menos 2 meses.</span></div>';
    }
  });

  // New Goal button
  document.getElementById('btnNewGoal')?.addEventListener('click', () => {
    document.getElementById('goalFormCard').classList.remove('hidden');
    document.getElementById('goalFormTitle').textContent = 'Novo Investimento';
    document.getElementById('goalId').value = '';
    document.getElementById('goalForm').reset();
    document.getElementById('goalCurrentValue').value = '';
  });
  ['btnCancelGoal','btnCancelGoal2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('goalFormCard').classList.add('hidden');
    });
  });

  document.getElementById('goalForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('goalId').value || genId();
    const goals2 = loadData('goals');
    const existing = goals2.find(g => g.id === id);
    const obj = {
      id,
      name: document.getElementById('goalName').value.trim(),
      investmentType: document.getElementById('goalInvType').value,
      type: 'investment',
      targetAmount: parseFloat(document.getElementById('goalTarget').value) || 0,
      initialAmount: parseFloat(document.getElementById('goalCurrent').value) || 0,
      currentValue: parseFloat(document.getElementById('goalCurrentValue').value) || null,
      rate: parseFloat(document.getElementById('goalRate').value) || 0,
      deadline: document.getElementById('goalDeadline').value || null,
    };
    if (existing) {
      const old = { ...existing };
      Object.assign(existing, obj);
      window._dataCache['goals'] = goals2;
      saveAll(); invalidateCalcCache();
      renderGoalsTab();
      showToastWithUndo('Investimento editado', () => {
        const g = loadData('goals').find(x => x.id === id);
        if (g) { Object.assign(g, old); saveAll(); invalidateCalcCache(); renderGoalsTab(); }
      });
    } else {
      goals2.push(obj);
      window._dataCache['goals'] = goals2;
      saveAll(); invalidateCalcCache();
      renderGoalsTab();
      showToast('Investimento salvo!');
    }
  });
}

function getGoalCurrent(g, txs) {
  const deposits = (txs || loadData('transactions'))
    .filter(t => t.goalId === g.id && t.value < 0)
    .reduce((s, t) => s + Math.abs(t.value), 0);
  return (g.initialAmount || g.currentAmount || 0) + deposits;
}

function editGoal(id) {
  const goals = loadData('goals');
  const g = goals.find(x => x.id === id);
  if (!g) return;
  const card = document.getElementById('goalFormCard');
  card.classList.remove('hidden');
  document.getElementById('goalFormTitle').textContent = 'Editar Investimento';
  document.getElementById('goalId').value = g.id;
  document.getElementById('goalName').value = g.name || '';
  document.getElementById('goalInvType').value = g.investmentType || 'Renda Fixa';
  document.getElementById('goalTarget').value = g.targetAmount || '';
  document.getElementById('goalCurrent').value = g.initialAmount || g.currentAmount || '';
  document.getElementById('goalCurrentValue').value = g.currentValue || '';
  document.getElementById('goalRate').value = g.rate || '';
  document.getElementById('goalDeadline').value = g.deadline || '';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteGoal(id) {
  const goals = loadData('goals');
  const g = goals.find(x => x.id === id);
  if (!g) return;
  showConfirm(`Excluir investimento "<b>${escapeHtml(g.name)}</b>"?`, () => {
    window._dataCache['goals'] = goals.filter(x => x.id !== id);
    saveAll(); invalidateCalcCache(); renderGoalsTab();
  });
}

function showInvHistory(goalId) {
  const goals = loadData('goals');
  const txs   = loadData('transactions');
  const g = goals.find(x => x.id === goalId);
  if (!g) return;
  const invTxs = txs.filter(t => t.goalId === goalId).sort((a,b) => parseDateISO(b.date)-parseDateISO(a.date));
  const html = invTxs.length
    ? `<table class="inv-history-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>
        ${invTxs.map(t => `<tr><td>${fmtDate(t.date)}</td><td>${escapeHtml(t.description)}</td><td style="font-weight:700;color:${t.value<0?'var(--danger)':'var(--success)'};">${t.value<0?'-':'+'}${fmt(Math.abs(t.value))}</td></tr>`).join('')}
       </tbody></table>`
    : '<p style="color:var(--text-muted);text-align:center;padding:20px;">Sem movimentações.</p>';

  let existing = document.getElementById('invHistModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'invHistModal'; modal.className = 'modal open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'invHistModalTitle');
  modal.innerHTML = `<div class="modal-content" style="max-width:560px;">
    <button class="modal-close" data-action="remove-dynamic-modal" data-id="invHistModal" aria-label="Fechar"><i class="fas fa-times"></i></button>
    <h3 class="modal-title" id="invHistModalTitle"><i class="fas fa-history" style="color:#7c3aed;"></i> Movimentações — ${escapeHtml(g.name)}</h3>
    ${html}
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function renderGoalsGrid(grid, goals, txs) {
  grid.innerHTML = goals.map(g => {
    const current = getGoalCurrent(g, txs);
    const target  = g.targetAmount || 0;
    const pct     = target > 0 ? Math.min(100, current / target * 100) : 0;
    return `<div class="goal-card">
      <div class="goal-header"><div class="goal-name">${escapeHtml(g.name)}</div></div>
      <div class="goal-values">
        <div><div class="hint">Atual</div><div class="goal-current">${fmt(current)}</div></div>
        ${target > 0 ? `<div style="text-align:right;"><div class="hint">Meta</div><div class="u-font-bold">${fmt(target)}</div></div>` : ''}
      </div>
      ${target > 0 ? `<div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%;"></div></div>
      <div style="font-size:11px;color:var(--text-muted);text-align:right;">${pct.toFixed(0)}%</div>` : ''}
      <div class="row" style="margin-top:10px;gap:6px;">
        <button class="btn secondary small" data-action="deposit-goal" data-id="${g.id}"><i class="fas fa-plus"></i> Aporte</button>
        <button class="btn secondary small" data-action="edit-goal" data-id="${g.id}"><i class="fas fa-pen"></i></button>
        <button class="btn secondary small" style="color:var(--danger);border-color:var(--danger);" data-action="delete-goal" data-id="${g.id}"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}
// ============================
// CALENDAR - DAY DETAIL MODAL
// ============================
function showDayDetail(iso, dayTxs) {
  let existing = document.getElementById('dayDetailModal');
  if (existing) existing.remove();

  const [y, m, d] = iso.split('-');
  const dateLabel = `${d}/${m}/${y}`;
  const cards = loadData('cards');

  const modal = document.createElement('div');
  modal.id = 'dayDetailModal';
  modal.className = 'modal open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'dayDetailTitle');

  const dayTotals = calcTotals(dayTxs);

  const rowsHtml = dayTxs.map(t => {
    const isIncome = t.value > 0;
    const isCard   = !!t.cardId;
    const card     = isCard ? cards.find(c=>c.id===t.cardId) : null;
    const iconClass = isCard ? '#7c3aed' : (isIncome ? 'var(--success)' : 'var(--danger)');
    const icon = isCard ? 'fa-credit-card' : (isIncome ? 'fa-arrow-up' : 'fa-arrow-down');

    // Show which invoice month this card purchase belongs to
    let invoiceTag = '';
    if (isCard && card && card.closingDay && t.value < 0) {
      const [iy, im] = getCardInvoiceMonth(t.date, card.closingDay);
      const realDate = parseDateISO(t.date);
      const isNextMonth = (iy !== realDate.getFullYear() || im !== realDate.getMonth());
      if (isNextMonth) {
        invoiceTag = `<span style="font-size:10px;background:#fef3c7;color:#92400e;border-radius:5px;padding:1px 6px;margin-left:4px;font-weight:700;">📅 Fatura ${MONTH_SHORT[im]}/${iy}</span>`;
      } else {
        invoiceTag = `<span style="font-size:10px;background:#ede9fe;color:#5b21b6;border-radius:5px;padding:1px 6px;margin-left:4px;font-weight:700;">📅 Fatura ${MONTH_SHORT[im]}/${iy}</span>`;
      }
    }

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-light);border-radius:1px;border:1px solid var(--border-color);">
        <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${isIncome?'var(--accent-light)':isCard?'#ede9fe':'var(--danger-light)'};flex-shrink:0;">
          <i class="fas ${icon}" style="color:${iconClass};font-size:13px;"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.description || 'Sem descrição')}${invoiceTag}</div>
          <div class="u-text-sm-muted">${escapeHtml(t.category || '')}${t.paymentMethod ? ' • ' + escapeHtml(t.paymentMethod) : ''}</div>
        </div>
        <div style="font-weight:800;font-size:15px;color:${isIncome ? 'var(--success)' : 'var(--danger)'};white-space:nowrap;">${isIncome ? '+' : '-'}${fmt(Math.abs(t.value))}</div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button
            style="border:none;background:var(--info-light);color:var(--info);padding:6px 10px;border-radius:2px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;"
            data-action="day-detail-edit" data-id="${t.id}">
            Editar
          </button>
          <button
            style="border:none;background:var(--danger-light);color:var(--danger);padding:6px 10px;border-radius:2px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;"
            data-action="day-detail-delete" data-id="${t.id}">
            Excluir
          </button>
        </div>
      </div>`;
  }).join('');

  const summaryHtml = (dayTotals.income > 0 || dayTotals.expense > 0) ? `
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      ${dayTotals.income>0?`<div style="flex:1;background:var(--accent-light);border-radius:2px;padding:8px 12px;"><div style="font-size:10px;color:var(--accent-dark-green);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Entradas</div><div style="font-weight:800;color:var(--success);font-size:15px;">+${fmt(dayTotals.income)}</div></div>`:''}
      ${dayTotals.expense>0?`<div style="flex:1;background:var(--danger-light);border-radius:2px;padding:8px 12px;"><div style="font-size:10px;color:#b91c1c;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Saídas</div><div style="font-weight:800;color:var(--danger);font-size:15px;">-${fmt(dayTotals.expense)}</div></div>`:''}
    </div>` : '';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:520px;">
      <button class="modal-close" data-action="remove-dynamic-modal" data-id="dayDetailModal" aria-label="Fechar"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="dayDetailTitle"><i class="far fa-calendar-alt" style="color:var(--info)"></i> ${dateLabel} <span style="font-size:13px;color:var(--text-muted);font-weight:400;">(${dayTxs.length} transaç${dayTxs.length===1?'ão':'ões'})</span></h3>
      ${summaryHtml}
      <div style="display:flex;flex-direction:column;gap:10px;max-height:55vh;overflow-y:auto;margin-bottom:16px;">${rowsHtml}</div>
      <div style="border-top:1px solid var(--border-color);padding-top:14px;">
        <button class="btn" class="u-w-full u-flex-center"
          data-action="day-detail-add" data-id="${iso}">
          <i class="fas fa-plus"></i> Adicionar Transação neste dia
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ============================
// CALENDAR TAB
// ============================
