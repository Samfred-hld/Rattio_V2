function renderBudgetsTab() {
  const page=document.getElementById('budgetsPage'); page.innerHTML='';
  let budgets=loadData('budgets'); budgets.forEach(b=>{ if(!b.id) b.id=genId(); });

  page.innerHTML=`
    <div class="section"><div class="section-header"><div class="section-header-left"><div class="section-icon"><i class="fas fa-list-ul"></i></div><h2>Orçamentos Ativos</h2></div><button class="btn small" id="btnNewBudget"><i class="fas fa-plus"></i> Novo Orçamento</button></div>
      <div class="table-responsive"><table class="data-table"><thead><tr><th>Categoria</th><th>Limite</th><th>Gasto (Mês)</th><th>Progresso</th><th>Ações</th></tr></thead><tbody id="budgetsBody"></tbody></table></div>
    </div>
    <!-- Budget inline form (hidden by default) -->
    <div id="budgetFormCard" class="section hidden"><div class="section-header"><div class="section-header-left"><div class="section-icon"><i class="fas fa-sliders"></i></div><h2 id="budgetFormTitle">Novo Orçamento</h2></div><button class="btn secondary small" id="btnCancelBudget"><i class="fas fa-times"></i> Cancelar</button></div>
      <form id="budgetForm" style="background:var(--bg-light);padding:22px;border-radius:3px;border:1px solid var(--border-color);">
        <input type="hidden" id="budgetId">
        <div class="form-grid">
          <div class="form-group"><label for="budgetCategory">Categoria</label><select id="budgetCategory"></select></div>
          <div class="form-group"><label for="budgetLimit">Limite Mensal (R$)</label><input type="number" id="budgetLimit" step="0.01" placeholder="0,00" required aria-required="true"></div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:18px;"><button class="btn" type="submit"><i class="fas fa-check"></i> Salvar</button></div>
      </form>
    </div>
  `;

  const budCat=page.querySelector('#budgetCategory'); loadData('categories').forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; budCat.appendChild(o); });
  const formCard=page.querySelector('#budgetFormCard');
  page.querySelector('#btnNewBudget').addEventListener('click',()=>{ formCard.classList.remove('hidden'); page.querySelector('#budgetFormTitle').textContent='Novo Orçamento'; page.querySelector('#budgetId').value=''; page.querySelector('#budgetForm').reset(); formCard.scrollIntoView({behavior:'smooth'}); });
  page.querySelector('#btnCancelBudget').addEventListener('click',()=>{ formCard.classList.add('hidden'); });

  const refresh=()=>{
    renderTablePaginated(budgets,'budgetsBody','budgets',50,(b)=>{ const spent=getCatTotal(b.category,currentMonth,currentYear), pct=b.limit>0?(spent/b.limit)*100:0, color=pct>=100?'var(--danger)':pct>=80?'var(--warning)':'var(--accent-green)'; const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${b.category}</td><td>${fmt(b.limit)}</td><td>${fmt(spent)}</td><td style="min-width:120px;"><div class="progress-wrap" style="margin-bottom:4px;"><div class="progress-fill" style="width:${Math.min(pct,100)}%;background:${color};"></div></div><span style="font-size:12px;font-weight:700;color:var(--text-muted);">${pct.toFixed(0)}%</span></td><td class="actions"><button class="action-button history" data-id="${b.id}" title="Histórico" aria-label="Histórico de ${escapeHtml(b.category)}"><i class="fas fa-history"></i></button><button class="action-button edit" data-id="${b.id}" title="Editar" aria-label="Editar ${escapeHtml(b.category)}"><i class="fas fa-pencil-alt"></i></button><button class="action-button delete" data-id="${b.id}" title="Excluir" aria-label="Excluir ${escapeHtml(b.category)}"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{
      const body=document.getElementById('budgetsBody'); if(!body) return;
      body.querySelectorAll('.edit').forEach(b2=>b2.addEventListener('click',e=>{ const b=budgets.find(x=>x.id===e.currentTarget.dataset.id); if(b){page.querySelector('#budgetFormTitle').textContent='Editar Orçamento';page.querySelector('#budgetId').value=b.id;budCat.value=b.category;page.querySelector('#budgetLimit').value=b.limit;formCard.classList.remove('hidden');formCard.scrollIntoView({behavior:'smooth'});} }));
      body.querySelectorAll('.delete').forEach(b2=>b2.addEventListener('click',e=>{ const id=e.currentTarget.dataset.id, b=budgets.find(x=>x.id===id); showConfirm(`Excluir orçamento de "<b>${b?.category}</b>"?`,()=>{ logChange('budget',id,'DELETE',b,null); budgets=budgets.filter(x=>x.id!==id); window._dataCache['budgets']=budgets; saveAll(); invalidateCalcCache(); refresh(); }); }));
      bindHistoryButtons('budgetsBody','budget');
    });
  };
  refresh();
  page.querySelector('#budgetForm').addEventListener('submit',async e=>{
    e.preventDefault(); const btn=e.submitter||e.target.querySelector('button[type="submit"]');
    const id=page.querySelector('#budgetId').value||genId(), cat=budCat.value, lim=parseFloat(page.querySelector('#budgetLimit').value);
    if(!cat||isNaN(lim)){showToast('Preencha corretamente.','error');return;}
    btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
    const ex=budgets.find(b=>b.id===id);
    if(ex){
      const old={...ex}; ex.category=cat; ex.limit=lim; logChange('budget',id,'UPDATE',old,ex);
      window._dataCache['budgets']=budgets; saveAll(); invalidateCalcCache();
      btn.disabled=false; btn.innerHTML='<i class="fas fa-check"></i> Salvar';
      formCard.classList.add('hidden'); page.querySelector('#budgetId').value=''; refresh();
      showToastWithUndo('Orçamento editado', () => {
        const b = loadData('budgets').find(x=>x.id===id);
        if(b){ Object.assign(b, old); saveAll(); invalidateCalcCache(); refresh(); }
      });
    }else{
      const nb={id,category:cat,limit:lim}; budgets.push(nb); logChange('budget',id,'CREATE',null,nb);
      window._dataCache['budgets']=budgets; saveAll(); invalidateCalcCache();
      btn.disabled=false; btn.innerHTML='<i class="fas fa-check"></i> Salvar';
      showToast('Orçamento salvo!'); formCard.classList.add('hidden'); page.querySelector('#budgetId').value=''; refresh();
    }
  });
}

