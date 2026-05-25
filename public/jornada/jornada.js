/* ============================================================
   Jornada da Campanha — Timeline + filtros + busca + CRUD admin
   ============================================================ */
(function () {
  'use strict';

  // ============ CATEGORIAS ============
  const CATS = {
    midia:     { label: 'Mídia',       icon: '📺', cor: 'var(--jr-c-midia)',     bg: 'var(--jr-c-midia-bg)' },
    blitz:     { label: 'Blitz',       icon: '🚀', cor: 'var(--jr-c-blitz)',     bg: 'var(--jr-c-blitz-bg)' },
    watch:     { label: 'Watch Party', icon: '🍿', cor: 'var(--jr-c-watch)',     bg: 'var(--jr-c-watch-bg)' },
    evento:    { label: 'Evento',      icon: '🎤', cor: 'var(--jr-c-evento)',    bg: 'var(--jr-c-evento-bg)' },
    aprovacao: { label: 'Aprovação',   icon: '✅', cor: 'var(--jr-c-aprovacao)', bg: 'var(--jr-c-aprovacao-bg)' },
    campanha:  { label: 'Campanha',    icon: '🎯', cor: 'var(--jr-c-campanha)',  bg: 'var(--jr-c-campanha-bg)' },
    outros:    { label: 'Outros',      icon: '📌', cor: 'var(--jr-c-outros)',    bg: 'var(--jr-c-outros-bg)' },
  };
  const ORDEM = ['midia', 'blitz', 'watch', 'evento', 'aprovacao', 'campanha', 'outros'];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // ============ HELPERS ============
  const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapeAttr = escapeHtml;

  const parseDate = (iso) => {
    if (!iso) return null;
    const [y, m, d] = String(iso).split('T')[0].split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const fmtRange = (ini, fim) => {
    const a = parseDate(ini); if (!a) return '';
    const b = fim ? parseDate(fim) : null;
    const dia = (d) => String(d.getDate()).padStart(2, '0');
    const mes = (d) => String(d.getMonth() + 1).padStart(2, '0');
    if (!b || (a.getTime() === b.getTime())) return `${dia(a)}/${mes(a)}/${a.getFullYear()}`;
    return `${dia(a)}/${mes(a)} – ${dia(b)}/${mes(b)}/${b.getFullYear()}`;
  };

  const isAdmin = () => !!(window.WhirlpoolAuth && window.WhirlpoolAuth.isAdmin && window.WhirlpoolAuth.isAdmin());

  // ============ TOAST ============
  const Toast = {
    show(msg, kind = 'info') {
      let el = document.getElementById('jrToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'jrToast';
        el.className = 'jr-toast';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.className = 'jr-toast jr-toast-' + kind + ' is-visible';
      clearTimeout(this._t);
      const duration = (kind === 'error') ? 6000 : 2600;
      this._t = setTimeout(() => { el.className = 'jr-toast jr-toast-' + kind; }, duration);
    }
  };

  // ============ STATE ============
  let state = {
    cat: 'todos',
    month: 'all',           // 'all' | 'YYYY-MM'
    eventos: [],
    loading: true,
    error: null,
    setupPending: false,
    didInitialScroll: false,
  };

  // ============ MODAL ============
  const Modal = {
    open(ev) {
      const isEdit = !!ev;
      const e = ev || { titulo: '', categoria: 'campanha', data_inicio: '', data_fim: '', descricao: '', link_interno: '' };
      const ini = e.data_inicio ? String(e.data_inicio).split('T')[0] : '';
      const fim = e.data_fim ? String(e.data_fim).split('T')[0] : '';

      const catOpts = ORDEM.map(c =>
        `<option value="${c}" ${e.categoria === c ? 'selected' : ''}>${CATS[c].icon} ${CATS[c].label}</option>`
      ).join('');

      const html = `
        <div class="jr-modal-backdrop" id="jrModalBackdrop">
          <div class="jr-modal" role="dialog" aria-modal="true" aria-labelledby="jrModalTitle">
            <div class="jr-modal-head">
              <h3 id="jrModalTitle">${isEdit ? 'Editar evento' : 'Adicionar evento'}</h3>
              <button type="button" class="jr-modal-close" id="jrModalClose" aria-label="Fechar">×</button>
            </div>
            <form class="jr-modal-body" id="jrModalForm">
              <label>
                <span>Título *</span>
                <input type="text" name="titulo" required maxlength="200" value="${escapeAttr(e.titulo)}" placeholder="Ex: Blitz Brasil x Marrocos" />
              </label>
              <label>
                <span>Categoria *</span>
                <select name="categoria" required>${catOpts}</select>
              </label>
              <div class="jr-modal-row">
                <label>
                  <span>Data início *</span>
                  <input type="date" name="data_inicio" required value="${escapeAttr(ini)}" />
                </label>
                <label>
                  <span>Data fim (opcional)</span>
                  <input type="date" name="data_fim" value="${escapeAttr(fim)}" />
                </label>
              </div>
              <label>
                <span>Descrição</span>
                <textarea name="descricao" rows="3" maxlength="500" placeholder="Contexto da ação, locais, observações...">${escapeHtml(e.descricao || '')}</textarea>
              </label>
              <label>
                <span>Link interno (opcional)</span>
                <input type="text" name="link_interno" maxlength="200" value="${escapeAttr(e.link_interno || '')}" placeholder="/blitz, /elemidia, etc." />
              </label>
              <div class="jr-modal-actions">
                ${isEdit ? `<button type="button" class="jr-btn-danger" id="jrModalDelete">Excluir</button>` : ''}
                <div class="jr-modal-actions-right">
                  <button type="button" class="jr-btn-ghost" id="jrModalCancel">Cancelar</button>
                  <button type="submit" class="jr-btn-primary">${isEdit ? 'Salvar' : 'Adicionar'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      `;
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap.firstElementChild);
      this._wireUp(ev);
    },

    _wireUp(ev) {
      const backdrop = document.getElementById('jrModalBackdrop');
      const form = document.getElementById('jrModalForm');
      const escListener = (k) => { if (k.key === 'Escape') close(); };
      const close = () => { backdrop.remove(); document.removeEventListener('keydown', escListener); };

      document.addEventListener('keydown', escListener);
      document.getElementById('jrModalClose').addEventListener('click', close);
      document.getElementById('jrModalCancel').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

      if (ev) {
        document.getElementById('jrModalDelete').addEventListener('click', async () => {
          if (!confirm('Excluir este evento? Essa ação não pode ser desfeita.')) return;
          try {
            await window.EventsStore.delete(ev.id);
            Toast.show('Evento excluído.', 'success');
            close();
            await reload();
          } catch (e) {
            Toast.show('Erro ao excluir: ' + (e.message || e), 'error');
          }
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          titulo: fd.get('titulo'),
          categoria: fd.get('categoria'),
          data_inicio: fd.get('data_inicio'),
          data_fim: fd.get('data_fim') || null,
          descricao: fd.get('descricao'),
          link_interno: fd.get('link_interno'),
        };
        try {
          if (ev) {
            await window.EventsStore.update(ev.id, payload);
            Toast.show('Evento atualizado.', 'success');
          } else {
            await window.EventsStore.create(payload);
            Toast.show('Evento adicionado.', 'success');
          }
          close();
          await reload();
        } catch (err) {
          Toast.show('Erro: ' + (err.message || err), 'error');
        }
      });

      setTimeout(() => form.querySelector('input[name="titulo"]').focus(), 50);
    },
  };

  // ============ RENDER ============
  function renderAdminBar() {
    const slot = document.getElementById('jrAdminSlot');
    if (!slot) return;
    if (isAdmin()) {
      slot.innerHTML = `<button type="button" class="jr-btn-primary" id="jrBtnAdd">+ Adicionar evento</button>`;
      const btn = document.getElementById('jrBtnAdd');
      if (state.setupPending) {
        btn.disabled = true;
        btn.title = 'Aplique o schema SQL no Supabase para liberar';
        btn.style.opacity = '0.55';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.addEventListener('click', () => Modal.open(null));
      }
    } else {
      slot.innerHTML = '';
    }
  }

  function renderMonthFilter() {
    const sel = document.getElementById('jrMonthFilter');
    if (!sel) return;

    const arr = state.eventos || [];
    // Coleta meses únicos com eventos (ordenados)
    const seen = {};
    arr.forEach(ev => {
      const d = parseDate(ev.data_inicio);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen[key]) seen[key] = { key, year: d.getFullYear(), month: d.getMonth() };
    });
    const months = Object.values(seen).sort((a, b) => a.key.localeCompare(b.key));

    const opts = [`<option value="all">Todos os meses</option>`].concat(
      months.map(m => `<option value="${m.key}" ${state.month === m.key ? 'selected' : ''}>${MESES[m.month]} ${m.year}</option>`)
    ).join('');

    sel.innerHTML = opts;
    sel.classList.toggle('has-filter', state.month !== 'all');

    if (!sel.dataset.wired) {
      sel.dataset.wired = '1';
      sel.addEventListener('change', () => {
        state.month = sel.value;
        sel.classList.toggle('has-filter', state.month !== 'all');
        renderTimeline();
      });
    }
  }

  /** Encontra o melhor evento pra dar scroll inicial:
   *  1) se hoje tem evento -> esse
   *  2) senão, último evento ANTES de hoje
   *  3) senão (todos futuros), primeiro evento futuro
   *  Retorna o ID do evento ou null.
   */
  function findInitialScrollTarget(eventos) {
    if (!eventos || !eventos.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = eventos
      .map(ev => ({ ev, d: parseDate(ev.data_inicio) }))
      .filter(x => x.d)
      .sort((a, b) => a.d - b.d);

    if (!sorted.length) return null;

    // Match exato com hoje (range inclui o início)
    const sameDay = sorted.find(x => x.d.getTime() === today.getTime());
    if (sameDay) return sameDay.ev.id;

    // Último evento no passado (incluindo hoje? já tratado acima)
    const past = sorted.filter(x => x.d < today);
    if (past.length) return past[past.length - 1].ev.id;

    // Primeiro evento futuro
    return sorted[0].ev.id;
  }

  function renderFiltros() {
    const arr = state.eventos || [];
    const counts = { todos: arr.length };
    ORDEM.forEach(c => { counts[c] = arr.filter(e => e.categoria === c).length; });

    const chips = [
      `<button type="button" class="jr-chip ${state.cat === 'todos' ? 'is-active' : ''}" data-cat="todos">
         <span>Todos</span>
         <span class="jr-chip-count">${counts.todos}</span>
       </button>`,
      ...ORDEM.map(c => {
        const meta = CATS[c];
        const active = state.cat === c ? 'is-active' : '';
        return `<button type="button" class="jr-chip ${active}" data-cat="${c}">
                  <span class="jr-chip-icon">${meta.icon}</span>
                  <span>${meta.label}</span>
                  <span class="jr-chip-count">${counts[c]}</span>
                </button>`;
      }),
    ].join('');

    const filters = document.getElementById('jrFilters');
    if (!filters) return;
    filters.innerHTML = chips;
    filters.querySelectorAll('.jr-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cat = btn.dataset.cat;
        renderFiltros();
        renderTimeline();
      });
    });
  }

  function renderTimeline() {
    const wrap = document.getElementById('jrTimeline');
    const count = document.getElementById('jrCount');
    if (!wrap) return;

    if (state.loading) {
      wrap.innerHTML = `<div class="jr-empty"><strong>Carregando jornada…</strong>Aguarde um instante.</div>`;
      if (count) count.textContent = '';
      return;
    }
    if (state.setupPending) {
      wrap.innerHTML = `
        <div class="jr-empty">
          <strong>Tabela <code style="background:rgba(13, 67, 107,.06);padding:1px 6px;border-radius:4px;">events</code> ainda não foi criada no Supabase.</strong>
          Aplique o schema SQL no Supabase Dashboard → SQL Editor antes de usar a seção.
          <br><br>
          <button type="button" class="jr-btn-ghost" id="jrRetry">Já apliquei — tentar novamente</button>
        </div>`;
      if (count) count.textContent = '';
      const r = document.getElementById('jrRetry');
      if (r) r.addEventListener('click', init);
      return;
    }
    if (state.error) {
      wrap.innerHTML = `
        <div class="jr-empty">
          <strong>Não foi possível carregar a jornada.</strong>
          ${escapeHtml(state.error)}
          <br><br>
          <button type="button" class="jr-btn-ghost" id="jrRetry">Tentar de novo</button>
        </div>`;
      if (count) count.textContent = '';
      const r = document.getElementById('jrRetry');
      if (r) r.addEventListener('click', reload);
      return;
    }

    const filtered = (state.eventos || []).filter(e => {
      if (state.cat !== 'todos' && e.categoria !== state.cat) return false;
      if (state.month !== 'all') {
        const d = parseDate(e.data_inicio);
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== state.month) return false;
      }
      return true;
    });

    if (count) count.textContent = `${filtered.length} evento${filtered.length === 1 ? '' : 's'}`;

    if (!filtered.length) {
      const totalHas = (state.eventos || []).length;
      wrap.innerHTML = `
        <div class="jr-empty">
          <strong>${totalHas === 0 ? 'Nenhum evento cadastrado ainda.' : 'Nenhum evento nessa categoria.'}</strong>
          ${totalHas === 0 && isAdmin() ? 'Clique em <strong>+ Adicionar evento</strong> pra começar.' : 'Tenta ajustar o filtro.'}
        </div>`;
      return;
    }

    // Agrupa por mês-ano
    const groups = {};
    filtered.forEach(ev => {
      const d = parseDate(ev.data_inicio);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { year: d.getFullYear(), month: d.getMonth(), items: [] };
      groups[key].items.push(ev);
    });

    const sortedKeys = Object.keys(groups).sort();
    const today = new Date();
    const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const admin = isAdmin();

    // Identifica evento alvo do scroll inicial (apenas na primeira renderização)
    let scrollTargetId = null;
    if (!state.didInitialScroll && state.month === 'all' && state.cat === 'todos') {
      scrollTargetId = findInitialScrollTarget(filtered);
    }

    wrap.innerHTML = sortedKeys.map(key => {
      const g = groups[key];
      const isCurrent = key === currentKey ? 'jr-month-current' : '';
      const monthLabel = `${MESES[g.month]} ${g.year}`;

      const eventsHtml = g.items.map(ev => {
        const meta = CATS[ev.categoria] || CATS.outros;
        const d = parseDate(ev.data_inicio);
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monShort = MESES_CURTO[d.getMonth()];
        const weekday = DIAS_SEMANA[d.getDay()];
        const range = fmtRange(ev.data_inicio, ev.data_fim);
        const currentClass = ev.id === scrollTargetId ? 'jr-event-current' : '';

        return `
          <article class="jr-event ${currentClass}" style="--jr-event-color: ${meta.cor}; --jr-event-bg: ${meta.bg};" data-id="${escapeAttr(ev.id)}">
            <div class="jr-event-date">
              <span class="jr-event-day">${dayNum}</span>
              <span class="jr-event-month-short">${monShort}</span>
              <span class="jr-event-weekday">${weekday}</span>
            </div>
            <div class="jr-event-bullet"></div>
            <div class="jr-event-card">
              ${admin ? `<button type="button" class="jr-event-edit" data-action="edit" title="Editar evento">✏️</button>` : ''}
              <div class="jr-event-head">
                <span class="jr-event-categoria">${meta.icon} ${escapeHtml(meta.label)}</span>
              </div>
              <h3 class="jr-event-title">${escapeHtml(ev.titulo)}</h3>
              ${ev.descricao ? `<p class="jr-event-desc">${escapeHtml(ev.descricao)}</p>` : ''}
              <div class="jr-event-foot">
                <span class="jr-event-range">${range}</span>
                ${ev.link_interno ? `<a class="jr-event-link" href="${escapeAttr(ev.link_interno)}">Ver detalhes <span aria-hidden="true">→</span></a>` : '<span></span>'}
              </div>
            </div>
          </article>
        `;
      }).join('');

      return `
        <header class="jr-month ${isCurrent}">
          <span class="jr-month-label">${MESES_CURTO[g.month]}/${g.year}</span>
          <span class="jr-month-bullet"></span>
          <span class="jr-month-title">${monthLabel}</span>
        </header>
        ${eventsHtml}
      `;
    }).join('');

    // Wire edit buttons
    if (admin) {
      wrap.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const card = btn.closest('.jr-event');
          const id = card && card.dataset.id;
          const ev = state.eventos.find(x => x.id === id);
          if (ev) Modal.open(ev);
        });
      });
    }

    // Scroll automático até o evento atual (apenas uma vez)
    if (scrollTargetId) {
      const targetEl = wrap.querySelector(`.jr-event[data-id="${scrollTargetId}"]`);
      if (targetEl) {
        // Aguarda layout estabilizar
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        });
        state.didInitialScroll = true;
      }
    }
  }

  // ============ DATA LOAD ============
  async function reload() {
    state.loading = true;
    state.error = null;
    renderTimeline();
    try {
      state.eventos = await window.EventsStore.list(true);
      state.loading = false;
      state.setupPending = false;
    } catch (e) {
      state.loading = false;
      const msg = e && e.message ? e.message : String(e);
      if (/relation .*events.* does not exist/i.test(msg) || /could not find the .*events.*table/i.test(msg)) {
        state.setupPending = true;
      } else {
        state.error = msg;
      }
    }
    renderFiltros();
    renderMonthFilter();
    renderAdminBar();
    renderTimeline();
  }

  // ============ INIT ============
  async function init() {
    renderFiltros();
    renderMonthFilter();
    renderAdminBar();

    if (!window.EventsStore) {
      state.loading = false;
      state.error = 'O script events-store.js não foi carregado. Verifique o console.';
      renderTimeline();
      return;
    }

    if (window.EventsStore._failed) {
      state.loading = false;
      state.error = 'Dependência ausente: ' + ((window.EventsStore._missingDeps || []).join(', ') || (window.EventsStore._initError && window.EventsStore._initError.message) || 'desconhecida');
      renderTimeline();
      return;
    }

    try {
      await window.EventsStore.ping();
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      state.loading = false;
      if (/relation .*events.* does not exist/i.test(msg) || /could not find the .*events.*table/i.test(msg) || /404/.test(msg)) {
        state.setupPending = true;
      } else {
        state.error = msg;
      }
      renderAdminBar();
      renderTimeline();
      return;
    }

    await reload();

    if (window.EventsStore.subscribe) {
      window.EventsStore.subscribe(() => reload());
    }
  }

  window.__jornadaInit = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
