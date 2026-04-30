# Rattio — Controle Financeiro Inteligente

Aplicação web SPA (Single Page Application) para controle de finanças pessoais, construída em HTML, CSS e JavaScript puro (vanilla). Todos os dados são persistidos localmente via `localStorage`.

## Visão Geral

O Rattio é um dashboard financeiro pessoal com as seguintes capacidades:

- **Dashboard interativo** com KPIs, gráficos, alertas e previsões
- **Lançamentos** (receitas, despesas, investimentos) com CRUD completo
- **Parcelamento** automático com detecção de padrões (Nubank, Itaú, genérico)
- **Orçamentos** por categoria com acompanhamento visual
- **Metas financeiras** com histórico de depósitos e progresso
- **Calendário** com visualização diária/mensal de lançamentos
- **Relatórios avançados** com múltiplos gráficos (Chart.js) e exportação PDF/CSV
- **Importação de faturas** de cartão de crédito via CSV
- **Busca global** (Ctrl+K) com navegação por teclado
- **Modo escuro** com toggle e persistência
- **Responsivo** com layout mobile (bottom nav, FAB, bottom sheets)
- **Onboarding** interativo para novos usuários
- **IA (Gemini)** para insights financeiros (opcional, requer API key)

---

## Estrutura de Arquivos

```
rattio/
├── index.html              ← Shell da aplicação (sidebar, header, modals, containers)
├── README.md               ← Este arquivo
├── css/
│   ├── variables.css       ← Design tokens: cores, sombras, raios, dark mode
│   ├── layout.css          ← App wrapper, sidebar, header, content area
│   ├── components.css      ← Cards, modals, botões, forms, tabelas, toast, etc.
│   └── responsive.css      ← Media queries, mobile nav, bottom sheets, breakpoints
└── js/
    ├── utils.js            ← Constantes globais, configuração, helpers de formatação
    ├── store.js            ← Persistência (localStorage), toast, confirm, cache
    ├── data.js             ← Cálculos: totais, filtros por mês, previsão, regras
    ├── ui.js               ← Modais, header, dirty state do formulário
    ├── pagination.js       ← Paginação de tabelas, autocomplete de descrições
    ├── form.js             ← Validação, selects de categoria/pagamento, modal de transação
    ├── transactions.js     ← CRUD de transações, parcelamentos, import/export JSON
    ├── dashboard.js        ← Renderização do dashboard, KPIs, gráficos, seções
    ├── transactions-tab.js ← Aba de transações: lista, filtros, quick entry, templates
    ├── budgets.js          ← Aba de orçamentos: CRUD, barras de progresso
    ├── goals.js            ← Aba de metas: CRUD, grid, histórico de depósitos
    ├── calendar.js         ← Aba de calendário: visualização mensal, detalhe do dia
    ├── reports.js          ← Relatórios avançados: KPIs, gráficos, exportação PDF/CSV
    ├── configurations.js   ← Aba de configurações: categorias, cartões, regras, backup
    └── app.js              ← Init, routing de abas, dark mode, busca global, onboarding
```

---

## Modelo de Dados

Todos os dados são armazenados no `localStorage` com prefixo `gcn_`.

### Transações (`gcn_transactions`)

