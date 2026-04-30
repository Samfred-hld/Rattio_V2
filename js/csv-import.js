function parseCsvText(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  
  let sep = ',';
  if (lines[0].includes('\t')) sep = '\t';
  else if (lines[0].includes(';')) sep = ';';

  // Strip BOM and quotes from headers
  const rawHeaders = lines[0].replace(/^\uFEFF/, '').split(sep)
    .map(h => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());

  const dateIdx = rawHeaders.findIndex(h => /^(data|date|dt|fecha)/.test(h));
  const descIdx = rawHeaders.findIndex(h => /descri|hist|memo|detail|lança|establ|comercio|title|name/.test(h));
  const valIdx  = rawHeaders.findIndex(h => /^(valor|value|amount|vl|importe|total|debit)/.test(h));

  const rows = [];
  const seenInternally = new Set();
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const cells = [];
    let cell = '', inQ = false;
    for (const ch of lines[i] + sep) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cells.push(cell.trim()); cell = ''; }
      else { cell += ch; }
    }

    if (cells.length < 2) continue;
    const date  = (dateIdx  >= 0 ? cells[dateIdx]  : cells[0]) || '';
    const desc  = (descIdx  >= 0 ? cells[descIdx]  : cells[1]) || '';
    const rawV  = (valIdx   >= 0 ? cells[valIdx]   : cells[2]) || '';
    if (!desc.trim()) continue;

    // ── Smart amount parsing (Brazilian + US formats) ──
    const value = (function parseAmount(raw) {
      const s = raw.replace(/[^\d.,\-]/g, '').trim();
      if (!s || s === '-') return 0;
      const hasDot = s.includes('.'), hasComma = s.includes(',');
      let num;
      if (hasDot && hasComma) {
        const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
        num = lastComma > lastDot
          ? s.replace(/\./g, '').replace(',', '.')   // 1.234,56
          : s.replace(/,/g, '');                     // 1,234.56
      } else if (hasComma && !hasDot) {
        const afterComma = s.split(',').pop();
        num = (afterComma && afterComma.length === 3)
          ? s.replace(',', '')      // 1,234 (thousands)
          : s.replace(',', '.');    // 1,56  (decimal)
      } else {
        num = s;
      }
      return Math.abs(parseFloat(num)) || 0; // credit card: always positive amount
    })(rawV);

    // ── Date normalization (DD/MM/YYYY or YYYY-MM-DD or MM/DD/YYYY) ──
    let isoDate = '';
    const clean = date.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('/');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      isoDate = clean.slice(0, 10);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('-');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(clean)) {
      // DD/MM/YY
      const [d, m, y] = clean.split('/');
      isoDate = `20${y}-${m}-${d}`;
    } else {
      isoDate = fmtDateISO(new Date());
    }

    // Validation 1: Check if date is valid
    const testDate = new Date(isoDate + 'T12:00:00');
    if (isNaN(testDate.getTime())) {
      isoDate = fmtDateISO(new Date());
    }

    // Validation 2: Range check (before 2000 or > 1 year in future)
    let _dateWarning = false;
    const finalDateObj = new Date(isoDate + 'T12:00:00');
    const limitFuture = new Date();
    limitFuture.setFullYear(limitFuture.getFullYear() + 1);
    const limitPast = new Date('2000-01-01T12:00:00');
    
    if (finalDateObj < limitPast || finalDateObj > limitFuture) {
      _dateWarning = true;
    }

    // Identificação Interna de Duplicatas
    const dupeKey = `${isoDate}|${desc.trim().toLowerCase()}`;
    if (seenInternally.has(dupeKey)) continue;
    seenInternally.add(dupeKey);

    // Identificação de Parcelas e Estornos para Preview
    let txType = 'normal';
    let installmentIndex = null;
    let installmentTotal = null;

    const descLower = desc.toLowerCase();
    if (descLower.includes('estorno') || descLower.includes('cancelamento')) {
      txType = 'refund';
    } else {
      const inst = detectInstallment(desc);
      if (inst) {
        txType = 'installment';
        installmentIndex = inst.index;
        installmentTotal = inst.total;
      }
    }

    // Auto-categorize
    const category = autoCategorize(desc, -value);

    rows.push({ 
      date: isoDate, description: desc, value: -value, category, 
      selected: true, _dateWarning, txType, installmentIndex, installmentTotal 
    });
  }
  return rows;
}

