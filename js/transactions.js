function handleTransactionSubmit() {
  if(!validateForm()) return { success: false };
  const id=document.getElementById('transactionId').value||null;
  const type=document.querySelector('input[name="transactionType"]:checked').value;
  const description=document.getElementById('transactionDescription').value.trim();
  const value=parseFloat(document.getElementById('transactionValue').value);
  const date=document.getElementById('transactionDate').value;
  let category=document.getElementById('transactionCategory').value;
  const pm=document.getElementById('transactionPaymentMethod').value;
  const isCredit=pm.startsWith('Crédito');
  const isInstShown=isCredit && !document.getElementById('installmentDetails').classList.contains('hidden');
  const count=isInstShown?parseInt(document.getElementById('installmentCount').value):null;
  const sel=document.getElementById('transactionPaymentMethod'); const cardId=sel.options[sel.selectedIndex]?.dataset?.cardId||null;
  const goalId=category==='Investimentos'&&type==='expense'?document.getElementById('investmentGoalSelect').value:null;
  const recCheck=document.getElementById('txRecurring');
  const recFreq=document.getElementById('txRecurringFreq')?.value;
  const recurring = (recCheck?.checked && recFreq) ? recFreq : null;
  const rr=applyRules(description,category,type,false); category=rr.category; const finalFixed=rr.isFixedExpense;
  const txs=loadData('transactions');
  // UX-01: Aviso de limite de cartão
  if(cardId) {
    const card=loadData('cards').find(c=>c.id===cardId);
    if(card && card.limit>0) {
      const totalSpent=txs.filter(t=>t.cardId===cardId&&t.value<0).reduce((s,t)=>s+Math.abs(t.value),0);
      const newTotal=totalSpent+Math.abs(value);
      if(newTotal>card.limit) showToast(`⚠️ ${h(card.name)}: limite excedido em ${fmt(newTotal-card.limit)}!`,'error');
      else if(newTotal>card.limit*0.9) showToast(`⚠️ ${h(card.name)}: ${fmt(card.limit-newTotal)} restantes do limite.`,'error');
    }
  }
  if(!id){
    if(isInstShown&&type==='expense') {
      createInstallmentSeries({description,date,perInstallmentValue:value,count,category,paymentMethod:pm,cardId,isFixed:finalFixed,goalId});
    } else {
    const effectiveDate = date;
    const o=buildTxObj({id:genId(),date:effectiveDate,description,value:type==='income'?Math.abs(value):-Math.abs(value),category,paymentMethod:pm,isFixedExpense:finalFixed,isInstallment:false,cardId,goalId,recurring});
      txs.push(o); logChange('transaction',o.id,'CREATE',null,o);
    }
    saveAll(); invalidateCalcCache(); updateAutocompleteList(); return { success: true, isCreate: true };
  } else {
    const ex=txs.find(t=>t.id===id); if(!ex){return { success: false };}
    let undoItems = [];
    if(ex.isInstallment&&ex.parentId){
      const editScope = document.querySelector('input[name="editScope"]:checked')?.value || 'single';
      if(editScope === 'single'){
        // Edit only this installment — break it out of the series
        const old={...ex}; undoItems.push({ id: ex.id, old });
        ex.description=description||ex.description; ex.date=date||ex.date; ex.category=category||ex.category; ex.paymentMethod=pm||ex.paymentMethod; ex.isFixedExpense=finalFixed; if(cardId!==null) ex.cardId=cardId;
        if(goalId) ex.goalId=goalId;
        ex.value=-(Math.abs(value));
        logChange('transaction',ex.id,'UPDATE',old,ex);
      } else {
        // forward: from this one onwards; all: from the beginning
        const sId=ex.parentId, fromIdx = editScope === 'all' ? 1 : (ex.installmentIndex||1);
        txs.filter(t=>t.parentId===sId).sort((a,b)=>(a.installmentIndex||1)-(b.installmentIndex||1)).forEach(t=>{
          if((t.installmentIndex||1)>=fromIdx){ const old={...t}; undoItems.push({ id: t.id, old }); t.description=withInstSuffix(description,t.installmentIndex,count||ex.installmentCount); t.category=category||t.category; t.paymentMethod=pm||t.paymentMethod; if(cardId!==null) t.cardId=cardId; t.isFixedExpense=finalFixed;
            if(date){ const diff=(t.installmentIndex||1)-fromIdx; t.date=addMonthsISO(date,diff); }
            if(isInstShown&&count){t.installmentCount=count;t.value=-(Math.abs(value));} logChange('transaction',t.id,'UPDATE',old,t); }
        });
      }
    } else {
      const old={...ex}; undoItems.push({ id: ex.id, old }); ex.description=description||ex.description; ex.date=date||ex.date; ex.category=category||ex.category; ex.paymentMethod=pm||ex.paymentMethod; ex.isFixedExpense=finalFixed; if(cardId!==null) ex.cardId=cardId;
      if(goalId) ex.goalId=goalId;
      if(ex.isInstallment){ex.value=-(Math.abs(value));}
      else ex.value=type==='income'?Math.abs(value):-Math.abs(value);
      logChange('transaction',ex.id,'UPDATE',old,ex);
    }
    saveAll(); invalidateCalcCache(); updateAutocompleteList();
    return {
      success: true, isCreate: false,
      undoFn: () => {
        const current = loadData('transactions');
        undoItems.forEach(item => {
          const idx = current.findIndex(t => t.id === item.id);
          if (idx !== -1) Object.assign(current[idx], item.old);
        });
        window._dataCache['transactions'] = current;
        saveAll(); invalidateCalcCache(); updateAutocompleteList(); renderActiveTab();
      }
    };
  }
}
function deleteTransaction(id) {
  let txs=loadData('transactions'); const t=txs.find(x=>x.id===id); if(!t) return;
  const doDelete = (keepSeries) => {
    let removed = [];
    if(!keepSeries&&t.isInstallment&&t.parentId){ const sId=t.parentId; removed=txs.filter(x=>x.parentId===sId); removed.forEach(c=>logChange('transaction',c.id,'DELETE',c,null)); txs=txs.filter(x=>x.parentId!==sId); }
    else { removed=[t]; logChange('transaction',id,'DELETE',t,null); txs=txs.filter(x=>x.id!==id); }
    window._dataCache['transactions']=txs; saveAll(); invalidateCalcCache(); updateAutocompleteList(); renderActiveTab();
    // Undo support
    showToastWithUndo(`"${t.description}" excluída`, () => {
      const current = loadData('transactions');
      removed.forEach(r => { if(!current.find(x=>x.id===r.id)) current.push(r); });
      current.sort((a,b)=>parseDateISO(b.date)-parseDateISO(a.date));
      window._dataCache['transactions'] = current;
      saveAll(); invalidateCalcCache(); updateAutocompleteList(); renderActiveTab();
    });
  };
  if(t.isInstallment&&t.parentId) {
    showInstallmentDeleteConfirm(t, doDelete);
  } else {
    showConfirm(`Excluir "<b>${escapeHtml(t.description)}</b>" permanentemente?`, () => doDelete(true));
  }
}

