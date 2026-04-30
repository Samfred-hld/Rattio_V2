function validateForm() {
  const desc=document.getElementById('transactionDescription').value.trim();
  const val=parseFloat(document.getElementById('transactionValue').value);
  const date=document.getElementById('transactionDate').value;
  const cat=document.getElementById('transactionCategory').value;
  const pm=document.getElementById('transactionPaymentMethod').value;
  const isCredit = pm.startsWith('Crédito');
  const isInstShown = isCredit && !document.getElementById('installmentDetails').classList.contains('hidden');
  const count=parseInt(document.getElementById('installmentCount').value);
  const type=document.querySelector('input[name="transactionType"]:checked')?.value;
  const counter=document.getElementById('descCounter');
  const isInvCat = cat==='Investimentos' && type==='expense';
  const invGoal = document.getElementById('investmentGoalSelect').value;

  let ok=true;
  if(counter) { counter.textContent=`${desc.length}/${CONFIG.DESCRIPTION_MAX_LENGTH}`; counter.style.color=desc.length>CONFIG.DESCRIPTION_MAX_LENGTH?'var(--danger)':'var(--text-muted)'; }
  
  const setErr=(id, errId, msg, valid) => { const g=document.getElementById(id); const e=document.getElementById(errId); if(g){g.className=`form-group ${valid?'success':'error'}`;} if(e){e.textContent=valid?'':msg;} if(!valid) ok=false; };
  
  setErr('fg-desc','err-desc', desc.length>CONFIG.DESCRIPTION_MAX_LENGTH?`Máx ${CONFIG.DESCRIPTION_MAX_LENGTH} chars`:desc?'':'Obrigatório', !!desc&&desc.length<=CONFIG.DESCRIPTION_MAX_LENGTH);
  setErr('fg-value','err-value','Valor inválido', !isNaN(val)&&val>0&&val<=999999);
  const dateOk = !!date;
  setErr('fg-date','err-date','Data inválida', dateOk);
  setErr('fg-cat','err-cat','Selecione categoria', !!cat);
  setErr('fg-pm','err-pm','Selecione forma de pagamento', !!pm);
  if(!type) ok=false;
  if(isInstShown){ if(isNaN(count)||count<=0){document.getElementById('err-inst-count').textContent='Parcelas obrigatório';ok=false;}else document.getElementById('err-inst-count').textContent=''; }
  if(isInvCat){ const ge=document.getElementById('err-inv-goal'); if(!invGoal){if(ge) ge.textContent='Selecione a meta'; ok=false;}else{if(ge) ge.textContent='';} }
  
  // FIX #5: update installment summary box with real-time total
  const summaryBox = document.getElementById('installmentSummary');
  if(summaryBox && isInstShown && !isNaN(val) && val > 0) {
    const cnt = parseInt(document.getElementById('installmentCount').value);
    if(!isNaN(cnt) && cnt > 0) {
      summaryBox.innerHTML = `<i class="fas fa-calculator"></i> <strong>${cnt}x</strong> de <strong>${fmt(val)}</strong> = Total: <strong>${fmt(val * cnt)}</strong>`;
    } else {
      summaryBox.innerHTML = `<i class="fas fa-info-circle"></i> O valor informado acima é o valor <strong>por parcela</strong>. O total será calculado automaticamente.`;
    }
  } else if(summaryBox && !isInstShown) {
    summaryBox.innerHTML = `<i class="fas fa-info-circle"></i> O valor informado acima é o valor <strong>por parcela</strong>. O total será calculado automaticamente.`;
  }

  const btn=document.getElementById('btnSaveTransaction');
  btn.disabled=!ok;
  btn.innerHTML=ok?'<i class="fas fa-check"></i> Salvar':'<i class="fas fa-ban"></i> Preencha';
  return ok;
}