// ── Render preview table ────────────────────────────────────────────────────
function renderCsvPreview(rows) {
  const tbody = document.getElementById('csvPreviewBody');
  const cats  = loadData('categories');
  const existingTxs = loadData('transactions');

  // Duplicate detection: mark rows that match existing transactions
  let dupeCount = 0;
  rows.forEach(r => {
    const isDupe = existingTxs.some(t =>
      t.description.trim().toLowerCase() === r.description.trim().toLowerCase() &&
      t.date === r.date
    );
    r._duplicate = isDupe;
    if (isDupe) dupeCount++;
  });

  csvSelectedRows = new Set(rows.map((r, i) => (r.txType !== 'refund' && r.txType !== 'installment' && !r._duplicate) || (r.txType === 'installment' && r.installmentIndex === 1 && !r._duplicate) ? i : -1).filter(i => i >= 0));

  const autoCatCount = rows.filter(r => r.category && r.category !== 'Outros').length;
  const badge = document.getElementById('csvAutoCategBadge');
  if (badge) {
    badge.style.display = (autoCatCount || dupeCount) ? '' : 'none';
    badge.textContent = dupeCount
      ? `✨ ${autoCatCount} auto-cat · ⚠ ${dupeCount} duplicada(s)`
      : `✨ ${autoCatCount} auto-categorizadas`;
  }

  const instCount = rows.filter(r => r.txType === 'installment').length;
  const refCount  = rows.filter(r => r.txType === 'refund').length;
  const statsEl = document.getElementById('csvTypeStats');
  if (statsEl) {
    const parts = [];
    if (instCount) parts.push(`<span style="color:var(--info);font-weight:700;">${instCount} parcela(s)</span>`);
    if (refCount)  parts.push(`<span style="color:var(--warning);font-weight:700;">${refCount} estorno(s)</span>`);
    statsEl.innerHTML = parts.length ? parts.join(' · ') : '';
  }

  tbody.innerHTML = rows.map((r, i) => {
    let rowStyle = '';
    let typeBadge = '';
    let checkboxDisabled = false;
    let checkedAttr = csvSelectedRows.has(i) ? 'checked' : '';

    if (r.txType === 'refund') {
      rowStyle = 'background:var(--warning-light);';
      typeBadge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;background:var(--warning-light);color:#b45309;border:1px solid #fde68a;">Estorno (ignorar)</span>';
      checkboxDisabled = true;
      checkedAttr = '';
    } else if (r.txType === 'installment') {
      if (r.installmentIndex === 1) {
        typeBadge = `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;background:var(--info-light);color:#1d4ed8;">Parcela 1/${r.installmentTotal}</span>`;
      } else {
        rowStyle = 'background:rgba(37,99,235,0.04);';
        typeBadge = `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;background:var(--info-light);color:#1d4ed8;">Parcela ${r.installmentIndex}/${r.installmentTotal}</span>
          <div style="font-size:10px;color:var(--info);margin-top:2px;font-weight:600;">Será gerada automaticamente</div>`;
        checkboxDisabled = true;
        checkedAttr = '';
      }
    } else {
      if (r._duplicate) {
        rowStyle = 'background:rgba(239,68,68,0.06);';
        typeBadge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;background:var(--danger-light);color:var(--danger);border:1px solid #fecaca;">⚠ Duplicada</span>';
        checkboxDisabled = true;
        checkedAttr = '';
      } else {
        typeBadge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:2px;background:var(--accent-light);color:var(--accent-dark-green);">Simples</span>';
      }
    }

    const valueColor = r.value < 0 ? 'var(--danger)' : 'var(--success)';
    const valueSign  = r.value < 0 ? '-' : '+';

    let dateHtml = `<td style="white-space:nowrap;font-size:12px;">${fmtDate(r.date)}</td>`;
    if (r._dateWarning) {
      dateHtml = `<td style="white-space:nowrap;font-size:12px;color:#d97706;font-weight:700;" title="Data fora do intervalo esperado — verifique">⚠️ ${fmtDate(r.date)}</td>`;
    }

    return `
    <tr id="csvRow_${i}" style="${rowStyle}">
      <td><input type="checkbox" class="csv-row-check" data-idx="${i}" ${checkedAttr} ${checkboxDisabled ? 'disabled' : ''} aria-label="Selecionar linha ${i+1}"></td>
      ${dateHtml}
      <td style="max-width:200px;font-size:12px;word-break:break-word;">${escapeHtml(r.description)}</td>
      <td>${typeBadge}</td>
      <td style="font-weight:700;color:${valueColor};white-space:nowrap;">${valueSign}${fmt(Math.abs(r.value))}</td>
      <td>
        <select class="csv-cat-select" data-idx="${i}"
          style="font-size:11px;padding:4px 8px;border-radius:2px;border:1px solid var(--border-color);background:var(--bg-light);color:var(--text-primary);max-width:150px;">
          ${cats.map(c => `<option value="${escapeHtml(c)}" ${c === r.category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.csv-row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const idx = parseInt(cb.dataset.idx);
      cb.checked ? csvSelectedRows.add(idx) : csvSelectedRows.delete(idx);
      updateCsvCount();
    });
  });

  tbody.querySelectorAll('.csv-cat-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.dataset.idx);
      csvParsedRows[idx].category = sel.value;
    });
  });

  updateCsvCount();
}
function updateCsvCount() {
  const el = document.getElementById('csvSelCount');
  if (el) el.textContent = `${csvSelectedRows.size} de ${csvParsedRows.length} selecionadas`;
}