function showInstallmentDeleteConfirm(t, doDelete) {
  let existing = document.getElementById('instDeleteModal');
  if (existing) existing.remove();
  const baseName = t.description.replace(/\s\(\d+\/\d+\)$/, '');
  const modal = document.createElement('div');
  modal.id = 'instDeleteModal';
  modal.className = 'modal open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px;">
      <h3 class="modal-title"><i class="fas fa-layer-group" style="color:var(--warning)"></i> Excluir Parcela</h3>
      <p style="margin-bottom:20px;color:var(--text-muted);">O que deseja fazer com "<b>${h(baseName)}</b>"?</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn danger" id="idcSeries" class="u-w-full u-flex-center"><i class="fas fa-trash"></i> Excluir série completa (${t.installmentCount} parcelas)</button>
        <button class="btn secondary" id="idcSingle" style="width:100%;justify-content:center;border-color:var(--danger);color:var(--danger);"><i class="fas fa-scissors"></i> Excluir só esta (${t.installmentIndex}/${t.installmentCount})</button>
        <button class="btn secondary" id="idcCancel" class="u-w-full u-flex-center">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#idcSeries').addEventListener('click', () => { modal.remove(); doDelete(false); });
  modal.querySelector('#idcSingle').addEventListener('click', () => { modal.remove(); doDelete(true); });
  modal.querySelector('#idcCancel').addEventListener('click', () => modal.remove());
}
function duplicateTransaction(id) {
  const txs=loadData('transactions'), t=txs.find(x=>x.id===id); if(!t) return;
  openTransactionModal(t.value>0?'income':'expense', {...t, id:'', isInstallment:false, installmentIndex:null, installmentCount:null, installmentTotalValue:null, parentId:null});
}
function bindTxEvents(containerId) {
  const c=document.getElementById(containerId); if(!c) return;
  const txs=loadData('transactions');
  c.querySelectorAll('.action-button.edit').forEach(b=>b.addEventListener('click',e=>{ const t=txs.find(x=>x.id===e.currentTarget.dataset.id); if(t) openTransactionModal(t.value>0?'income':'expense',t); }));
  c.querySelectorAll('.action-button.duplicate').forEach(b=>b.addEventListener('click',e=>duplicateTransaction(e.currentTarget.dataset.id)));
  c.querySelectorAll('.action-button.delete').forEach(b=>b.addEventListener('click',e=>deleteTransaction(e.currentTarget.dataset.id)));
  bindHistoryButtons(containerId, 'transaction');
}

