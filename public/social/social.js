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
    institucional:  { label: 'Institucional',         cor: '#0D436B' },
    conhecimento:   { label: 'Conhecimento de peças', cor: '#00A0DD' },
    resolucao:      { label: 'Resolução de problemas',cor: '#F59E0B' },
    boas_praticas:  { label: 'Boas práticas',         cor: '#1E7BAB' },
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
  };


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
    const cor = corHex || '#00A0DD';
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
    const cor = corHex || '#00A0DD';
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
    const cor = corHex || '#00A0DD';
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
    const cor = corHex || '#00A0DD';
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

    chipsHtml('#soFiltersTipo',    Array.from(u.tipo).sort(),    'tipo',    v => TIPOS[v] || v);
    chipsHtml('#soFiltersLinha',   Array.from(u.linha),          'linha',   v => LINHAS[v] ? LINHAS[v].label : v, v => LINHAS[v] && LINHAS[v].cor);
    chipsHtml('#soFiltersPeca',    Array.from(u.peca).sort(),    'peca',    v => v === '__nopeca' ? 'Sem peça' : v);
    chipsHtml('#soFiltersFormato', Array.from(u.formato).sort(), 'formato', v => FORMATOS[v] || v);
    chipsHtml('#soFiltersStatus',  Array.from(u.status),         'status',  v => STATUS[v] ? STATUS[v].label : v);
  }
  function chipsHtml(rootSel, values, group, labelFn, colorFn) {
    const root = $(rootSel);
    if (!root) return;
    root.innerHTML = values.map(v => {
      const active = state.filters[group].has(v) ? 'is-active' : '';
      const color = colorFn ? colorFn(v) : null;
      const dot = color ? `<span class="so-chip-color" style="background:${color}"></span>` : '';
      return `<button type="button" class="so-chip ${active}" data-group="${group}" data-value="${esc(v)}">${dot}${esc(labelFn(v))}</button>`;
    }).join('');
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

    if (!filtered.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = filtered.map(cardHtml).join('');
  }
  function cardHtml(p) {
    const linha = LINHAS[p.linha_editorial] || { label: p.linha_editorial, cor: '#00A0DD' };
    const fmtLabel = FORMATOS[p.formato] || p.formato;
    const stsLabel = STATUS[p.status] ? STATUS[p.status].label : p.status;
    const data = fmtData(p.data_post);
    const tipoChip = p.tipo === 'campanha'
      ? '<span class="so-card-tag so-card-tag-tipo-campanha">⚽ Campanha Copa</span>'
      : '<span class="so-card-tag">Always On</span>';

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
            <button type="button" class="so-btn so-btn-open" data-action="open">Ver →</button>
          </div>
        </div>
      </article>
    `;
  }


  // ============================================================
  // DRAWER · render do detalhe
  // ============================================================
  async function openDrawer(postId) {
    state.drawerPostId = postId;
    const drawer = $('#soDrawer');
    const backdrop = $('#soDrawerBackdrop');

    // Render esqueleto enquanto carrega comments+historico
    drawer.innerHTML = drawerSkeletonHtml();
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    try {
      const [comentarios, historico] = await Promise.all([
        window.SocialStore.listComentarios(postId, true),
        window.SocialStore.listHistorico(postId, true),
      ]);
      const post = state.posts.find(p => p.id === postId);
      if (post) drawer.innerHTML = drawerFullHtml(post, comentarios, historico);
      wireDrawerEvents(drawer);
    } catch (err) {
      console.error('[social] erro carregando detalhe:', err);
      drawer.innerHTML = `
        <div class="so-drawer-head">
          <h3 class="so-drawer-title">Erro</h3>
          <button type="button" class="so-drawer-close" id="soDrawerCloseErr" aria-label="Fechar">×</button>
        </div>
        <div class="so-drawer-body"><p>Não consegui carregar os detalhes. Tenta de novo em alguns segundos.</p></div>`;
      const closeBtn = $('#soDrawerCloseErr');
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
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
    const linha = LINHAS[p.linha_editorial] || { label: p.linha_editorial, cor: '#00A0DD' };
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

    return `
      <div class="so-drawer-head">
        <h3 class="so-drawer-title">Publicação #${esc(p.numero)}</h3>
        <button type="button" class="so-drawer-close" data-action="close" aria-label="Fechar">×</button>
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
  // EVENT WIRING
  // ============================================================
  function wireDrawerEvents(drawer) {
    drawer.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const postId = btn.dataset.postId || state.drawerPostId;

      if (action === 'close')   { closeDrawer(); return; }
      if (action === 'approve') { await doApprove(postId, btn); return; }
      if (action === 'reject')  { openRejectModal(postId); return; }
      if (action === 'reopen')  { await doReopen(postId); return; }
      if (action === 'comment') {
        const ta = $('#soCommentInput', drawer);
        if (ta) await doComment(postId, ta, btn);
        return;
      }
    });
  }

  function wireGlobalEvents() {
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

    // chips de filtro
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

    // card click — abre drawer
    $('#soGrid').addEventListener('click', (ev) => {
      const openBtn = ev.target.closest('[data-action="open"]');
      const card = ev.target.closest('.so-card');
      if (!card) return;
      // tanto clique no botão "Ver" quanto no corpo do card abre o drawer
      if (openBtn || !ev.target.closest('button, a')) {
        openDrawer(card.dataset.postId);
      }
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

    // Esc fecha drawer e modal
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if ($('#soModalReprovar').classList.contains('is-open')) closeRejectModal();
        else if ($('#soDrawer').classList.contains('is-open'))   closeDrawer();
      }
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
    const _bd1 = $('#soDrawerBackdrop');
    const _bd2 = $('#soModalBackdrop');
    const _dr  = $('#soDrawer');
    const _md  = $('#soModalReprovar');
    if (_bd1) { _bd1.hidden = true; _bd1.classList.remove('is-open'); }
    if (_bd2) { _bd2.hidden = true; _bd2.classList.remove('is-open'); }
    if (_dr)  { _dr.classList.remove('is-open'); _dr.setAttribute('aria-hidden', 'true'); }
    if (_md)  { _md.classList.remove('is-open');  _md.setAttribute('aria-hidden', 'true'); }

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
      $('#soConceito').innerHTML = 'Rode <code>docs/social_seed_junho.sql</code> no Supabase pra ver Junho/2026.';
      renderMesSelect();
      return;
    }

    // Mês inicial: o mais recente (primeiro do array por ordenação desc)
    state.mesAtual = state.meses[0];
    await loadPostsForMes(state.mesAtual.id);

    renderMesSelect();
    renderHero();
    renderKpis();
    renderFilters();
    renderGrid();

    // Realtime — re-atualiza sem reload
    window.SocialStore.subscribe(async (payload) => {
      try {
        if (!state.mesAtual) return;
        await loadPostsForMes(state.mesAtual.id);
        renderKpis();
        renderGrid();
        // se o drawer aberto teve mudança em comentários/historico, recarrega
        if (state.drawerPostId && (payload.table === 'comentarios' || payload.table === 'historico')) {
          await openDrawer(state.drawerPostId);
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
