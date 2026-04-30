function renderReportsTab() {
  const page = document.getElementById('reportsPage');
  page.innerHTML = '';
  const allCats = loadData('categories');
  if (advReport.categories.length === 0) advReport.categories = [...allCats];

  // ── Period label for display ──
  const periodLabel = getPeriodLabel();

  // ── Build filter panel HTML ──
  const catCheckboxes = allCats.map(c =>
    `<button type="button" class="adv-cat-pill ${advReport.categories.includes(c) ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  page.innerHTML = `
    <!-- ── REPORT HEADER ── -->
    <div class="adv-report-header">
      <div>
        <div class="adv-report-title"><i class="fas fa-chart-bar" style="color:var(--rattio-blue);"></i> Relatórios Avançados</div>
        <div class="adv-report-period-label" id="advPeriodLabel">${periodLabel}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn small" id="btnExportAdvCSV" style="background:var(--rattio-navy);"><i class="fas fa-file-csv"></i> CSV</button>
        <button class="btn small" id="btnExportAdvPDF" style="background:#DC2626;"><i class="fas fa-file-pdf"></i> PDF</button>
      </div>
    </div>

    <!-- ── FILTERS PANEL ── -->
    <div class="section adv-filters-panel">
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-header-left">
          <div class="section-icon" style="color:var(--rattio-blue);background:var(--info-light);"><i class="fas fa-filter"></i></div>
          <h2>Filtros do Relatório</h2>
        </div>
        <button class="btn secondary small" id="btnResetAdvFilters"><i class="fas fa-undo"></i> Resetar</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;flex-wrap:wrap;">
        <!-- Period -->
        <div class="form-group">
          <p style="font-weight:600;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0;">Período</p>
          <div class="adv-period-btns" id="advPeriodBtns">
            <button class="adv-period-btn ${advReport.period==='monthly'?'active':''}" data-period="monthly">Mensal</button>
            <button class="adv-period-btn ${advReport.period==='quarterly'?'active':''}" data-period="quarterly">Trimestral</button>
            <button class="adv-period-btn ${advReport.period==='annual'?'active':''}" data-period="annual">Anual</button>
            <button class="adv-period-btn ${advReport.period==='custom'?'active':''}" data-period="custom">Personalizado</button>
          </div>
        </div>
        <!-- Type -->
        <div class="form-group">
          <p style="font-weight:600;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0;">Tipo de Transação</p>
          <div class="adv-period-btns">
            <button class="adv-period-btn ${advReport.types==='all'?'active':''}" data-type="all">Todos</button>
            <button class="adv-period-btn ${advReport.types==='income'?'active':''}" data-type="income" style="${advReport.types==='income'?'':''}">Receitas</button>
            <button class="adv-period-btn ${advReport.types==='expense'?'active':''}" data-type="expense">Despesas</button>
          </div>
        </div>
        <!-- Year (for annual/trend) -->
        <div class="form-group">
          <p style="font-weight:600;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0;">Ano de Referência</p>
          <div style="display:flex;align-items:center;gap:8px;background:var(--bg-light);padding:4px;border-radius:2px;border:1px solid var(--border-color);">
            <button id="btnAdvPrevYear" class="month-nav-btn"><i class="fas fa-chevron-left"></i></button>
            <span id="advYearDisplay" style="font-weight:700;font-size:13px;flex:1;text-align:center;">${reportsYear}</span>
            <button id="btnAdvNextYear" class="month-nav-btn"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
      <!-- Custom date range (shown when period=custom) -->
      <div id="advCustomRange" style="display:${advReport.period==='custom'?'flex':'none'};gap:16px;margin-top:14px;">
        <div class="form-group" style="flex:1;"><label for="advDateStart">Data Início</label><input type="date" id="advDateStart" value="${advReport.customStart}"></div>
        <div class="form-group" style="flex:1;"><label for="advDateEnd">Data Fim</label><input type="date" id="advDateEnd" value="${advReport.customEnd}"></div>
      </div>
      <!-- Categories filter -->
      <div style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <p style="font-weight:600;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0;">Categorias</p>
          <div style="display:flex;gap:6px;">
            <button class="btn secondary small" id="btnSelectAllCats" style="font-size:11px;padding:4px 10px;">Todas</button>
            <button class="btn secondary small" id="btnClearAllCats" style="font-size:11px;padding:4px 10px;">Nenhuma</button>
          </div>
        </div>
        <div class="adv-cats-grid" id="advCatsGrid">${catCheckboxes}</div>
      </div>
    </div>

    <!-- ── KPI SUMMARY CARDS ── -->
    <div class="adv-kpi-row" id="advKpiRow"></div>

    <!-- ── CHART VIEW SELECTOR + CHART ── -->
    <div class="section">
      <div class="section-header">
        <div class="section-header-left">
          <div class="section-icon" style="color:var(--rattio-blue);background:var(--info-light);"><i class="fas fa-chart-bar"></i></div>
          <h2>Visualizações</h2>
        </div>
        <div class="adv-chart-tabs" id="advChartTabs">
          <button class="adv-chart-tab ${advReport.chartView==='bar-cat'?'active':''}" data-view="bar-cat"><i class="fas fa-chart-bar"></i> Por Categoria</button>
          <button class="adv-chart-tab ${advReport.chartView==='net-worth'?'active':''}" data-view="net-worth"><i class="fas fa-chart-area"></i> Patrimônio</button>
          <button class="adv-chart-tab ${advReport.chartView==='doughnut'?'active':''}" data-view="doughnut"><i class="fas fa-chart-pie"></i> Pizza</button>
          <button class="adv-chart-tab ${advReport.chartView==='trend'?'active':''}" data-view="trend"><i class="fas fa-chart-line"></i> Tendência</button>
        </div>
      </div>
      <div class="chart-container" style="height:340px;"><canvas id="advMainChart"></canvas></div>
    </div>

    <!-- ── SECONDARY CHARTS GRID ── -->
    <div class="charts-grid-2">
      <div class="section">
        <div class="section-header"><div class="section-header-left"><div class="section-icon" style="color:#EC4899;background:#FCE7F3;"><i class="fas fa-chart-pie"></i></div><h2>Distribuição de Despesas</h2></div></div>
        <div class="chart-container" style="height:260px;"><canvas id="advPieChart"></canvas></div>
      </div>
      <div class="section">
        <div class="section-header"><div class="section-header-left"><div class="section-icon" style="color:var(--rattio-blue);background:var(--info-light);"><i class="fas fa-chart-line"></i></div><h2>Evolução Receitas vs Despesas</h2></div></div>
        <div class="chart-container" style="height:260px;"><canvas id="advBarChart"></canvas></div>
      </div>
    </div>

    <!-- ── DETAILED TABLE ── -->
    <div class="section">
      <div class="section-header">
        <div class="section-header-left"><div class="section-icon"><i class="fas fa-table-list"></i></div><h2>Detalhamento por Categoria</h2></div>
        <button class="btn secondary small" id="btnExportTable"><i class="fas fa-file-csv"></i> Exportar Tabela</button>
      </div>
      <div class="table-responsive"><table class="data-table"><thead><tr><th>Categoria</th><th>Transações</th><th>Receitas</th><th>Despesas</th><th>Saldo</th><th>% do Total</th></tr></thead><tbody id="advDetailTable"></tbody></table></div>
    </div>

    <!-- ── FORECAST ── -->
    <div class="section">
      <div class="section-header"><div class="section-header-left"><div class="section-icon" style="color:var(--violet);background:#F3E8FF;"><i class="fas fa-wand-magic-sparkles"></i></div><h2>Previsão de Fluxo de Caixa</h2></div></div>
      <div style="display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap;">
        <div class="form-group" style="flex:1;min-width:140px;"><label for="histSel">Base Histórica</label><select id="histSel"><option value="1">Último mês</option><option value="3" selected>3 meses</option><option value="6">6 meses</option></select></div>
        <div class="form-group" style="flex:1;min-width:140px;"><label for="projSel">Projetar para</label><select id="projSel"><option value="3" selected>3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select></div>
      </div>
      <div id="forecastAlerts" class="u-mb-14"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="chart-container" style="height:260px;"><canvas id="forecastCanvas"></canvas></div>
        <div class="table-responsive"><table class="data-table"><thead><tr><th>Mês</th><th>Receita</th><th>Despesa</th><th>Saldo</th></tr></thead><tbody id="forecastBody"></tbody></table></div>
      </div>
    </div>
  `;

  // ── Bind filter events ──
  // Period buttons
  page.querySelectorAll('.adv-period-btn[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      advReport.period = btn.dataset.period;
      page.querySelectorAll('.adv-period-btn[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      page.querySelector('#advCustomRange').style.display = advReport.period === 'custom' ? 'flex' : 'none';
      refreshAdvReport();
    });
  });

  // Type buttons
  page.querySelectorAll('.adv-period-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      advReport.types = btn.dataset.type;
      page.querySelectorAll('.adv-period-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshAdvReport();
    });
  });

  // Year nav
  page.querySelector('#btnAdvPrevYear').addEventListener('click', () => { reportsYear--; page.querySelector('#advYearDisplay').textContent = reportsYear; refreshAdvReport(); });
  page.querySelector('#btnAdvNextYear').addEventListener('click', () => { reportsYear++; page.querySelector('#advYearDisplay').textContent = reportsYear; refreshAdvReport(); });

  // Custom dates
  page.querySelector('#advDateStart').addEventListener('change', e => { advReport.customStart = e.target.value; refreshAdvReport(); });
  page.querySelector('#advDateEnd').addEventListener('change', e => { advReport.customEnd = e.target.value; refreshAdvReport(); });

  // Category pills
  page.querySelectorAll('button.adv-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat;
      if (advReport.categories.includes(cat)) {
        if (advReport.categories.length === 1) return; // keep at least one
        advReport.categories = advReport.categories.filter(c => c !== cat);
        pill.classList.remove('active');
      } else {
        advReport.categories.push(cat);
        pill.classList.add('active');
      }
      refreshAdvReport();
    });
  });

  page.querySelector('#btnSelectAllCats').addEventListener('click', () => {
    advReport.categories = [...allCats];
    page.querySelectorAll('.adv-cat-pill').forEach(p => p.classList.add('active'));
    refreshAdvReport();
  });
  page.querySelector('#btnClearAllCats').addEventListener('click', () => {
    if (allCats.length > 0) { advReport.categories = [allCats[0]]; }
    page.querySelectorAll('button.adv-cat-pill').forEach((p,i) => p.classList.toggle('active', i===0));
    refreshAdvReport();
  });

  // Reset
  page.querySelector('#btnResetAdvFilters').addEventListener('click', () => {
    advReport = { period:'monthly', customStart:'', customEnd:'', categories:[...allCats], types:'all', chartView: advReport.chartView };
    renderReportsTab();
  });

  // Chart view tabs
  page.querySelectorAll('.adv-chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      advReport.chartView = tab.dataset.view;
      page.querySelectorAll('.adv-chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAdvMainChart();
    });
  });

  // Export buttons
  page.querySelector('#btnExportAdvCSV').addEventListener('click', () => exportAdvCSV());
  page.querySelector('#btnExportAdvPDF').addEventListener('click', () => exportAdvPDF());
  page.querySelector('#btnExportTable').addEventListener('click', () => exportAdvTableCSV());

  // Initial render
  refreshAdvReport();
}

async function refreshAdvReport() {
  const txs = getAdvancedTxs();
  const periodLabel = getPeriodLabel();
  const lbl = document.getElementById('advPeriodLabel');
  if (lbl) lbl.textContent = periodLabel;
  renderAdvKPIs(txs);
  await renderAdvMainChart();
  renderAdvSecondaryCharts(txs);
  renderAdvDetailTable(txs);
  renderForecastSection();
}

function renderAdvKPIs(txs) {
  const container = document.getElementById('advKpiRow');
  if (!container) return;
  const { income, expense, balance, count: totalTxCount } = calcTotals(txs);
  const savingsRate = income > 0 ? (balance / income * 100) : 0;
  const avgTx = totalTxCount > 0 ? expense / totalTxCount : 0;

  container.innerHTML = `
    <div class="adv-kpi-card income">
      <div class="adv-kpi-icon"><i class="fas fa-arrow-trend-up"></i></div>
      <div class="adv-kpi-body">
        <div class="adv-kpi-label">Total Receitas</div>
        <div class="adv-kpi-value">${fmt(income)}</div>
        <div class="adv-kpi-sub">${txs.filter(t=>t.value>0).length} transações</div>
      </div>
    </div>
    <div class="adv-kpi-card expense">
      <div class="adv-kpi-icon"><i class="fas fa-arrow-trend-down"></i></div>
      <div class="adv-kpi-body">
        <div class="adv-kpi-label">Total Despesas</div>
        <div class="adv-kpi-value">${fmt(expense)}</div>
        <div class="adv-kpi-sub">${txs.filter(t=>t.value<0).length} transações</div>
      </div>
    </div>
    <div class="adv-kpi-card balance ${balance>=0?'pos':'neg'}">
      <div class="adv-kpi-icon"><i class="fas fa-wallet"></i></div>
      <div class="adv-kpi-body">
        <div class="adv-kpi-label">Saldo do Período</div>
        <div class="adv-kpi-value">${fmt(balance)}</div>
        <div class="adv-kpi-sub">${balance>=0?'Superávit':'Déficit'}</div>
      </div>
    </div>
    <div class="adv-kpi-card savings">
      <div class="adv-kpi-icon"><i class="fas fa-piggy-bank"></i></div>
      <div class="adv-kpi-body">
        <div class="adv-kpi-label">Taxa de Poupança</div>
        <div class="adv-kpi-value">${savingsRate.toFixed(1)}%</div>
        <div class="adv-kpi-sub">Média: ${fmt(avgTx)}/despesa</div>
      </div>
    </div>
  `;
}

async function renderAdvMainChart() {
  await ensureChartJS();
  const txs = getAdvancedTxs();
  const canvas = document.getElementById('advMainChart');
  if (!canvas) return;
  if (chartInst.mainChart) { try { chartInst.mainChart.destroy(); } catch(e){} chartInst.mainChart = null; }
  const Chart = window.Chart;
  const commonTooltip = { padding:12, cornerRadius:10, callbacks:{ label: ctx => fmt(ctx.raw) } };

  if (advReport.chartView === 'bar-cat') {
    // Bar chart by category
    const catData = {};
    txs.filter(t => t.value < 0).forEach(t => { catData[t.category] = (catData[t.category]||0) + Math.abs(t.value); });
    const labels = Object.keys(catData).sort((a,b) => catData[b]-catData[a]);
    const data   = labels.map(l => catData[l]);
    chartInst.mainChart = new Chart(canvas, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Despesas', data, backgroundColor: CAT_COLORS.slice(0, labels.length), borderRadius:8, borderWidth:0 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:commonTooltip },
        scales:{ x:{ grid:{color:'rgba(0,0,0,0.04)'}, ticks:{callback:v=>'R$'+v} }, y:{ grid:{display:false} } }
      }
    });

  } else if (advReport.chartView === 'net-worth') {
    // Net worth evolution (cumulative all-time)
    const allTxs = loadData('transactions').sort((a,b) => parseDateISO(a.date)-parseDateISO(b.date));
    const netLabels = [], netData = [];
    let cum = 0;
    const monthly = {};
    allTxs.forEach(t => {
      const d = parseDateISO(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      monthly[key] = (monthly[key]||0) + t.value;
    });
    const sortedKeys = Object.keys(monthly).sort();
    sortedKeys.forEach(k => {
      cum += monthly[k];
      const [y,m] = k.split('-');
      netLabels.push(`${MONTH_SHORT[parseInt(m)-1]}/${y}`);
      netData.push(parseFloat(cum.toFixed(2)));
    });
    chartInst.mainChart = new Chart(canvas, {
      type:'line',
      data:{ labels:netLabels, datasets:[{ label:'Patrimônio Líquido', data:netData,
        borderColor:'#0055FF', backgroundColor:'rgba(37,99,235,0.08)',
        fill:true, tension:0.35, borderWidth:2.5, pointRadius:0, pointHoverRadius:5 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:commonTooltip },
        scales:{ x:{ grid:{display:false}, ticks:{ maxTicksLimit:8, font:{size:11} } }, y:{ grid:{color:'rgba(0,0,0,0.04)'}, ticks:{callback:v=>'R$'+v} } }
      }
    });

  } else if (advReport.chartView === 'doughnut') {
    const catData = {};
    txs.filter(t => t.value < 0).forEach(t => { catData[t.category] = (catData[t.category]||0) + Math.abs(t.value); });
    const labels = Object.keys(catData), data = Object.values(catData);
    chartInst.mainChart = new Chart(canvas, {
      type:'doughnut',
      data:{ labels: labels.length?labels:['Sem dados'], datasets:[{ data: data.length?data:[1], backgroundColor: CAT_COLORS.slice(0, Math.max(labels.length,1)), borderWidth:0, hoverOffset:6 }] },
      options:{ cutout:'60%', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'right', labels:{padding:16, font:{family:'Inter', size:12}}}, tooltip:commonTooltip }
      }
    });

  } else if (advReport.chartView === 'trend') {
    // Monthly income vs expense trend for the year
    const yearTxs = loadData('transactions').filter(t => parseDateISO(t.date).getFullYear() === reportsYear);
    const mInc = Array(12).fill(0), mExp = Array(12).fill(0);
    yearTxs.forEach(t => {
      const m = parseDateISO(t.date).getMonth();
      if (t.value > 0) mInc[m] += t.value; else mExp[m] += Math.abs(t.value);
    });
    chartInst.mainChart = new Chart(canvas, {
      type:'line',
      data:{ labels: MONTH_NAMES.map(m=>m.slice(0,3)),
        datasets:[
          { label:'Receitas', data:mInc, borderColor:'#00A86B', backgroundColor:'rgba(5,150,105,0.08)', fill:true, tension:0.4, borderWidth:2, pointRadius:3 },
          { label:'Despesas', data:mExp, borderColor:'#DC2626', backgroundColor:'rgba(220,38,38,0.06)', fill:true, tension:0.4, borderWidth:2, pointRadius:3 }
        ]
      },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top', labels:{font:{family:'Inter'}}}, tooltip:commonTooltip },
        scales:{ x:{grid:{display:false}}, y:{grid:{color:'rgba(0,0,0,0.04)'}, ticks:{callback:v=>'R$'+v}} }
      }
    });
  }
  if(canvas) { canvas.setAttribute('role','img'); canvas.setAttribute('aria-label','Gráfico principal de relatórios financeiros'); }
}

async function renderAdvSecondaryCharts(txs) {
  await ensureChartJS();
  if (chartInst.pie) { try{chartInst.pie.destroy();}catch(e){} chartInst.pie=null; }
  if (chartInst.bar) { try{chartInst.bar.destroy();}catch(e){} chartInst.bar=null; }
  const Chart = window.Chart;
  function setChartAria(canvas, label) { if(canvas) { canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',label); } }
  const commonTooltip = { padding:12, cornerRadius:10, callbacks:{ label: ctx => fmt(ctx.raw) } };

  // Pie
  const catData = {};
  txs.filter(t => t.value < 0).forEach(t => { catData[t.category] = (catData[t.category]||0) + Math.abs(t.value); });
  const pieLabels = Object.keys(catData), pieData = Object.values(catData);
  const pieCanvas = document.getElementById('advPieChart');
  if (pieCanvas) {
    chartInst.pie = new Chart(pieCanvas, {
      type:'doughnut',
      data:{ labels: pieLabels.length?pieLabels:['Sem dados'], datasets:[{ data:pieLabels.length?pieData:[1], backgroundColor:CAT_COLORS.slice(0, Math.max(pieLabels.length,1)), borderWidth:0, hoverOffset:4 }] },
      options:{ cutout:'65%', responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom', labels:{padding:12, font:{family:'Inter',size:11}}}, tooltip:commonTooltip } }
    });
    setChartAria(pieCanvas, 'Gráfico de pizza: distribuição de gastos por categoria no ano');
  }

  // Bar year trend
  const yearTxs = loadData('transactions').filter(t => parseDateISO(t.date).getFullYear() === reportsYear);
  const mInc2 = Array(12).fill(0), mExp2 = Array(12).fill(0);
  yearTxs.forEach(t => { const m=parseDateISO(t.date).getMonth(); if(t.value>0) mInc2[m]+=t.value; else mExp2[m]+=Math.abs(t.value); });
  const barCanvas = document.getElementById('advBarChart');
  if (barCanvas) {
    chartInst.bar = new Chart(barCanvas, {
      type:'bar',
      data:{ labels:MONTH_NAMES.map(m=>m.slice(0,3)), datasets:[
        { label:'Receitas', data:mInc2, backgroundColor:'rgba(5,150,105,0.8)', borderRadius:4 },
        { label:'Despesas', data:mExp2, backgroundColor:'rgba(220,38,38,0.75)', borderRadius:4 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top', labels:{font:{family:'Inter',size:11}}}, tooltip:commonTooltip },
        scales:{ x:{grid:{display:false}}, y:{grid:{color:'rgba(0,0,0,0.04)'}, ticks:{callback:v=>'R$'+v}} }
      }
    });
    setChartAria(barCanvas, 'Gráfico de barras: receitas vs despesas mensais no ano');
  }
}

function renderAdvDetailTable(txs) {
  const tbody = document.getElementById('advDetailTable');
  if (!tbody) return;
  const cats = [...new Set(txs.map(t => t.category))].sort();
  const total = txs.reduce((s,t) => s + Math.abs(t.value), 0);
  if (!cats.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum dado para o período selecionado.</td></tr>`; return; }
  tbody.innerHTML = cats.map(cat => {
    const catTxs = txs.filter(t => t.category === cat);
    const ct = calcTotals(catTxs);
    const pct  = total > 0 ? (Math.abs(ct.balance)/total*100).toFixed(1) : '0.0';
    return `<tr>
      <td style="font-weight:600;">${cat}</td>
      <td>${ct.count}</td>
      <td class="positive-value">${ct.income>0?fmt(ct.income):'-'}</td>
      <td class="negative-value">${ct.expense>0?fmt(ct.expense):'-'}</td>
      <td style="font-weight:700;color:${ct.balance>=0?'var(--success)':'var(--danger)'};">${fmt(ct.balance)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:6px;background:var(--bg-light);border-radius:2px;overflow:hidden;">
            <div style="width:${Math.min(parseFloat(pct),100)}%;height:100%;background:var(--rattio-blue);border-radius:2px;"></div>
          </div>
          <span style="font-size:11px;font-weight:700;color:var(--text-muted);min-width:35px;">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function renderForecastSection() {
  await ensureChartJS();
  const histSel = document.getElementById('histSel');
  const projSel = document.getElementById('projSel');
  if (!histSel || !projSel) return;
  const doForecast = () => {
    const fM = parseInt(projSel.value), hM = parseInt(histSel.value);
    const {predictions} = forecastCashFlow(fM, hM);
    const tbody = document.getElementById('forecastBody');
    if (tbody) tbody.innerHTML = predictions.map(p=>`<tr><td style="font-weight:600;">${p.label}</td><td class="positive-value">${fmt(p.income)}</td><td class="negative-value">${fmt(p.expense)}</td><td style="font-weight:700;color:${p.balance<0?'var(--danger)':'var(--text-main)'};">${fmt(p.balance)}</td></tr>`).join('');
    const fa = document.getElementById('forecastAlerts');
    if (fa) fa.innerHTML = predictions.some(p=>p.isDeficit)
      ? `<div class="alert-item danger"><i class="fas fa-exclamation-triangle"></i><div><strong>Déficit previsto!</strong> Sua projeção indica saldo negativo em um ou mais meses.</div></div>`
      : `<div class="alert-item info" style="background:var(--accent-light);border-color:#A7F3D0;color:var(--accent-dark-green);"><i class="fas fa-check-circle"></i><div><strong>Projeção positiva!</strong> Tendência de crescimento financeiro.</div></div>`;
    if (chartInst.forecast) { try{chartInst.forecast.destroy();}catch(e){} chartInst.forecast=null; }
    const fc = document.getElementById('forecastCanvas');
    if (fc) {
      chartInst.forecast = new Chart(fc, {
        type:'line',
        data:{ labels:predictions.map(p=>p.label), datasets:[{ label:'Saldo Previsto', data:predictions.map(p=>p.balance), borderColor:'#7C3AED', backgroundColor:'rgba(124,58,237,0.07)', fill:true, tension:0.4, borderWidth:2.5, pointBackgroundColor:'#7C3AED', pointRadius:4 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ padding:12, cornerRadius:10, callbacks:{ label:ctx=>fmt(ctx.raw) } } }, scales:{ x:{grid:{display:false}}, y:{grid:{color:'rgba(0,0,0,0.04)'}, ticks:{callback:v=>'R$'+v}} } }
      });
      fc.setAttribute('role','img');
      fc.setAttribute('aria-label','Gráfico de linha: previsão de saldo financeiro');
    }
  };
  doForecast();
  histSel.addEventListener('change', doForecast);
  projSel.addEventListener('change', doForecast);
}

// ── CSV Export ──
function exportAdvCSV() {
  const txs = getAdvancedTxs();
  // FIX BUG 4: Build CSV with filter metadata header
  const cards = loadData('cards');
  const periodLabel = getPeriodLabel();
  const typeLabel = advReport.types === 'all' ? 'Todos' : advReport.types === 'income' ? 'Receitas' : 'Despesas';
  const allCats = loadData('categories');
  const catLabel = advReport.categories.length >= allCats.length ? 'Todas' : advReport.categories.join(', ');
  const metaLines = [
    `Relatório: ${periodLabel}`,
    `Tipo: ${typeLabel}`,
    `Categorias: ${catLabel}`,
    `Total de transações: ${txs.length}`,
    '' // blank line before data
  ];
  const rows = txs.map(t => {
    const c = t.cardId ? cards.find(x => x.id === t.cardId) : null;
    return [
      `"${new Date(t.date).toLocaleDateString('pt-BR')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      (t.value > 0 ? 'Receita' : 'Despesa'),
      Math.abs(t.value).toFixed(2).replace('.', ','),
      `"${c ? 'Crédito - ' + c.name : t.paymentMethod || ''}"`
    ].join(';');
  });
  const csv = '\uFEFF' + metaLines.join('\n') + ['Data;Descrição;Categoria;Tipo;Valor;Pagamento', ...rows].join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rattio_relatorio_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// FIX BUG 3: Export category summary table (not raw transactions)
