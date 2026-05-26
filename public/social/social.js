/* ============================================================
   social.js — render + interação da página /social
   ------------------------------------------------------------
   Depende de: WhirlpoolAuth, SocialStore (já carregados no head).
   ============================================================ */
(function () {
  'use strict';

  // ============================================================
  // LABELS / CORES
  // ============================================================
  const LINHAS = {
    institucional:  { label: 'Institucional',         cor: '#39454D' },
    conhecimento:   { label: 'Conhecimento de peças', cor: '#FF671F' },
    resolucao:      { label: 'Resolução de problemas',cor: '#F59E0B' },
    boas_praticas:  { label: 'Boas práticas',         cor: '#0F766E' },
    humor:          { label: 'Humor técnico',         cor: '#7C6EE8' },
  };
  const FORMATOS = {
    carrossel:        'Carrossel',
    estatico:         'Estático',
    reels:            'Reels',
    carrossel_reels:  'Carrossel + Reels',
  };
  const TIPOS = {
    campanha:   'Campanha',
    always_on:  'Always On',
  };
  const STATUS = {
    pendente:   { label: 'Pendente',   icon: '⏳' },
    aprovado:   { label: 'Aprovado',   icon: '✓'  },
    reprovado:  { label: 'Reprovado',  icon: '✕'  },
  };
  const MESES_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];


  // ============================================================
  // ESTADO GLOBAL DA PÁGINA
  // ============================================================
  const state = {
    meses: [],           // todos os meses disponíveis
    mesAtual: null,      // o objeto mes atualmente selecionado
    posts: [],           // posts do mes atual
    filters: {
      tipo: new Set(),
      linha: new Set(),
      peca: new Set(),
      formato: new Set(),
      status: new Set(),
    },
    drawerPostId: null,  // qual post está aberto no drawer
    drawerMode: 'view',  // 'view' | 'edit' | 'new'
    isAdmin: false,      // role === 'molla'
  };

  // Constantes do form (peças predefinidas + outro)
  const PECAS_FIXAS = ['Mecanismo', 'Placa', 'Filtro', 'Geral'];


  // ============================================================
  // HELPERS
  // ============================================================
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  function fmtData(dataPost) {
    if (!dataPost) return { day: '--', month: '---' };
    // dataPost vem como '2026-06-08' (string ISO)
    const [, mm, dd] = dataPost.split('-');
    return { day: dd, month: MESES_PT[parseInt(mm, 10) - 1] || '---' };
  }
  function ago(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'agora';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + ' min atrás';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h atrás';
    if (diffSec < 86400 * 7) return Math.floor(diffSec / 86400) + 'd atrás';
    return fmtDate(iso);
  }
  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  }
  function actorFromAuth() {
    const Auth = window.WhirlpoolAuth;
    return {
      autor: (Auth && Auth.getUserName && Auth.getUserName()) || 'Anônimo',
      role:  (Auth && Auth.getRole && Auth.getRole()) || 'cliente',
    };
  }


  // ============================================================
  // SVG MOCKUPS · um por formato
  // ============================================================
  function svgCarrossel(corHex) {
    const cor = corHex || '#FF671F';
    return `
      <svg viewBox="0 0 320 90" xmlns="http://www.w3.org/2000/svg" aria-label="Mockup de carrossel">
        <rect x="6"   y="10" width="56" height="70" rx="6" fill="${cor}" opacity="0.96"/>
        <rect x="68"  y="10" width="56" height="70" rx="6" fill="${cor}" opacity="0.74"/>
        <rect x="130" y="10" width="56" height="70" rx="6" fill="${cor}" opacity="0.55"/>
        <rect x="192" y="10" width="56" height="70" rx="6" fill="${cor}" opacity="0.38"/>
        <rect x="254" y="10" width="56" height="70" rx="6" fill="${cor}" opacity="0.22"/>
        <!-- bolinhas indicador -->
        <circle cx="148" cy="86" r="2.5" fill="${cor}"/>
        <circle cx="156" cy="86" r="2.5" fill="${cor}" opacity="0.4"/>
        <circle cx="164" cy="86" r="2.5" fill="${cor}" opacity="0.4"/>
        <circle cx="172" cy="86" r="2.5" fill="${cor}" opacity="0.4"/>
        <circle cx="180" cy="86" r="2.5" fill="${cor}" opacity="0.4"/>
      </svg>
    `;
  }
  function svgEstatico(corHex) {
    const cor = corHex || '#FF671F';
    return `
      <svg viewBox="0 0 320 90" xmlns="http://www.w3.org/2000/svg" aria-label="Mockup de post estático">
        <rect x="120" y="6" width="80" height="78" rx="8" fill="${cor}"/>
        <rect x="132" y="22" width="56" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="132" y="32" width="40" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="132" y="44" width="48" height="3" rx="1.5" fill="white" opacity="0.4"/>
      </svg>
    `;
  }
  function svgReels(corHex) {
    const cor = corHex || '#FF671F';
    return `
      <svg viewBox="0 0 320 90" xmlns="http://www.w3.org/2000/svg" aria-label="Mockup de Reels">
        <rect x="138" y="2" width="44" height="86" rx="6" fill="${cor}"/>
        <polygon points="155,30 173,42 155,54" fill="white" opacity="0.92"/>
        <rect x="148" y="68" width="24" height="3" rx="1.5" fill="white" opacity="0.6"/>
        <rect x="152" y="74" width="16" height="3" rx="1.5" fill="white" opacity="0.45"/>
      </svg>
    `;
  }
  function svgCarrosselReels(corHex) {
    const cor = corHex || '#FF671F';
    return `
      <svg viewBox="0 0 320 90" xmlns="http://www.w3.org/2000/svg" aria-label="Mockup de Carrossel e Reels">
        <rect x="6"   y="12" width="40" height="66" rx="5" fill="${cor}" opacity="0.95"/>
        <rect x="52"  y="12" width="40" height="66" rx="5" fill="${cor}" opacity="0.70"/>
        <rect x="98"  y="12" width="40" height="66" rx="5" fill="${cor}" opacity="0.45"/>
        <rect x="144" y="12" width="40" height="66" rx="5" fill="${cor}" opacity="0.22"/>
        <!-- separador -->
        <line x1="198" y1="12" x2="198" y2="78" stroke="${cor}" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>
        <!-- reels -->
        <rect x="220" y="6" width="40" height="78" rx="5" fill="${cor}"/>
        <polygon points="232,32 248,42 232,52" fill="white" opacity="0.95"/>
        <rect x="270" y="12" width="40" height="66" rx="5" fill="${cor}" opacity="0.45"/>
      </svg>
    `;
  }
  function mockupFormato(formato, corHex) {
    switch (formato) {
      case 'carrossel':       return svgCarrossel(corHex);
      case 'estatico':        return svgEstatico(corHex);
      case 'reels':           return svgReels(corHex);
      case 'carrossel_reels': return svgCarrosselReels(corHex);
      default:                return svgEstatico(corHex);
    }
  }


  // ============================================================
  // FILTROS · matching
  // ============================================================
  function postPassesFilters(post) {
    const f = state.filters;
    if (f.tipo.size    && !f.tipo.has(post.tipo))                   return false;
    if (f.linha.size   && !f.linha.has(post.linha_editorial))       return false;
    if (f.peca.size    && !f.peca.has(post.peca || '__nopeca'))     return false;
    if (f.formato.size && !f.formato.has(post.formato))             return false;
    if (f.status.size  && !f.status.has(post.status))               return false;
    return true;
  }
  function hasAnyFilter() {
    return Object.values(state.filters).some(s => s.size > 0);
  }


  // ============================================================
  // RENDER · HERO + KPIs
  // ============================================================
  function renderHero() {
    const m = state.mesAtual;
    $('#soTema').textContent      = m ? (m.tema || m.nome) : 'Sem pré-pauta';
    $('#soConceito').textContent  = m ? (m.conceito || '') : '';
    $('#soMeta').innerHTML        = m ? metaHtml(m) : '';
  }
  function metaHtml(m) {
    const items = [];
    if (m.nome)        items.push(`<span class="so-meta-chip"><strong>Mês:</strong> ${esc(m.nome)}</span>`);
    if (m.estrategia)  items.push(`<span class="so-meta-chip"><strong>Estratégia:</strong> ${esc(m.estrategia)}</span>`);
    if (m.campanha)    items.push(`<span class="so-meta-chip"><strong>Campanha:</strong> ${esc(m.campanha)}</span>`);
    return items.join('');
  }
  function renderKpis() {
    const s = window.SocialStore.calcStats(state.posts);
    $('#soKpiPendente').textContent  = s.pendentes;
    $('#soKpiAprovado').textContent  = s.aprovados;
    $('#soKpiReprovado').textContent = s.reprovados;
    $('#soKpiTotal').textContent     = s.total;
    const pctOk = s.total ? (s.aprovados / s.total * 100) : 0;
    const pctKo = s.total ? (s.reprovados / s.total * 100) : 0;
    $('#soProgAprovado').style.width  = pctOk + '%';
    $('#soProgReprovado').style.width = pctKo + '%';
  }


  // ============================================================
  // RENDER · SELETOR DE MÊS
  // ============================================================
  function renderMesSelect() {
    const sel = $('#soMesSelect');
    if (!state.meses.length) {
      sel.innerHTML = '<option value="">Sem meses cadastrados</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    sel.innerHTML = state.meses
      .map(m => `<option value="${esc(m.slug)}" ${state.mesAtual && state.mesAtual.id === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`)
      .join('');
  }


  // ============================================================
  // RENDER · FILTROS (chips)
  // ============================================================
  function renderFilters() {
    // Coleta valores únicos a partir dos posts atuais
    const u = {
      tipo: new Set(),
      linha: new Set(),
      peca: new Set(),
      formato: new Set(),
      status: new Set(['pendente','aprovado','reprovado']),  // sempre os 3
    };
    state.posts.forEach(p => {
      u.tipo.add(p.tipo);
      u.linha.add(p.linha_editorial);
      u.peca.add(p.peca || '__nopeca');
      u.formato.add(p.formato);
    });

    // Chips multi-select com cor pra Tipo e Status
    chipsHtml('#soFiltersTipo',   Array.from(u.tipo).sort(),   'tipo',   v => TIPOS[v] || v);
    chipsHtml('#soFiltersStatus', Array.from(u.status),        'status', v => STATUS[v] ? STATUS[v].label : v, true);

    // Selects single-select pra Linha editorial, Formato e Peça
    selectHtml('#soSelectLinha',   Array.from(u.linha),          'linha',   'Todas',     v => LINHAS[v]   ? LINHAS[v].label   : v);
    selectHtml('#soSelectFormato', Array.from(u.formato).sort(), 'formato', 'Todos',     v => FORMATOS[v] || v);
    selectHtml('#soSelectPeca',    Array.from(u.peca).sort(),    'peca',    'Todas',     v => v === '__nopeca' ? 'Sem peça' : v);
  }

  // Chips: usado pra Tipo e Status (multi-select)
  // Se withColor=true, marca .so-chip-color (a cor real vem do CSS via data-value)
  function chipsHtml(rootSel, values, group, labelFn, withColor) {
    const root = $(rootSel);
    if (!root) return;
    root.innerHTML = values.map(v => {
      const active = state.filters[group].has(v) ? 'is-active' : '';
      const dot = withColor ? '<span class="so-chip-color"></span>' : '';
      return `<button type="button" class="so-chip ${active}" data-group="${group}" data-value="${esc(v)}">${dot}${esc(labelFn(v))}</button>`;
    }).join('');
  }

  // Select: single-select pros 3 grupos compactos (Linha, Formato, Peça)
  function selectHtml(rootSel, values, group, allLabel, labelFn) {
    const sel = $(rootSel);
    if (!sel) return;
    const set = state.filters[group];
    const current = set.size ? Array.from(set)[0] : '';
    const options = [`<option value="">${esc(allLabel)}</option>`]
      .concat(values.map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(labelFn(v))}</option>`));
    sel.innerHTML = options.join('');
    sel.classList.toggle('is-active', !!current);
  }


  // ============================================================
  // RENDER · GRID DE CARDS
  // ============================================================
  function renderGrid() {
    const grid  = $('#soGrid');
    const empty = $('#soEmpty');
    const filtered = state.posts.filter(postPassesFilters);

    // contador
    $('#soCount').innerHTML = filtered.length === state.posts.length
      ? `<strong>${filtered.length}</strong> ${filtered.length === 1 ? 'publicação' : 'publicações'}`
      : `<strong>${filtered.length}</strong> de ${state.posts.length}`;

    // botão clear
    $('#soClearFilters').hidden = !hasAnyFilter();

    // Admin: card "Novo post" sempre primeiro (mesmo com filtros aplicados)
    const adminCard = state.isAdmin && state.mesAtual ? newPostCardHtml() : '';

    if (!filtered.length) {
      grid.innerHTML = adminCard;
      empty.hidden = !!adminCard;  // empty só aparece se não tem nem o card do admin
      return;
    }
    empty.hidden = true;
    grid.innerHTML = adminCard + filtered.map(cardHtml).join('');
  }
  function newPostCardHtml() {
    return `
      <article class="so-card-new" data-action="post-new" role="button" tabindex="0" aria-label="Novo post">
        <div class="so-card-new-icon">+</div>
        <h3 class="so-card-new-title">Novo post</h3>
        <p class="so-card-new-sub">Adiciona uma publicação à pré-pauta deste mês</p>
      </article>
    `;
  }
  function cardHtml(p) {
    const linha = LINHAS[p.linha_editorial] || { label: p.linha_editorial, cor: '#FF671F' };
    const fmtLabel = FORMATOS[p.formato] || p.formato;
    const stsLabel = STATUS[p.status] ? STATUS[p.status].label : p.status;
    const data = fmtData(p.data_post);
    const tipoChip = p.tipo === 'campanha'
      ? '<span class="so-card-tag so-card-tag-tipo-campanha">⚽ Campanha Copa</span>'
      : '<span class="so-card-tag">Always On</span>';

    const adminBtns = state.isAdmin ? `
      <button type="button" class="so-btn so-btn-edit" data-action="post-edit" title="Editar post">✏️</button>
      <button type="button" class="so-btn so-btn-del"  data-action="post-delete" title="Excluir post">🗑️</button>
    ` : '';

    return `
      <article class="so-card" data-linha="${esc(p.linha_editorial)}" data-post-id="${esc(p.id)}">
        <div class="so-card-strip" style="background: ${linha.cor}"></div>
        <div class="so-card-head">
          <div class="so-card-date">
            <span class="so-card-date-day">${esc(data.day)}</span>
            <span class="so-card-date-month">${esc(data.month)}</span>
          </div>
          <div class="so-card-tags">
            ${tipoChip}
            <span class="so-card-tag so-card-tag-linha">${esc(linha.label)}</span>
            <span class="so-card-tag">${esc(fmtLabel)}</span>
          </div>
        </div>

        <div class="so-card-mock">
          ${mockupFormato(p.formato, linha.cor)}
        </div>

        <div class="so-card-body">
          <h3 class="so-card-title">${esc(p.tema)}</h3>
          <div class="so-card-meta">
            ${p.peca ? `<span class="so-card-meta-item"><strong>Peça:</strong> ${esc(p.peca)}</span>` : ''}
            <span class="so-card-meta-item"><strong>#${esc(p.numero)}</strong></span>
          </div>
        </div>

        <div class="so-card-foot">
          <span class="so-status so-status-${esc(p.status)}">
            <span class="so-status-dot"></span> ${esc(stsLabel)}
          </span>
          <div class="so-card-actions">
            ${adminBtns}
            <button type="button" class="so-btn so-btn-open" data-action="open">Ver →</button>
          </div>
        </div>
      </article>
    `;
  }


  // ============================================================
  // DRAWER · render do detalhe
  // ------------------------------------------------------------
  // Modos: 'view' (default), 'edit' (form de editar post), 'new' (criar)
  // ============================================================
  async function openDrawer(postId, mode) {
    state.drawerPostId = postId;
    state.drawerMode = mode || 'view';
    const drawer = $('#soDrawer');
    const backdrop = $('#soDrawerBackdrop');

    drawer.innerHTML = drawerSkeletonHtml();
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    try {
      if (state.drawerMode === 'new') {
        drawer.innerHTML = drawerEditHtml(null);
      } else if (state.drawerMode === 'edit') {
        const post = state.posts.find(p => p.id === postId);
        drawer.innerHTML = drawerEditHtml(post);
      } else {
        const [comentarios, historico] = await Promise.all([
          window.SocialStore.listComentarios(postId, true),
          window.SocialStore.listHistorico(postId, true),
        ]);
        const post = state.posts.find(p => p.id === postId);
        if (post) drawer.innerHTML = drawerFullHtml(post, comentarios, historico);
      }
    } catch (err) {
      console.error('[social] erro carregando detalhe:', err);
      drawer.innerHTML = `
        <div class="so-drawer-head">
          <h3 class="so-drawer-title">Erro</h3>
          <button type="button" class="so-drawer-close" data-action="close" aria-label="Fechar">×</button>
        </div>
        <div class="so-drawer-body"><p>Não consegui carregar os detalhes. Tenta de novo em alguns segundos.</p></div>`;
    }
  }
  function closeDrawer() {
    const drawer = $('#soDrawer');
    const backdrop = $('#soDrawerBackdrop');
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { backdrop.hidden = true; }, 280);
    state.drawerPostId = null;
    state.drawerMode = 'view';
  }
  function drawerSkeletonHtml() {
    return `
      <div class="so-drawer-head">
        <h3 class="so-drawer-title">Carregando…</h3>
        <button type="button" class="so-drawer-close" id="soDrawerCloseSk" aria-label="Fechar">×</button>
      </div>
      <div class="so-drawer-body"><p>Carregando detalhes da publicação…</p></div>`;
  }
  function drawerFullHtml(p, comentarios, historico) {
    const linha = LINHAS[p.linha_editorial] || { label: p.linha_editorial, cor: '#FF671F' };
    const fmtLabel = FORMATOS[p.formato] || p.formato;
    const data = fmtData(p.data_post);
    const stsLabel = STATUS[p.status] ? STATUS[p.status].label : p.status;

    const tipoChip = p.tipo === 'campanha'
      ? '<span class="so-card-tag so-card-tag-tipo-campanha">⚽ Campanha Copa</span>'
      : '<span class="so-card-tag">Always On</span>';

    let notice = '';
    if (p.status === 'aprovado') {
      notice = `<div class="so-drawer-notice">✓ <strong>Aprovado</strong> por ${esc(p.aprovado_por || '—')} em ${esc(fmtDate(p.aprovado_em))}</div>`;
    } else if (p.status === 'reprovado') {
      notice = `<div class="so-drawer-notice">✕ <strong>Reprovado</strong> por ${esc(p.reprovado_por || '—')} em ${esc(fmtDate(p.reprovado_em))}</div>`;
    }

    const actions = p.status === 'pendente' ? `
      <div class="so-drawer-foot">
        <button type="button" class="so-btn so-btn-reject"  data-action="reject"  data-post-id="${esc(p.id)}">✕ Reprovar</button>
        <button type="button" class="so-btn so-btn-approve" data-action="approve" data-post-id="${esc(p.id)}">✓ Aprovar</button>
      </div>` : `
      <div class="so-drawer-foot">
        <button type="button" class="so-btn so-btn-ghost" data-action="reopen" data-post-id="${esc(p.id)}">Reabrir</button>
      </div>`;

    const adminHeadBtns = state.isAdmin ? `
        <button type="button" class="so-drawer-close" data-action="post-edit" data-post-id="${esc(p.id)}" title="Editar" style="margin-right:4px">✏️</button>
        <button type="button" class="so-drawer-close" data-action="post-delete" data-post-id="${esc(p.id)}" title="Excluir" style="margin-right:4px">🗑️</button>
    ` : '';

    return `
      <div class="so-drawer-head">
        <h3 class="so-drawer-title">Publicação #${esc(p.numero)}</h3>
        <div style="display:flex; gap:4px; align-items:center;">
          ${adminHeadBtns}
          <button type="button" class="so-drawer-close" data-action="close" aria-label="Fechar">×</button>
        </div>
      </div>
      <div class="so-drawer-body">
        <div class="so-drawer-tags">
          ${tipoChip}
          <span class="so-card-tag so-card-tag-linha" style="color:${linha.cor}; background:${linha.cor}1f">${esc(linha.label)}</span>
          <span class="so-card-tag">${esc(fmtLabel)}</span>
          ${p.peca ? `<span class="so-card-tag">${esc(p.peca)}</span>` : ''}
          <span class="so-status so-status-${esc(p.status)}"><span class="so-status-dot"></span>${esc(stsLabel)}</span>
        </div>

        <div class="so-drawer-date">${esc(data.day)} ${esc(data.month)} · ${esc(p.data_post)}</div>
        <h2 class="so-drawer-tema">${esc(p.tema)}</h2>

        <div class="so-drawer-mock" aria-hidden="true">
          ${mockupFormato(p.formato, linha.cor)}
        </div>

        <p class="so-drawer-explicacao">${esc(p.explicacao)}</p>

        ${notice}

        <h4 class="so-section-title">Histórico</h4>
        ${historicoHtml(historico)}

        <h4 class="so-section-title">Comentários (${comentarios.length})</h4>
        <div class="so-thread" id="soThread">${comentariosHtml(comentarios)}</div>

        <div class="so-comment-form">
          <textarea class="so-comment-input" id="soCommentInput" placeholder="Escreva um comentário pra Molla…" rows="3"></textarea>
          <div class="so-comment-form-actions">
            <button type="button" class="so-btn so-btn-open" data-action="comment" data-post-id="${esc(p.id)}">Comentar</button>
          </div>
        </div>
      </div>
      ${actions}
    `;
  }

  // ============================================================
  // DRAWER · modo EDIT/NEW · form de publicação
  // ============================================================
  function drawerEditHtml(p) {
    const isNew = !p;

    // Defaults pra novo post
    const today = (new Date()).toISOString().slice(0, 10);  // YYYY-MM-DD
    const maxNum = state.posts.reduce((a, x) => Math.max(a, x.numero || 0), 0);

    const numero  = isNew ? (maxNum + 1) : p.numero;
    const dataP   = isNew ? today        : (p.data_post || today);
    const linhaP  = isNew ? 'conhecimento' : p.linha_editorial;
    const fmtP    = isNew ? 'carrossel'    : p.formato;
    const tipoP   = isNew ? 'always_on'    : p.tipo;
    const pecaP   = isNew ? ''             : (p.peca || '');
    const temaP   = isNew ? ''             : (p.tema || '');
    const explP   = isNew ? ''             : (p.explicacao || '');

    // Decide se a peça atual é uma das fixas ou "Outro"
    const pecaIsFixa = PECAS_FIXAS.indexOf(pecaP) >= 0;
    const pecaSelectVal = pecaP === '' ? '' : (pecaIsFixa ? pecaP : '__outro');
    const pecaOutroVal  = pecaIsFixa ? '' : pecaP;

    const linhaOpts = Object.keys(LINHAS).map(k =>
      `<option value="${k}" ${k === linhaP ? 'selected' : ''}>${esc(LINHAS[k].label)}</option>`
    ).join('');
    const fmtOpts = Object.keys(FORMATOS).map(k =>
      `<option value="${k}" ${k === fmtP ? 'selected' : ''}>${esc(FORMATOS[k])}</option>`
    ).join('');
    const pecaOpts = [
      `<option value=""           ${pecaSelectVal === ''         ? 'selected' : ''}>Sem peça</option>`,
      ...PECAS_FIXAS.map(pc =>
        `<option value="${esc(pc)}" ${pecaSelectVal === pc ? 'selected' : ''}>${esc(pc)}</option>`
      ),
      `<option value="__outro"    ${pecaSelectVal === '__outro' ? 'selected' : ''}>Outro…</option>`,
    ].join('');

    const headTitle = isNew ? 'Novo post' : `Editar publicação #${esc(p.numero)}`;
    const footBtns = isNew ? `
      <div class="so-drawer-foot">
        <button type="button" class="so-btn so-btn-ghost"  data-action="edit-cancel">Cancelar</button>
        <button type="button" class="so-btn so-btn-open"   data-action="edit-save">Salvar publicação</button>
      </div>` : `
      <div class="so-drawer-foot">
        <button type="button" class="so-btn so-btn-del"   data-action="post-delete" data-post-id="${esc(p.id)}">Excluir</button>
        <button type="button" class="so-btn so-btn-ghost" data-action="edit-cancel">Cancelar</button>
        <button type="button" class="so-btn so-btn-open"  data-action="edit-save" data-post-id="${esc(p.id)}">Salvar</button>
      </div>`;

    return `
      <div class="so-drawer-head">
        <h3 class="so-drawer-title">${headTitle}</h3>
        <button type="button" class="so-drawer-close" data-action="close" aria-label="Fechar">×</button>
      </div>
      <div class="so-drawer-body">
        <form class="so-edit-form" onsubmit="return false">
          <div class="so-form-row so-form-row-2">
            <div class="so-field">
              <label class="so-field-label" for="soFData">Data <span class="so-required">*</span></label>
              <input type="date" class="so-input" id="soFData" value="${esc(dataP)}" required />
            </div>
            <div class="so-field">
              <label class="so-field-label" for="soFNumero">Número</label>
              <input type="number" class="so-input" id="soFNumero" value="${esc(numero)}" min="1" />
              <p class="so-form-help">Auto pro próximo livre (${maxNum + 1}). Editável.</p>
            </div>
          </div>

          <div class="so-form-row so-form-row-2">
            <div class="so-field">
              <label class="so-field-label" for="soFLinha">Linha editorial <span class="so-required">*</span></label>
              <select class="so-input" id="soFLinha">${linhaOpts}</select>
            </div>
            <div class="so-field">
              <label class="so-field-label" for="soFFormato">Formato <span class="so-required">*</span></label>
              <select class="so-input" id="soFFormato">${fmtOpts}</select>
            </div>
          </div>

          <div class="so-field">
            <label class="so-field-label">Tipo <span class="so-required">*</span></label>
            <div class="so-radios">
              <label class="so-radio ${tipoP === 'always_on' ? 'is-active' : ''}">
                <input type="radio" name="soFTipo" value="always_on" ${tipoP === 'always_on' ? 'checked' : ''} />
                Always On
              </label>
              <label class="so-radio ${tipoP === 'campanha' ? 'is-active' : ''}">
                <input type="radio" name="soFTipo" value="campanha" ${tipoP === 'campanha' ? 'checked' : ''} />
                ⚽ Campanha
              </label>
            </div>
          </div>

          <div class="so-form-row so-form-row-2">
            <div class="so-field">
              <label class="so-field-label" for="soFPeca">Peça</label>
              <select class="so-input" id="soFPeca">${pecaOpts}</select>
            </div>
            <div class="so-field" id="soFPecaOutroWrap" ${pecaSelectVal === '__outro' ? '' : 'hidden'}>
              <label class="so-field-label" for="soFPecaOutro">Especificar peça</label>
              <input type="text" class="so-input" id="soFPecaOutro" value="${esc(pecaOutroVal)}" placeholder="Ex: Resistência" />
            </div>
          </div>

          <div class="so-field">
            <label class="so-field-label" for="soFTema">Tema (título) <span class="so-required">*</span></label>
            <input type="text" class="so-input" id="soFTema" value="${esc(temaP)}" placeholder="Título do post" required />
          </div>

          <div class="so-field">
            <label class="so-field-label" for="soFExpl">Explicação breve <span class="so-required">*</span></label>
            <textarea class="so-input" id="soFExpl" rows="5" placeholder="Briefing detalhado do post…" required>${esc(explP)}</textarea>
          </div>

          <div class="so-modal-error" id="soFErr" hidden></div>
        </form>
      </div>
      ${footBtns}
    `;
  }

  function historicoHtml(historico) {
    if (!historico.length) {
      return `<div class="so-thread-empty">Sem alterações registradas ainda.</div>`;
    }
    return `<div class="so-historico">${historico.map(h => {
      const iconClass = h.status_para === 'aprovado' ? 'aprovado'
                      : h.status_para === 'reprovado' ? 'reprovado' : 'pendente';
      const symbol = h.status_para === 'aprovado' ? '✓'
                   : h.status_para === 'reprovado' ? '✕' : '⏳';
      const labelDe   = STATUS[h.status_de]   ? STATUS[h.status_de].label   : (h.status_de || '—');
      const labelPara = STATUS[h.status_para] ? STATUS[h.status_para].label : h.status_para;
      const transicao = h.status_de
        ? `mudou de <strong>${esc(labelDe)}</strong> para <strong>${esc(labelPara)}</strong>`
        : `marcou como <strong>${esc(labelPara)}</strong>`;
      return `
        <div class="so-hist-item">
          <span class="so-hist-icon ${iconClass}">${symbol}</span>
          <div class="so-hist-text">
            <strong>${esc(h.autor)}</strong> <em>(${esc(h.role)})</em> ${transicao}
            <em>· ${esc(ago(h.created_at))}</em>
            ${h.observacao ? `<div class="so-hist-obs">${esc(h.observacao)}</div>` : ''}
          </div>
        </div>`;
    }).join('')}</div>`;
  }
  function comentariosHtml(comentarios) {
    if (!comentarios.length) {
      return `<div class="so-thread-empty">Ainda sem comentários. Seja a primeira voz por aqui.</div>`;
    }
    return comentarios.map(c => `
      <div class="so-comment">
        <div class="so-comment-head">
          <span class="so-comment-avatar">${esc(initials(c.autor))}</span>
          <div class="so-comment-meta">
            <span class="so-comment-author">${esc(c.autor)}</span>
            <span class="so-comment-when">${esc(ago(c.created_at))}</span>
          </div>
          <span class="so-comment-role ${c.role === 'molla' ? 'molla' : ''}">${esc(c.role)}</span>
          ${state.isAdmin ? `<button type="button" class="so-comment-del-btn" data-action="comment-delete" data-comment-id="${esc(c.id)}" title="Excluir comentário" aria-label="Excluir comentário">🗑️</button>` : ''}
        </div>
        <p class="so-comment-text">${esc(c.texto)}</p>
      </div>
    `).join('');
  }


  // ============================================================
  // MODAL DE REPROVAÇÃO
  // ============================================================
  function openRejectModal(postId) {
    const modal = $('#soModalReprovar');
    const bd = $('#soModalBackdrop');
    modal.dataset.postId = postId;
    $('#soMotivoText').value = '';
    $('#soMotivoError').hidden = true;
    bd.hidden = false;
    requestAnimationFrame(() => {
      bd.classList.add('is-open');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      setTimeout(() => $('#soMotivoText').focus(), 100);
    });
  }
  function closeRejectModal() {
    const modal = $('#soModalReprovar');
    const bd = $('#soModalBackdrop');
    modal.classList.remove('is-open');
    bd.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { bd.hidden = true; }, 220);
    delete modal.dataset.postId;
  }


  // ============================================================
  // ACTIONS · aprovar/reprovar/comentar/reabrir
  // ============================================================
  async function doApprove(postId, btn) {
    const Auth = window.WhirlpoolAuth;
    if (Auth && Auth.ensureUserName) Auth.ensureUserName();
    const actor = actorFromAuth();
    if (btn) { btn.disabled = true; btn.textContent = 'Aprovando…'; }
    try {
      await window.SocialStore.approvePost(postId, actor);
      await refreshPosts();
      if (state.drawerPostId === postId) await openDrawer(postId);  // re-renderiza drawer
    } catch (e) {
      console.error('[social] approve erro:', e);
      alert('Não consegui aprovar. ' + (e.message || ''));
      if (btn) { btn.disabled = false; btn.textContent = '✓ Aprovar'; }
    }
  }
  async function doReject(postId, motivo) {
    const Auth = window.WhirlpoolAuth;
    if (Auth && Auth.ensureUserName) Auth.ensureUserName();
    const actor = actorFromAuth();
    try {
      await window.SocialStore.rejectPost(postId, motivo, actor);
      closeRejectModal();
      await refreshPosts();
      if (state.drawerPostId === postId) await openDrawer(postId);
    } catch (e) {
      console.error('[social] reject erro:', e);
      const err = $('#soMotivoError');
      err.textContent = 'Erro ao reprovar: ' + (e.message || '');
      err.hidden = false;
    }
  }
  async function doComment(postId, textarea, btn) {
    const Auth = window.WhirlpoolAuth;
    if (Auth && Auth.ensureUserName) Auth.ensureUserName();
    const actor = actorFromAuth();
    const texto = (textarea.value || '').trim();
    if (!texto) {
      textarea.focus();
      return;
    }
    btn.disabled = true; const oldLabel = btn.textContent; btn.textContent = 'Enviando…';
    try {
      await window.SocialStore.createComentario(postId, texto, actor);
      textarea.value = '';
      // re-render drawer pra ver o novo comment
      if (state.drawerPostId === postId) await openDrawer(postId);
    } catch (e) {
      console.error('[social] comment erro:', e);
      alert('Não consegui comentar. ' + (e.message || ''));
    } finally {
      btn.disabled = false; btn.textContent = oldLabel;
    }
  }

  function doDeleteComentario(commentId, postId) {
    openConfirm({
      title: 'Excluir comentário',
      body:  'Excluir esse comentário do thread? Não dá pra desfazer.',
      btnLabel: 'Excluir comentário',
      onConfirm: async () => {
        try {
          await window.SocialStore.deleteComentario(commentId);
          closeConfirm();
          if (state.drawerPostId === postId) await openDrawer(postId);
        } catch (e) {
          console.error('[social] delete comentário erro:', e);
          alert('Erro ao excluir: ' + (e.message || ''));
        }
      }
    });
  }
  async function doReopen(postId) {
    if (!confirm('Reabrir essa publicação? O status volta pra pendente.')) return;
    const actor = actorFromAuth();
    try {
      await window.SocialStore.reopenPost(postId, actor);
      await refreshPosts();
      if (state.drawerPostId === postId) await openDrawer(postId);
    } catch (e) {
      console.error('[social] reopen erro:', e);
      alert('Não consegui reabrir. ' + (e.message || ''));
    }
  }


  // ============================================================
  // ADMIN · ações de POST (criar / editar / excluir)
  // ============================================================
  function collectPostForm(drawer) {
    const root = drawer || $('#soDrawer');
    const peca = $('#soFPeca', root).value;
    const pecaFinal = peca === '__outro'
      ? ($('#soFPecaOutro', root).value || '').trim()
      : peca;
    const radio = root.querySelector('input[name="soFTipo"]:checked');

    return {
      data_post:       $('#soFData', root).value,
      numero:          parseInt($('#soFNumero', root).value, 10) || null,
      linha_editorial: $('#soFLinha', root).value,
      formato:         $('#soFFormato', root).value,
      tipo:            radio ? radio.value : 'always_on',
      peca:            pecaFinal || null,
      tema:            ($('#soFTema', root).value || '').trim(),
      explicacao:      ($('#soFExpl', root).value || '').trim(),
    };
  }

  function showFormErr(msg) {
    const el = $('#soFErr');
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.hidden = false;
  }

  async function doSavePost(postId, btn) {
    const drawer = $('#soDrawer');
    const data = collectPostForm(drawer);
    if (!data.data_post)        return showFormErr('Data é obrigatória.');
    if (!data.tema)             return showFormErr('Tema é obrigatório.');
    if (!data.explicacao)       return showFormErr('Explicação é obrigatória.');

    if (btn) { btn.disabled = true; btn.dataset._oldLabel = btn.textContent; btn.textContent = 'Salvando…'; }

    try {
      if (state.drawerMode === 'new') {
        if (!state.mesAtual) throw new Error('Sem mês selecionado');
        await window.SocialStore.createPost(state.mesAtual.id, data);
      } else {
        await window.SocialStore.updatePost(postId, data);
      }
      await refreshPosts();
      // após salvar, volta pra view do post (se editando) ou fecha (se novo)
      if (state.drawerMode === 'new') closeDrawer();
      else await openDrawer(postId, 'view');
    } catch (e) {
      console.error('[social] save post erro:', e);
      showFormErr('Erro ao salvar: ' + (e.message || ''));
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._oldLabel || 'Salvar'; }
    }
  }

  function doDeletePost(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    openConfirm({
      title: 'Excluir publicação',
      body:  `Tem certeza que quer excluir a publicação #${post.numero} "${post.tema}"? Todos os comentários e histórico vão junto. Não dá pra desfazer.`,
      btnLabel: 'Excluir publicação',
      onConfirm: async () => {
        try {
          await window.SocialStore.deletePost(postId);
          await refreshPosts();
          if (state.drawerPostId === postId) closeDrawer();
          closeConfirm();
        } catch (e) {
          console.error('[social] delete post erro:', e);
          alert('Erro ao excluir: ' + (e.message || ''));
        }
      }
    });
  }


  // ============================================================
  // ADMIN · ações de MÊS (criar / editar / duplicar / excluir)
  // ============================================================
  let _monthMode = 'edit';   // 'edit' | 'new' | 'duplicate'

  function openMonthModal(mode) {
    _monthMode = mode;
    const modal = $('#soModalMonth');
    const bd    = $('#soModalMonthBackdrop');
    const m     = state.mesAtual;

    const titles = {
      edit: 'Editar mês',
      new:  'Novo mês',
      duplicate: 'Duplicar para outro mês'
    };
    $('#soModalMonthTitle').textContent = titles[mode] || 'Mês';

    // Preencher campos baseado no modo
    if (mode === 'edit' && m) {
      $('#soMonthAno').value        = m.ano;
      $('#soMonthMes').value        = m.mes;
      $('#soMonthNome').value       = m.nome || '';
      $('#soMonthTema').value       = m.tema || '';
      $('#soMonthEstrategia').value = m.estrategia || '';
      $('#soMonthCampanha').value   = m.campanha || '';
      $('#soMonthConceito').value   = m.conceito || '';
    } else if (mode === 'duplicate' && m) {
      // sugestão: próximo mês após o atual
      const next = nextMonth(m.ano, m.mes);
      $('#soMonthAno').value        = next.ano;
      $('#soMonthMes').value        = next.mes;
      $('#soMonthNome').value       = monthName(next.ano, next.mes);
      $('#soMonthTema').value       = '';
      $('#soMonthEstrategia').value = m.estrategia || '';
      $('#soMonthCampanha').value   = '';
      $('#soMonthConceito').value   = '';
    } else {  // new
      const today = new Date();
      $('#soMonthAno').value        = today.getFullYear();
      $('#soMonthMes').value        = today.getMonth() + 1;
      $('#soMonthNome').value       = monthName(today.getFullYear(), today.getMonth() + 1);
      $('#soMonthTema').value       = '';
      $('#soMonthEstrategia').value = '';
      $('#soMonthCampanha').value   = '';
      $('#soMonthConceito').value   = '';
    }
    $('#soMonthError').hidden = true;

    bd.hidden = false;
    requestAnimationFrame(() => {
      bd.classList.add('is-open');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    });
  }
  function closeMonthModal() {
    const modal = $('#soModalMonth');
    const bd    = $('#soModalMonthBackdrop');
    modal.classList.remove('is-open');
    bd.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { bd.hidden = true; }, 220);
  }
  function nextMonth(ano, mes) {
    if (mes === 12) return { ano: ano + 1, mes: 1 };
    return { ano: ano, mes: mes + 1 };
  }
  function monthName(ano, mes) {
    const NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${NOMES[mes - 1]} ${ano}`;
  }
  function slugFor(ano, mes) {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  async function doSaveMonth() {
    const ano = parseInt($('#soMonthAno').value, 10);
    const mes = parseInt($('#soMonthMes').value, 10);
    const nome = ($('#soMonthNome').value || '').trim();
    if (!ano || ano < 2024 || ano > 2035) {
      $('#soMonthError').textContent = 'Ano inválido. Use entre 2024 e 2035.';
      $('#soMonthError').hidden = false;
      return;
    }
    if (!mes || mes < 1 || mes > 12) {
      $('#soMonthError').textContent = 'Mês inválido.';
      $('#soMonthError').hidden = false;
      return;
    }
    const data = {
      slug:       slugFor(ano, mes),
      ano:        ano,
      mes:        mes,
      nome:       nome || monthName(ano, mes),
      tema:       $('#soMonthTema').value,
      estrategia: $('#soMonthEstrategia').value,
      campanha:   $('#soMonthCampanha').value,
      conceito:   $('#soMonthConceito').value,
    };

    try {
      let savedSlug = data.slug;
      if (_monthMode === 'edit') {
        await window.SocialStore.updateMes(state.mesAtual.id, data);
      } else if (_monthMode === 'duplicate') {
        const created = await window.SocialStore.duplicateMes(state.mesAtual.id, data);
        savedSlug = created.slug;
      } else {
        const created = await window.SocialStore.createMes(data);
        savedSlug = created.slug;
      }
      closeMonthModal();
      // recarrega lista de meses e seleciona o atualizado/criado
      state.meses = await window.SocialStore.listMeses(true);
      const target = state.meses.find(m => m.slug === savedSlug);
      if (target) {
        state.mesAtual = target;
        await loadPostsForMes(target.id);
        Object.values(state.filters).forEach(s => s.clear());
        renderMesSelect();
        renderHero();
        renderKpis();
        renderFilters();
        renderGrid();
      }
    } catch (e) {
      console.error('[social] save month erro:', e);
      const msg = (e.message || '').includes('duplicate key')
        ? `Já existe um mês ${slugFor(ano, mes)}.`
        : ('Erro ao salvar: ' + (e.message || ''));
      $('#soMonthError').textContent = msg;
      $('#soMonthError').hidden = false;
    }
  }

  function doDeleteMonth() {
    if (!state.mesAtual) return;
    const m = state.mesAtual;
    const numPosts = state.posts.length;
    openConfirm({
      title: 'Excluir mês inteiro',
      body:  numPosts > 0
        ? `Excluir ${m.nome} e os ${numPosts} ${numPosts === 1 ? 'post' : 'posts'} desse mês (com comentários e histórico). Não dá pra desfazer.`
        : `Excluir ${m.nome}? Não tem posts cadastrados ainda.`,
      btnLabel: `Excluir ${m.nome}`,
      onConfirm: async () => {
        try {
          await window.SocialStore.deleteMes(m.id);
          closeConfirm();
          state.meses = await window.SocialStore.listMeses(true);
          state.mesAtual = state.meses[0] || null;
          if (state.mesAtual) await loadPostsForMes(state.mesAtual.id);
          else state.posts = [];
          renderMesSelect();
          renderHero();
          renderKpis();
          renderFilters();
          renderGrid();
          renderAdminBar();
        } catch (e) {
          console.error('[social] delete month erro:', e);
          alert('Erro ao excluir mês: ' + (e.message || ''));
        }
      }
    });
  }


  // ============================================================
  // ADMIN · modal de confirmação genérico
  // ============================================================
  let _confirmCallback = null;
  function openConfirm({ title, body, btnLabel, onConfirm }) {
    $('#soConfirmTitle').textContent = title || 'Confirmar';
    $('#soConfirmBody').textContent = body || '';
    $('#soConfirmAction').textContent = btnLabel || 'Confirmar';
    _confirmCallback = onConfirm;
    const modal = $('#soModalConfirm2');
    const bd    = $('#soModalConfirmBackdrop');
    bd.hidden = false;
    requestAnimationFrame(() => {
      bd.classList.add('is-open');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    });
  }
  function closeConfirm() {
    const modal = $('#soModalConfirm2');
    const bd    = $('#soModalConfirmBackdrop');
    modal.classList.remove('is-open');
    bd.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { bd.hidden = true; }, 220);
    _confirmCallback = null;
  }


  // ============================================================
  // RENDER · ADMIN BAR (só pra molla)
  // ============================================================
  function renderAdminBar() {
    const bar = $('#soAdminBar');
    if (!bar) return;
    bar.hidden = !state.isAdmin || !state.meses.length;
    // Botão "Editar / Duplicar / Excluir" só funciona se tem mes selecionado
    const hasMes = !!state.mesAtual;
    $$('[data-action="month-edit"], [data-action="month-duplicate"], [data-action="month-delete"]', bar)
      .forEach(b => { b.disabled = !hasMes; });
  }


  // ============================================================
  // EVENT WIRING
  // ============================================================
  // ============================================================
  // EVENT WIRING DO DRAWER · uma única vez no boot
  // ------------------------------------------------------------
  // Antes era chamado a cada openDrawer e acumulava listeners,
  // o que fazia 1 clique em "Comentar" inserir N comentários.
  // ============================================================
  function wireDrawerEvents(drawer) {
    if (drawer._wired) return;
    drawer._wired = true;

    drawer.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const postId = btn.dataset.postId || state.drawerPostId;

      if (action === 'close')        { closeDrawer(); return; }
      if (action === 'approve')      { await doApprove(postId, btn); return; }
      if (action === 'reject')       { openRejectModal(postId); return; }
      if (action === 'reopen')       { await doReopen(postId); return; }
      if (action === 'comment') {
        const ta = $('#soCommentInput', drawer);
        if (ta) await doComment(postId, ta, btn);
        return;
      }
      if (action === 'comment-delete') {
        const commentId = btn.dataset.commentId;
        if (commentId) doDeleteComentario(commentId, postId);
        return;
      }
      // admin actions
      if (action === 'post-edit')    { await openDrawer(postId, 'edit'); return; }
      if (action === 'post-delete')  { doDeletePost(postId); return; }
      if (action === 'edit-cancel')  {
        if (state.drawerMode === 'new') closeDrawer();
        else await openDrawer(postId, 'view');
        return;
      }
      if (action === 'edit-save')    { await doSavePost(postId, btn); return; }
    });
    // Quando muda o select de peça pra "Outro…", mostra o input
    drawer.addEventListener('change', (ev) => {
      const sel = ev.target.closest('#soFPeca');
      if (!sel) return;
      const wrap = $('#soFPecaOutroWrap', drawer);
      if (wrap) wrap.hidden = sel.value !== '__outro';
    });
    // Visual feedback nos radios de tipo
    drawer.addEventListener('change', (ev) => {
      const radio = ev.target.closest('input[name="soFTipo"]');
      if (!radio) return;
      $$('.so-radio', drawer).forEach(r => r.classList.remove('is-active'));
      const parent = radio.closest('.so-radio');
      if (parent) parent.classList.add('is-active');
    });
  }

  function wireGlobalEvents() {
    // Wire do drawer · uma única vez, no boot
    wireDrawerEvents($('#soDrawer'));

    // seletor de mês
    $('#soMesSelect').addEventListener('change', async (e) => {
      const slug = e.target.value;
      const mes = state.meses.find(m => m.slug === slug);
      if (!mes) return;
      state.mesAtual = mes;
      // limpa filtros ao trocar mês — mais limpo
      Object.values(state.filters).forEach(s => s.clear());
      await loadPostsForMes(mes.id);
      renderHero();
      renderKpis();
      renderFilters();
      renderGrid();
    });

    // chips de filtro · multi-select (Tipo, Status)
    document.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.so-chip');
      if (!chip) return;
      const group = chip.dataset.group;
      const value = chip.dataset.value;
      const set = state.filters[group];
      if (!set) return;
      if (set.has(value)) set.delete(value);
      else set.add(value);
      renderFilters();
      renderGrid();
    });

    // selects de filtro · single-select (Linha editorial, Formato, Peça)
    document.addEventListener('change', (ev) => {
      const sel = ev.target.closest('.so-select');
      if (!sel) return;
      const group = sel.dataset.group;
      const value = sel.value;
      const set = state.filters[group];
      if (!set) return;
      set.clear();
      if (value) set.add(value);
      sel.classList.toggle('is-active', !!value);
      // não re-renderiza todos os filtros pra não perder o focus do select aberto;
      // só re-renderiza a grid e o contador.
      renderGrid();
    });

    // clear filters
    $('#soClearFilters').addEventListener('click', () => {
      Object.values(state.filters).forEach(s => s.clear());
      renderFilters();
      renderGrid();
    });
    $('#soEmptyClear').addEventListener('click', () => {
      Object.values(state.filters).forEach(s => s.clear());
      renderFilters();
      renderGrid();
    });

    // card click — abre drawer (view por padrão; admin actions tratadas)
    $('#soGrid').addEventListener('click', (ev) => {
      // 1. Card "+ Novo post" — só admin
      const newCard = ev.target.closest('[data-action="post-new"]');
      if (newCard) {
        openDrawer(null, 'new');
        return;
      }
      // 2. Botão editar no card
      const editBtn = ev.target.closest('[data-action="post-edit"]');
      if (editBtn) {
        const card = editBtn.closest('.so-card');
        if (card) openDrawer(card.dataset.postId, 'edit');
        return;
      }
      // 3. Botão excluir no card
      const delBtn = ev.target.closest('[data-action="post-delete"]');
      if (delBtn) {
        const card = delBtn.closest('.so-card');
        if (card) doDeletePost(card.dataset.postId);
        return;
      }
      // 4. Botão Ver ou corpo do card abre drawer view
      const openBtn = ev.target.closest('[data-action="open"]');
      const card = ev.target.closest('.so-card');
      if (!card) return;
      if (openBtn || !ev.target.closest('button, a')) {
        openDrawer(card.dataset.postId, 'view');
      }
    });

    // teclado: enter no card "Novo post"
    $('#soGrid').addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const newCard = ev.target.closest('[data-action="post-new"]');
      if (newCard) { ev.preventDefault(); openDrawer(null, 'new'); }
    });

    // drawer backdrop
    $('#soDrawerBackdrop').addEventListener('click', closeDrawer);

    // modal reprovação
    $('#soModalClose').addEventListener('click', closeRejectModal);
    $('#soModalCancel').addEventListener('click', closeRejectModal);
    $('#soModalBackdrop').addEventListener('click', closeRejectModal);
    $('#soModalConfirm').addEventListener('click', () => {
      const modal = $('#soModalReprovar');
      const postId = modal.dataset.postId;
      const motivo = ($('#soMotivoText').value || '').trim();
      if (!motivo) {
        $('#soMotivoError').textContent = 'Escreva o motivo da reprovação.';
        $('#soMotivoError').hidden = false;
        $('#soMotivoText').focus();
        return;
      }
      doReject(postId, motivo);
    });

    // Admin bar — botões de mês
    const adminBar = $('#soAdminBar');
    if (adminBar) {
      adminBar.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) return;
        const a = btn.dataset.action;
        if (a === 'month-edit')      openMonthModal('edit');
        if (a === 'month-new')       openMonthModal('new');
        if (a === 'month-duplicate') openMonthModal('duplicate');
        if (a === 'month-delete')    doDeleteMonth();
      });
    }

    // Modal de mês — fechar e salvar
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'month-close') closeMonthModal();
      if (a === 'month-save')  doSaveMonth();
      if (a === 'confirm-close') closeConfirm();
    });
    $('#soModalMonthBackdrop').addEventListener('click', closeMonthModal);
    $('#soModalConfirmBackdrop').addEventListener('click', closeConfirm);
    $('#soConfirmAction').addEventListener('click', () => {
      if (typeof _confirmCallback === 'function') _confirmCallback();
    });

    // Esc fecha drawer e modais
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if ($('#soModalConfirm2').classList.contains('is-open')) closeConfirm();
      else if ($('#soModalMonth').classList.contains('is-open')) closeMonthModal();
      else if ($('#soModalReprovar').classList.contains('is-open')) closeRejectModal();
      else if ($('#soDrawer').classList.contains('is-open'))   closeDrawer();
    });
  }


  // ============================================================
  // CARGA DE DADOS
  // ============================================================
  async function loadPostsForMes(mesId) {
    state.posts = await window.SocialStore.listPosts(mesId, true);
  }
  async function refreshPosts() {
    if (!state.mesAtual) return;
    await loadPostsForMes(state.mesAtual.id);
    renderKpis();
    renderFilters();   // valores únicos podem ter mudado
    renderGrid();
  }


  // ============================================================
  // BOOT
  // ============================================================
  async function boot() {
    // Reset defensivo: garante que nenhum overlay ficou marcado como aberto
    // por algum cache, navegação anterior ou bug de extensão do navegador.
    const overlayIds = [
      '#soDrawerBackdrop', '#soModalBackdrop',
      '#soModalMonthBackdrop', '#soModalConfirmBackdrop'
    ];
    overlayIds.forEach(id => {
      const el = $(id);
      if (el) { el.hidden = true; el.classList.remove('is-open'); }
    });
    ['#soDrawer', '#soModalReprovar', '#soModalMonth', '#soModalConfirm2'].forEach(id => {
      const el = $(id);
      if (el) { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); }
    });

    // Identifica role
    const Auth = window.WhirlpoolAuth;
    state.isAdmin = !!(Auth && Auth.isAdmin && Auth.isAdmin());

    if (window.SocialStore && window.SocialStore._failed) {
      $('#soTema').textContent = 'Erro de configuração';
      $('#soConceito').textContent = 'Faltam dependências (Supabase/config). Recarrega a página.';
      return;
    }

    wireGlobalEvents();

    try {
      state.meses = await window.SocialStore.listMeses(true);
    } catch (e) {
      console.error('[social] erro listando meses:', e);
      $('#soTema').textContent = 'Erro ao carregar meses';
      $('#soConceito').innerHTML = 'Talvez o schema não tenha sido rodado ainda. Rode <code>docs/social_schema.sql</code> e <code>docs/social_seed_junho.sql</code> no Supabase.';
      return;
    }

    if (!state.meses.length) {
      $('#soTema').textContent = 'Sem pré-pauta cadastrada';
      if (state.isAdmin) {
        $('#soConceito').innerHTML = 'Crie o primeiro mês clicando em <strong>+ Novo mês</strong> na barra de admin.';
        // Mostra admin bar mesmo sem mês (só pra permitir criar)
        const bar = $('#soAdminBar');
        if (bar) {
          bar.hidden = false;
          $$('[data-action="month-edit"], [data-action="month-duplicate"], [data-action="month-delete"]', bar)
            .forEach(b => { b.disabled = true; });
        }
      } else {
        $('#soConceito').textContent = 'A pré-pauta deste mês ainda não está disponível. Volte em breve.';
      }
      renderMesSelect();
      return;
    }

    // Mês inicial: o mais recente
    state.mesAtual = state.meses[0];
    await loadPostsForMes(state.mesAtual.id);

    renderMesSelect();
    renderHero();
    renderKpis();
    renderFilters();
    renderGrid();
    renderAdminBar();

    // Realtime — re-atualiza sem reload
    window.SocialStore.subscribe(async (payload) => {
      try {
        if (!state.mesAtual) return;
        // mudança em meses requer recarregar lista
        if (payload.table === 'meses') {
          state.meses = await window.SocialStore.listMeses(true);
          renderMesSelect();
        }
        await loadPostsForMes(state.mesAtual.id);
        renderKpis();
        renderGrid();
        renderAdminBar();
        // se o drawer view aberto teve mudança em comentários/historico, recarrega
        if (state.drawerPostId && state.drawerMode === 'view'
            && (payload.table === 'comentarios' || payload.table === 'historico')) {
          await openDrawer(state.drawerPostId, 'view');
        }
      } catch (e) {
        console.warn('[social] realtime callback erro:', e);
      }
    });
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