```json
{
  "id": "1714500000000abc123",
  "type": "expense",              // "income" | "expense" | "investment"
  "description": "Supermercado",
  "value": 250.00,
  "date": "2025-01-15",           // ISO format (YYYY-MM-DD)
  "category": "Alimentação",
  "paymentMethod": "Pix",         // "Débito" | "Dinheiro" | "Pix" | "Transferência"
  "cardId": null,                 // ID do cartão de crédito (se aplicável)
  "isFixed": false,               // Despesa fixa mensal
  "installment": null,            // { index: 1, total: 12, seriesId: "..." }
  "goalId": null,                 // ID da meta vinculada
  "notes": "",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### Categorias (`gcn_categories`)

Array de strings. Default:
```json
["Salário", "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Investimentos", "Contas", "Outros"]
```

### Métodos de Pagamento (`gcn_paymentMethods`)

Array de strings. Default:
```json
["Débito", "Dinheiro", "Pix", "Transferência"]
```

### Cartões de Crédito (`gcn_cards`)

```json
{
  "id": "card_123",
  "name": "Nubank",
  "closingDay": 3,                // Dia de fechamento da fatura
  "dueDay": 10,                   // Dia de vencimento
  "brand": "Mastercard",          // Bandeira
  "color": "#8B5CF6"              // Cor de exibição
}
```

### Orçamentos (`gcn_budgets`)

```json
{
  "id": "budget_123",
  "category": "Alimentação",
  "limit": 800.00,
  "month": "2025-01"              // YYYY-MM
}
```

### Metas (`gcn_goals`)

```json
{
  "id": "goal_123",
  "name": "Reserva de Emergência",
  "targetValue": 30000.00,
  "currentValue": null,           // null = calculado automaticamente pelas transações vinculadas
  "deadline": "2025-12-31",
  "color": "#10b981",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Regras de Categorização Automática (`gcn_rules`)

```json
{
  "id": "rule_123",
  "keyword": "uber",              // Palavra-chave na descrição
  "category": "Transporte",       // Categoria a ser aplicada
  "type": null                    // Tipo (opcional)
}
```

### Templates de Lançamentos Fixos (`gcn_settings.fixedTemplates`)

```json
{
  "description": "Aluguel",
  "value": 1500.00,
  "category": "Moradia",
  "type": "expense",
  "paymentMethod": "Transferência"
}
```

### Histórico de Alterações (`gcn_changelog`)

```json
{
  "id": "log_123",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "entityType": "transaction",    // "transaction" | "goal" | "budget" | "card"
  "entityId": "1714500000000abc",
  "action": "create",             // "create" | "update" | "delete"
  "oldValue": null,
  "newValue": { ... }
}
```

### Seções do Dashboard (`gcn_dashSections`)

Array de objetos controlando a ordem e visibilidade das seções:
```json
[
  { "id": "resumo", "visible": true },
  { "id": "graficos", "visible": true },
  { "id": "gastos", "visible": true },
  { "id": "metas", "visible": true },
  { "id": "parcelas", "visible": true },
  { "id": "planejado", "visible": true }
]
```

### Schema Versioning (`gcn_schemaVersion`)

Número inteiro (atualmente `3`). O app executa migrações automáticas ao detectar versões antigas.

---

## Funcionalidades Detalhadas

### 1. Dashboard (`dashboard.js`)

**Seções do Dashboard:**
- **Resumo**: Receitas, despesas, saldo, patrimônio acumulado com tendência (comparação mês anterior)
- **Gráficos**: Donut de distribuição por categoria + evolução mensal (Chart.js)
- **Maiores Gastos**: Top categorias com valor e percentual
- **Metas**: Preview das metas ativas com barra de progresso
- **Parcelas**: Parcelas pendentes com vencimento
- **Planejado vs Real**: Comparação orçamento vs gasto real por categoria

**Customização:** O usuário pode reordenar, ocultar e resetar as seções do dashboard via modal de customização.

**KPIs exibidos no header:**
- Total de receitas do mês
- Total de despesas do mês
- Saldo (receitas - despesas)
- Badges de notificação (contas a vencer nos próximos 7 dias)

### 2. Transações (`transactions.js`, `transactions-tab.js`, `form.js`)

**Tipos de lançamento:**
- **Despesa** (saída de dinheiro)
- **Receita** (entrada de dinheiro)
- **Investimento** (aplicação, meta vinculada)

**CRUD completo:**
- Criar, editar, duplicar e excluir transações
- Exclusão de parcelas: pergunta se exclui só aquela ou toda a série
- Undo após exclusão (toast com botão "Desfazer")

**Parcelamento:**
- Detecção automática de parcelas na descrição (ex: "Compra (3/12)")
- Parcelamento manual com cálculo automático do valor por parcela
- Série de parcelas com `seriesId` para agrupamento
- Exclusão em lote de toda uma série

**Filtros avançados:**
- Por texto (descrição)
- Por categoria
- Por tipo (receita/despesa/investimento)
- Por período (data início/fim)
- Filtros combináveis com UI de chips

**Quick Entry (Entrada Rápida):**
- Formulário simplificado na aba de transações
- 3 abas: Despesa, Receita, Investimento
- Rascunho salvo automaticamente (`sessionStorage`)
- Sugestão automática de categoria baseada em descrições anteriores

**Templates:**
- Salvar transações recorrentes como templates
- Aplicar templates com um clique
- Gerenciamento de templates no painel de configurações

**Importação/Exportação:**
- Export JSON (backup completo)
- Export CSV (formato planilha)
- Import JSON (restaurar backup)

### 3. Orçamentos (`budgets.js`)

- Criar orçamentos por categoria e mês
- Barra de progresso visual (gasto / limite)
- Indicadores de cor: verde (ok), amarelo (perto), vermelho (extrapolou)
- Sugestões automáticas baseadas em gastos históricos
- Exclusão com confirmação

### 4. Metas (`goals.js`)

- Criar metas com valor alvo e prazo
- Duas formas de atualização:
  - **Automática**: vincular transações à meta (investimentos)
  - **Manual**: registrar depósitos diretamente
- Grid visual com cards de progresso
- Barra de progresso com percentual
- Histórico de movimentações (depósitos/retiradas)
- Badge de status: "Concluída", "No prazo", "Atrasada"
- Exclusão com confirmação

### 5. Calendário (`calendar.js`)

- Visualização mensal em grid de dias
- Cada dia mostra: ícone de receita/despesa, valor total
- Dias com lançamentos são destacados visualmente
- Clique em um dia abre modal com detalhes:
  - Lista de transações do dia
  - Totais de receita/despesa do dia
  - Botão para adicionar nova transação naquele dia
- Navegação por mês (setas no header global)
- Indicador visual de "hoje"

### 6. Relatórios (`reports.js`)

**Painel de Filtros:**
- Período: mês atual, trimestre, semestre, ano, personalizado
- Tipo: receita, despesa, investimento, todos
- Categoria: seleção múltipla
- Agrupar por: mês, categoria, tipo de pagamento

**KPIs Avançados:**
- Total de transações no período
- Ticket médio
- Maior gasto
- Dia da semana com mais gastos
- Taxa de poupança (%)

**Gráficos (Chart.js):**
- Gráfico principal: evolução temporal (linha/barras)
- Donut: distribuição por categoria
- Barras: comparação mensal
- Previsão: projeção de fluxo de caixa (3 meses à frente, 3 para trás)

**Tabela detalhada:**
- Lista de transações filtradas
- Totais por categoria
- Ordenação por data, valor ou descrição

**Exportação:**
- CSV: dados filtrados
- PDF: relatório formatado com KPIs, gráficos e tabela (jsPDF + AutoTable)

### 7. Importação de Faturas CSV (`csv-import.js`)

**Formatos suportados:**
- **Nubank**: data, categoria, valor, título, detalhes
- **Itaú**: data, descrição, valor
- **Genérico**: auto-detecção de colunas

**Fluxo:**
1. Upload do arquivo (drag & drop ou seletor)
2. Auto-detecção do formato e parsing
3. Preview em tabela com checkboxes
4. Seleção/deseleção individual ou em lote
5. Mapeamento automático de categorias
6. Detecção de parcelas
7. Importação com feedback de sucesso

**Parsing inteligente:**
- Suporta formatos brasileiros (1.234,56) e americanos (1,234.56)
- Normalização de datas (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
- Detecção automática de valores negativos como despesas

### 8. Configurações (`configurations.js`)

**Seções configuráveis:**
- **Categorias**: adicionar, remover, reordenar
- **Cartões de Crédito**: CRUD com dia de fechamento/vencimento
- **Métodos de Pagamento**: adicionar/remover
- **Regras de Categorização**: automática baseada em palavras-chave
- **Templates de Lançamentos Fixos**: gerenciar recorrentes
- **Salário**: valor e dia de recebimento (para cálculos de "disponível")
- **Financiamentos**: registrar financiamentos com parcelas
- **Backup**: exportar/importar JSON completo, exportar CSV
- **Histórico**: log de todas as alterações com filtros

### 9. Busca Global (`app.js`)

- Atalho: `Ctrl+K` ou botão no header
- Busca em transações, categorias, metas e orçamentos
- Navegação por teclado (↑↓ para navegar, Enter para selecionar, ESC para fechar)
- Resultados categorizados com ícones
- Destaque do texto buscado nos resultados
- Ação: navega para a aba relevante e destaca o item

### 10. Modo Escuro (`app.js`)

- Toggle no header (ícone de lua/sol)
- Persistência no localStorage (`gcn_darkMode`)
- CSS variables com tema completo (cores, sombras, bordas)
- Transição suave (0.3s)
- Aplicação via `data-theme="dark"` no `<html>`

### 11. Onboarding (`app.js`)

- Exibido automaticamente na primeira visita
- 3 etapas:
  1. Boas-vindas e nome do usuário
  2. Configuração de salário e categorias
  3. Tour das funcionalidades
- Modal com navegação (próximo/voltar)
- Indicador de progresso (dots)
- Pode ser reaberto nas configurações

### 12. Recursos Mobile

- **Bottom Navigation**: barra fixa com 5 ícones (Início, Extrato, +, Gráficos, Config)
- **FAB (Floating Action Button)**: botão "+" para novo lançamento
- **Bottom Sheet**: seleção rápida de tipo (receita/despesa) ao clicar no FAB
- **Swipe to Delete**: arrastar para deletar transações em mobile
- **Touch-friendly**: botões maiores, áreas de toque adequadas
- **Safe areas**: respeita notch e barras do sistema

### 13. Acessibilidade

- **Navegação por teclado**: Tab, Enter, Escape em todos os elementos interativos
- **Atalhos numéricos**: 1-7 para trocar de aba
- **ARIA labels**: em todos os botões e inputs
- **Focus trap**: modais capturam foco
- **Live region**: anúncios para leitores de tela (`aria-live="polite"`)
- **Skip link**: "Pular para o conteúdo principal"
- **Contraste**: cores com contraste adequado (WCAG AA)

---

## Design System

### Cores (CSS Variables)

**Brand:**
- `--rattio-navy`: #1B2A4A (sidebar, header pills)
- `--rattio-blue`: #0055FF (accent principal)
- `--rattio-sky`: #2979FF (ícones ativos)
- `--rattio-teal`: #00B8D4

**Semânticas:**
- `--success` / `--accent-green`: #00A86B (receitas, positivo)
- `--danger`: #E53935 (despesas, exclusão)
- `--warning`: #D97706 (alertas)
- `--info`: #0055FF (informações)

### Tipografia

- **Fonte principal**: Inter (300-900)
- **Fonte display**: DM Serif Display (logotipo)
- **Hierarquia**: 9px (labels) → 12px (meta) → 14px (body) → 16px (h3) → 18px (h2) → 26px (KPIs)

### Bordas e Sombras

- `--radius`: 4px (cards, botões)
- `--radius-sm`: 2px (inputs, pills)
- `--shadow-sm` → `--shadow` → `--shadow-lg` → `--shadow-float` (hierarquia de elevação)

### Breakpoints (Responsivo)

- `≥1200px`: Layout completo
- `<1200px`: Sidebar colapsa, tabelas viram cards
- `<900px`: Grid de cards empilha, calendário vertical
- `<640px`: Bottom navigation, bottom sheets, formulários compactos
- `<480px`: Espaçamentos mínimos, header simplificado

---

## Dependências Externas

| Biblioteca | Versão | Uso | Carregamento |
|-----------|--------|-----|--------------|
| Font Awesome | 6.5.0 | Ícones | `<link>` no head |
| Chart.js | latest | Gráficos | Lazy load via `ensureChartJS()` |
| jsPDF | 2.5.1 | Export PDF | Lazy load via `ensureJsPDF()` |
| jsPDF AutoTable | 3.8.2 | Tabelas no PDF | Lazy load junto com jsPDF |
| Google Fonts (Inter) | - | Tipografia | `@import` no CSS |
| Gemini API | - | Insights IA | Opcional, via API key |

---

## Padrões de Código

### Gerenciamento de Estado
- Estado global em variáveis `var` no topo de `utils.js` (escopo global)
- Dados persistidos em `localStorage` com prefixo `gcn_`
- Cache em memória (`window._dataCache`) com invalidação manual
- Cache de cálculos mensais (`calcCache`)

### Renderização
- Cada aba tem sua função `render[Tab]Tab()` que regenera o HTML
- HTML construído via template literals com `escapeHtml()` (prevenção XSS)
- Funções de apoio: `buildXxxHTML()` retornam strings de HTML
- Event delegation em containers para handlers dinâmicos

### Convenções
- Formatação de moeda: `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`
- Datas: armazenadas em ISO (YYYY-MM-DD), exibidas em DD/MM/YYYY
- IDs: timestamp + random hex (`genId()`)
- Changelog: toda alteração é registrada com timestamp e diff