// ── Setup all CSV modal event listeners ────────────────────────────────────
function setupCsvImport() {
  if (window._csvSetupDone) return;
  window._csvSetupDone = true;

  const fileInput  = document.getElementById('csvFileInput');
  const selectBtn  = document.getElementById('csvSelectBtn');
  const dropZone   = document.getElementById('csvDropZone');
  const cardSelect = document.getElementById('csvCardSelect');
  if (!fileInput) return;

  // Populate card dropdown
  function populateCsvCards() {
    const cards = loadData('cards');
    cardSelect.innerHTML = '<option value="">— Selecione o cartão —</option>' +
      cards.map(c => `<option value="${escapeHtml(c.id)}" style="color:${c.color || '#333'}">${escapeHtml(c.name)}</option>`).join('');
  }
  populateCsvCards();

  const processFile = (file) => {
    if (!file) return;
    fileInput.value = ''; // Garante que o mesmo arquivo possa ser selecionado novamente
    if (!cardSelect.value) {
      showToast('Selecione o cartão antes de continuar.', 'error');
      cardSelect.focus();
      return;
    }
    document.getElementById('csvFileInfo').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => {
      csvParsedRows = parseCsvText(e.target.result);
      if (!csvParsedRows.length) {
        showToast('Nenhum lançamento encontrado no arquivo.', 'error');
        return;
      }
      document.getElementById('csvParseInfo').textContent =
        `${csvParsedRows.length} lançamentos encontrados`;

      // Show selected card badge
      const cards = loadData('cards');
      const card  = cards.find(c => c.id === cardSelect.value);
      const badge = document.getElementById('csvCardBadgeText');
      if (badge && card) badge.textContent = card.name;

      renderCsvPreview(csvParsedRows);
      document.getElementById('importStep1').classList.remove('active');
      document.getElementById('importStep2').classList.add('active');
    };
    reader.readAsText(file, 'UTF-8');
  };

  selectBtn?.addEventListener('click', () => fileInput.click());
  dropZone?.addEventListener('click',  () => fileInput.click());
  fileInput?.addEventListener('change', e => processFile(e.target.files[0]));
  dropZone?.addEventListener('dragover',  e => { e.preventDefault(); dropZone.style.borderColor = 'var(--success)'; dropZone.style.background = 'var(--accent-light)'; });
  dropZone?.addEventListener('dragleave', ()  => { dropZone.style.borderColor = ''; dropZone.style.background = ''; });
  dropZone?.addEventListener('drop',      e  => { e.preventDefault(); dropZone.style.borderColor = ''; dropZone.style.background = ''; processFile(e.dataTransfer.files[0]); });

  // Select all
  document.getElementById('csvSelectAll')?.addEventListener('change', e => {
    document.querySelectorAll('.csv-row-check').forEach(cb => {
      if (cb.disabled) return;
      cb.checked = e.target.checked;
      const idx = parseInt(cb.dataset.idx);
      e.target.checked ? csvSelectedRows.add(idx) : csvSelectedRows.delete(idx);
    });
    updateCsvCount();
  });
  document.getElementById('csvHeaderCheck')?.addEventListener('change', e => {
    const sel = document.getElementById('csvSelectAll');
    sel.checked = e.target.checked;
    sel.dispatchEvent(new Event('change'));
  });

  // Back button
  document.getElementById('csvBackBtn')?.addEventListener('click', () => {
    document.getElementById('importStep2').classList.remove('active');
    document.getElementById('importStep1').classList.add('active');
  });

  // Confirm import
  document.getElementById('csvConfirmBtn')?.addEventListener('click', () => {
    if (!csvSelectedRows.size) { showToast('Selecione ao menos um lançamento.', 'error'); return; }
    const cardId = cardSelect.value;
    if (!cardId) { showToast('Nenhum cartão selecionado.', 'error'); return; }
    const cards = loadData('cards');
    const card  = cards.find(c => c.id === cardId);
    const txs   = loadData('transactions');
    let added = 0, skippedRefund = 0, skippedInst = 0, seriesCreated = 0, dateWarningsCount = 0;

    csvParsedRows.forEach((r, i) => {
      if (!csvSelectedRows.has(i)) return;
      if (r._dateWarning) dateWarningsCount++;
      if (r.txType === 'refund') { skippedRefund++; return; }
      const inst = detectInstallment(r.description);
      if (inst && inst.index > 1) { skippedInst++; return; }
      if (inst && inst.index === 1) {
        const paymentMethod = card ? `Crédito - ${card.name}` : 'Crédito';
        createInstallmentSeries({
          description: inst.cleanTitle, date: r.date,
          perInstallmentValue: Math.abs(r.value), count: inst.total,
          category: r.category || 'Outros', paymentMethod,
          cardId, isFixed: false, goalId: null
        });
        seriesCreated++; added += inst.total; return;
      }
      const o = buildTxObj({
        id: genId(), date: r.date, description: r.description,
        value: -Math.abs(r.value),
        category: csvParsedRows[i].category || 'Outros',
        paymentMethod: card ? `Crédito - ${card.name}` : 'Crédito',
        cardId, isFixedExpense: false, isInstallment: false
      });
      txs.push(o); logChange('transaction', o.id, 'CREATE', null, o); added++;
    });

    saveAll(); invalidateCalcCache(); updateAutocompleteList();
    closeModal('csvImportModal');
    let msg = `${added} lançamento(s) importado(s)`;
    const extras = [];
    if (seriesCreated) extras.push(`${seriesCreated} série(s) de parcelas criada(s)`);
    if (skippedRefund) extras.push(`${skippedRefund} estorno(s) ignorado(s)`);
    if (skippedInst) extras.push(`${skippedInst} parcela(s) derivada(s) ignorada(s)`);
    if (dateWarningsCount) extras.push(`⚠️ ${dateWarningsCount} com data suspeita`);
    if (extras.length) msg += ` — ${extras.join(', ')}`;
    showToast(msg);
    renderActiveTab();
  });
}