// ============================
// SALARY & FIXED TEMPLATES
// ============================
function applySalary() {
  const mk=`${currentYear}-${currentMonth}`; const txs=loadData('transactions'); const st=loadData('settings');
  if(txs.some(t=>{ const d=parseDateISO(t.date); return t.value>0&&t.category==='Salário'&&d.getFullYear()===currentYear&&d.getMonth()===currentMonth; })){ showToast('Salário já lançado neste mês.','error'); return; }
  const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,st.salaryDay)),description:'Salário',value:Math.abs(st.salaryValue),category:'Salário',paymentMethod:'Transferência',isFixedExpense:false,isInstallment:false});
  txs.push(o); logChange('transaction',o.id,'CREATE',null,o);
  if(!st.suggestionsLog) st.suggestionsLog={}; if(!st.suggestionsLog[mk]) st.suggestionsLog[mk]={}; st.suggestionsLog[mk].salaryApplied=true;
  saveAll(); invalidateCalcCache(); showToast('Salário adicionado!'); renderActiveTab();
}
function applyFinancings() {
  const mk=`${currentYear}-${currentMonth}`; let added=0; const txs=loadData('transactions'); const st=loadData('settings');
  (st.financings||[]).filter(f=>!f.done).forEach(f=>{
    if(!txs.some(t=>{ const d=parseDateISO(t.date); return d.getFullYear()===currentYear&&d.getMonth()===currentMonth&&t.description===f.description&&t.value<0; })){
      const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,1)),description:f.description,value:-Math.abs(f.installmentValue),category:'Contas',paymentMethod:'Transferência',isFixedExpense:true,isInstallment:false}); txs.push(o); logChange('transaction',o.id,'CREATE',null,o); added++;
    }
  });
  if(!st.suggestionsLog) st.suggestionsLog={}; if(!st.suggestionsLog[mk]) st.suggestionsLog[mk]={}; st.suggestionsLog[mk].financingApplied=true;
  saveAll(); invalidateCalcCache();
  showToast(added>0?`${added} financiamento(s) adicionado(s)!`:'Financiamentos já lançados.');
  renderActiveTab();
}
function applyFixedTemplates() {
  const mk=`${currentYear}-${currentMonth}`; let added=0; const txs=loadData('transactions'); const st=loadData('settings');
  (st.fixedTemplates||[]).forEach(tpl=>{
    if(!txs.some(t=>{ const d=parseDateISO(t.date); return d.getFullYear()===currentYear&&d.getMonth()===currentMonth&&t.description===tpl.description&&t.value<0; })){
      const o=buildTxObj({id:genId(),date:fmtDateISO(safeDate(currentYear,currentMonth,1)),description:tpl.description,value:-Math.abs(tpl.value),category:tpl.category,paymentMethod:tpl.paymentMethod,isFixedExpense:true,isInstallment:false}); txs.push(o); logChange('transaction',o.id,'CREATE',null,o); added++;
    }
  });
  if(!st.suggestionsLog) st.suggestionsLog={}; if(!st.suggestionsLog[mk]) st.suggestionsLog[mk]={}; st.suggestionsLog[mk].fixedApplied=true;
  saveAll(); invalidateCalcCache();
  showToast(added>0?`${added} despesas fixas adicionadas!`:'Todas as despesas fixas já estavam lançadas.');
  renderActiveTab();
}

