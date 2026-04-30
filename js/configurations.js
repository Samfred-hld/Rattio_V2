function renderConfigTab() {
  const page=document.getElementById('configurationsPage'); page.innerHTML='';
  let st=loadData('settings'), cats=loadData('categories'), paymentMethods=loadData('paymentMethods'), rules=loadData('rules'), cards=loadData('cards');

  page.innerHTML=`
    <div class="config-tabs-nav">
      <button class="config-tab-btn active" data-ctab="personaliz"><i class="fas fa-palette"></i> Personalização</button>
      <button class="config-tab-btn" data-ctab="automacao"><i class="fas fa-bolt"></i> Regras Automáticas</button>
      <button class="config-tab-btn" data-ctab="backup"><i class="fas fa-database"></i> Backup e Histórico</button>
    </div>
    <div class="config-tab-panel active" id="ctab-personaliz"></div>
    <div class="config-tab-panel" id="ctab-automacao"></div>
    <div class="config-tab-panel" id="ctab-backup"></div>
  `;

  // Build tab 1
  document.getElementById('ctab-personaliz').innerHTML = 
    makeConfigSection('cats','<i class="fas fa-tags"></i>','var(--violet)','#f3e8ff','Categorias', buildCatsConfigHTML()) +
    makeConfigSection('salary','<i class="fas fa-money-bill-wave"></i>','#0ea5e9','#e0f2fe','Configurar Salário', buildSalaryConfigHTML(st)) +
    makeConfigSection('cards','<i class="fas fa-credit-card"></i>','var(--info)','var(--info-light)','Cartões de Crédito', buildCardsConfigHTML()) +
    makeConfigSection('pms','<i class="fas fa-wallet"></i>','#0ea5e9','#e0f2fe','Meios de Pagamento', buildPaymentMethodsConfigHTML()) +
    makeConfigSection('financing','<i class="fas fa-building-columns"></i>','#f59e0b','#fef3c7','Financiamento/Empréstimo', buildFinancingConfigHTML());

  // Build tab 2
  document.getElementById('ctab-automacao').innerHTML =
    makeConfigSection('tpls','<i class="fas fa-thumbtack"></i>','var(--violet)','#f3e8ff','Despesa Fixa Automática', buildTemplatesConfigHTML()) +
    makeConfigSection('rules','<i class="fas fa-bolt"></i>','var(--warning)','var(--warning-light)','Categorização Automática', buildRulesConfigHTML());

  // Build tab 3
  document.getElementById('ctab-backup').innerHTML = buildBackupConfigHTML();

  // Config tab switching
  page.querySelectorAll('.config-tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
    page.querySelectorAll('.config-tab-btn').forEach(b=>b.classList.remove('active'));
    page.querySelectorAll('.config-tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ctab-'+btn.dataset.ctab).classList.add('active');
  }));

  // Populate selects
  const ruleCat=page.querySelector('#ruleCategory'); if(ruleCat) cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; ruleCat.appendChild(o); });
  const tplCat=page.querySelector('#tplCat'); if(tplCat) cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; tplCat.appendChild(o); });
  const tplPM=page.querySelector('#tplPM'); if(tplPM) paymentMethods.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; tplPM.appendChild(o); });

  // Categories
  const renderCats=()=>renderTablePaginated(cats,'catsBody','categories',50,(c,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${c}</td><td class="actions"><button class="action-button delete" data-idx="${i}" title="Excluir" aria-label="Excluir categoria ${escapeHtml(c)}"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{ document.getElementById('catsBody').querySelectorAll('.delete').forEach(b=>b.addEventListener('click',e=>{ const i=parseInt(e.currentTarget.dataset.idx); const catName=cats[i];
      // FIX #9: check if category is in use before allowing deletion
      const usedInTxs=loadData('transactions').some(t=>t.category===catName);
      const usedInBudgets=loadData('budgets').some(b=>b.category===catName);
      const usedInRules=loadData('rules').some(r=>r.category===catName);
      const usedInTemplates=(loadData('settings').fixedTemplates||[]).some(t=>t.category===catName);
      let warnMsg=`Excluir categoria "<b>${catName}</b>"?`;
      if(usedInTxs||usedInBudgets||usedInRules||usedInTemplates) {
        const uses=[];
        if(usedInTxs) uses.push('transações');
        if(usedInBudgets) uses.push('orçamentos');
        if(usedInRules) uses.push('regras automáticas');
        if(usedInTemplates) uses.push('despesas fixas');
        warnMsg=`Atenção: a categoria "<b>${catName}</b>" está em uso em ${uses.join(', ')}. Excluir deixará esses registros sem categoria válida. Confirmar?`;
      }
      showConfirm(warnMsg,()=>{ cats.splice(i,1); window._dataCache['categories']=cats; saveAll(); renderCats(); }); })); });
  renderCats();
  page.querySelector('#catForm').addEventListener('submit',e=>{ e.preventDefault(); const v=page.querySelector('#newCatInput').value.trim(); if(v&&!cats.includes(v)){ cats.push(v); window._dataCache['categories']=cats; saveAll(); page.querySelector('#newCatInput').value=''; renderCats(); showToast('Categoria adicionada!'); } });

  // Payment Methods
  const renderPMs=()=>renderTablePaginated(paymentMethods,'pmsBody','pm',50,(p,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${p}</td><td class="actions"><button class="action-button delete" data-idx="${i}" title="Excluir" aria-label="Excluir forma de pagamento ${escapeHtml(p)}"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{ document.getElementById('pmsBody').querySelectorAll('.delete').forEach(b=>b.addEventListener('click',e=>{ const i=parseInt(e.currentTarget.dataset.idx); showConfirm(`Excluir "<b>${paymentMethods[i]}</b>"?`,()=>{ paymentMethods.splice(i,1); window._dataCache['paymentMethods']=paymentMethods; saveAll(); renderPMs(); }); })); });
  renderPMs();
  page.querySelector('#pmFormConfig').addEventListener('submit',e=>{ e.preventDefault(); const v=page.querySelector('#newPmInput').value.trim(); if(v&&!paymentMethods.includes(v)){ paymentMethods.push(v); window._dataCache['paymentMethods']=paymentMethods; saveAll(); page.querySelector('#newPmInput').value=''; renderPMs(); showToast('Forma de pagamento adicionada!'); } });

  // Settings (CF-02: show current salary value in header subtitle)
  const salaryDisplay=`${fmt(st.salaryValue||0)} · Dia ${st.salaryDay||5}`;
  const salarySecHeader=page.querySelector('#csec-salary .config-section-header h2');
  if(salarySecHeader) salarySecHeader.insertAdjacentHTML('afterend',`<span style="font-size:12px;color:var(--text-muted);font-weight:600;margin-left:8px;">${salaryDisplay}</span>`);
  page.querySelector('#settingsForm').addEventListener('submit',e=>{ e.preventDefault(); const v=parseFloat(page.querySelector('#salaryValue').value), d=parseInt(page.querySelector('#salaryDay').value); if(!isNaN(v)) st.salaryValue=v; if(!isNaN(d)) st.salaryDay=d; window._dataCache['settings']=st; saveAll(); showToast('Configurações salvas!'); // CF-02: update display
    const h=page.querySelector('#csec-salary .config-section-header h2 + span'); if(h) h.textContent=`${fmt(st.salaryValue||0)} · Dia ${st.salaryDay||5}`; });

  // Rules
  const refreshRules=()=>renderTablePaginated(rules,'rulesBody','rules',50,(r)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${r.keyword}</td><td>${r.category||'-'}</td><td><span class="pill" style="background:${r.type==='income'?'var(--accent-light)':'var(--danger-light)'};color:${r.type==='income'?'var(--accent-dark-green)':'#b91c1c'};border:none;">${r.type||'-'}</span></td><td>${r.isFixedExpense?'<span class="pill" style="background:#f3e8ff;color:#6b21a8;border:none;">Sim</span>':'-'}</td><td class="actions"><button class="action-button history" data-id="${r.id}" title="Histórico" aria-label="Histórico de regra"><i class="fas fa-history"></i></button><button class="action-button edit" data-id="${r.id}" title="Editar" aria-label="Editar regra"><i class="fas fa-pencil-alt"></i></button><button class="action-button delete" data-id="${r.id}" title="Excluir" aria-label="Excluir regra"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{ const b=document.getElementById('rulesBody'); b.querySelectorAll('.edit').forEach(el=>el.addEventListener('click',e=>{ const r=rules.find(x=>x.id===e.currentTarget.dataset.id); if(r){page.querySelector('#ruleId').value=r.id;page.querySelector('#ruleKeyword').value=r.keyword;page.querySelector('#ruleCategory').value=r.category||'';page.querySelector('#ruleType').value=r.type||'';page.querySelector('#ruleFixed').checked=!!r.isFixedExpense;} })); b.querySelectorAll('.delete').forEach(el=>el.addEventListener('click',e=>{ const id=e.currentTarget.dataset.id, r=rules.find(x=>x.id===id); showConfirm(`Excluir regra "<b>${r?.keyword}</b>"?`,()=>{ logChange('rule',id,'DELETE',r,null); rules=rules.filter(x=>x.id!==id); window._dataCache['rules']=rules; saveAll(); refreshRules(); }); })); bindHistoryButtons('rulesBody','rule'); });
  refreshRules();
  page.querySelector('#ruleForm').addEventListener('submit',e=>{
    e.preventDefault(); const id=page.querySelector('#ruleId').value||genId(), kw=page.querySelector('#ruleKeyword').value.trim(), cat=page.querySelector('#ruleCategory').value||null, type=page.querySelector('#ruleType').value||null, fixed=page.querySelector('#ruleFixed').checked;
    if(!kw){showToast('Informe a palavra-chave.','error');return;}
    const obj={id,keyword:kw,category:cat,type,isFixedExpense:fixed};
    const ex=rules.find(r=>r.id===id);
    if(ex){const old={...ex}; Object.assign(ex,obj); logChange('rule',id,'UPDATE',old,obj);
      window._dataCache['rules']=rules; saveAll(); e.target.reset(); page.querySelector('#ruleId').value=''; refreshRules();
      showToastWithUndo('Regra editada', () => { const r=loadData('rules').find(x=>x.id===id); if(r){Object.assign(r,old);saveAll();refreshRules();} });
    }else{rules.push(obj);logChange('rule',id,'CREATE',null,obj);
      window._dataCache['rules']=rules; saveAll(); e.target.reset(); page.querySelector('#ruleId').value=''; refreshRules(); showToast('Regra salva!');
    }
  });

  // Cards
  const refreshCards=()=>renderTablePaginated(cards,'cardsBody','cards',50,(c)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td><span class="chip-card" style="background:${c.color}"><i class="fas fa-credit-card"></i>${c.name}</span></td><td>Dia ${c.closingDay}</td><td>Dia ${c.dueDay}</td><td>${fmt(c.limit||0)}</td><td class="actions"><button class="action-button history" data-id="${c.id}" title="Histórico" aria-label="Histórico de ${escapeHtml(c.name)}"><i class="fas fa-history"></i></button><button class="action-button view-stmt" data-id="${c.id}" title="Extrato" aria-label="Extrato de ${escapeHtml(c.name)}"><i class="fas fa-file-invoice-dollar"></i></button><button class="action-button edit" data-id="${c.id}" title="Editar" aria-label="Editar ${escapeHtml(c.name)}"><i class="fas fa-pencil-alt"></i></button><button class="action-button delete" data-id="${c.id}" title="Excluir" aria-label="Excluir ${escapeHtml(c.name)}"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{ const b=document.getElementById('cardsBody'); b.querySelectorAll('.view-stmt').forEach(el=>el.addEventListener('click',e=>viewCardStatement(e.currentTarget.dataset.id))); b.querySelectorAll('.edit').forEach(el=>el.addEventListener('click',e=>{ const c=cards.find(x=>x.id===e.currentTarget.dataset.id); if(c){page.querySelector('#cardId').value=c.id;page.querySelector('#cardName').value=c.name;page.querySelector('#cardColor').value=c.color;page.querySelector('#cardClosing').value=c.closingDay;page.querySelector('#cardDue').value=c.dueDay;page.querySelector('#cardLimit').value=c.limit||0;} })); b.querySelectorAll('.delete').forEach(el=>el.addEventListener('click',e=>{ const id=e.currentTarget.dataset.id, c=cards.find(x=>x.id===id); showConfirm(`Excluir cartão "<b>${c?.name}</b>"? As transações vinculadas serão mantidas.`,()=>{ logChange('card',id,'DELETE',c,null); cards=cards.filter(x=>x.id!==id); window._dataCache['cards']=cards; saveAll(); refreshCards(); }); })); bindHistoryButtons('cardsBody','card'); });
  refreshCards();
  page.querySelector('#cardForm').addEventListener('submit',e=>{
    e.preventDefault(); const id=page.querySelector('#cardId').value||genId(), name=page.querySelector('#cardName').value.trim(), color=page.querySelector('#cardColor').value, closingDay=parseInt(page.querySelector('#cardClosing').value), dueDay=parseInt(page.querySelector('#cardDue').value), limit=parseFloat(page.querySelector('#cardLimit').value)||0;
    if(!name||!closingDay||!dueDay){showToast('Preencha todos os campos.','error');return;}
    const obj={id,name,color,closingDay,dueDay,limit};
    const ex=cards.find(c=>c.id===id);
    if(ex){const old={...ex}; Object.assign(ex,obj); logChange('card',id,'UPDATE',old,obj);
      window._dataCache['cards']=cards; saveAll(); page.querySelector('#cardForm').reset(); page.querySelector('#cardId').value=''; refreshCards();
      showToastWithUndo('Cartão editado', () => { const c=loadData('cards').find(x=>x.id===id); if(c){Object.assign(c,old);saveAll();refreshCards();} });
    }else{cards.push(obj);logChange('card',id,'CREATE',null,obj);
      window._dataCache['cards']=cards; saveAll(); page.querySelector('#cardForm').reset(); page.querySelector('#cardId').value=''; refreshCards(); showToast('Cartão salvo!');
    }
  });

  // Templates (Fixed Expenses)
  const refreshTpls=()=>renderTablePaginated(st.fixedTemplates||[],'tplsBody','tpls',50,(t)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${t.description}</td><td>${fmt(t.value)}</td><td>${t.category}</td><td>${t.paymentMethod}</td><td class="actions"><button class="action-button edit" data-id="${t.id}" title="Editar" aria-label="Editar"><i class="fas fa-pencil-alt" aria-hidden="true"></i></button><button class="action-button delete" data-id="${t.id}" title="Excluir" aria-label="Excluir"><i class="fas fa-trash" aria-hidden="true"></i></button></td>`; return tr; },()=>{ const b=document.getElementById('tplsBody'); if(!b) return; b.querySelectorAll('.edit').forEach(el=>el.addEventListener('click',e=>{ const t=(st.fixedTemplates||[]).find(x=>x.id===e.currentTarget.dataset.id); if(t){page.querySelector('#tplId').value=t.id;page.querySelector('#tplDesc').value=t.description;page.querySelector('#tplValue').value=t.value;page.querySelector('#tplCat').value=t.category;page.querySelector('#tplPM').value=t.paymentMethod;} })); b.querySelectorAll('.delete').forEach(el=>el.addEventListener('click',e=>{ const id=e.currentTarget.dataset.id; showConfirm('Excluir modelo?',()=>{ st.fixedTemplates=(st.fixedTemplates||[]).filter(x=>x.id!==id); window._dataCache['settings']=st; saveAll(); refreshTpls(); }); })); });
  refreshTpls();
  page.querySelector('#tplForm').addEventListener('submit',e=>{
    e.preventDefault(); const id=page.querySelector('#tplId').value||genId(), desc=page.querySelector('#tplDesc').value.trim(), val=parseFloat(page.querySelector('#tplValue').value), cat=page.querySelector('#tplCat').value, pm=page.querySelector('#tplPM').value;
    if(!desc||isNaN(val)){showToast('Preencha todos os campos.','error');return;}
    const obj={id,description:desc,value:val,category:cat,paymentMethod:pm};
    const ex=(st.fixedTemplates||[]).find(x=>x.id===id);
    if(ex){ const old={...ex}; Object.assign(ex,obj);
      window._dataCache['settings']=st; saveAll(); e.target.reset(); page.querySelector('#tplId').value=''; refreshTpls();
      showToastWithUndo('Modelo editado', () => { const t=(loadData('settings').fixedTemplates||[]).find(x=>x.id===id); if(t){Object.assign(t,old);saveAll();refreshTpls();} });
    } else { if(!st.fixedTemplates) st.fixedTemplates=[]; st.fixedTemplates.push(obj);
      window._dataCache['settings']=st; saveAll(); e.target.reset(); page.querySelector('#tplId').value=''; refreshTpls(); showToast('Modelo salvo!');
    }
  });

  // Financings
  if(!st.financings) st.financings=[];
  const financings=st.financings;
  const refreshFinancings=()=>{ const tbody=document.getElementById('financingsBody'); if(!tbody) return; renderTablePaginated(financings,'financingsBody','financings',50,(f)=>{ 
    const paid=f.paidCount||0, total=f.count||0, remaining=total-paid;
    const pct=total>0?(paid/total*100):0;
    const paidAmt=(f.installmentValue||0)*paid;
    const owed=(f.totalValue||0)-paidAmt;
    const tr=document.createElement('tr'); tr.innerHTML=`<td class="u-font-bold">${f.description}</td><td>${fmt(f.totalValue)}</td><td style="min-width:140px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:3px;">${paid}/${total} parcelas · ${fmt(f.installmentValue)}/mês</div><div class="progress-wrap"><div class="progress-fill" style="width:${Math.min(pct,100)}%;background:var(--info);"></div></div><span class="u-label-sm">${pct.toFixed(0)}%</span></td><td style="font-weight:800;color:var(--danger);">${fmt(Math.max(0,owed))}</td><td class="actions"><button class="action-button delete" data-id="${f.id}" title="Excluir" aria-label="Excluir financiamento"><i class="fas fa-trash"></i></button></td>`; return tr; },()=>{ const b=document.getElementById('financingsBody'); if(!b) return; b.querySelectorAll('.delete').forEach(el=>el.addEventListener('click',e=>{ const id=e.currentTarget.dataset.id; showConfirm('Excluir financiamento?',()=>{ const idx=st.financings.findIndex(x=>x.id===id); if(idx>-1) st.financings.splice(idx,1); window._dataCache['settings']=st; saveAll(); refreshFinancings(); }); })); }); };
  refreshFinancings();
  const finTotalEl=page.querySelector('#financingTotal'), finCountEl=page.querySelector('#financingCount'), finInstEl=page.querySelector('#financingInstallment');
  if(finTotalEl&&finCountEl&&finInstEl) {
    const calcInst=()=>{ const t=parseFloat(finTotalEl.value), c=parseInt(finCountEl.value); finInstEl.value=(!isNaN(t)&&!isNaN(c)&&c>0)?(t/c).toFixed(2):''; };
    finTotalEl.addEventListener('input',calcInst); finCountEl.addEventListener('input',calcInst);
    page.querySelector('#financingForm').addEventListener('submit',e=>{ e.preventDefault(); const id=page.querySelector('#financingId').value||genId(), desc=page.querySelector('#financingDesc').value.trim(), total=parseFloat(finTotalEl.value), count=parseInt(finCountEl.value), paid=parseInt(page.querySelector('#financingPaid').value)||0; if(!desc||isNaN(total)||isNaN(count)||count<=0){showToast('Preencha todos os campos.','error');return;} const inst=total/count; const obj={id,description:desc,totalValue:total,count,paidCount:paid,installmentValue:inst}; if(!st.financings) st.financings=[]; const ex=st.financings.find(x=>x.id===id); if(ex) Object.assign(ex,obj); else { st.financings.push(obj); financings.push(obj); } window._dataCache['settings']=st; saveAll(); e.target.reset(); page.querySelector('#financingId').value=''; finInstEl.value=''; refreshFinancings(); showToast('Financiamento salvo!'); });
  }

  // Changelog
  const renderCL=(e='',s='',d='')=>{ let logs=loadData('changelog'); if(e) logs=logs.filter(l=>l.entityType===e); if(s) logs=logs.filter(l=>l.timestamp>=new Date(s).getTime()); if(d) logs=logs.filter(l=>{ const end=new Date(d); end.setHours(23,59,59); return l.timestamp<=end.getTime(); }); renderTablePaginated(logs,'changelogBody','changelog',50,(l)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td style="white-space:nowrap;font-weight:600;">${new Date(l.timestamp).toLocaleString('pt-BR')}</td><td><strong>${l.entityType}</strong><br><span style="font-size:10px;color:var(--text-muted);">${l.entityId}</span></td><td><span class="pill ${l.action.toLowerCase()}">${l.action}</span></td><td style="font-size:13px;color:var(--text-muted);">${formatLogDetails(l)}</td>`; return tr; }); };
  renderCL();
  page.querySelector('#btnFilterChangelog')?.addEventListener('click',()=>renderCL(page.querySelector('#clFilterEntity').value,page.querySelector('#clFilterStart').value,page.querySelector('#clFilterEnd').value));
  page.querySelector('#btnExportChangelog')?.addEventListener('click',()=>{ const logs=loadData('changelog'); const csv='\uFEFF'+['Data;Tipo;Ação;Detalhes',...logs.map(l=>`"${new Date(l.timestamp).toLocaleString('pt-BR')}";"${l.entityType}";"${l.action}";"${formatLogDetails(l).replace(/<[^>]+>/g,'').replace(/"/g,'""')}\"`)].join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`alteracoes_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url); });
  page.querySelector('#btnClearChangelog')?.addEventListener('click',()=>showConfirm('Limpar <b>todo o histórico</b>? (Os dados não são afetados.)',()=>{ window._dataCache['changelog']=[]; saveAll(); renderCL(); showToast('Histórico limpo.'); }));
  page.querySelector('#btnResetOnboarding')?.addEventListener('click',()=>{ localStorage.removeItem(LS+'onboardingDone'); showToast('Onboarding reiniciado!'); checkAndShowOnboarding(); });

  // Export/Import
  page.querySelector('#btnExportJSON')?.addEventListener('click',exportJSON);
  page.querySelector('#btnExportCSVAll')?.addEventListener('click',()=>exportCSV(loadData('transactions'),'todas'));
  page.querySelector('#btnImportJSON')?.addEventListener('click',()=>page.querySelector('#importFile').click());
  page.querySelector('#importFile')?.addEventListener('change',e=>{ if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; });
  page.querySelector('#btnImportCSV')?.addEventListener('click',()=>{ openModal('csvImportModal'); setTimeout(setupCsvImport,100); });

  // Backups
  const renderBackups=()=>{
    const tbody=document.getElementById('backupsBody'); if(!tbody) return;
    const keys=[];
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith(LS+'backup_')) keys.push(k); }
    keys.sort((a,b)=>parseInt(b.replace(LS+'backup_',''))-parseInt(a.replace(LS+'backup_','')));
    renderTablePaginated(keys,'backupsBody','backups',5,(k)=>{ const d=localStorage.getItem(k); if(!d) return null; try { const bd=JSON.parse(d); const tr=document.createElement('tr'); tr.innerHTML=`<td style="font-weight:600;">${bd.dateStr||new Date(bd.timestamp).toLocaleString('pt-BR')}</td><td class="actions"><button class="action-button edit" data-key="${k}" title="Restaurar" aria-label="Restaurar backup"><i class="fas fa-undo"></i></button><button class="action-button delete" data-key="${k}" title="Excluir" aria-label="Excluir backup"><i class="fas fa-trash"></i></button></td>`; return tr; } catch{ return null; } },()=>{ const b=document.getElementById('backupsBody'); if(!b) return; b.querySelectorAll('.edit').forEach(el=>el.addEventListener('click',e=>{ const d=localStorage.getItem(e.currentTarget.dataset.key); if(d) try { const bd=JSON.parse(d); showConfirm('Restaurar este backup? <b>Isso substituirá todos os dados atuais.</b>',()=>{ ['transactions','categories','paymentMethods','budgets','goals','cards','rules','changelog'].forEach(k=>{ window._dataCache[k]=bd[k]||DEFAULTS[k]; }); if(bd.settings){const s=bd.settings;if(!s.fixedTemplates)s.fixedTemplates=[];if(!s.suggestionsLog)s.suggestionsLog={};window._dataCache['settings']=s;} saveAll(); showToast('Backup restaurado!'); setTimeout(()=>location.reload(),1000); }); } catch{} })); b.querySelectorAll('.delete').forEach(el=>el.addEventListener('click',e=>{ const k=e.currentTarget.dataset.key; showConfirm('Excluir este backup local?',()=>{ localStorage.removeItem(k); renderBackups(); showToast('Backup excluído.'); }); })); });
  };
  renderBackups();
  page.querySelector('#btnManualBackup')?.addEventListener('click',()=>{ performBackup(); showToast('Backup salvo!'); renderBackups(); });
}


// ============================
// ROUTING
// ============================
