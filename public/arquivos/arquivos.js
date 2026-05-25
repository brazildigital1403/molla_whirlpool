/* ============================================================
   Arquivos & Downloads — Render + filtros + busca + CRUD admin
   Sempre renderiza UI base (admin bar, filtros, search) mesmo
   que o Supabase falhe. Erros aparecem na própria página.
   ============================================================ */
(function () {
  'use strict';

  // ============ TIPOS ============
  const TIPOS = {
    ppt:      { label: 'Apresentação', plural: 'Apresentações', icon: '📊', cor: 'var(--aq-c-ppt)', bg: 'var(--aq-c-ppt-bg)' },
    pdf:      { label: 'Documento',    plural: 'Documentos',    icon: '📄', cor: 'var(--aq-c-pdf)', bg: 'var(--aq-c-pdf-bg)' },
    imagem:   { label: 'Imagem',       plural: 'Imagens',       icon: '🖼️', cor: 'var(--aq-c-img)', bg: 'var(--aq-c-img-bg)' },
    planilha: { label: 'Planilha',     plural: 'Planilhas',     icon: '📈', cor: 'var(--aq-c-xls)', bg: 'var(--aq-c-xls-bg)' },
    kv:       { label: 'Key Visual',   plural: 'Key Visuals',   icon: '🎨', cor: 'var(--aq-c-kv)',  bg: 'var(--aq-c-kv-bg)'  },
    video:    { label: 'Vídeo',        plural: 'Vídeos',        icon: '🎬', cor: 'var(--aq-c-vid)', bg: 'var(--aq-c-vid-bg)' },
  };
  const ORDEM = ['ppt', 'pdf', 'imagem', 'planilha', 'kv', 'video'];

  // ============ HELPERS ============
  const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapeAttr = escapeHtml;

  const fmtData = (iso) => {
    if (!iso) return '';
    try {
      const [y, m, d] = String(iso).split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    } catch { return iso; }
  };

  const isAdmin = () => !!(window.WhirlpoolAuth && window.WhirlpoolAuth.isAdmin && window.WhirlpoolAuth.isAdmin());

  // ============ TOAST ============
  const Toast = {
    show(msg, kind = 'info') {
      let el = document.getElementById('aqToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'aqToast';
        el.className = 'aq-toast';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.className = 'aq-toast aq-toast-' + kind + ' is-visible';
      clearTimeout(this._t);
      this._t = setTimeout(() => { el.className = 'aq-toast aq-toast-' + kind; }, 2600);
    }
  };

  // ============ STATE ============
  let state = {
    tipo: 'todos',
    busca: '',
    arquivos: [],
    loading: true,
    error: null,
    setupPending: false,  // true quando schema SQL ainda não foi aplicado
  };

  // ============ MODAL DE EDIÇÃO ============
  const Modal = {
    open(arquivo) {
      const isEdit = !!arquivo;
      const a = arquivo || { nome: '', tipo: 'pdf', descricao: '', url: '', data: '' };
      const dataStr = a.data ? String(a.data).split('T')[0] : '';

      const tipoOpts = ORDEM.map(t =>
        `<option value="${t}" ${a.tipo === t ? 'selected' : ''}>${TIPOS[t].icon} ${TIPOS[t].label}</option>`
      ).join('');

      const html = `
        <div class="aq-modal-backdrop" id="aqModalBackdrop">
          <div class="aq-modal" role="dialog" aria-modal="true" aria-labelledby="aqModalTitle">
            <div class="aq-modal-head">
              <h3 id="aqModalTitle">${isEdit ? 'Editar arquivo' : 'Adicionar arquivo'}</h3>
              <button type="button" class="aq-modal-close" id="aqModalClose" aria-label="Fechar">×</button>
            </div>
            <form class="aq-modal-body" id="aqModalForm">
              <label>
                <span>Nome do arquivo *</span>
                <input type="text" name="nome" required maxlength="200" value="${escapeAttr(a.nome)}" placeholder="Ex: KV Principal — É tempo de Copa" />
              </label>
              <label>
                <span>Tipo *</span>
                <select name="tipo" required>${tipoOpts}</select>
              </label>
              <label>
                <span>URL do SharePoint *</span>
                <input type="url" name="url" required value="${escapeAttr(a.url)}" placeholder="https://sharepoint.com/sites/..." />
              </label>
              <label>
                <span>Descrição</span>
                <textarea name="descricao" rows="3" maxlength="500" placeholder="Linha curta de contexto sobre o arquivo">${escapeHtml(a.descricao || '')}</textarea>
              </label>
              <label>
                <span>Data (opcional)</span>
                <input type="date" name="data" value="${escapeAttr(dataStr)}" />
              </label>
              <div class="aq-modal-actions">
                ${isEdit ? `<button type="button" class="aq-btn-danger" id="aqModalDelete">Excluir</button>` : ''}
                <div class="aq-modal-actions-right">
                  <button type="button" class="aq-btn-ghost" id="aqModalCancel">Cancelar</button>
                  <button type="submit" class="aq-btn-primary">${isEdit ? 'Salvar' : 'Adicionar'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      `;
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap.firstElementChild);
      this._wireUp(arquivo);
    },

    _wireUp(arquivo) {
      const backdrop = document.getElementById('aqModalBackdrop');
      const form = document.getElementById('aqModalForm');
      const escListener = (e) => { if (e.key === 'Escape') close(); };
      const close = () => { backdrop.remove(); document.removeEventListener('keydown', escListener); };

      document.addEventListener('keydown', escListener);
      document.getElementById('aqModalClose').addEventListener('click', close);
      document.getElementById('aqModalCancel').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

      if (arquivo) {
        document.getElementById('aqModalDelete').addEventListener('click', async () => {
          if (!confirm('Excluir este arquivo? Essa ação não pode ser desfeita.')) return;
          try {
            await window.FilesStore.delete(arquivo.id);
            Toast.show('Arquivo excluído.', 'success');
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
          nome: fd.get('nome'),
          tipo: fd.get('tipo'),
          url: fd.get('url'),
          descricao: fd.get('descricao'),
          data: fd.get('data') || null,
        };
        try {
          if (arquivo) {
            await window.FilesStore.update(arquivo.id, payload);
            Toast.show('Arquivo atualizado.', 'success');
          } else {
            await window.FilesStore.create(payload);
            Toast.show('Arquivo adicionado.', 'success');
          }
          close();
          await reload();
        } catch (err) {
          Toast.show('Erro: ' + (err.message || err), 'error');
        }
      });

      setTimeout(() => form.querySelector('input[name="nome"]').focus(), 50);
    },
  };

  // ============ RENDER ============
  function renderAdminBar() {
    const slot = document.getElementById('aqAdminSlot');
    if (!slot) return;
    if (isAdmin()) {
      slot.innerHTML = `<button type="button" class="aq-btn-primary aq-btn-add" id="aqBtnAdd">+ Adicionar arquivo</button>`;
      const btn = document.getElementById('aqBtnAdd');
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

  function renderFiltros() {
    const arr = state.arquivos || [];
    const counts = { todos: arr.length };
    ORDEM.forEach(t => { counts[t] = arr.filter(a => a.tipo === t).length; });

    const chips = [
      `<button type="button" class="aq-chip ${state.tipo === 'todos' ? 'is-active' : ''}" data-tipo="todos">
         <span>Todos</span>
         <span class="aq-chip-count">${counts.todos}</span>
       </button>`,
      ...ORDEM.map(t => {
        const meta = TIPOS[t];
        const active = state.tipo === t ? 'is-active' : '';
        return `<button type="button" class="aq-chip ${active}" data-tipo="${t}">
                  <span class="aq-chip-icon">${meta.icon}</span>
                  <span>${meta.plural}</span>
                  <span class="aq-chip-count">${counts[t]}</span>
                </button>`;
      }),
    ].join('');

    const filters = document.getElementById('aqFilters');
    if (!filters) return;
    filters.innerHTML = chips;
    filters.querySelectorAll('.aq-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tipo = btn.dataset.tipo;
        renderFiltros();
        renderLista();
      });
    });
  }

  function renderLista() {
    const lista = document.getElementById('aqList');
    const count = document.getElementById('aqCount');
    if (!lista) return;

    if (state.loading) {
      lista.innerHTML = `<div class="aq-empty"><strong>Carregando arquivos…</strong>Aguarde um instante.</div>`;
      if (count) count.textContent = '';
      return;
    }
    if (state.setupPending) {
      lista.innerHTML = `
        <div class="aq-empty">
          <strong>Tabela <code style="background:rgba(13, 67, 107,.06);padding:1px 6px;border-radius:4px;">files</code> ainda não foi criada no Supabase.</strong>
          Aplique o schema SQL no Supabase Dashboard → SQL Editor antes de usar a seção.
          <br><br>
          <button type="button" class="aq-btn-ghost" id="aqRetry">Já apliquei — tentar novamente</button>
        </div>`;
      if (count) count.textContent = '';
      const r = document.getElementById('aqRetry');
      if (r) r.addEventListener('click', init);
      return;
    }
    if (state.error) {
      lista.innerHTML = `
        <div class="aq-empty">
          <strong>Não foi possível carregar os arquivos.</strong>
          ${escapeHtml(state.error)}
          <br><br>
          <button type="button" class="aq-btn-ghost" id="aqRetry">Tentar de novo</button>
        </div>`;
      if (count) count.textContent = '';
      const r = document.getElementById('aqRetry');
      if (r) r.addEventListener('click', reload);
      return;
    }

    const q = (state.busca || '').toLowerCase().trim();
    const filtered = (state.arquivos || []).filter(a => {
      if (state.tipo !== 'todos' && a.tipo !== state.tipo) return false;
      if (q) {
        const hay = ((a.nome || '') + ' ' + (a.descricao || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (count) count.textContent = `${filtered.length} arquivo${filtered.length === 1 ? '' : 's'}`;

    if (!filtered.length) {
      const totalHas = (state.arquivos || []).length;
      lista.innerHTML = `
        <div class="aq-empty">
          <strong>${totalHas === 0 ? 'Nenhum arquivo cadastrado ainda.' : 'Nenhum arquivo encontrado.'}</strong>
          ${totalHas === 0 && isAdmin() ? 'Clique em <strong>+ Adicionar arquivo</strong> pra começar.' : 'Tenta ajustar os filtros ou a busca.'}
        </div>`;
      return;
    }

    const admin = isAdmin();
    lista.innerHTML = filtered.map(a => {
      const meta = TIPOS[a.tipo] || TIPOS.pdf;
      return `
        <article class="aq-card" style="--aq-card-color: ${meta.cor}; --aq-card-bg: ${meta.bg};" data-id="${escapeAttr(a.id)}">
          ${admin ? `<button type="button" class="aq-card-edit" data-action="edit" title="Editar arquivo">✏️</button>` : ''}
          <div class="aq-card-head">
            <div class="aq-card-icon">${meta.icon}</div>
            <div class="aq-card-meta">
              <span class="aq-card-tipo">${escapeHtml(meta.label)}</span>
              <h3 class="aq-card-nome">${escapeHtml(a.nome)}</h3>
            </div>
          </div>
          ${a.descricao ? `<p class="aq-card-desc">${escapeHtml(a.descricao)}</p>` : ''}
          <div class="aq-card-foot">
            <span class="aq-card-data">${a.data ? fmtData(a.data) : '—'}</span>
            <a class="aq-card-link" href="${escapeAttr(a.url)}" target="_blank" rel="noopener">
              Abrir <span aria-hidden="true">→</span>
            </a>
          </div>
        </article>
      `;
    }).join('');

    if (admin) {
      lista.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const card = btn.closest('.aq-card');
          const id = card && card.dataset.id;
          const arquivo = state.arquivos.find(x => x.id === id);
          if (arquivo) Modal.open(arquivo);
        });
      });
    }
  }

  // ============ DATA LOAD ============
  async function reload() {
    state.loading = true;
    state.error = null;
    renderLista();
    try {
      state.arquivos = await window.FilesStore.list(true);
      state.loading = false;
      state.setupPending = false;
    } catch (e) {
      state.loading = false;
      const msg = e && e.message ? e.message : String(e);
      // Detecta tabela inexistente -> setup pendente
      if (/relation .*files.* does not exist/i.test(msg) || /could not find the .*files.*table/i.test(msg)) {
        state.setupPending = true;
      } else {
        state.error = msg;
      }
    }
    renderFiltros();
    renderAdminBar();
    renderLista();
  }

  // ============ INIT ============
  async function init() {
    // Sempre renderiza UI essencial primeiro, mesmo se algo der errado depois
    renderFiltros();
    renderAdminBar();

    const search = document.getElementById('aqSearch');
    if (search && !search.dataset.wired) {
      search.dataset.wired = '1';
      search.addEventListener('input', () => {
        state.busca = search.value;
        renderLista();
      });
    }

    // Verifica que FilesStore existe (mesmo o stub de erro existe)
    if (!window.FilesStore) {
      state.loading = false;
      state.error = 'O script files-store.js não foi carregado. Verifique o console para detalhes.';
      renderLista();
      return;
    }

    // Detecta caso especial: stub de falha (dependência ausente)
    if (window.FilesStore._failed) {
      state.loading = false;
      state.error = 'Dependência ausente: ' + ((window.FilesStore._missingDeps || []).join(', ') || (window.FilesStore._initError && window.FilesStore._initError.message) || 'desconhecida');
      renderLista();
      return;
    }

    // Healthcheck
    try {
      await window.FilesStore.ping();
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      state.loading = false;
      if (/relation .*files.* does not exist/i.test(msg) || /could not find the .*files.*table/i.test(msg) || /404/.test(msg)) {
        state.setupPending = true;
      } else {
        state.error = msg;
      }
      renderAdminBar();
      renderLista();
      return;
    }

    await reload();

    // Realtime
    if (window.FilesStore.subscribe) {
      window.FilesStore.subscribe(() => reload());
    }
  }

  // Expor pra debug
  window.__arquivosInit = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
