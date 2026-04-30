function renderTablePaginated(data, tbodyId, stateKey, perPage=50, rowFn, doneFn=null) {
  if (!paginationState[stateKey]) paginationState[stateKey] = 1;
  paginate({
    items: data,
    containerId: tbodyId,
    state: { get page() { return paginationState[stateKey]; }, set page(v) { paginationState[stateKey] = v; } },
    perPage,
    renderRow: rowFn,
    onPageChange: doneFn,
    isTable: true
  });
}

// ═══ MOBILE: Auto-add data-label to table cells for responsive card layout ═══
function addDataLabelsToTables() {
  document.querySelectorAll('table.data-table').forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (!headers.length) return;
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.children).forEach((cell, i) => {
        if (i < headers.length && !cell.hasAttribute('data-label') && !cell.classList.contains('actions')) {
          cell.setAttribute('data-label', headers[i]);
        }
      });
    });
  });
}
// Wrap renderTablePaginated to auto-add labels after render
const _origRenderTablePaginated = renderTablePaginated;
renderTablePaginated = function(data, tbodyId, stateKey, perPage, rowFn, doneFn) {
  const wrappedDone = () => { if (doneFn) doneFn(); setTimeout(addDataLabelsToTables, 50); };
  _origRenderTablePaginated(data, tbodyId, stateKey, perPage, rowFn, wrappedDone);
};
// Run on DOM ready + observe for dynamic table changes
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addDataLabelsToTables, 200);
  // MutationObserver to catch dynamically rendered tables
  const observer = new MutationObserver(() => { requestAnimationFrame(addDataLabelsToTables); });
  observer.observe(document.body, { childList: true, subtree: true });
});

// ══════════════════════════════════════════
// PAGINAÇÃO UNIFICADA (QC-01)
// ══════════════════════════════════════════
/**
 * Renderiza itens paginados em qualquer container (tbody ou div).
 * @param {Object} opts
 * @param {Array} opts.items - Dados a paginar
 * @param {string} opts.containerId - ID do container (tbody ou div)
 * @param {Object} opts.state - Objeto com propriedade `page` (mutável): { page: 1 }
 * @param {number} [opts.perPage=50] - Itens por página
 * @param {Function} opts.renderRow - (item, index) => HTMLElement|string
 * @param {Function} [opts.onPageChange] - Callback após troca de página
 * @param {string} [opts.emptyText='Nenhum item.'] - Texto quando vazio
 * @param {boolean} [opts.isTable=false] - Se true, usa appendChild em tbody; se false, usa innerHTML em div
 */
function paginate({ items, containerId, state, perPage = 50, renderRow, onPageChange, emptyText = 'Nenhum item.', isTable = false }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = items.length;
  const totalPages = Math.ceil(total / perPage) || 1;

  // Clamp page
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const page = state.page;
  const start = (page - 1) * perPage;
  const slice = items.slice(start, start + perPage);

  // Render empty state
  if (!total) {
    if (isTable) {
      container.innerHTML = `<tr><td colspan="100%" style="text-align:center;padding:32px;color:var(--text-muted);">${emptyText}</td></tr>`;
    } else {
      container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:14px;">${emptyText}</div>`;
    }
    hidePagination(containerId);
    if (onPageChange) onPageChange(page);
    return;
  }

  // Render items
  if (isTable) {
    container.innerHTML = '';
    slice.forEach((item, i) => { const el = renderRow(item, start + i); if (el) container.appendChild(el); });
  } else {
    container.innerHTML = slice.map((item, i) => renderRow(item, start + i)).join('');
  }

  // Render pagination controls
  renderPaginationControls(containerId, { page, totalPages, total, items, state, perPage, renderRow, onPageChange, emptyText, isTable });

  if (onPageChange) onPageChange(page);
}

function renderPaginationControls(containerId, ctx) {
  const { page, totalPages, total } = ctx;
  let pag = document.getElementById(containerId + '_pag');
  if (!pag) {
    const container = document.getElementById(containerId);
    pag = document.createElement('div');
    pag.id = containerId + '_pag';
    pag.className = 'pagination-container';
    if (container) container.parentNode.insertBefore(pag, container.nextSibling);
  }
  if (totalPages <= 1) { pag.innerHTML = ''; pag.style.display = 'none'; return; }
  pag.style.display = 'flex';

  let btns = `<button class="page-btn" data-p="${page-1}" ${page===1?'disabled':''}>Ant.</button>`;
  let sp = Math.max(1, page - 2), ep = Math.min(totalPages, page + 2);
  if (sp > 1) { btns += `<button class="page-btn" data-p="1">1</button>`; if (sp > 2) btns += `<span style="padding:6px 4px">…</span>`; }
  for (let i = sp; i <= ep; i++) btns += `<button class="page-btn ${i===page?'active':''}" data-p="${i}">${i}</button>`;
  if (ep < totalPages) { if (ep < totalPages - 1) btns += `<span style="padding:6px 4px">…</span>`; btns += `<button class="page-btn" data-p="${totalPages}">${totalPages}</button>`; }
  btns += `<button class="page-btn" data-p="${page+1}" ${page===totalPages?'disabled':''}>Próx.</button>`;
  pag.innerHTML = `<div class="pagination-info">${total} itens | Pág ${page}/${totalPages}</div><div class="pagination-controls">${btns}</div>`;

  pag.querySelectorAll('.page-btn').forEach(b => {
    if (!b.disabled && !b.classList.contains('active')) {
      b.addEventListener('click', () => {
        ctx.state.page = parseInt(b.dataset.p);
        paginate(ctx);
      });
    }
  });
}

function hidePagination(containerId) {
  const pag = document.getElementById(containerId + '_pag');
  if (pag) { pag.innerHTML = ''; pag.style.display = 'none'; }
}

// ============================
// AUTOCOMPLETE
// ============================
function updateAutocompleteList() { autocompleteDescriptions = [...new Set(loadData('transactions').map(t=>t.description))]; }
function setupAutocomplete(inp) {
  const list = document.getElementById('autocomplete-list');
  inp.addEventListener('input', function() {
    const val=this.value; list.innerHTML=''; list.classList.add('hidden');
    if(!val) return;
    const matches = autocompleteDescriptions.filter(d=>d.toUpperCase().includes(val.toUpperCase())).slice(0, CONFIG.AUTOCOMPLETE_MAX_ITEMS);
    if(!matches.length) return;
    list.classList.remove('hidden');
    matches.forEach(m=>{ const d=document.createElement('div'); d.textContent=m; d.addEventListener('click',()=>{ inp.value=m; list.classList.add('hidden'); validateForm(); suggestCategory(m); }); list.appendChild(d); });
  });
  document.addEventListener('click', e => { if(e.target!==inp) list.classList.add('hidden'); });
}
function suggestCategory(desc) {
  if(!desc||desc.length<3) return;
  const txs=loadData('transactions'), hint=document.getElementById('categorySuggestionHint');
  const match=txs.sort((a,b)=>parseDateISO(b.date)-parseDateISO(a.date)).find(t=>t.description.toLowerCase().includes(desc.toLowerCase()));
  if(match&&match.category){ const sel=document.getElementById('transactionCategory'); if(sel.value!==match.category){sel.value=match.category; hint.innerHTML=`<i class="fas fa-magic"></i> Sugerido com base em "${match.description}"`; hint.classList.remove('hidden'); validateForm(); } }
  else hint.classList.add('hidden');
}

// ============================
// FORM VALIDATION
// ============================