// ============================
// EXPORT / IMPORT
// ============================
function exportJSON() {
  const data={metadata:{exportDate:new Date().toISOString(),app:'GestaoComNocao'},transactions:loadData('transactions'),categories:loadData('categories'),paymentMethods:loadData('paymentMethods'),budgets:loadData('budgets'),goals:loadData('goals'),cards:loadData('cards'),rules:loadData('rules'),settings:loadData('settings'),changelog:loadData('changelog')};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`gcn_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
}
function exportCSV(txsArr, suffix) {
  const cards=loadData('cards'); const rows=txsArr.map(t=>{ const c=t.cardId?cards.find(x=>x.id===t.cardId):null; return [`"${new Date(t.date).toLocaleDateString('pt-BR')}"`,`"${(t.description||'').replace(/"/g,'""')}"`,`"${t.category||''}"`,(t.value>0?'Receita':'Despesa'),Math.abs(t.value).toFixed(2).replace('.',','),`"${c?'Crédito - '+c.name:t.paymentMethod||''}"`].join(';'); });
  const csv='\uFEFF'+['Data;Descrição;Categoria;Tipo;Valor;Pagamento',...rows].join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`gcn_transacoes_${suffix}_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
}
function importJSON(file) {
  const r=new FileReader(); r.onload=e=>{ try { const d=JSON.parse(e.target.result); if(!d.transactions) throw new Error('Inválido'); showConfirm('Isso <b>substituirá todos</b> os seus dados atuais. Continuar?', ()=>{ ['transactions','categories','paymentMethods','budgets','goals','cards','rules','changelog'].forEach(k=>{ window._dataCache[k]=d[k]||DEFAULTS[k]; }); const st=d.settings||DEFAULTS.settings; if(!st.fixedTemplates) st.fixedTemplates=[]; if(!st.suggestionsLog) st.suggestionsLog={}; window._dataCache['settings']=st; saveAll(); showToast('Dados importados!'); setTimeout(()=>location.reload(),1000); }); } catch(err){ showToast('Arquivo inválido.','error'); } }; r.readAsText(file);
}

// ============================
// CARD STATEMENT
// ============================
function viewCardStatement(cardId) {
  const cards=loadData('cards'), card=cards.find(c=>c.id===cardId); if(!card) return;
  const txs=loadData('transactions');
  // Use invoice month logic: show all transactions whose invoice falls in currentYear/currentMonth
  const stmtTxs=txs.filter(t=>{
    if(t.cardId!==cardId||t.value>=0) return false;
    const [iy,im]=getCardInvoiceMonth(t.date,card.closingDay);
    return iy===currentYear && im===currentMonth;
  }).sort((a,b)=>parseDateISO(b.date)-parseDateISO(a.date));
  const total=stmtTxs.reduce((s,t)=>s+Math.abs(t.value),0);
  // Compute the actual date range for display: from day after prev closing to current closing
  let prevCloseY=currentYear, prevCloseM=currentMonth-1;
  if(prevCloseM<0){prevCloseM=11;prevCloseY--;}
  const periodStart=safeDate(prevCloseY,prevCloseM,card.closingDay+1);
  const periodEnd=safeDate(currentYear,currentMonth,card.closingDay);
  document.getElementById('statementCardName').textContent=card.name;
  document.getElementById('statementPeriod').textContent=`${periodStart.toLocaleDateString('pt-BR')} — ${periodEnd.toLocaleDateString('pt-BR')} (venc. dia ${card.dueDay})`;
  document.getElementById('statementTotal').textContent=fmt(total);
  document.getElementById('statementBody').innerHTML=stmtTxs.map(t=>`<tr><td>${new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR')}</td><td style="font-weight:600;">${t.description}</td><td>${t.category}</td><td class="negative-value">${fmt(Math.abs(t.value))}</td></tr>`).join('')||`<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);">Sem transações nesta fatura.</td></tr>`;
  document.getElementById('btnExportStatement').onclick=()=>exportCSV(stmtTxs,`fatura_${card.name.replace(/\s+/g,'_')}`);
  openModal('cardStatementModal');
}

// ============================
// GEMINI AI
// ============================
async function callGemini(prompt, system='') {
  if(!GEMINI_API_KEY) throw new Error('API Key não configurada.');
  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload={contents:[{parts:[{text:prompt}]}]}; if(system) payload.systemInstruction={parts:[{text:system}]};
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const d=await r.json(); const txt=d.candidates?.[0]?.content?.parts?.[0]?.text; if(!txt) throw new Error('Resposta vazia');
      return txt;
    } catch(e){ if(i===2) throw e; await new Promise(r=>setTimeout(r,Math.pow(2,i)*1000)); }
  }
}

// ============================
// RENDER HELPERS
// ============================
function getTrendHTML(cur, prev, isExpense) {
  if(!prev&&!cur) return `<span class="trend neutral"><i class="fas fa-minus"></i> 0%</span>`;
  if(!prev) return `<span class="trend ${isExpense?'up-bad':'up-good'}"><i class="fas fa-arrow-up"></i> +100%</span>`;
  const diff=cur-prev, pct=Math.abs((diff/prev)*100).toFixed(1);
  if(diff>0) return `<span class="trend ${isExpense?'up-bad':'up-good'}"><i class="fas fa-arrow-up"></i> +${pct}%</span>`;
  if(diff<0) return `<span class="trend ${isExpense?'down-good':'down-bad'}"><i class="fas fa-arrow-down"></i> -${pct}%</span>`;
  return `<span class="trend neutral"><i class="fas fa-minus"></i> 0%</span>`;
}
function makeSectionHTML(icon, title, content, actionHtml='') {
  return `<div class="section"><div class="section-header"><div class="section-header-left"><div class="section-icon">${icon}</div><h2>${title}</h2></div>${actionHtml}</div>${content}</div>`;
}

// ============================
// DASHBOARD
// ============================