// ============================
// GOAL DEPOSIT MODAL (M-02)
// ============================
function openDepositModal(goal) {
  // Build simple modal dynamically
  let existing = document.getElementById('depositModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'depositModal';
  modal.className = 'modal open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'depositModalTitle');
  modal.innerHTML = `
    <div class="modal-content" style="max-width:420px;">
      <button class="modal-close" data-action="remove-dynamic-modal" data-id="depositModal" aria-label="Fechar"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="depositModalTitle"><i class="fas fa-piggy-bank" style="color:var(--info)"></i> Aportar em: ${goal.name}</h3>
      <form id="depositForm" style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-group">
          <label for="depositValue">Valor do Aporte (R$) <span class="required-asterisk">*</span></label>
          <input type="number" id="depositValue" step="0.01" placeholder="0,00" min="0.01" required autofocus aria-required="true">
        </div>
        <div class="form-group">
          <label for="depositDate">Data</label>
          <input type="date" id="depositDate" value="${fmtDateISO(new Date())}">
        </div>
        <div class="form-group">
          <label for="depositDesc">Descrição</label>
          <input type="text" id="depositDesc" value="Aporte - ${goal.name}" placeholder="Descrição do aporte">
        </div>
        <div class="row" style="justify-content:flex-end;gap:12px;border-top:1px solid var(--border-color);padding-top:16px;">
          <button type="button" class="btn secondary" data-action="remove-dynamic-modal" data-id="depositModal">Cancelar</button>
          <button type="submit" class="btn" style="background:var(--info);"><i class="fas fa-check"></i> Confirmar Aporte</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.getElementById('depositForm').addEventListener('submit', e => {
    e.preventDefault();
    const val = parseFloat(document.getElementById('depositValue').value);
    const date = document.getElementById('depositDate').value || fmtDateISO(new Date());
    const desc = document.getElementById('depositDesc').value.trim() || `Aporte - ${goal.name}`;
    if(isNaN(val)||val<=0) { showToast('Valor inválido','error'); return; }
    const txs = loadData('transactions');
    const o = buildTxObj({id:genId(),date,description:desc,value:-Math.abs(val),category:'Investimentos',paymentMethod:'Transferência',isFixedExpense:false,isInstallment:false,goalId:goal.id});
    txs.push(o); logChange('transaction',o.id,'CREATE',null,o);
    saveAll(); invalidateCalcCache();
    modal.remove();
    showToast(`Aporte de ${fmt(val)} registrado!`);
    renderActiveTab();
  });
}

// ============================
// GOALS TAB — INVESTMENTS + SAVINGS GOALS
// ============================