// ============================
// SWIPE-TO-DELETE (MOBILE)
// ============================
function setupSwipeToDelete(containerSelector, itemSelector, getIdFromElement) {
  if (window.innerWidth >= 768) return;
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let openItem = null; // currently swiped-open item

  function closeOpen() {
    if (openItem) {
      openItem.classList.remove('swiped');
      const bg = openItem.previousElementSibling;
      if (bg) bg.classList.remove('visible');
      openItem = null;
    }
  }

  container.querySelectorAll(itemSelector).forEach(item => {
    if (item._swipeBound) return;
    item._swipeBound = true;

    // Wrap item if not already wrapped
    const parent = item.parentElement;
    if (!parent.classList.contains('swipe-item-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'swipe-item-wrap';
      const bg = document.createElement('div');
      bg.className = 'swipe-delete-bg';
      bg.innerHTML = '<i class="fas fa-trash"></i>';
      parent.insertBefore(wrap, item);
      wrap.appendChild(bg);
      wrap.appendChild(item);
      item.classList.add('swipe-item');
    }

    const bg = item.previousElementSibling;
    let startX = 0, startY = 0, dx = 0, locked = false, isHorizontal = false;

    item.addEventListener('touchstart', (e) => {
      if (openItem && openItem !== item) closeOpen();
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dx = 0;
      locked = false;
      isHorizontal = false;
      item.style.transition = 'none';
    }, { passive: true });

    item.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!locked) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          isHorizontal = true;
          locked = true;
        } else if (Math.abs(dy) > 10) {
          locked = true; // vertical scroll, do nothing
          return;
        } else {
          return;
        }
      }

      if (!isHorizontal) return;
      e.preventDefault();

      const isSwiped = item.classList.contains('swiped');
      const offset = isSwiped ? Math.min(0, dx) : Math.min(0, dx);
      const clamped = Math.max(-80, Math.min(0, offset));
      item.style.transform = `translateX(${clamped}px)`;
      bg.classList.toggle('visible', clamped < -20);
    }, { passive: false });

    item.addEventListener('touchend', () => {
      item.style.transition = '';
      if (!isHorizontal) return;

      const isSwiped = item.classList.contains('swiped');
      const threshold = isSwiped ? -30 : -50; // easier to close, harder to open

      if (isSwiped) {
        // Was open: close if swiped right enough, or if tapped (dx ~0)
        if (dx > 30 || Math.abs(dx) < 5) {
          closeOpen();
        } else {
          item.classList.add('swiped');
          bg.classList.add('visible');
        }
      } else {
        // Was closed: open if swiped left enough
        if (dx < threshold) {
          closeOpen();
          item.classList.add('swiped');
          bg.classList.add('visible');
          openItem = item;
        } else {
          item.style.transform = '';
          bg.classList.remove('visible');
        }
      }
    }, { passive: true });

    // Tap on delete background → confirm delete
    bg.addEventListener('click', () => {
      const id = getIdFromElement(item);
      if (!id) return;
      showConfirm('Excluir esta transação?', () => {
        deleteTransaction(id);
      });
    });
  });

  // Close swipe on tap outside
  document.addEventListener('touchstart', (e) => {
    if (openItem && !openItem.parentElement.contains(e.target)) {
      closeOpen();
    }
  }, { passive: true });
}