function exportAdvTableCSV() {
  const txs = getAdvancedTxs();
  const cats = [...new Set(txs.map(t => t.category))].sort();
  const grandTotal = calcTotals(txs);
  const periodLabel = getPeriodLabel();
  const rows = cats.map(cat => {
    const ct = calcTotals(txs.filter(t => t.category === cat));
    const pct  = grandTotal.expense > 0 ? (ct.expense/grandTotal.expense*100).toFixed(1).replace('.',',') : '0,0';
    return [`"${cat}"`, ct.count, ct.income.toFixed(2).replace('.',','), ct.expense.toFixed(2).replace('.',','), ct.balance.toFixed(2).replace('.',','), pct+'%'].join(';');
  });
  // Add total row
  rows.push([`"TOTAL"`, grandTotal.count, grandTotal.income.toFixed(2).replace('.',','), grandTotal.expense.toFixed(2).replace('.',','), grandTotal.balance.toFixed(2).replace('.',','), '100,0%'].join(';'));
  const csv = '\uFEFF' + `Relatório: ${periodLabel}\n` + ['Categoria;Transações;Receitas;Despesas;Saldo;% Total', ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rattio_categorias_${periodLabel.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ──
async function exportAdvPDF() {
  try {
    await ensureJsPDF();
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { showToast('Biblioteca PDF não carregada', 'error'); return; }
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const txs = getAdvancedTxs();
    const { income, expense, balance } = calcTotals(txs);
    const periodLabel = getPeriodLabel();
    const now = new Date().toLocaleDateString('pt-BR');

    // ── Header ──
    doc.setFillColor(27, 42, 74);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.setFont('helvetica','bold');
    doc.text('Rattio', 15, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.text('Controle Financeiro Inteligente', 15, 25);
    doc.setFontSize(9);
    doc.text(`Relatório: ${periodLabel}   |   Gerado em: ${now}`, 15, 33);

    // ── KPI Summary ──
    doc.setTextColor(27,42,74);
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text('Resumo do Período', 15, 50);

    const kpis = [
      { label:'Receitas', value:fmt(income), color:[5,150,105] },
      { label:'Despesas', value:fmt(expense), color:[220,38,38] },
      { label:'Saldo', value:fmt(balance), color: balance>=0?[5,150,105]:[220,38,38] },
      { label:'Transações', value:String(txs.length), color:[37,99,235] },
    ];
    kpis.forEach((kpi, i) => {
      const x = 15 + (i * 47);
      doc.setFillColor(248,250,252);
      doc.roundedRect(x, 55, 43, 22, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.setTextColor(100,116,139);
      doc.text(kpi.label, x+4, 63);
      doc.setFontSize(11);
      doc.setFont('helvetica','bold');
      doc.setTextColor(...kpi.color);
      doc.text(kpi.value, x+4, 72);
    });

    // ── Detail table ──
    doc.setTextColor(27,42,74);
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.text('Detalhamento por Categoria', 15, 90);

    const cats = [...new Set(txs.map(t=>t.category))].sort();
    const grandTotal = calcTotals(txs);
    const tableRows = cats.map(cat => {
      const ct = calcTotals(txs.filter(t=>t.category===cat));
      const pct  = grandTotal.expense > 0 ? (ct.expense/grandTotal.expense*100).toFixed(1)+'%' : '0%';
      return [cat, ct.count.toString(), fmt(ct.income), fmt(ct.expense), fmt(ct.balance), pct];
    });

    if (doc.autoTable) {
      doc.autoTable({
        startY: 94,
        head: [['Categoria','Qtd','Receitas','Despesas','Saldo','% Total']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor:[27,42,74], textColor:255, fontStyle:'bold', fontSize:9 },
        bodyStyles: { fontSize:8, textColor:[30,30,30] },
        alternateRowStyles: { fillColor:[248,250,252] },
        columnStyles: { 0:{fontStyle:'bold'}, 5:{halign:'center'} },
        margin: { left:15, right:15 },
      });
    }

    // ── Transactions list ──
    // FIX BUG 2: Remove .slice(0,50) limit — autoTable handles page breaks automatically
    // Add new page if remaining space is too small
    let txStartY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 150;
    if (txStartY > 250) { doc.addPage(); txStartY = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.setTextColor(27,42,74);
    const sortedTxs = txs.slice().sort((a,b)=>parseDateISO(b.date)-parseDateISO(a.date));
    doc.text(`Transações do Período (${sortedTxs.length})`, 15, txStartY);
    const txRows = sortedTxs.map(t=>[
      fmtDate(t.date), t.description.slice(0,35), t.category, fmt(Math.abs(t.value)), t.value>0?'Receita':'Despesa'
    ]);
    if (doc.autoTable) {
      doc.autoTable({
        startY: txStartY + 4,
        head: [['Data','Descrição','Categoria','Valor','Tipo']],
        body: txRows,
        theme:'striped',
        headStyles: { fillColor:[37,99,235], textColor:255, fontStyle:'bold', fontSize:8 },
        bodyStyles: { fontSize:7.5 },
        margin: { left:15, right:15 },
        didParseCell: function(data) {
          // Color income green, expense red in the Valor column
          if (data.section === 'body' && data.column.index === 3) {
            const tipo = data.row.raw[4];
            if (tipo === 'Receita') data.cell.styles.textColor = [5,150,105];
            else data.cell.styles.textColor = [220,38,38];
          }
          // Color Tipo column
          if (data.section === 'body' && data.column.index === 4) {
            const tipo = data.cell.raw;
            if (tipo === 'Receita') { data.cell.styles.textColor = [5,150,105]; data.cell.styles.fontStyle = 'bold'; }
            else { data.cell.styles.textColor = [220,38,38]; data.cell.styles.fontStyle = 'bold'; }
          }
        },
      });
    }

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i=1; i<=pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(148,163,184);
      doc.text(`Rattio — rattio.app   |   Página ${i} de ${pageCount}`, 15, 292);
    }
    doc.save(`rattio_relatorio_${periodLabel.replace(/\s/g,'_')}_${now.replace(/\//g,'-')}.pdf`);
    showToast('PDF exportado com sucesso!');
  } catch(e) {
    console.error('PDF error:', e);
    showToast('Erro ao exportar PDF. Tente o CSV.', 'error');
  }
}

// ============================
// CONFIGURATIONS TAB
// ============================
function makeConfigSection(id, icon, iconColor, iconBg, title, bodyHtml) {
  return `
    <div class="config-section" id="csec-${id}">
      <div class="config-section-header" data-action="toggle-config-section" data-id="${id}">
        <div class="config-section-header-left">
          <div class="section-icon" style="color:${iconColor};background:${iconBg};">${icon}</div>
          <h2>${title}</h2>
        </div>
        <i class="fas fa-chevron-down config-chevron" id="cchev-${id}"></i>
      </div>
      <div class="config-section-body" id="cbody-${id}">${bodyHtml}</div>
    </div>`;
}

function buildCatsConfigHTML() {
  return `<div class="u-mt-16"><form id="catForm" class="row" style="gap:10px;flex-wrap:nowrap;margin-bottom:16px;"><input type="text" id="newCatInput" placeholder="Nova categoria..." style="flex:1;" aria-label="Nova categoria"><button class="btn" type="submit" style="background:var(--violet);"><i class="fas fa-plus"></i></button></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Nome</th><th>Ações</th></tr></thead><tbody id="catsBody"></tbody></table></div></div>`;
}

function buildSalaryConfigHTML(st) {
  return `<div class="u-mt-16"><form id="settingsForm" style="background:var(--bg-light);padding:20px;border-radius:3px;border:1px solid var(--border-color);"><div class="form-grid"><div class="form-group"><label for="salaryValue">Valor do Salário (R$)</label><input id="salaryValue" type="number" step="0.01" value="${st.salaryValue||0}"></div><div class="form-group"><label for="salaryDay">Dia do Pagamento</label><input id="salaryDay" type="number" min="1" max="31" value="${st.salaryDay||5}"></div></div><div class="row" class="u-flex-end u-mt-16"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar</button></div></form></div>`;
}

function buildCardsConfigHTML() {
  return `<div class="u-mt-16"><form id="cardForm" style="background:var(--bg-light);padding:20px;border-radius:3px;border:1px solid var(--border-color);margin-bottom:18px;"><input type="hidden" id="cardId"><div class="form-grid"><div class="form-group"><label for="cardName">Nome</label><input id="cardName" type="text" placeholder="Ex: Nubank" required></div><div class="form-group"><label for="cardColor">Cor</label><input id="cardColor" type="color" value="#8b5cf6"></div><div class="form-group"><label for="cardClosing">Dia de Fechamento</label><input id="cardClosing" type="number" min="1" max="31" required></div><div class="form-group"><label for="cardDue">Dia de Vencimento</label><input id="cardDue" type="number" min="1" max="31" required></div><div class="form-group"><label for="cardLimit">Limite (R$)</label><input id="cardLimit" type="number" step="0.01" placeholder="Ex: 5000.00" required></div></div><div class="row" class="u-flex-end u-mt-16"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar</button></div></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Nome</th><th>Fechamento</th><th>Vencimento</th><th>Limite</th><th>Ações</th></tr></thead><tbody id="cardsBody"></tbody></table></div></div>`;
}

function buildPaymentMethodsConfigHTML() {
  return `<div class="u-mt-16"><form id="pmFormConfig" class="row" style="gap:10px;flex-wrap:nowrap;margin-bottom:16px;"><input type="text" id="newPmInput" placeholder="Nova forma de pagamento..." style="flex:1;"><button class="btn" type="submit" style="background:#0ea5e9;"><i class="fas fa-plus"></i></button></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Nome</th><th>Ações</th></tr></thead><tbody id="pmsBody"></tbody></table></div></div>`;
}

function buildFinancingConfigHTML() {
  return `<div class="u-mt-16"><form id="financingForm" style="background:var(--bg-light);padding:20px;border-radius:3px;border:1px solid var(--border-color);margin-bottom:18px;"><input type="hidden" id="financingId"><div class="form-grid"><div class="form-group"><label for="financingDesc">Descrição</label><input id="financingDesc" type="text" placeholder="Ex: Financiamento Carro" required></div><div class="form-group"><label for="financingTotal">Valor Total (R$)</label><input id="financingTotal" type="number" step="0.01" placeholder="Ex: 50000" required></div><div class="form-group"><label for="financingCount">Nº de Parcelas</label><input id="financingCount" type="number" min="1" placeholder="Ex: 60" required></div><div class="form-group"><label for="financingPaid">Parcelas já pagas</label><input id="financingPaid" type="number" min="0" value="0" placeholder="Ex: 12"></div><div class="form-group"><label for="financingInstallment">Valor da Parcela (calculado)</label><input id="financingInstallment" type="number" step="0.01" placeholder="Calculado automaticamente" readonly style="background:#f1f5f9;"></div></div><div class="row" class="u-flex-end u-mt-16"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar Financiamento</button></div></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Descrição</th><th>Total</th><th>Progresso</th><th>Saldo Devedor</th><th>Ações</th></tr></thead><tbody id="financingsBody"></tbody></table></div></div>`;
}

function buildRulesConfigHTML() {
  return `<div class="u-mt-16"><form id="ruleForm" style="background:var(--bg-light);padding:20px;border-radius:3px;border:1px solid var(--border-color);margin-bottom:18px;"><input type="hidden" id="ruleId"><div class="form-grid"><div class="form-group"><label for="ruleKeyword">Palavra-chave</label><input id="ruleKeyword" type="text" placeholder="Ex: Uber, Mercado" required></div><div class="form-group"><label for="ruleCategory">Categoria</label><select id="ruleCategory"></select></div><div class="form-group"><label for="ruleType">Tipo</label><select id="ruleType"><option value="">Nenhum</option><option value="income">Receita</option><option value="expense">Despesa</option></select></div><label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:#fff;padding:12px 14px;border:1.5px solid var(--border-color);border-radius:2px;font-weight:700;font-size:13.5px;align-self:end;"><input type="checkbox" id="ruleFixed"> Marcar como Fixa</label></div><div class="row" class="u-flex-end u-mt-16"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar</button></div></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Palavra</th><th>Categoria</th><th>Tipo</th><th>Fixa?</th><th>Ações</th></tr></thead><tbody id="rulesBody"></tbody></table></div></div>`;
}

function buildTemplatesConfigHTML() {
  return `<div class="u-mt-16"><form id="tplForm" style="background:var(--bg-light);padding:20px;border-radius:3px;border:1px solid var(--border-color);margin-bottom:16px;"><input type="hidden" id="tplId"><div class="form-grid"><div class="form-group"><label for="tplDesc">Descrição</label><input id="tplDesc" type="text" placeholder="Ex: Aluguel" required></div><div class="form-group"><label for="tplValue">Valor (R$)</label><input id="tplValue" type="number" step="0.01" required></div><div class="form-group"><label for="tplCat">Categoria</label><select id="tplCat"></select></div><div class="form-group"><label for="tplPM">Forma de Pagamento</label><select id="tplPM"></select></div></div><div class="row" class="u-flex-end u-mt-16"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar</button></div></form><div class="table-responsive"><table class="data-table"><thead><tr><th>Descrição</th><th>Valor</th><th>Categoria</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody id="tplsBody"></tbody></table></div></div>`;
}

function buildBackupConfigHTML() {
  return makeConfigSection('exportimport','<i class="fas fa-download"></i>','var(--success)','var(--accent-light)','Exportar / Importar',`<div style="padding-top:16px;display:flex;flex-direction:column;gap:10px;"><button class="btn" id="btnExportJSON" style="background:#1e293b;"><i class="fas fa-file-export"></i> Exportar Backup (JSON)</button><button class="btn secondary" id="btnExportCSVAll"><i class="fas fa-file-csv"></i> Exportar Transações (CSV)</button><div style="height:1px;background:var(--border-color);margin:4px 0;"></div><input type="file" id="importFile" accept=".json" style="display:none;"><button class="btn secondary" id="btnImportJSON" style="border-color:var(--info);color:var(--info);"><i class="fas fa-file-import"></i> Restaurar Backup (JSON)</button><button class="btn secondary" id="btnImportCSV" style="border-color:var(--success);color:var(--success);"><i class="fas fa-file-csv"></i> Importar Fatura de Cartão</button></div>`) +
    makeConfigSection('autobackups','<i class="fas fa-clock-rotate-left"></i>','var(--text-muted)','var(--bg-light)','Backups Automáticos',`<div class="u-mt-16"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><span id="lastBackupIndicator" class="hint" style="font-size:12px;"><i class="fas fa-clock"></i> ${localStorage.getItem(LS+'lastBackup')?'Último backup: '+localStorage.getItem(LS+'lastBackup'):'Nenhum backup registrado ainda.'}</span><button class="btn small secondary" id="btnManualBackup"><i class="fas fa-save"></i> Salvar Agora</button></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Data/Hora</th><th>Ações</th></tr></thead><tbody id="backupsBody"></tbody></table></div></div>`) +
    makeConfigSection('changelog','<i class="fas fa-history"></i>','#b45309','#fef3c7','Histórico de Alterações',`<div class="u-mt-16"><div class="row" style="gap:12px;margin-bottom:16px;background:#fff;padding:14px;border-radius:1px;border:1px solid #fde68a;"><div class="form-group" style="flex:1;"><label for="clFilterEntity">Entidade</label><select id="clFilterEntity"><option value="">Todas</option><option value="transaction">Transações</option><option value="budget">Orçamentos</option><option value="goal">Metas</option><option value="card">Cartões</option></select></div><div class="form-group" style="flex:1;"><label for="clFilterStart">De</label><input type="date" id="clFilterStart"></div><div class="form-group" style="flex:1;"><label for="clFilterEnd">Até</label><input type="date" id="clFilterEnd"></div><div class="form-group" style="flex:0;"><label aria-hidden="true">&nbsp;</label><button class="btn" style="background:var(--warning);color:#fff;height:44px;" id="btnFilterChangelog"><i class="fas fa-filter"></i></button></div></div><div class="row" style="justify-content:flex-end;gap:8px;margin-bottom:14px;"><button class="btn secondary small" id="btnExportChangelog"><i class="fas fa-file-csv"></i> Exportar</button><button class="btn small" style="background:var(--danger);color:#fff;" id="btnClearChangelog"><i class="fas fa-trash"></i> Limpar</button></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Data/Hora</th><th>Entidade</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody id="changelogBody"></tbody></table></div></div>`) +
    makeConfigSection('onboarding','<i class="fas fa-rocket"></i>','var(--info)','var(--info-light)','Onboarding',`<div class="u-mt-16"><p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">Reviva a experiência de configuração inicial. Útil para demonstrações ou reconfigurar rapidamente.</p><button class="btn secondary" id="btnResetOnboarding" style="border-color:var(--info);color:var(--info);"><i class="fas fa-rocket"></i> Reiniciar Onboarding</button></div>`);
}