// ============================
// TRANSACTION MODAL
// ============================
function populateCategorySelect(sel) {
  sel = sel || document.getElementById('transactionCategory'); sel.innerHTML='';
  loadData('categories').forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
}
function populatePaymentSelect(sel) {
  sel = sel || document.getElementById('transactionPaymentMethod'); sel.innerHTML='';
  loadData('paymentMethods').forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
  loadData('cards').forEach(c=>{ const o=document.createElement('option'); o.value=`Crédito - ${c.name}`; o.textContent=`Crédito - ${c.name}`; o.dataset.cardId=c.id; sel.appendChild(o); });
}
function openTransactionModal(type='expense', t=null) {
  const form=document.getElementById('transactionForm');
  form.reset();
  document.getElementById('transactionId').value='';
  document.getElementById('parentId').value='';
  document.getElementById('installmentDetails').classList.add('hidden');
  document.getElementById('seriesControls').classList.add('hidden');
  document.getElementById('investmentGoalGroup').classList.add('hidden');
  document.getElementById('advancedContent').classList.remove('active');
  document.getElementById('advancedContent').style.display='none';
  document.getElementById('categorySuggestionHint').classList.add('hidden');
  document.getElementById('autocomplete-list').classList.add('hidden');
  document.getElementById('descCounter').textContent='0/100';
  document.querySelectorAll('#transactionForm .form-group').forEach(g=>{g.className='form-group';});
  document.querySelectorAll('#transactionForm .error-message').forEach(e=>e.textContent='');
  document.getElementById('modalTxTitle').textContent = t ? 'Editar Lançamento' : 'Novo Lançamento';
  // Populate investment goals
  const goalSel=document.getElementById('investmentGoalSelect'); goalSel.innerHTML='<option value="">Selecione a meta...</option>';
  loadData('goals').forEach(g=>{ const o=document.createElement('option'); o.value=g.id; o.textContent=g.name; goalSel.appendChild(o); });
  populateCategorySelect(); populatePaymentSelect();
  const targetType = t ? (t.value>0?'income':'expense') : type;
  document.querySelector(`input[name="transactionType"][value="${targetType}"]`).checked=true;
  // T-04: Default date — today if current month/year, otherwise 1st of the viewed month
  const today3=new Date();
  let defaultDate;
  if(today3.getMonth()===currentMonth&&today3.getFullYear()===currentYear){
    defaultDate=fmtDateISO(today3);
  } else {
    defaultDate=fmtDateISO(safeDate(currentYear,currentMonth,1));
  }
  document.getElementById('transactionDate').value = defaultDate;
  if(t){
    document.getElementById('transactionId').value=t.id||'';
    document.getElementById('parentId').value=t.parentId||'';
    // strip installment suffix from description for editing
    let cleanDesc = t.description || '';
    if(t.isInstallment) cleanDesc = cleanDesc.replace(/\s\(\d+\/\d+\)$/, '');
    document.getElementById('transactionDescription').value=cleanDesc;
    document.getElementById('transactionValue').value=Math.abs(t.value||0).toFixed(2);
    document.getElementById('transactionDate').value=t.date||'';
    document.getElementById('transactionCategory').value=t.category||'';
    const cards=loadData('cards'); let pm=t.paymentMethod;
    if(t.cardId){ const c=cards.find(x=>x.id===t.cardId); if(c) pm=`Crédito - ${c.name}`; }
    document.getElementById('transactionPaymentMethod').value=pm||'';
    // Open advanced section directly without .click() hack
    const openAdvanced = () => {
      const c=document.getElementById('advancedContent');
      const icon=document.querySelector('#advancedToggle .toggle-icon');
      c.style.display='block'; c.classList.add('active');
      if(icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
    };
    if(t.isInstallment){ document.getElementById('installmentCount').value=t.installmentCount||''; document.getElementById('installmentTotalValue').value=t.installmentTotalValue?.toFixed(2)||''; document.getElementById('installmentDetails').classList.remove('hidden'); document.getElementById('seriesControls').classList.remove('hidden'); const cntEl=document.getElementById('editScopeTotalCount'); if(cntEl) cntEl.textContent=`(${t.installmentCount||'?'})`; openAdvanced(); }
    if(t.category==='Investimentos'&&t.goalId){ document.getElementById('investmentGoalGroup').classList.remove('hidden'); document.getElementById('investmentGoalSelect').value=t.goalId; openAdvanced(); }
    if(t.recurring){ document.getElementById('txRecurring').checked=true; document.getElementById('txRecurringFreq').value=t.recurring; document.getElementById('recurringOptions').classList.remove('hidden'); openAdvanced(); }
  }
  // Bind payment method change for installments (use onchange to prevent listener accumulation)
  const pmSel=document.getElementById('transactionPaymentMethod');
  const updateInstallmentVis=()=>{
    const isCredit=pmSel.value.startsWith('Crédito');
    if(!isCredit){ document.getElementById('installmentDetails').classList.add('hidden'); }
    else { document.getElementById('installmentDetails').classList.remove('hidden'); document.getElementById('advancedContent').style.display='block'; document.getElementById('advancedContent').classList.add('active'); }
  };
  pmSel.onchange = updateInstallmentVis;
  // Bind category change for investment goal (use onchange to prevent listener accumulation)
  const catSel=document.getElementById('transactionCategory');
  const updateInvestmentVis=()=>{
    const isInv=catSel.value==='Investimentos';
    document.getElementById('investmentGoalGroup').classList.toggle('hidden',!isInv);
    if(isInv){ document.getElementById('advancedContent').style.display='block'; document.getElementById('advancedContent').classList.add('active'); }
  };
  catSel.onchange = updateInvestmentVis;
  // Recurring toggle
  const recCheck = document.getElementById('txRecurring');
  const recOpts = document.getElementById('recurringOptions');
  if (recCheck && recOpts) {
    recCheck.onchange = () => { recOpts.classList.toggle('hidden', !recCheck.checked); };
  }
  // Initial check
  if(t){ updateInstallmentVis(); updateInvestmentVis(); }
  openModal('transactionModal'); validateForm(); markTxClean();
  setTimeout(()=>document.getElementById('transactionDescription').focus(),100);
}

// ============================
// TRANSACTION CRUD
// ============================
/**
 * Cria objeto de transação normalizado com todos os campos obrigatórios.
 * @param {Object} o - Dados brutos da transação
 * @returns {Object} Transação normalizada
 */
function buildTxObj(o) {
  return { id:o.id, date:o.date, description:o.description, value:o.value, category:o.category, paymentMethod:o.paymentMethod, isFixedExpense:!!o.isFixedExpense, isInstallment:!!o.isInstallment, installmentTotalValue:o.installmentTotalValue??null, installmentCount:o.installmentCount??null, installmentIndex:o.installmentIndex??null, parentId:o.parentId??null, cardId:o.cardId??null, goalId:o.goalId??null, recurring:o.recurring??null };
}
/**
 * Cria série de parcelas vinculadas por parentId.
 * Cada parcela recebe description com sufixo "(i/c)".
 * @param {Object} opts
 * @param {string} opts.description - Descrição base
 * @param {string} opts.date - Data ISO da primeira parcela
 * @param {number} opts.perInstallmentValue - Valor por parcela (positivo)
 * @param {number} opts.count - Quantidade de parcelas
 * @param {string} opts.category - Categoria
 * @param {string} opts.paymentMethod - Forma de pagamento
 * @param {string|null} opts.cardId - ID do cartão (opcional)
 * @param {boolean} opts.isFixed - Se é despesa fixa
 * @param {string|null} opts.goalId - ID da meta (opcional)
 */
function createInstallmentSeries({description, date, perInstallmentValue, count, category, paymentMethod, cardId, isFixed, goalId}) {
  const txs=loadData('transactions'), sId=genId();
  const perVal = -(Math.abs(perInstallmentValue));
  const totalVal = Math.abs(perInstallmentValue) * count;
  for(let i=1;i<=count;i++){ const obj=buildTxObj({id:genId(),date:i===1?date:addMonthsISO(date,i-1),description:withInstSuffix(description,i,count),value:perVal,category,paymentMethod,isFixedExpense:!!isFixed,isInstallment:true,installmentTotalValue:totalVal,installmentCount:count,installmentIndex:i,parentId:sId,cardId,goalId}); txs.push(obj); logChange('transaction',obj.id,'CREATE',null,obj); }
}