// ============================
// ONBOARDING
// ============================
function checkAndShowOnboarding() {
  if (localStorage.getItem(LS + 'onboardingDone')) return;
  setTimeout(() => { showOnboardingModal(); }, 500);
}

function showOnboardingModal() {
  let step = 1;
  let obCards = []; // {name, closingDay, dueDay}

  function updateDots() {
    document.querySelectorAll('#onb-progress .onb-dot').forEach((d, i) => {
      d.classList.toggle('active', i < step);
    });
  }

  function renderStep1() {
    const st = loadData('settings');
    document.getElementById('onb-title').textContent = 'Bem-vindo ao Rattio 👋';
    document.getElementById('onb-subtitle').textContent = 'Vamos configurar suas finanças em 3 passos rápidos';
    document.getElementById('onb-body').innerHTML = `
      <div class="onb-step">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:18px;line-height:1.6;">
          Para personalizar o app, precisamos de algumas informações básicas sobre sua renda.
        </p>
        <div class="form-group" class="u-mb-14">
          <label for="onbSalary">Qual é o seu salário mensal? (R$)</label>
          <input type="number" id="onbSalary" step="0.01" placeholder="Ex: 5000" value="${st.salaryValue || ''}">
        </div>
        <div class="form-group" style="margin-bottom:20px;">
          <label for="onbSalaryDay">Em qual dia você recebe?</label>
          <input type="number" id="onbSalaryDay" min="1" max="31" placeholder="Ex: 5" value="${st.salaryDay || ''}">
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button class="btn" id="onbNext1">Próximo →</button>
        </div>
      </div>`;
    document.getElementById('onbNext1').addEventListener('click', () => {
      const v = parseFloat(document.getElementById('onbSalary').value);
      const d = parseInt(document.getElementById('onbSalaryDay').value);
      const st = loadData('settings');
      if (!isNaN(v) && v > 0) st.salaryValue = v;
      if (!isNaN(d) && d >= 1 && d <= 31) st.salaryDay = d;
      window._dataCache['settings'] = st;
      step = 2;
      updateDots();
      renderStep2();
    });
  }

  function renderStep2() {
    document.getElementById('onb-title').textContent = 'Seus cartões de crédito 💳';
    document.getElementById('onb-subtitle').textContent = 'Adicione seus cartões para importar faturas e controlar gastos';
    renderStep2Body();
  }

  function renderStep2Body() {
    const cardTags = obCards.map((c, i) =>
      `<span class="onb-card-tag"><i class="fas fa-credit-card"></i> ${escapeHtml(c.name)} (dia ${c.closingDay})<button class="onb-remove-card" data-idx="${i}"><i class="fas fa-times"></i></button></span>`
    ).join('');

    document.getElementById('onb-body').innerHTML = `
      <div class="onb-step">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:14px;line-height:1.6;">
          Adicione seus cartões de crédito para vincular gastos e importar faturas automaticamente. Você pode pular esta etapa.
        </p>
        <div class="onb-card-add">
          <input type="text" id="onbCardName" placeholder="Nome (ex: Nubank)" style="flex:2;">
          <input type="number" id="onbCardClosing" min="1" max="31" placeholder="Fechamento" style="flex:1;">
          <input type="number" id="onbCardDue" min="1" max="31" placeholder="Vencimento" style="flex:1;">
          <button class="btn small" id="onbAddCard" style="background:var(--info);"><i class="fas fa-plus"></i></button>
        </div>
        <div class="onb-card-list">${cardTags}</div>
        <div style="display:flex;justify-content:space-between;margin-top:20px;">
          <button class="btn secondary" id="onbSkip2">Pular</button>
          <button class="btn" id="onbNext2">Próximo →</button>
        </div>
      </div>`;

    document.getElementById('onbAddCard').addEventListener('click', () => {
      const name = document.getElementById('onbCardName').value.trim();
      const closing = parseInt(document.getElementById('onbCardClosing').value);
      const due = parseInt(document.getElementById('onbCardDue').value);
      if (!name) { showToast('Informe o nome do cartão.', 'error'); return; }
      if (!closing || closing < 1 || closing > 31) { showToast('Dia de fechamento inválido.', 'error'); return; }
      if (!due || due < 1 || due > 31) { showToast('Dia de vencimento inválido.', 'error'); return; }
      obCards.push({ name, closingDay: closing, dueDay: due });
      renderStep2Body();
    });

    document.querySelectorAll('.onb-remove-card').forEach(btn => {
      btn.addEventListener('click', () => {
        obCards.splice(parseInt(btn.dataset.idx), 1);
        renderStep2Body();
      });
    });

    document.getElementById('onbSkip2').addEventListener('click', () => { step = 3; updateDots(); renderStep3(); });
    document.getElementById('onbNext2').addEventListener('click', () => { step = 3; updateDots(); renderStep3(); });
  }

  function renderStep3() {
    const st = loadData('settings');
    const summaryParts = [];
    if (st.salaryValue) summaryParts.push(`Salário: ${fmt(st.salaryValue)} (dia ${st.salaryDay || '?'})`);
    if (obCards.length) summaryParts.push(`${obCards.length} cartão(ões) adicionado(s)`);
    if (!summaryParts.length) summaryParts.push('Configuração básica concluída');

    document.getElementById('onb-title').textContent = 'Pronto para começar! 🎉';
    document.getElementById('onb-subtitle').textContent = 'Tudo configurado. Comece a registrar seus gastos!';
    document.getElementById('onb-body').innerHTML = `
      <div class="onb-step">
        <div style="background:var(--accent-light);border-radius:3px;padding:18px;margin-bottom:20px;">
          <div style="font-weight:700;font-size:13px;color:var(--accent-dark-green);margin-bottom:8px;">Resumo da configuração</div>
          ${summaryParts.map(s => `<div style="font-size:13px;color:var(--text-main);padding:3px 0;">✓ ${escapeHtml(s)}</div>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn" id="onbFirstTx" class="u-w-full u-flex-center"><i class="fas fa-plus"></i> Lançar primeira transação</button>
          <button class="btn secondary" id="onbExplore" class="u-w-full u-flex-center">Explorar o app</button>
        </div>
      </div>`;

    document.getElementById('onbFirstTx').addEventListener('click', () => {
      finishOnboarding();
      setTimeout(() => openTransactionModal('expense'), 300);
    });
    document.getElementById('onbExplore').addEventListener('click', () => {
      finishOnboarding();
    });
  }

  function finishOnboarding() {
    // Save cards if any were added
    if (obCards.length) {
      const cards = loadData('cards');
      obCards.forEach(c => {
        cards.push({
          id: genId(),
          name: c.name,
          color: '#8b5cf6',
          closingDay: c.closingDay,
          dueDay: c.dueDay,
          limit: 0
        });
      });
      window._dataCache['cards'] = cards;
    }
    saveAll();
    invalidateCalcCache();
    localStorage.setItem(LS + 'onboardingDone', '1');
    closeModal('onboardingModal');
    showToast('Configuração concluída! Bem-vindo ao Rattio 🎉');
    renderActiveTab();
  }

  openModal('onboardingModal');
  renderStep1();
  updateDots();
}

// ============================
// RECURRING TRANSACTIONS AUTO-CREATE
// ============================
function processRecurringTransactions() {
  const txs = loadData('transactions');
  const recurringDefs = txs.filter(t => t.recurring && !t.parentId);
  if (!recurringDefs.length) return;

  let created = 0;
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();

  for (const def of recurringDefs) {
    const freq = def.recurring; // 'monthly', 'weekly', 'annual'
    // Find the latest instance of this recurring transaction
    const instances = txs.filter(t =>
      t.description === def.description &&
      t.value === def.value &&
      t.category === def.category &&
      t.recurring === freq
    ).sort((a, b) => parseDateISO(b.date) - parseDateISO(a.date));

    const lastDate = instances.length ? parseDateISO(instances[0].date) : parseDateISO(def.date);

    // Determine next occurrence
    let nextDate;
    if (freq === 'monthly') {
      nextDate = safeDate(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
    } else if (freq === 'weekly') {
      nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (freq === 'annual') {
      nextDate = safeDate(lastDate.getFullYear() + 1, lastDate.getMonth(), lastDate.getDate());
    }

    if (!nextDate) continue;

    // Create all missing occurrences up to current month
    while (nextDate <= now) {
      const nextY = nextDate.getFullYear();
      const nextM = nextDate.getMonth();
      const nextISO = fmtDateISO(nextDate);

      // Check if already exists for this month/period
      const exists = txs.some(t =>
        t.description === def.description &&
        t.value === def.value &&
        t.category === def.category &&
        t.date === nextISO
      );

      if (!exists) {
        const o = buildTxObj({
          id: genId(),
          date: nextISO,
          description: def.description,
          value: def.value,
          category: def.category,
          paymentMethod: def.paymentMethod,
          isFixedExpense: def.isFixedExpense,
          isInstallment: false,
          cardId: def.cardId || null,
          goalId: def.goalId || null,
          recurring: freq
        });
        txs.push(o);
        logChange('transaction', o.id, 'CREATE', null, o);
        created++;
      }

      // Advance to next occurrence
      if (freq === 'monthly') {
        nextDate = safeDate(nextY, nextM + 1, lastDate.getDate());
      } else if (freq === 'weekly') {
        nextDate = new Date(nextDate);
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (freq === 'annual') {
        nextDate = safeDate(nextY + 1, lastDate.getMonth(), lastDate.getDate());
      }
    }
  }

  if (created > 0) {
    window._dataCache['transactions'] = txs;
    saveAll();
    invalidateCalcCache();
    showToast(`${created} transação(ões) recorrente(s) criada(s) automaticamente.`);
  }
}

// ============================
// INIT
// ============================
function init() {
  console.log(`%c Rattio v${BUILD_INFO.version} (${BUILD_INFO.date}) `, 'background:#1B2A4A;color:#60A5FA;padding:4px 8px;border-radius:4px;font-weight:bold;');
  migrateIfNeeded();
  const sc=localStorage.getItem(LS+'sidebar'); if(sc){sidebarCollapsed=JSON.parse(sc);document.getElementById('sidebar').classList.toggle('collapsed',sidebarCollapsed);}
  initDarkMode();
  // Load dashboard section preferences
  loadDashboardSections();
  clearCache(); updateAutocompleteList(); setupAutocomplete(document.getElementById('transactionDescription'));
  processRecurringTransactions();
  renderActiveTab();
  updateAlertBadges();
  // New features init
  setupCsvImport();
  checkDueNotifications();
  requestNotificationPermission();
  checkAndShowOnboarding();
  checkStorageUsage();
}

// ============================
// ALERT BADGES ON NAV
// ============================
function updateAlertBadges() {
  const budgets = loadData('budgets');
  let alertCount = 0;
  budgets.forEach(b => { const spent = getCatTotal(b.category, currentMonth, currentYear); const pct = b.limit > 0 ? (spent/b.limit)*100 : 0; if(pct >= 80) alertCount++; });
  const dashBtn = document.querySelector('.nav-button[data-tab="dashboard"]');
  if (dashBtn) {
    let badge = dashBtn.querySelector('.nav-badge');
    if (alertCount > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; dashBtn.insertBefore(badge, dashBtn.querySelector('.kbd-badge')); }
      badge.textContent = alertCount;
    } else if (badge) { badge.remove(); }
  }
}

// ============================
// KEYBOARD SHORTCUTS (ENHANCED)
// ============================
document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // Ctrl+K → Global search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openGlobalSearch();
    return;
  }
  // ESC → close global search or modals
  if (e.key === 'Escape') {
    if (document.getElementById('globalSearchOverlay').classList.contains('open')) { closeGlobalSearch(); return; }
    document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id));
    return;
  }
  if (isInput) return;
  // Number keys 1-8 → switch tab
  const tabMap = {'1':'dashboard','2':'transactions','3':'budgets','4':'goals','5':'calendar','6':'reports','7':'configurations'};
  if (tabMap[e.key]) { e.preventDefault(); switchTab(tabMap[e.key]); return; }
  // N → new transaction
  if (e.key === 'n') { e.preventDefault(); openTransactionModal('expense'); }

  // Arrow keys in global search
  if (document.getElementById('globalSearchOverlay').classList.contains('open')) {
    if (e.key === 'ArrowDown') { e.preventDefault(); searchSelectedIndex = Math.min(searchSelectedIndex+1, searchResults.length-1); updateSearchSelection(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); searchSelectedIndex = Math.max(searchSelectedIndex-1, 0); updateSearchSelection(); }
    if (e.key === 'Enter' && searchSelectedIndex >= 0) { e.preventDefault(); selectSearchResult(searchSelectedIndex); }
  }
});

// ============================
// GLOBAL SEARCH EVENT LISTENERS
// ============================
document.getElementById('darkToggleBtn').addEventListener('click', toggleDarkMode);
document.getElementById('globalSearchBtn').addEventListener('click', openGlobalSearch);
document.getElementById('globalSearchOverlay').addEventListener('click', e => { if(e.target === document.getElementById('globalSearchOverlay')) closeGlobalSearch(); });
document.getElementById('globalSearchInput').addEventListener('input', function() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => renderGlobalSearchResults(this.value.trim()), 200);
});

// ══════════════════════════════════════════
// EVENT DELEGATION — Central handler (JS-01)
// ══════════════════════════════════════════
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    case 'edit-tx': {
      const type = btn.dataset.type || 'expense';
      const tx = loadData('transactions').find(x => x.id === id);
      if (tx) openTransactionModal(type, tx);
      break;
    }
    case 'delete-tx':
      if (id) deleteTransaction(id);
      break;
    case 'deposit-goal':
      if (id) {
        const g = loadData('goals').find(x => x.id === id);
        if (g) openDepositModal(g);
      }
      break;
    case 'edit-goal':
      if (id) editGoal(id);
      break;
    case 'delete-goal':
      if (id) deleteGoal(id);
      break;
    case 'inv-history':
      if (id) showInvHistory(id);
      break;
    case 'switch-tab':
      if (btn.dataset.tab) switchTab(btn.dataset.tab);
      break;
    case 'dash-customize':
      openDashCustomize();
      break;
    case 'dash-move-section-up':
      if (id !== undefined) dashMoveSection(parseInt(id), -1);
      break;
    case 'dash-move-section-down':
      if (id !== undefined) dashMoveSection(parseInt(id), 1);
      break;
    case 'dash-toggle-section':
      if (id !== undefined) dashToggleSection(parseInt(id));
      break;
    case 'dash-reset-sections':
      dashResetSections();
      break;
    case 'qe-set-type':
      if (btn.dataset.type) qeSetType(btn.dataset.type);
      break;
    case 'qe-submit':
      quickEntrySubmit();
      break;
    case 'change-month':
      if (btn.dataset.delta) changeMonth(parseInt(btn.dataset.delta));
      break;
    case 'toggle-config-section':
      if (id) toggleConfigSection(id);
      break;
    case 'remove-dynamic-modal':
      if (id) {
        const modalToRemove = document.getElementById(id);
        if (modalToRemove) modalToRemove.remove();
      }
      break;
    case 'day-detail-edit': {
      const modal = document.getElementById('dayDetailModal');
      if (modal) modal.remove();
      const all = loadData('transactions');
      const tx  = all.find(x => x.id === id);
      if (tx) openTransactionModal(tx.value > 0 ? 'income' : 'expense', tx);
      break;
    }
    case 'day-detail-delete': {
      const modal = document.getElementById('dayDetailModal');
      if (modal) modal.remove();
      deleteTransaction(id);
      break;
    }
    case 'day-detail-add': {
      const modal = document.getElementById('dayDetailModal');
      if (modal) modal.remove();
      openTransactionModal('expense');
      setTimeout(() => {
        const el = document.getElementById('transactionDate');
        if (el) { el.value = id; validateForm(); }
      }, 60);
      break;
    }
    case 'export-json':
      exportJSON();
      break;
    default:
      break;
  }
});

// ══════════════════════════════════════════
// KEYBOARD NAVIGATION — Delegated (AA-05)
// ══════════════════════════════════════════
document.addEventListener('keydown', e => {
  const el = e.target;

  // Transaction list items: Enter/Space → open edit modal
  if (el.matches('.tx-list-item[role="listitem"]') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    const txId = el.dataset.txId;
    if (txId) {
      const tx = loadData('transactions').find(x => x.id === txId);
      if (tx) openTransactionModal(tx.value > 0 ? 'income' : 'expense', tx);
    }
    return;
  }

  // Transaction list items: Delete key → confirm delete
  if (el.matches('.tx-list-item[role="listitem"]') && e.key === 'Delete') {
    e.preventDefault();
    const txId = el.dataset.txId;
    if (txId) deleteTransaction(txId);
    return;
  }

  // Goal cards: Enter/Space → switch to goals tab
  if (el.matches('.goal-card[data-action]') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    el.click();
    return;
  }

  // Alert items: Enter/Space → switch tab
  if (el.matches('.alert-item[data-action]') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    el.click();
    return;
  }

  // Dashboard sections with data-action: Enter/Space
  if (el.matches('[data-action="switch-tab"]') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    el.click();
    return;
  }
});

init();

// ── Expose functions used in dynamically-generated inline onclick handlers ──
window.loadData             = loadData;
window.openDepositModal     = openDepositModal;
window.openTransactionModal = openTransactionModal;
window.deleteTransaction    = deleteTransaction;
window.validateForm         = validateForm;
window.showDayDetail        = showDayDetail;
// Quick-entry transaction form
window.qeSwitchTab          = qeSwitchTab;
window.openDashCustomize     = openDashCustomize;
window.qeSetType            = qeSetType;
window.quickEntrySubmit     = quickEntrySubmit;
window.qeFilterList         = qeFilterList;
// Dashboard customization
window.dashMoveSection      = dashMoveSection;
window.dashToggleSection    = dashToggleSection;
window.dashResetSections    = dashResetSections;
window.changeMonth          = changeMonth;
// Investments/Goals
window.deleteGoal           = deleteGoal;
window.editGoal             = editGoal;
window.showInvHistory       = showInvHistory;
