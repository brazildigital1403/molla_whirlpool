/* ============================================================
   Whirlpool Brasil — Aprovação (SPA)
   ------------------------------------------------------------
   Persistência: Supabase (via window.WhirlpoolStore)
   Toda a camada de UI é async; loading states em cada operação.
   ============================================================ */

(function () {
  'use strict';

  if (!window.WhirlpoolStore) {
    document.addEventListener('DOMContentLoaded', () => {
      const c = document.getElementById('appContent');
      if (c) c.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <h3>Erro ao carregar dados</h3>
          <p>Falha ao inicializar o Supabase. Verifique <code>config.js</code> e a conexão.</p>
        </div>`;
    });
    return;
  }

  const Store = window.WhirlpoolStore;

  // ============ CONSTANTES ============
  const MAX_IMAGE_DIM = 1400;
  const IMAGE_QUALITY = 0.82;
  const MAX_IMAGE_BYTES = 800 * 1024;

  const CAMPAIGN_TYPES = [
    'Awareness', 'Performance', 'Branding',
    'Lançamento', 'Sazonal', 'Always On',
    'Institucional', 'Promocional'
  ];

  // ============ UTILS ============
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Markdown leve nos comentários:
  //   **negrito**   _itálico_   [texto](url)   + autolink de URLs soltas
  // Aplica escapeHtml ANTES, depois substitui os tokens (que sobrevivem ao escape).
  function renderCommentText(text) {
    if (text == null) return '';
    let s = escapeHtml(String(text));

    // [texto](url) — só http/https/mailto pra não permitir javascript:
    s = s.replace(/\[([^\]\n]+?)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
      (_, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);

    // Autolink — URLs http(s) soltas que NÃO estão dentro de um href (já viraram <a>)
    // Pra evitar dupla-substituição, marca temporariamente as URLs já dentro de href.
    s = s.replace(/(href="[^"]+")/g, m => m.replace(/https?:\/\//g, '\u0001\u0001'));
    s = s.replace(/(^|[^"=>])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?)\]"'])/g,
      (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    s = s.replace(/\u0001\u0001/g, 'https://');

    // **bold** — usa lookahead/behind simples pra não pegar ** em meio a palavras
    s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');

    // _italic_ — só quando rodeado por boundary (espaço, início, pontuação)
    s = s.replace(/(^|[\s(\[])_(?=\S)([^_\n]+?\S)_(?=$|[\s)\].,;:!?])/g,
      '$1<em>$2</em>');

    return s;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hour}:${min}`;
  }

  function relativeTime(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return Math.floor(diff / 60) + 'min';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd';
    return formatDate(iso);
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim()[0].toUpperCase();
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          let quality = IMAGE_QUALITY;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > MAX_IMAGE_BYTES * 1.37 && quality > 0.4) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Imagem inválida'));
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function diffVersions(a, b) {
    return {
      name: (a.name || '') !== (b.name || ''),
      copy: (a.copy || '') !== (b.copy || ''),
      caption: (a.caption || '') !== (b.caption || ''),
      link_url: (a.link_url || '') !== (b.link_url || ''),
      media_url: (a.media_url || '') !== (b.media_url || ''),
      media_type: (a.media_type || '') !== (b.media_type || ''),
      status: a.status !== b.status,
    };
  }

  function compareSideHtml(v, diffs) {
    const statusLabels = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Reprovada' };
    let mediaHtml = '';
    if (v.media_type === 'image' && v.media_url) {
      mediaHtml = `<img src="${escapeHtml(v.media_url)}" alt="${escapeHtml(v.name)}" loading="lazy">`;
    } else if (v.media_type === 'video' && v.media_url) {
      if (typeof isDirectVideoFile === 'function' && isDirectVideoFile(v.media_url)) {
        mediaHtml = `<video src="${escapeHtml(v.media_url)}" controls></video>`;
      } else if (v.video_embed_url) {
        mediaHtml = `<iframe src="${escapeHtml(v.video_embed_url)}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe>`;
      } else {
        mediaHtml = `<div class="placeholder">▶ Vídeo<br><small>${escapeHtml(v.media_url)}</small></div>`;
      }
    } else {
      mediaHtml = `<div class="placeholder">Sem mídia</div>`;
    }

    const field = (label, value, diffKey) => {
      const empty = !value;
      return `
        <div class="compare-field ${diffs[diffKey] ? 'is-diff' : ''}">
          <span class="cf-label">${label}</span>
          <div class="cf-value ${empty ? 'cf-empty' : ''}">${empty ? '— vazio —' : escapeHtml(value)}</div>
        </div>
      `;
    };
    const fieldLink = (label, value, diffKey) => {
      const empty = !value;
      return `
        <div class="compare-field ${diffs[diffKey] ? 'is-diff' : ''}">
          <span class="cf-label">${label}</span>
          <div class="cf-value ${empty ? 'cf-empty' : ''}">${empty ? '— vazio —' : `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`}</div>
        </div>
      `;
    };

    return `
      <div class="compare-side">
        <div class="compare-side-head">
          <span class="version-tag big">v${v.version}${v._isCurrent ? ' • atual' : ''}</span>
          <span class="compare-side-status status-${v.status}">
            <span class="dot"></span>${statusLabels[v.status] || v.status}
          </span>
        </div>
        <div class="compare-side-media">${mediaHtml}</div>
        <div class="compare-fields">
          ${field('Nome da peça', v.name, 'name')}
          ${field('Copy', v.copy, 'copy')}
          ${field('Legenda', v.caption, 'caption')}
          ${fieldLink('Link da peça', v.link_url, 'link_url')}
        </div>
      </div>
    `;
  }

  function toEmbedUrl(url) {
    if (!url) return null;
    const u = String(url).trim();

    // YouTube (watch, youtu.be, shorts)
    let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?#/]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;

    // Vimeo
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;

    // SharePoint / OneDrive — adiciona action=embedview (preserva o resto do URL)
    if (/sharepoint\.com|onedrive\.live\.com|1drv\.ms/i.test(u)) {
      try {
        const parsed = new URL(u);
        parsed.searchParams.set('action', 'embedview');
        return parsed.toString();
      } catch (e) {
        return null;
      }
    }

    // Google Drive (arquivos compartilhados)
    m = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

    return null;
  }

  // Detecta arquivo de vídeo direto (.mp4, .webm, .mov, .ogg, .m4v)
  // Funciona com query strings (?ABC) e fragmentos (#XYZ).
  function isDirectVideoFile(url) {
    if (!url) return false;
    return /\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i.test(String(url));
  }

  // SharePoint pessoal / OneDrive Business — Microsoft bloqueia embed por design.
  // URLs tipo "empresa-my.sharepoint.com" não carregam em iframe.
  function isSharePointPersonal(url) {
    if (!url) return false;
    return /-my\.sharepoint\.com/i.test(String(url));
  }

  // ============ TOAST ============
  const Toast = {
    _t: null,
    show(msg, type = 'default', duration = 2800) {
      let el = document.getElementById('appToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'appToast';
        el.className = 'toast';
        document.body.appendChild(el);
      }
      el.className = 'toast' + (type !== 'default' ? ' ' + type : '');
      el.textContent = msg;
      requestAnimationFrame(() => el.classList.add('show'));
      clearTimeout(this._t);
      this._t = setTimeout(() => el.classList.remove('show'), duration);
    }
  };

  // ============ LOADING / ERROR HELPERS ============
  function loadingHtml(msg = 'Carregando...') {
    return `
      <div class="empty-state">
        <div class="loader" style="
          width: 40px; height: 40px; margin: 0 auto 14px;
          border: 3px solid rgba(57, 69, 77,0.12);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 800ms linear infinite;
        "></div>
        <p style="font-size:13px; color:var(--muted);">${escapeHtml(msg)}</p>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
  }

  function errorHtml(err, retryFn) {
    const id = 'retry_' + Math.random().toString(36).slice(2, 8);
    setTimeout(() => {
      const btn = document.getElementById(id);
      if (btn && retryFn) btn.addEventListener('click', retryFn);
    }, 0);
    return `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <h3>Erro ao carregar</h3>
        <p>${escapeHtml(err && err.message ? err.message : 'Falha de conexão com o Supabase.')}</p>
        ${retryFn ? `<button class="btn-primary" id="${id}">Tentar novamente</button>` : ''}
      </div>
    `;
  }

  function safeError(err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : 'Erro de conexão';
    Toast.show(msg, 'error', 4000);
  }

  // ============ ROUTER ============
  const Router = {
    parse() {
      const h = window.location.hash || '#/';
      // Galeria de peças aprovadas (S45)
      if (h.startsWith('#/aprovadas')) return { view: 'approved' };
      // Concept (criativo) — opcionalmente com variação selecionada:
      //   #/c/<campaignId>/k/<conceptId>
      //   #/c/<campaignId>/k/<conceptId>/v/<variantId>
      const mConcept = h.match(/^#\/c\/([\w-]+)\/k\/([\w-]+)(?:\/v\/([\w-]+))?/);
      if (mConcept) return { view: 'concept', campaignId: mConcept[1], conceptId: mConcept[2], variantId: mConcept[3] || null };
      const m = h.match(/^#\/c\/([\w-]+)/);
      if (m) return { view: 'campaign', campaignId: m[1] };
      return { view: 'home' };
    },
    go(hash) { window.location.hash = hash; },
    onChange(cb) { window.addEventListener('hashchange', cb); }
  };

  // ============ APP ============
  const App = {
    el: { crumb: null, content: null },
    state: {
      campaignFilter: 'all',
      approved: { campaignFilter: 'all', query: '' } // S45: filtros da galeria de aprovadas
    },

    async init() {
      // Garantia defensiva: nome agora vem do login. Se faltar (legacy), pergunta.
      window.WhirlpoolAuth.ensureUserName();
      this.el.crumb = document.getElementById('crumb');
      this.el.content = document.getElementById('appContent');

      Router.onChange(() => this.render());

      // Healthcheck inicial — útil pra avisar se schema não foi aplicado
      try {
        await Store.ping();
      } catch (e) {
        this.el.content.innerHTML = errorHtml(
          { message: 'Não foi possível conectar ao Supabase. Confirme se o schema SQL foi aplicado e se a URL/key estão corretas em config.js.' },
          () => location.reload()
        );
        return;
      }

      this.render();
    },

    async render() {
      const route = Router.parse();
      if (route.view === 'concept') {
        await this.renderConceptView(route.campaignId, route.conceptId, route.variantId);
      } else if (route.view === 'campaign') {
        await this.renderCampaignView(route.campaignId);
      } else if (route.view === 'approved') {
        await this.renderApprovedView();
      } else {
        await this.renderHomeView();
      }
    },

    // ----- HOME VIEW -----
    async renderHomeView() {
      this.el.crumb.innerHTML = '<a href="/">Central do Cliente</a> &nbsp;/&nbsp; <strong>Aprovação</strong>';
      this.el.content.innerHTML = loadingHtml('Carregando campanhas...');

      let campaigns;
      try {
        campaigns = await Store.loadCampaignsWithStats();
      } catch (e) {
        this.el.content.innerHTML = errorHtml(e, () => this.renderHomeView());
        return;
      }

      // Agrega stats de TODAS as campanhas
      const allStats = campaigns.reduce((acc, c) => {
        const s = c.stats || { total: 0, approved: 0, rejected: 0, pending: 0 };
        return {
          total: acc.total + s.total,
          approved: acc.approved + s.approved,
          rejected: acc.rejected + s.rejected,
          pending: acc.pending + s.pending,
        };
      }, { total: 0, approved: 0, rejected: 0, pending: 0 });

      const withPending = campaigns.filter(c => (c.stats || {}).pending > 0).length;
      const pct = (n) => allStats.total > 0 ? Math.round((n / allStats.total) * 100) : 0;
      const currentFilter = this._homeFilter || 'all';
      const filteredCampaigns = currentFilter === 'pending'
        ? campaigns.filter(c => (c.stats || {}).pending > 0)
        : campaigns;

      const dashboardHtml = allStats.total > 0 ? `
        <div class="dashboard">
          <h2 class="dashboard-title">📊 Visão geral</h2>
          <p class="dashboard-sub">${campaigns.length} ${campaigns.length === 1 ? 'campanha' : 'campanhas'} · ${allStats.total} ${allStats.total === 1 ? 'peça' : 'peças'} no total</p>
          <div class="dashboard-progress" title="${allStats.approved} aprovadas · ${allStats.rejected} reprovadas · ${allStats.pending} pendentes">
            ${allStats.approved > 0 ? `<div class="seg-approved" style="width:${pct(allStats.approved)}%"></div>` : ''}
            ${allStats.rejected > 0 ? `<div class="seg-rejected" style="width:${pct(allStats.rejected)}%"></div>` : ''}
            ${allStats.pending > 0 ? `<div class="seg-pending" style="width:${pct(allStats.pending)}%"></div>` : ''}
          </div>
          <div class="dashboard-kpis">
            <div class="dash-kpi dash-kpi-pending">
              <div class="dash-kpi-icon">⏳</div>
              <div class="dash-kpi-body">
                <div class="dash-kpi-value">${allStats.pending}</div>
                <div class="dash-kpi-label">Pendentes</div>
                <div class="dash-kpi-pct">${pct(allStats.pending)}% do total</div>
              </div>
            </div>
            <div class="dash-kpi dash-kpi-approved">
              <div class="dash-kpi-icon">✓</div>
              <div class="dash-kpi-body">
                <div class="dash-kpi-value">${allStats.approved}</div>
                <div class="dash-kpi-label">Aprovadas</div>
                <div class="dash-kpi-pct">${pct(allStats.approved)}% do total</div>
              </div>
            </div>
            <div class="dash-kpi dash-kpi-rejected">
              <div class="dash-kpi-icon">✕</div>
              <div class="dash-kpi-body">
                <div class="dash-kpi-value">${allStats.rejected}</div>
                <div class="dash-kpi-label">Reprovadas</div>
                <div class="dash-kpi-pct">${pct(allStats.rejected)}% do total</div>
              </div>
            </div>
            <div class="dash-kpi dash-kpi-total">
              <div class="dash-kpi-icon">📦</div>
              <div class="dash-kpi-body">
                <div class="dash-kpi-value">${allStats.total}</div>
                <div class="dash-kpi-label">Total de peças</div>
                <div class="dash-kpi-pct">em ${campaigns.length} ${campaigns.length === 1 ? 'campanha' : 'campanhas'}</div>
              </div>
            </div>
          </div>
          ${allStats.approved > 0 ? `
            <a class="dashboard-approved-cta" href="#/aprovadas" data-nav-approved>
              <span class="dac-icon">✨</span>
              <span class="dac-body">
                <span class="dac-title">Galeria de peças aprovadas</span>
                <span class="dac-sub">Veja as ${allStats.approved} ${allStats.approved === 1 ? 'peça aprovada' : 'peças aprovadas'} em um só lugar — imagem, copy, legenda e link de destino</span>
              </span>
              <span class="dac-arrow">→</span>
            </a>
          ` : ''}
        </div>
      ` : '';

      const filterPillsHtml = `
        <button class="filter-pill ${currentFilter === 'all' ? 'active' : ''}" data-home-filter="all">
          Todas <span class="count">${campaigns.length}</span>
        </button>
        ${withPending > 0 ? `
          <button class="filter-pill ${currentFilter === 'pending' ? 'active' : ''}" data-home-filter="pending">
            Com pendência <span class="count">${withPending}</span>
          </button>
        ` : ''}
      `;

      const html = `
        ${dashboardHtml}
        <div class="toolbar">
          <!-- Trigger mobile (só aparece em <=760px) -->
          <button class="bs-trigger toolbar-bs-trigger" type="button" data-bs-open="aprovacaoFiltrosSheet" aria-label="Abrir filtros">
            <span class="bs-trigger-icon">⚙️</span>
            <span>Filtros</span>
            ${currentFilter !== 'all' ? `<span class="bs-trigger-count">1</span>` : ''}
          </button>

          <!-- Em desktop: inline; em mobile: bottom sheet -->
          <div class="bs-panel toolbar-bs-panel" id="aprovacaoFiltrosSheet" aria-hidden="true">
            <div class="bs-handle"></div>
            <div class="bs-header">
              <h3>Filtros</h3>
              <button class="bs-close" type="button" data-bs-close aria-label="Fechar filtros">×</button>
            </div>
            <div class="bs-content toolbar-left">
              ${filterPillsHtml}
            </div>
          </div>

          ${window.WhirlpoolAuth.isAdmin() ? `
            <button class="btn-primary" id="btnNewCampaign">
              <span class="plus">+</span> Nova Campanha
            </button>
          ` : ''}
        </div>

        ${campaigns.length === 0 ? `
          <div class="empty-state">
            <div class="icon">📋</div>
            <h3>Nenhuma campanha cadastrada</h3>
            <p>${window.WhirlpoolAuth.isAdmin() ? 'Crie sua primeira campanha para começar a subir peças para aprovação.' : 'Aguardando a Molla cadastrar a primeira campanha.'}</p>
            ${window.WhirlpoolAuth.isAdmin() ? `
              <button class="btn-primary" id="btnNewCampaignEmpty">
                <span class="plus">+</span> Criar primeira campanha
              </button>
            ` : ''}
          </div>
        ` : filteredCampaigns.length === 0 ? `
          <div class="empty-state">
            <div class="icon">✨</div>
            <h3>Nenhuma campanha com pendência</h3>
            <p>Todas as campanhas estão sem peças aguardando aprovação.</p>
          </div>
        ` : `
          <div class="cards-grid">
            ${filteredCampaigns.map(c => this.campaignCardHtml(c)).join('')}
          </div>
        `}
      `;
      this.el.content.innerHTML = html;

      // Filtros do toolbar — fecha sheet em mobile se estiver aberto
      this.el.content.querySelectorAll('[data-home-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.WhirlpoolBottomSheet) window.WhirlpoolBottomSheet.closeAll();
          this._homeFilter = btn.dataset.homeFilter;
          this.renderHomeView();
        });
      });

      const newBtn = document.getElementById('btnNewCampaign');
      const newBtnEmpty = document.getElementById('btnNewCampaignEmpty');
      if (newBtn) newBtn.addEventListener('click', () => Modals.openCampaign());
      if (newBtnEmpty) newBtnEmpty.addEventListener('click', () => Modals.openCampaign());

      this.el.content.querySelectorAll('.campaign-card').forEach(card => {
        const id = card.dataset.id;
        card.addEventListener('click', (e) => {
          if (e.target.closest('.action-btn')) return;
          Router.go(`#/c/${id}`);
        });
        const editBtn = card.querySelector('.edit-btn');
        if (editBtn) editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Modals.openCampaign(id);
        });
        const del = card.querySelector('.delete-btn');
        if (del) del.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Excluir esta campanha e todas as suas peças? Esta ação não pode ser desfeita.')) return;
          try {
            del.disabled = true;
            await Store.deleteCampaign(id);
            Toast.show('Campanha excluída.', 'success');
            await this.renderHomeView();
          } catch (err) {
            safeError(err);
            del.disabled = false;
          }
        });
      });
    },

    campaignCardHtml(c) {
      const stats = c.stats || { total: 0, approved: 0, rejected: 0, pending: 0 };
      return `
        <article class="campaign-card" data-id="${c.id}">
          ${window.WhirlpoolAuth.isAdmin() ? `
            <div class="card-actions">
              <button class="action-btn edit-btn" type="button" title="Editar campanha" aria-label="Editar">✎</button>
              <button class="action-btn delete-btn" type="button" title="Excluir campanha" aria-label="Excluir">×</button>
            </div>
          ` : ''}
          <div class="campaign-card-header">
            <span class="type-tag">${escapeHtml(c.type)}</span>
          </div>
          <h3>${escapeHtml(c.name)}</h3>
          <span class="meta">Criada em ${formatDate(c.created_at)}</span>
          <div class="stats-row">
            <span class="stat-mini total"><span class="dot"></span>${stats.total} peças</span>
            <span class="stat-mini approved"><span class="dot"></span>${stats.approved}</span>
            <span class="stat-mini rejected"><span class="dot"></span>${stats.rejected}</span>
            <span class="stat-mini pending"><span class="dot"></span>${stats.pending}</span>
          </div>
          <span class="cta">Abrir campanha</span>
        </article>
      `;
    },

    // ----- CAMPAIGN VIEW -----
    async renderCampaignView(campaignId) {
      this.el.crumb.innerHTML = `
        <a href="/">Central do Cliente</a> &nbsp;/&nbsp;
        <a href="#/" id="crumbHome">Aprovação</a> &nbsp;/&nbsp;
        <em>carregando...</em>
      `;
      const ch = document.getElementById('crumbHome');
      if (ch) ch.addEventListener('click', (e) => { e.preventDefault(); Router.go('#/'); });

      this.el.content.innerHTML = loadingHtml('Carregando campanha...');

      let campaign, concepts;
      try {
        [campaign, concepts] = await Promise.all([
          Store.getCampaign(campaignId),
          Store.loadConceptsWithStats(campaignId)
        ]);
      } catch (e) {
        this.el.content.innerHTML = errorHtml(e, () => this.renderCampaignView(campaignId));
        return;
      }

      if (!campaign) {
        Toast.show('Campanha não encontrada.', 'error');
        Router.go('#/');
        return;
      }

      this.el.crumb.innerHTML = `
        <a href="/">Central do Cliente</a> &nbsp;/&nbsp;
        <a href="#/" id="crumbHome">Aprovação</a> &nbsp;/&nbsp;
        <strong>${escapeHtml(campaign.name)}</strong>
      `;
      document.getElementById('crumbHome').addEventListener('click', (e) => {
        e.preventDefault(); Router.go('#/');
      });

      // KPIs e barra de progresso continuam contando VARIAÇÕES (unidade de decisão).
      const allVariants = concepts.flatMap(c => c.variants);
      const stats = Store.statsFromPieces(allVariants);
      const pct = (n) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

      // Status agregado por CRIATIVO (pra filtros):
      // - pending: tem ≥1 variação pendente
      // - rejected: tem ≥1 reprovada E nenhuma pendente
      // - approved: TODAS as variações aprovadas
      function conceptStatus(c) {
        if (c.stats.total === 0) return 'pending';
        if (c.stats.pending > 0) return 'pending';
        if (c.stats.rejected > 0) return 'rejected';
        return 'approved';
      }
      const conceptCounts = { all: concepts.length, pending: 0, approved: 0, rejected: 0 };
      concepts.forEach(c => conceptCounts[conceptStatus(c)]++);

      const filter = this.state.campaignFilter;
      const filteredConcepts = concepts.filter(c => filter === 'all' ? true : conceptStatus(c) === filter);

      const html = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
          <button class="btn-ghost" id="btnBack">← Voltar</button>
          <div>
            <h2 style="margin:0; font-size:22px; color:var(--navy);">${escapeHtml(campaign.name)}</h2>
            <span style="font-size:12px; color:var(--muted);">${escapeHtml(campaign.type)} · ${concepts.length} criativo${concepts.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div class="campaign-dashboard">
          <div class="kpi kpi-total">
            <div class="kpi-label">Variações</div>
            <div class="kpi-value">${stats.total}</div>
            <div class="kpi-pct">No total</div>
          </div>
          <div class="kpi kpi-approved">
            <div class="kpi-label">Aprovadas</div>
            <div class="kpi-value">${stats.approved}</div>
            <div class="kpi-pct">${pct(stats.approved)}% do total</div>
          </div>
          <div class="kpi kpi-rejected">
            <div class="kpi-label">Reprovadas</div>
            <div class="kpi-value">${stats.rejected}</div>
            <div class="kpi-pct">${pct(stats.rejected)}% do total</div>
          </div>
          <div class="kpi kpi-pending">
            <div class="kpi-label">Pendentes</div>
            <div class="kpi-value">${stats.pending}</div>
            <div class="kpi-pct">${pct(stats.pending)}% do total</div>
          </div>
        </div>

        ${stats.total > 0 ? `
          <div class="progress" title="${stats.approved} aprov. / ${stats.rejected} reprov. / ${stats.pending} pend.">
            <div class="progress-seg progress-approved" style="width:${pct(stats.approved)}%"></div>
            <div class="progress-seg progress-rejected" style="width:${pct(stats.rejected)}%"></div>
            <div class="progress-seg progress-pending" style="width:${pct(stats.pending)}%"></div>
          </div>
        ` : ''}

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="filter-pill ${filter === 'all' ? 'active' : ''}" data-filter="all">Todos <span class="count">${conceptCounts.all}</span></button>
            <button class="filter-pill ${filter === 'pending' ? 'active' : ''}" data-filter="pending">Pendentes <span class="count">${conceptCounts.pending}</span></button>
            <button class="filter-pill ${filter === 'approved' ? 'active' : ''}" data-filter="approved">Aprovados <span class="count">${conceptCounts.approved}</span></button>
            <button class="filter-pill ${filter === 'rejected' ? 'active' : ''}" data-filter="rejected">Reprovados <span class="count">${conceptCounts.rejected}</span></button>
          </div>
          ${window.WhirlpoolAuth.isAdmin() ? `
            <button class="btn-primary" id="btnNewConcept">
              <span class="plus">+</span> Novo Criativo
            </button>
          ` : ''}
        </div>

        ${filteredConcepts.length === 0 ? `
          <div class="empty-state">
            <div class="icon">🎨</div>
            <h3>${concepts.length === 0 ? 'Nenhum criativo nesta campanha' : 'Nenhum criativo neste filtro'}</h3>
            <p>${concepts.length === 0 ? (window.WhirlpoolAuth.isAdmin() ? 'Crie o primeiro criativo para aprovação.' : 'Aguardando a Molla criar os criativos.') : 'Tente outro filtro' + (window.WhirlpoolAuth.isAdmin() ? ' ou crie um novo criativo.' : '.')}</p>
            ${concepts.length === 0 && window.WhirlpoolAuth.isAdmin() ? `<button class="btn-primary" id="btnNewConceptEmpty"><span class="plus">+</span> Criar primeiro criativo</button>` : ''}
          </div>
        ` : `
          <div class="cards-grid">
            ${filteredConcepts.map(c => this.conceptCardHtml(c)).join('')}
          </div>
        `}
      `;
      this.el.content.innerHTML = html;

      document.getElementById('btnBack').addEventListener('click', () => Router.go('#/'));
      const newBtn = document.getElementById('btnNewConcept');
      const newBtnEmpty = document.getElementById('btnNewConceptEmpty');
      if (newBtn) newBtn.addEventListener('click', () => Modals.openConcept(campaignId));
      if (newBtnEmpty) newBtnEmpty.addEventListener('click', () => Modals.openConcept(campaignId));

      this.el.content.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.state.campaignFilter = pill.dataset.filter;
          this.renderCampaignView(campaignId);
        });
      });

      // Cards-criativo: vários elementos clicáveis dentro
      this.el.content.querySelectorAll('.concept-card').forEach(card => {
        const conceptId = card.dataset.conceptId;

        // Clique em variação: navega pra concept view com a variação selecionada
        card.querySelectorAll('[data-variant-id]').forEach(thumb => {
          thumb.addEventListener('click', (e) => {
            e.stopPropagation();
            Router.go(`#/c/${campaignId}/k/${conceptId}/v/${thumb.dataset.variantId}`);
          });
        });

        // Botão "+ Variação"
        const addBtn = card.querySelector('[data-action="add-variant"]');
        if (addBtn) addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Modals.openAddVariant(campaignId, conceptId);
        });

        // Botão "editar criativo" (renomear título + descrição)
        const editBtn = card.querySelector('[data-action="edit-concept"]');
        if (editBtn) editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Modals.openConcept(campaignId, conceptId);
        });
      });

      // Cards de "peça única" continuam clicáveis no card todo (compat)
      this.el.content.querySelectorAll('.piece-card[data-id]').forEach(card => {
        // Botão "+ Variação" dentro da card single
        const addVarBtn = card.querySelector('[data-action="add-variant"]');
        if (addVarBtn) addVarBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cId = card.dataset.conceptId;
          if (cId) Modals.openAddVariant(campaignId, cId);
        });

        card.addEventListener('click', (e) => {
          // Ignora cliques em controles internos
          if (e.target.closest('[data-action]')) return;
          Modals.openPieceDetail(campaignId, card.dataset.id);
        });
      });
    },

    /** Renderiza um criativo. Se tem 1 variação "Única", visual = card de peça antigo
        com 1 botão pequenino "+ Variação" no rodapé. Se 2+, visual novo com galeria. */
    conceptCardHtml(concept) {
      const variants = concept.variants || [];
      const isAdmin = window.WhirlpoolAuth.isAdmin();
      const isSingleVariant = variants.length === 1 &&
        (!variants[0].variant_label || variants[0].variant_label === 'Única');

      if (isSingleVariant) {
        return this.pieceCardHtml(variants[0], concept.id, isAdmin);
      }

      // 2+ variações: card-criativo com galeria
      const statusKey = concept.stats.pending > 0 ? 'pending'
        : (concept.stats.rejected > 0 ? 'rejected' : 'approved');
      const aggLabel = concept.stats.total > 0
        ? `${concept.stats.approved} / ${concept.stats.total} aprovada${concept.stats.total === 1 ? '' : 's'}`
        : 'Sem variações';

      const thumbHtml = (v) => {
        let media = '';
        if (v.media_type === 'image') {
          media = `<img src="${v.media_url}" alt="${escapeHtml(v.variant_label || v.name || '')}" loading="lazy" />`;
        } else {
          media = `<div class="cc-thumb-video">▶</div>`;
        }
        const statusClass = v.status || 'pending';
        return `
          <button type="button" class="cc-thumb cc-thumb-${statusClass}" data-variant-id="${v.id}"
                  title="${escapeHtml(v.variant_label || v.name || '')}">
            ${media}
            <span class="cc-thumb-status"></span>
            <span class="cc-thumb-label">${escapeHtml(v.variant_label || 'Sem rótulo')}</span>
          </button>
        `;
      };

      return `
        <article class="concept-card" data-concept-id="${concept.id}" data-status="${statusKey}">
          <header class="cc-header">
            <div class="cc-title">
              <h4>${escapeHtml(concept.title)}</h4>
              ${concept.description ? `<p class="cc-desc">${escapeHtml(concept.description)}</p>` : ''}
            </div>
            <div class="cc-meta">
              <span class="cc-agg cc-agg-${statusKey}">${aggLabel}</span>
              ${isAdmin ? `<button class="cc-mini-btn" type="button" data-action="edit-concept" title="Editar criativo">✎</button>` : ''}
            </div>
          </header>
          <div class="cc-gallery" role="list">
            ${variants.map(thumbHtml).join('')}
            ${isAdmin ? `
              <button class="cc-add-thumb" type="button" data-action="add-variant" title="Adicionar variação">
                <span class="cc-add-plus">+</span>
                <span class="cc-add-label">Variação</span>
              </button>
            ` : ''}
          </div>
        </article>
      `;
    },

    pieceCardHtml(p, conceptId, isAdmin) {
      const statusLabel = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Reprovada' }[p.status] || 'Pendente';
      let thumb = '';
      if (p.media_type === 'image') {
        thumb = `<img src="${p.media_url}" alt="${escapeHtml(p.name)}" loading="lazy">`;
      } else if (p.media_type === 'video') {
        thumb = `<div class="placeholder">Vídeo</div><div class="video-overlay">▶</div>`;
      }
      const showAddVariant = !!conceptId && !!isAdmin;
      return `
        <article class="piece-card" data-id="${p.id}" data-status="${p.status}"${conceptId ? ` data-concept-id="${conceptId}"` : ''}>
          <div class="piece-thumb">
            ${thumb}
            <span class="piece-status-badge ${p.status}">
              <span class="dot"></span>${statusLabel}
            </span>
          </div>
          <div class="piece-info">
            <h4>${escapeHtml(p.name)}</h4>
            <div class="footer-row">
              <span>${relativeTime(p.created_at)}</span>
              ${showAddVariant ? `<button type="button" class="piece-add-variant" data-action="add-variant" title="Adicionar variação a este criativo">+ Variação</button>` : ''}
            </div>
          </div>
        </article>
      `;
    },

    // ============================================================
    // APPROVED VIEW (S45) — galeria de peças aprovadas
    // ============================================================
    async renderApprovedView() {
      this.el.crumb.innerHTML = `<a href="/">Central do Cliente</a> &nbsp;/&nbsp; <a href="#/" id="crumbHome">Aprovação</a> &nbsp;/&nbsp; <strong>Galeria de aprovadas</strong>`;
      this.el.content.innerHTML = loadingHtml('Carregando peças aprovadas...');

      let pieces;
      try {
        pieces = await Store.loadApprovedPieces();
      } catch (err) {
        this.el.content.innerHTML = errorHtml(err, () => this.renderApprovedView());
        return;
      }

      // Empty state geral
      if (!pieces || pieces.length === 0) {
        this.el.content.innerHTML = `
          <div class="approved-view">
            <div class="approved-empty">
              <div class="approved-empty-icon">✨</div>
              <h2>Ainda não tem peças aprovadas</h2>
              <p>Assim que uma peça for aprovada nas campanhas, ela aparece aqui automaticamente.</p>
              <a class="btn-primary" href="#/">← Voltar para Aprovação</a>
            </div>
          </div>
        `;
        return;
      }

      // Lista de campanhas únicas pros chips
      const campaignsMap = {};
      pieces.forEach(p => {
        if (!campaignsMap[p.campaign_id]) {
          campaignsMap[p.campaign_id] = { id: p.campaign_id, name: p.campaign_name, count: 0 };
        }
        campaignsMap[p.campaign_id].count++;
      });
      const campaignsList = Object.values(campaignsMap).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      const { campaignFilter, query } = this.state.approved;
      const queryLower = (query || '').trim().toLowerCase();

      // Aplica filtros
      const filtered = pieces.filter(p => {
        if (campaignFilter !== 'all' && p.campaign_id !== campaignFilter) return false;
        if (queryLower) {
          const hay = `${p.concept_title || ''} ${p.name || ''} ${p.copy || ''} ${p.caption || ''}`.toLowerCase();
          if (!hay.includes(queryLower)) return false;
        }
        return true;
      });

      // Chips de campanha (Todas + uma por campanha)
      const chipsHtml = `
        <button class="approved-chip ${campaignFilter === 'all' ? 'active' : ''}" data-approved-filter="all">
          Todas <span class="count">${pieces.length}</span>
        </button>
        ${campaignsList.map(c => `
          <button class="approved-chip ${campaignFilter === c.id ? 'active' : ''}" data-approved-filter="${escapeHtml(c.id)}">
            ${escapeHtml(c.name)} <span class="count">${c.count}</span>
          </button>
        `).join('')}
      `;

      // Empty state de filtro
      const cardsHtml = filtered.length === 0 ? `
        <div class="approved-empty approved-empty-filter">
          <div class="approved-empty-icon">🔍</div>
          <p><strong>Nenhuma peça encontrada</strong> com os filtros atuais.</p>
          <button class="btn-link" id="approvedClearFilters">Limpar filtros</button>
        </div>
      ` : filtered.map(p => this.renderApprovedCard(p)).join('');

      this.el.content.innerHTML = `
        <div class="approved-view">
          <header class="approved-header">
            <div class="approved-header-left">
              <h2 class="approved-title">✨ Galeria de peças aprovadas</h2>
              <p class="approved-sub">${pieces.length} ${pieces.length === 1 ? 'peça aprovada' : 'peças aprovadas'} no total · mostrando ${filtered.length}</p>
            </div>
            <a class="btn-link approved-back" href="#/">← Voltar para Aprovação</a>
          </header>

          <div class="approved-toolbar">
            <div class="approved-chips" role="tablist" aria-label="Filtrar por campanha">
              ${chipsHtml}
            </div>
            <div class="approved-search">
              <input
                type="search"
                id="approvedQuery"
                class="approved-search-input"
                placeholder="🔍 Buscar por título, copy ou legenda…"
                value="${escapeHtml(query || '')}"
                aria-label="Buscar peças aprovadas"
              />
            </div>
          </div>

          <div class="approved-grid">
            ${cardsHtml}
          </div>
        </div>
      `;

      // Wire chips
      this.el.content.querySelectorAll('[data-approved-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.state.approved.campaignFilter = btn.getAttribute('data-approved-filter');
          this.renderApprovedView();
        });
      });

      // Wire busca (debounced)
      const queryInput = this.el.content.querySelector('#approvedQuery');
      if (queryInput) {
        let tid = null;
        queryInput.addEventListener('input', () => {
          clearTimeout(tid);
          tid = setTimeout(() => {
            this.state.approved.query = queryInput.value;
            this.renderApprovedView();
            // Refocar e mover cursor pro fim
            const newInput = this.el.content.querySelector('#approvedQuery');
            if (newInput) {
              newInput.focus();
              const len = newInput.value.length;
              newInput.setSelectionRange(len, len);
            }
          }, 280);
        });
      }

      // Wire "limpar filtros"
      const clearBtn = this.el.content.querySelector('#approvedClearFilters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.state.approved = { campaignFilter: 'all', query: '' };
          this.renderApprovedView();
        });
      }
    },

    /** HTML de um card de peça aprovada (expandido). */
    renderApprovedCard(p) {
      // Mídia (reusa lógica do compareSideHtml)
      let mediaHtml = '';
      if (p.media_type === 'image' && p.media_url) {
        mediaHtml = `<img src="${escapeHtml(p.media_url)}" alt="${escapeHtml(p.name || '')}" loading="lazy">`;
      } else if (p.media_type === 'video' && p.media_url) {
        if (typeof isDirectVideoFile === 'function' && isDirectVideoFile(p.media_url)) {
          mediaHtml = `<video src="${escapeHtml(p.media_url)}" controls preload="metadata"></video>`;
        } else if (p.video_embed_url) {
          mediaHtml = `<iframe src="${escapeHtml(p.video_embed_url)}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" loading="lazy"></iframe>`;
        } else {
          mediaHtml = `<div class="approved-media-placeholder">▶ Vídeo</div>`;
        }
      } else {
        mediaHtml = `<div class="approved-media-placeholder">Sem mídia</div>`;
      }

      // Data formatada (DD/MM/AAAA · HH:MM)
      let dateLabel = '';
      if (p.approved_at) {
        try {
          const d = new Date(p.approved_at);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          dateLabel = `${dd}/${mm}/${yyyy} · ${hh}h${mi}`;
        } catch (_) { /* noop */ }
      }

      const variantBadge = p.variant_label && p.variant_label !== 'Única'
        ? `<span class="approved-variant-badge">Variação ${escapeHtml(p.variant_label)}</span>`
        : (p.variant_label === 'Única' ? `<span class="approved-variant-badge approved-variant-single">Versão única</span>` : '');

      const linkHtml = p.link_url ? `
        <div class="approved-field">
          <span class="approved-field-label">🔗 Link de destino</span>
          <a class="approved-field-link" href="${escapeHtml(p.link_url)}" target="_blank" rel="noopener">
            ${escapeHtml(p.link_url)} <span class="approved-field-link-icon">↗</span>
          </a>
        </div>
      ` : '';

      const conceptViewUrl = `#/c/${encodeURIComponent(p.campaign_id)}/k/${encodeURIComponent(p.concept_id)}/v/${encodeURIComponent(p.id)}`;

      return `
        <article class="approved-card" data-piece-id="${escapeHtml(p.id)}">
          <div class="approved-card-media">
            ${mediaHtml}
            <span class="approved-card-badge">✓ Aprovada</span>
          </div>

          <div class="approved-card-body">
            <div class="approved-card-meta">
              <span class="approved-card-campaign">${escapeHtml(p.campaign_name)}</span>
              ${variantBadge}
            </div>

            <h3 class="approved-card-title">${escapeHtml(p.concept_title || p.name || 'Sem título')}</h3>

            ${p.copy ? `
              <div class="approved-field">
                <span class="approved-field-label">💬 Copy</span>
                <p class="approved-field-text">${escapeHtml(p.copy)}</p>
              </div>
            ` : ''}

            ${p.caption ? `
              <div class="approved-field">
                <span class="approved-field-label">🏷️ Legenda</span>
                <p class="approved-field-text approved-field-caption">${escapeHtml(p.caption)}</p>
              </div>
            ` : ''}

            ${linkHtml}

            <div class="approved-card-footer">
              ${dateLabel ? `<span class="approved-card-date" title="Data de aprovação">📅 ${escapeHtml(dateLabel)}${p.approved_by ? ` · ${escapeHtml(p.approved_by)}` : ''}</span>` : ''}
              <a class="approved-card-view" href="${conceptViewUrl}">Ver na campanha →</a>
            </div>
          </div>
        </article>
      `;
    },

    // ============================================================
    // CONCEPT VIEW (S40 Fase 3) — galeria + foco + comentário geral
    // ============================================================
    async renderConceptView(campaignId, conceptId, variantId = null) {
      this.el.crumb.innerHTML = `<a href="/">Central do Cliente</a> &nbsp;/&nbsp; <a href="#/" id="crumbHome">Aprovação</a> &nbsp;/&nbsp; <em>carregando...</em>`;
      this.el.content.innerHTML = loadingHtml('Carregando criativo...');

      let campaign, concept, variants, generalComments;
      try {
        [campaign, concept, variants, generalComments] = await Promise.all([
          Store.getCampaign(campaignId),
          Store.getConcept(conceptId),
          Store.loadVariants(conceptId, true),
          Store.loadConceptComments(conceptId, true),
        ]);
      } catch (err) {
        this.el.content.innerHTML = errorHtml(err, () => this.renderConceptView(campaignId, conceptId, variantId));
        return;
      }
      if (!campaign) { Toast.show('Campanha não encontrada.', 'error'); Router.go('#/'); return; }
      if (!concept)  { Toast.show('Criativo não encontrado.', 'error'); Router.go(`#/c/${campaignId}`); return; }
      if (!variants || variants.length === 0) {
        // Criativo sem variações: deixa o admin adicionar a primeira
        this.el.content.innerHTML = `
          <div class="empty-state">
            <div class="icon">🎨</div>
            <h3>Criativo sem variações ainda</h3>
            <p>Adicione a primeira variação pra começar a coletar aprovações.</p>
            ${window.WhirlpoolAuth.isAdmin() ? `<button class="btn-primary" id="btnAddFirstVar"><span class="plus">+</span> Adicionar variação</button>` : ''}
            <div style="margin-top:14px;"><button class="btn-ghost" id="btnBackCampaign">← Voltar pra campanha</button></div>
          </div>
        `;
        const b1 = document.getElementById('btnAddFirstVar');
        if (b1) b1.addEventListener('click', () => Modals.openAddVariant(campaignId, conceptId));
        document.getElementById('btnBackCampaign').addEventListener('click', () => Router.go(`#/c/${campaignId}`));
        return;
      }

      // Resolve variação selecionada (ou primeira)
      let selected = variants.find(v => v.id === variantId) || variants[0];
      if (!variantId || !variants.find(v => v.id === variantId)) {
        // Normaliza URL pra incluir a variantId (sem provocar reload — replace)
        const newHash = `#/c/${campaignId}/k/${conceptId}/v/${selected.id}`;
        if (window.location.hash !== newHash) {
          history.replaceState(null, '', newHash);
        }
      }

      // Stats agregadas
      const stats = Store.statsFromPieces(variants);
      const aggKey = stats.pending > 0 ? 'pending' : (stats.rejected > 0 ? 'rejected' : 'approved');
      const aggLabel = `${stats.approved} / ${stats.total} aprovada${stats.total === 1 ? '' : 's'}`;

      this.el.crumb.innerHTML = `
        <a href="/">Central do Cliente</a> &nbsp;/&nbsp;
        <a href="#/" id="crumbHome">Aprovação</a> &nbsp;/&nbsp;
        <a href="#/c/${campaignId}" id="crumbCamp">${escapeHtml(campaign.name)}</a> &nbsp;/&nbsp;
        <strong>${escapeHtml(concept.title)}</strong>
      `;
      document.getElementById('crumbHome').addEventListener('click', (e) => { e.preventDefault(); Router.go('#/'); });
      document.getElementById('crumbCamp').addEventListener('click', (e) => { e.preventDefault(); Router.go(`#/c/${campaignId}`); });

      const isAdmin = window.WhirlpoolAuth.isAdmin();
      const isClient = !isAdmin;

      // Galeria de thumbnails (todas as variações)
      const galleryHtml = variants.map((v) => {
        const isSel = v.id === selected.id;
        let media = '';
        if (v.media_type === 'image') {
          media = `<img src="${v.media_url}" alt="${escapeHtml(v.variant_label || v.name || '')}" loading="lazy" />`;
        } else {
          media = `<div class="cv-thumb-video">▶</div>`;
        }
        const statusClass = v.status || 'pending';
        return `
          <button type="button"
                  class="cv-thumb cv-thumb-${statusClass} ${isSel ? 'is-selected' : ''}"
                  data-variant-id="${v.id}"
                  title="${escapeHtml(v.variant_label || v.name || '')}">
            ${media}
            <span class="cv-thumb-status"></span>
            <span class="cv-thumb-label">${escapeHtml(v.variant_label || 'Sem rótulo')}</span>
          </button>
        `;
      }).join('');

      // ============ FOCO: preview da variação selecionada ============
      const pp = selected;
      const currentVersion = pp.version || 1;

      // Carrega comments da variação selecionada
      let cms = [];
      try { cms = await Store.loadComments(pp.id, true); } catch (_) {}

      const FIVE_MIN_MS = 5 * 60 * 1000;
      const currentUser = (window.WhirlpoolAuth.getUserName() || '').trim();
      const canDeleteComment = (c) => {
        if (c.kind !== 'comment') return false;
        if (!isClient) return false;
        if ((c.author || '').trim() !== currentUser) return false;
        return (Date.now() - new Date(c.created_at).getTime()) < FIVE_MIN_MS;
      };
      const canEditPin = (c) => {
        if (!isClient) return false;
        if ((c.author || '').trim() !== currentUser) return false;
        return (Date.now() - new Date(c.created_at).getTime()) < FIVE_MIN_MS;
      };

      // Pins da versão atual
      const visiblePins = cms
        .filter(c => c.pin_x != null && c.pin_y != null && c.pin_version === currentVersion)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const pinNumberById = new Map(visiblePins.map((c, i) => [c.id, i + 1]));

      const pinsOverlayHtml = visiblePins.map((c, i) => {
        const editable = canEditPin(c);
        const tooltip = `${(c.text || '').substring(0, 80)} — ${c.author || ''}`;
        return `
          <button type="button" class="pin${editable ? ' pin-editable' : ''}"
                  data-comment-id="${c.id}" data-num="${i + 1}"
                  style="left: ${c.pin_x}%; top: ${c.pin_y}%;"
                  title="${escapeHtml(tooltip)}">
            <span class="pin-num">${i + 1}</span>
          </button>
        `;
      }).join('');

      // Media (imagem com pins ou vídeo)
      let mediaHtml = '';
      if (pp.media_type === 'image') {
        mediaHtml = `
          <div class="piece-image-wrap" data-pin-mode="off">
            <img src="${pp.media_url}" alt="${escapeHtml(pp.name)}" class="piece-image">
            <div class="pin-overlay">${pinsOverlayHtml}</div>
            <div class="pin-banner">
              <span class="pin-banner-text">📍 Clique na imagem para marcar o ponto deste comentário</span>
              <button type="button" class="pin-btn pin-btn-skip">Pular marcação</button>
              <button type="button" class="pin-btn pin-btn-cancel">Cancelar</button>
            </div>
          </div>
        `;
      } else if (pp.media_type === 'video') {
        const embedUrl = pp.video_embed_url || (pp.media_url && !isDirectVideoFile(pp.media_url) ? pp.media_url : null);
        const originalUrl = pp.media_url || pp.video_embed_url || '';
        const isPersonalSP = isSharePointPersonal(originalUrl);
        const fallbackLink = originalUrl ? `
          <a class="video-fallback-link" href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener">
            <span>Vídeo não carregou?</span> <strong>Abrir em nova aba ↗</strong>
          </a>` : '';
        if (embedUrl && !isPersonalSP) {
          mediaHtml = `
            <div class="video-frame-wrap">
              <iframe src="${escapeHtml(embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"></iframe>
            </div>${fallbackLink}`;
        } else if (pp.media_url && isDirectVideoFile(pp.media_url)) {
          mediaHtml = `<video src="${escapeHtml(pp.media_url)}" controls></video>${fallbackLink}`;
        } else if (isPersonalSP) {
          mediaHtml = `
            <div class="video-frame-wrap video-frame-placeholder">
              <div class="video-sp-icon">🔒</div>
              <div class="video-sp-notice">
                <strong>⚠️ SharePoint pessoal não permite embed.</strong>
                Clique em <strong>"Abrir em nova aba"</strong> abaixo.
              </div>
            </div>${fallbackLink}`;
        } else {
          mediaHtml = `<div class="video-frame-wrap video-frame-placeholder"><div style="font-size:32px;">🎬</div><p>Vídeo sem URL</p></div>`;
        }
      }

      const variantStatusLabel = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Reprovada' }[pp.status] || 'Pendente';

      // ============ HTML completo ============
      const html = `
        <div class="cv-toolbar">
          <button class="btn-ghost" id="cvBack">← Voltar</button>
          <div class="cv-title-block">
            <h2>${escapeHtml(concept.title)}</h2>
            ${concept.description ? `<p class="cv-desc">${escapeHtml(concept.description)}</p>` : ''}
          </div>
          <div class="cv-actions">
            <span class="cc-agg cc-agg-${aggKey}">${aggLabel}</span>
            ${isAdmin ? `
              <button class="btn-ghost cc-mini-btn" id="cvEditConcept" title="Editar criativo">✎</button>
              <button class="btn-primary" id="cvAddVariant"><span class="plus">+</span> Nova variação</button>
            ` : ''}
          </div>
        </div>

        <div class="cv-gallery-wrap">
          <div class="cv-gallery" role="list">
            ${galleryHtml}
          </div>
        </div>

        <div class="cv-focus" data-status="${pp.status}">
          <div class="cv-focus-head">
            <div>
              <h3>${escapeHtml(pp.variant_label || 'Variação')}
                <span class="version-tag">v${currentVersion}</span>
              </h3>
              <span class="cv-status-tag cv-status-${pp.status}">${variantStatusLabel}</span>
            </div>
            <div class="cv-focus-head-right">
              <div class="cv-hints" aria-hidden="true">
                <kbd>←</kbd><kbd>→</kbd> navegar
                <span class="cv-hint-sep">·</span>
                <kbd>A</kbd> aprovar
                <span class="cv-hint-sep">·</span>
                <kbd>R</kbd> reprovar
                <span class="cv-hint-sep">·</span>
                <kbd>C</kbd> comentar
              </div>
              <div class="cv-nav">
                <button class="btn-ghost cv-nav-btn" id="cvPrev" title="Variação anterior (←)" ${variants.indexOf(selected) === 0 ? 'disabled' : ''}>←</button>
                <button class="btn-ghost cv-nav-btn" id="cvNext" title="Próxima variação (→)" ${variants.indexOf(selected) === variants.length - 1 ? 'disabled' : ''}>→</button>
              </div>
            </div>
          </div>

          <div class="piece-detail" data-status="${pp.status}">
            <div class="piece-left">
              <div class="piece-media">${mediaHtml}</div>
              ${pp.link_url ? `
                <a class="piece-link-block" href="${escapeHtml(pp.link_url)}" target="_blank" rel="noopener noreferrer">
                  <span class="piece-link-icon">🔗</span>
                  <span class="piece-link-text">
                    <span class="piece-link-label">Arquivo original</span>
                    <span class="piece-link-host">${escapeHtml((function(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'abrir link'}})(pp.link_url))}</span>
                  </span>
                  <span class="piece-link-arrow">↗</span>
                </a>
              ` : ''}
            </div>
            <div class="piece-side">
              <div class="cv-tabs" role="tablist" aria-label="Painel da variação">
                <button type="button" class="cv-tab is-active" data-cv-tab="actions" role="tab" aria-selected="true">Aprovação</button>
                <button type="button" class="cv-tab" data-cv-tab="comments" role="tab" aria-selected="false">Comentários · ${cms.length}</button>
              </div>

              <div class="cv-tab-content" data-cv-tab-content="actions">
                ${pp.copy ? `<div class="copy-block"><div class="label">Copy</div><p>${escapeHtml(pp.copy)}</p></div>` : ''}
                ${pp.caption ? `<div class="copy-block caption-block"><div class="label">Legenda</div><p>${escapeHtml(pp.caption)}</p></div>` : ''}

                <div class="action-row">
                  <button class="btn-approve ${pp.status === 'approved' ? 'active' : ''}" id="cvBtnApprove" type="button">
                    ✓ ${pp.status === 'approved' ? 'Aprovada' : 'Aprovar'}
                  </button>
                  <button class="btn-reject ${pp.status === 'rejected' ? 'active' : ''}" id="cvBtnReject" type="button">
                    ✗ ${pp.status === 'rejected' ? 'Reprovada' : 'Reprovar'}
                  </button>
                </div>

                ${(isAdmin || currentVersion > 1) ? `
                  <div class="piece-side-footer">
                    ${currentVersion > 1 ? `<button class="btn-ghost btn-history" id="cvBtnHistory" type="button"><span class="history-icon">⟳</span> Histórico</button>` : ''}
                    ${isAdmin ? `
                      <button class="btn-ghost" id="cvBtnEditVariant" type="button">✎ Editar variação</button>
                      <button class="btn-ghost btn-ghost-danger" id="cvBtnDeleteVariant" type="button">Excluir</button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>

              <div class="cv-tab-content" data-cv-tab-content="comments" hidden>
                <div class="section-title">Histórico (${cms.length})</div>
                <div class="comments-list" id="cvCommentsList">
                  ${cms.length === 0 ? `<div style="font-size:12px; color:var(--muted); text-align:center; padding:14px;">Sem comentários ainda.</div>` : cms.map(cm => {
                    const hasPin = cm.pin_x != null && cm.pin_y != null;
                    const pinIsCurrent = hasPin && cm.pin_version === currentVersion;
                    const pinNumber = pinIsCurrent ? pinNumberById.get(cm.id) : null;
                    const pinBadge = hasPin
                      ? (pinIsCurrent
                          ? `<span class="comment-pin-badge" title="Marcado no ponto ${pinNumber}">📍 ${pinNumber}</span>`
                          : `<span class="comment-pin-badge old" title="Pin de versão anterior">📍 v${cm.pin_version}</span>`)
                      : '';
                    const canDel = canDeleteComment(cm);
                    const isAction = cm.kind && cm.kind.startsWith('action');
                    const kindClass = cm.kind === 'action' ? 'action action-approved'
                      : cm.kind === 'action-rejected' ? 'action action-rejected'
                      : cm.kind === 'action-update' ? 'action action-update'
                      : cm.kind === 'action-created' ? 'action action-created'
                      : '';
                    const actionTitle = cm.kind === 'action' ? 'Aprovou'
                      : cm.kind === 'action-rejected' ? 'Reprovou'
                      : cm.kind === 'action-update' ? 'Editou'
                      : cm.kind === 'action-created' ? 'Criou'
                      : 'Comentou';
                    const avatarIcon = `<span class="comment-action-icon" title="${escapeHtml(cm.author)} — ${actionTitle}">${escapeHtml(initials(cm.author))}</span>`;
                    const textHtml = isAction ? escapeHtml(cm.text) : renderCommentText(cm.text);
                    return `
                      <div class="comment ${kindClass}" data-comment-id="${cm.id}" data-pin-id="${pinIsCurrent ? cm.id : ''}">
                        <div class="comment-head">
                          ${avatarIcon}
                          ${pinBadge}
                          <span class="comment-author">${escapeHtml(cm.author)}</span>
                          <span class="comment-date">${formatDate(cm.created_at)}</span>
                          ${canDel ? `<button type="button" class="comment-delete" data-id="${cm.id}" title="Excluir comentário">×</button>` : ''}
                        </div>
                        <p class="comment-text">${textHtml}</p>
                      </div>
                    `;
                  }).join('')}
                </div>

                <form class="comment-form" id="cvCommentForm">
                  <input type="text" id="cvCommentInput" placeholder="Comentar nessa variação..." maxlength="500" autocomplete="off" />
                  ${(isClient && pp.media_type === 'image') ? `<button type="button" id="cvBtnPinComment" class="btn-pin-comment" title="Enviar marcando um ponto na imagem">📍</button>` : ''}
                  <button type="submit">Enviar</button>
                </form>
                <div class="comment-hint">
                  Formatação: <code>**negrito**</code> <code>_itálico_</code> <code>[link](url)</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <details class="cv-general" ${generalComments.length > 0 ? 'open' : ''}>
          <summary>
            <span class="cv-general-icon">💬</span>
            <span class="cv-general-label">Comentário geral do criativo</span>
            <span class="cv-general-count">${generalComments.length}</span>
            <span class="cv-general-caret">▾</span>
          </summary>
          <div class="cv-general-body">
            <div class="cv-general-help">Use esse espaço pra discutir o criativo como um todo (estratégia, briefing, direção). Comentários específicos de uma variação ficam no painel acima.</div>
            <div class="cv-general-list" id="cvGeneralList">
              ${generalComments.length === 0 ? `<div style="font-size:12px; color:var(--muted); text-align:center; padding:14px;">Sem comentários gerais ainda.</div>` : generalComments.map(cm => {
                const canDel = (cm.kind === 'comment') && isClient && ((cm.author || '').trim() === currentUser) && (Date.now() - new Date(cm.created_at).getTime() < FIVE_MIN_MS);
                return `
                  <div class="comment" data-general-comment-id="${cm.id}">
                    <div class="comment-head">
                      <span class="comment-action-icon" title="${escapeHtml(cm.author)} — Comentou">${escapeHtml(initials(cm.author))}</span>
                      <span class="comment-author">${escapeHtml(cm.author)}</span>
                      <span class="comment-date">${formatDate(cm.created_at)}</span>
                      ${canDel ? `<button type="button" class="comment-delete cv-general-delete" data-id="${cm.id}" title="Excluir">×</button>` : ''}
                    </div>
                    <p class="comment-text">${renderCommentText(cm.text)}</p>
                  </div>
                `;
              }).join('')}
            </div>
            <form class="comment-form" id="cvGeneralForm">
              <input type="text" id="cvGeneralInput" placeholder="Comentar no criativo (não na variação)..." maxlength="500" autocomplete="off" />
              <button type="submit">Enviar</button>
            </form>
          </div>
        </details>
      `;

      this.el.content.innerHTML = html;
      this._wireConceptView(campaignId, concept, variants, selected, cms);
    },

    _wireConceptView(campaignId, concept, variants, selected, cms) {
      const isAdmin = window.WhirlpoolAuth.isAdmin();
      const isClient = !isAdmin;
      const author = window.WhirlpoolAuth.getUserName() || 'Anônimo';
      const ppId = selected.id;
      const conceptId = concept.id;
      const currentVersion = selected.version || 1;
      const root = this.el.content;

      // ----- Voltar / breadcrumb -----
      document.getElementById('cvBack').addEventListener('click', () => Router.go(`#/c/${campaignId}`));

      // ----- Tabs mobile (Aprovação | Comentários) -----
      const tabs = root.querySelectorAll('.cv-tab');
      const tabContents = root.querySelectorAll('.cv-tab-content');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.cvTab;
          tabs.forEach(t => {
            const isActive = t.dataset.cvTab === target;
            t.classList.toggle('is-active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });
          tabContents.forEach(c => {
            const matches = c.dataset.cvTabContent === target;
            // Em desktop, ambos sempre visíveis (CSS @media decide).
            // Em mobile, esconde via hidden attribute. CSS limpa em desktop com !important.
            if (matches) c.removeAttribute('hidden');
            else c.setAttribute('hidden', '');
          });
        });
      });

      // ----- Galeria: click muda variação selecionada -----
      root.querySelectorAll('.cv-thumb[data-variant-id]').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const vid = thumb.dataset.variantId;
          if (vid && vid !== ppId) Router.go(`#/c/${campaignId}/k/${conceptId}/v/${vid}`);
        });
      });

      // ----- Nav ← → -----
      const idx = variants.indexOf(selected);
      const goPrev = () => {
        if (idx <= 0) return;
        Router.go(`#/c/${campaignId}/k/${conceptId}/v/${variants[idx - 1].id}`);
      };
      const goNext = () => {
        if (idx >= variants.length - 1) return;
        Router.go(`#/c/${campaignId}/k/${conceptId}/v/${variants[idx + 1].id}`);
      };
      const prevBtn = document.getElementById('cvPrev');
      const nextBtn = document.getElementById('cvNext');
      if (prevBtn) prevBtn.addEventListener('click', goPrev);
      if (nextBtn) nextBtn.addEventListener('click', goNext);

      // Atalhos teclado: ← → navega; A aprova; R reprova; C foca no comentário
      // Ignora atalhos se cursor está num input/textarea (exceto Esc/setas que já têm tratamento)
      const keyHandler = (e) => {
        const active = document.activeElement;
        const inField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        // C funciona fora de inputs (move foco PRA input)
        if ((e.key === 'c' || e.key === 'C') && !inField) {
          e.preventDefault();
          const inp = document.getElementById('cvCommentInput');
          if (inp) { inp.focus(); inp.select && inp.select(); }
          return;
        }
        if (inField) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          if (selected.status !== 'approved') {
            const b = document.getElementById('cvBtnApprove');
            if (b && !b.disabled) b.click();
          }
        }
        else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (selected.status !== 'rejected') {
            const b = document.getElementById('cvBtnReject');
            if (b && !b.disabled) b.click();
          }
        }
      };
      document.addEventListener('keydown', keyHandler);
      // Limpa o handler ao sair da view (ao próximo render)
      if (!this._cleanups) this._cleanups = [];
      this._cleanups.forEach(fn => { try { fn(); } catch (_) {} });
      this._cleanups = [() => document.removeEventListener('keydown', keyHandler)];

      // ----- Editar criativo / nova variação -----
      const editConceptBtn = document.getElementById('cvEditConcept');
      if (editConceptBtn) editConceptBtn.addEventListener('click', () => Modals.openConcept(campaignId, conceptId));
      const addVarBtn = document.getElementById('cvAddVariant');
      if (addVarBtn) addVarBtn.addEventListener('click', () => Modals.openAddVariant(campaignId, conceptId));

      // ----- Aprovar/Reprovar variação -----
      const btnApprove = document.getElementById('cvBtnApprove');
      const btnReject  = document.getElementById('cvBtnReject');
      btnApprove.addEventListener('click', async () => {
        if (selected.status === 'approved') { Toast.show('Já está aprovada.'); return; }
        btnApprove.disabled = true; btnReject.disabled = true;
        try {
          await Store.updatePieceStatus(campaignId, ppId, 'approved', author);
          Toast.show('Variação aprovada.', 'success');
          App.renderConceptView(campaignId, conceptId, ppId);
        } catch (err) { safeError(err); btnApprove.disabled = false; btnReject.disabled = false; }
      });
      btnReject.addEventListener('click', async () => {
        if (selected.status === 'rejected') { Toast.show('Já está reprovada.'); return; }
        btnApprove.disabled = true; btnReject.disabled = true;
        try {
          await Store.updatePieceStatus(campaignId, ppId, 'rejected', author);
          Toast.show('Variação reprovada.', 'success');
          App.renderConceptView(campaignId, conceptId, ppId);
        } catch (err) { safeError(err); btnApprove.disabled = false; btnReject.disabled = false; }
      });

      // ----- Pins + comentário da variação -----
      let pinModeText = null;
      const wrapEl = root.querySelector('.piece-image-wrap');
      const imgEl = root.querySelector('.piece-image');
      const submitBtn = root.querySelector('#cvCommentForm button[type="submit"]');
      const inputEl = root.querySelector('#cvCommentInput');

      const enterPinMode = (text) => {
        if (!wrapEl) return false;
        pinModeText = text;
        wrapEl.dataset.pinMode = 'on';
        if (submitBtn) submitBtn.disabled = true;
        return true;
      };
      const exitPinMode = () => {
        if (wrapEl) wrapEl.dataset.pinMode = 'off';
        pinModeText = null;
        if (submitBtn) submitBtn.disabled = false;
      };
      const savePinAndComment = async (text, x, y) => {
        if (submitBtn) submitBtn.disabled = true;
        try {
          const opts = (x != null && y != null) ? { pinX: x, pinY: y, pinVersion: currentVersion } : {};
          await Store.addComment(ppId, author, text, opts);
          if (inputEl) inputEl.value = '';
          App.renderConceptView(campaignId, conceptId, ppId);
        } catch (err) { safeError(err); }
        finally { exitPinMode(); }
      };

      const form = document.getElementById('cvCommentForm');
      if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (!text) return;
        await savePinAndComment(text, null, null);
      });

      const btnPinComment = document.getElementById('cvBtnPinComment');
      if (btnPinComment) {
        btnPinComment.addEventListener('click', (e) => {
          e.preventDefault();
          const text = inputEl.value.trim();
          if (!text) { Toast.show('Escreva o comentário primeiro, depois marque o ponto.', 'error'); inputEl.focus(); return; }
          enterPinMode(text);
        });
      }

      if (imgEl) {
        imgEl.addEventListener('click', async (e) => {
          if (!wrapEl || wrapEl.dataset.pinMode !== 'on') return;
          const rect = imgEl.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          await savePinAndComment(pinModeText, x, y);
        });
      }
      const skipBtn = root.querySelector('.pin-btn-skip');
      if (skipBtn) skipBtn.addEventListener('click', async (e) => { e.stopPropagation(); await savePinAndComment(pinModeText, null, null); });
      const cancelBtn = root.querySelector('.pin-btn-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); exitPinMode(); });

      const escHandler = (e) => {
        if (e.key === 'Escape' && wrapEl && wrapEl.dataset.pinMode === 'on') exitPinMode();
      };
      document.addEventListener('keydown', escHandler);
      this._cleanups.push(() => document.removeEventListener('keydown', escHandler));

      // Click no pin → scroll pro comment
      root.querySelectorAll('.pin').forEach(pin => {
        pin.addEventListener('click', (e) => {
          if (wrapEl && wrapEl.dataset.pinMode === 'on') return;
          e.stopPropagation();
          const id = pin.dataset.commentId;
          const cm = root.querySelector(`.comment[data-comment-id="${id}"]`);
          if (cm) {
            cm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cm.classList.add('comment-flash');
            setTimeout(() => cm.classList.remove('comment-flash'), 1400);
          }
        });
      });

      // Hover comment com pin → destaca pin
      root.querySelectorAll('.comment[data-pin-id]').forEach(c => {
        const id = c.dataset.pinId;
        if (!id) return;
        const findPin = () => root.querySelector(`.pin[data-comment-id="${id}"]`);
        c.addEventListener('mouseenter', () => { const p = findPin(); if (p) p.classList.add('is-active'); });
        c.addEventListener('mouseleave', () => { const p = findPin(); if (p) p.classList.remove('is-active'); });
      });

      // Excluir comment próprio
      root.querySelectorAll('.comments-list .comment-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (!confirm('Excluir este comentário?')) return;
          try { await Store.deleteComment(ppId, id); Toast.show('Comentário excluído.', 'success'); App.renderConceptView(campaignId, conceptId, ppId); }
          catch (err) { safeError(err); }
        });
      });

      // ----- Drag-and-drop de pin (admin não tem, só client) -----
      let dragging = null;
      root.querySelectorAll('.pin.pin-editable').forEach(pin => {
        pin.addEventListener('mousedown', (e) => {
          e.preventDefault(); e.stopPropagation();
          dragging = { pin, moved: false };
          pin.classList.add('is-dragging');
        });
      });
      const onMove = (e) => {
        if (!dragging || !imgEl) return;
        dragging.moved = true;
        const rect = imgEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        dragging.pin.style.left = x + '%';
        dragging.pin.style.top = y + '%';
      };
      const onUp = async (e) => {
        if (!dragging) return;
        const wasMoved = dragging.moved;
        const pin = dragging.pin;
        pin.classList.remove('is-dragging');
        const id = pin.dataset.commentId;
        dragging = null;
        if (!wasMoved || !imgEl) return;
        const rect = imgEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        try { await Store.updateCommentPin(ppId, id, x, y); }
        catch (err) { safeError(err); App.renderConceptView(campaignId, conceptId, ppId); }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      this._cleanups.push(() => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      });

      // ----- Editar variação / Histórico / Excluir -----
      const editBtn = document.getElementById('cvBtnEditVariant');
      if (editBtn) editBtn.addEventListener('click', () => Modals.openPiece(campaignId, ppId));
      const historyBtn = document.getElementById('cvBtnHistory');
      if (historyBtn) historyBtn.addEventListener('click', () => Modals.openVersionsHistory(campaignId, ppId));
      const delBtn = document.getElementById('cvBtnDeleteVariant');
      if (delBtn) delBtn.addEventListener('click', async () => {
        const lastVariation = variants.length === 1;
        const msg = lastVariation
          ? 'Excluir essa variação? Como é a última, o criativo também ficará sem variações.'
          : 'Excluir essa variação? Não pode ser desfeito.';
        if (!confirm(msg)) return;
        try {
          await Store.deletePiece(campaignId, ppId);
          Toast.show('Variação excluída.', 'success');
          if (variants.length > 1) {
            // navega pra próxima variação remanescente
            const nextV = variants[idx + 1] || variants[idx - 1];
            Router.go(`#/c/${campaignId}/k/${conceptId}/v/${nextV.id}`);
          } else {
            Router.go(`#/c/${campaignId}`);
          }
        } catch (err) { safeError(err); }
      });

      // ----- Comentário geral do criativo (accordion) -----
      const generalForm = document.getElementById('cvGeneralForm');
      if (generalForm) generalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('cvGeneralInput');
        const text = input.value.trim();
        if (!text) return;
        const submit = generalForm.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
          await Store.addConceptComment(conceptId, author, text);
          input.value = '';
          App.renderConceptView(campaignId, conceptId, ppId);
        } catch (err) { safeError(err); submit.disabled = false; }
      });
      root.querySelectorAll('.cv-general-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (!confirm('Excluir esse comentário?')) return;
          try {
            await Store.deleteConceptComment(conceptId, id);
            Toast.show('Comentário excluído.', 'success');
            App.renderConceptView(campaignId, conceptId, ppId);
          } catch (err) { safeError(err); }
        });
      });
    }
  };

  // ============ MODAIS ============
  const Modals = {
    async openCampaign(editId = null) {
      const isEdit = !!editId;
      let existing = null;
      if (isEdit) {
        try {
          existing = await Store.getCampaign(editId);
          if (!existing) { Toast.show('Campanha não encontrada.', 'error'); return; }
        } catch (err) { safeError(err); return; }
      }

      const datalistId = 'campTypesDl';
      const html = `
        <div class="modal-header">
          <div>
            <h2>${isEdit ? 'Editar Campanha' : 'Nova Campanha'}</h2>
            <div class="modal-sub">${isEdit ? 'Atualize os dados da campanha.' : 'Defina o nome e o tipo da campanha.'}</div>
          </div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome da campanha</label>
            <input type="text" id="campName" placeholder="Ex: Lançamento Família+ 2026" maxlength="120" autofocus value="${isEdit ? escapeHtml(existing.name) : ''}" />
          </div>
          <div class="form-group">
            <label>Tipo de campanha</label>
            <input type="text" id="campType" placeholder="Selecione ou digite" list="${datalistId}" maxlength="60" value="${isEdit ? escapeHtml(existing.type) : ''}" />
            <datalist id="${datalistId}">
              ${CAMPAIGN_TYPES.map(t => `<option value="${t}"></option>`).join('')}
            </datalist>
            <div class="hint">Sugestões: ${CAMPAIGN_TYPES.join(', ')}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" type="button" data-close>Cancelar</button>
          <button class="btn-primary" type="button" id="campSave">${isEdit ? 'Salvar alterações' : 'Criar campanha'}</button>
        </div>
      `;
      this._open(html, (modal) => {
        modal.querySelector('#campSave').addEventListener('click', async () => {
          const name = modal.querySelector('#campName').value.trim();
          const type = modal.querySelector('#campType').value.trim();
          if (!name) { Toast.show('Informe o nome.', 'error'); return; }
          if (!type) { Toast.show('Informe o tipo.', 'error'); return; }
          const btn = modal.querySelector('#campSave');
          const originalLabel = btn.textContent;
          btn.disabled = true; btn.textContent = 'Salvando...';
          try {
            if (isEdit) {
              await Store.updateCampaign(editId, { name, type });
              Toast.show('Campanha atualizada.', 'success');
              this._close();
              App.render();
            } else {
              const c = await Store.addCampaign(name, type);
              Toast.show('Campanha criada.', 'success');
              this._close();
              Router.go(`#/c/${c.id}`);
            }
          } catch (err) {
            safeError(err);
            btn.disabled = false; btn.textContent = originalLabel;
          }
        });
      });
    },

    /** Cria/edita CRIATIVO (peça-conceito). Na criação, monta título +
        descrição opcional + 1ª variação no mesmo modal. Na edição, só
        título e descrição (variações editam pelo modal de peça). */
    async openConcept(campaignId, editId = null) {
      const isEdit = !!editId;
      let existing = null;
      if (isEdit) {
        try {
          existing = await Store.getConcept(editId);
          if (!existing) { Toast.show('Criativo não encontrado.', 'error'); return; }
        } catch (err) { safeError(err); return; }
      }

      // Na edição: form curto (só título + descrição)
      if (isEdit) {
        const html = `
          <div class="modal-header">
            <div>
              <h2>Editar Criativo</h2>
              <div class="modal-sub">Atualize o título e a descrição. Variações são editadas individualmente.</div>
            </div>
            <button class="modal-close" type="button" data-close>×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Título do criativo</label>
              <input type="text" id="conceptTitle" placeholder="Ex: Banner Site XPTO" maxlength="160" autofocus value="${escapeHtml(existing.title)}" />
            </div>
            <div class="form-group">
              <label>Descrição (opcional)</label>
              <textarea id="conceptDesc" placeholder="Ex: Hero da home — A/B de cores" maxlength="500">${escapeHtml(existing.description || '')}</textarea>
              <div class="hint">Aparece como subtítulo do criativo. Útil pra explicar o que diferencia as variações.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" type="button" data-close>Cancelar</button>
            <button class="btn-primary" type="button" id="conceptSave">Salvar alterações</button>
          </div>
        `;
        this._open(html, (modal) => {
          modal.querySelector('#conceptSave').addEventListener('click', async () => {
            const title = modal.querySelector('#conceptTitle').value.trim();
            const description = modal.querySelector('#conceptDesc').value.trim();
            if (!title) { Toast.show('Informe o título.', 'error'); return; }
            const btn = modal.querySelector('#conceptSave');
            const orig = btn.textContent;
            btn.disabled = true; btn.textContent = 'Salvando...';
            try {
              await Store.updateConcept(editId, { title, description });
              Toast.show('Criativo atualizado.', 'success');
              this._close();
              App.renderCampaignView(campaignId);
            } catch (err) {
              safeError(err);
              btn.disabled = false; btn.textContent = orig;
            }
          });
        });
        return;
      }

      // Criação: criativo + primeira variação no mesmo modal
      const html = `
        <div class="modal-header">
          <div>
            <h2>Novo Criativo</h2>
            <div class="modal-sub">Defina o título e suba a 1ª variação. Adicione outras variações depois.</div>
          </div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Título do criativo</label>
            <input type="text" id="conceptTitle" placeholder="Ex: Banner Site XPTO" maxlength="160" autofocus />
            <div class="hint">É o nome que aparece no card da campanha.</div>
          </div>
          <div class="form-group">
            <label>Descrição (opcional)</label>
            <textarea id="conceptDesc" placeholder="Ex: Hero da home — A/B de cores" maxlength="500"></textarea>
          </div>

          <hr style="border:none; border-top:1px solid var(--border); margin: 14px 0;">
          <div style="margin-bottom:10px;"><strong>1ª Variação</strong></div>

          <div class="form-group">
            <label>Rótulo da variação</label>
            <input type="text" id="variantLabel" placeholder="Ex: Verde · Vermelha · CTA forte" maxlength="80" value="Única" />
            <div class="hint">Como você quer chamar essa variação. Se for único, deixa "Única".</div>
          </div>

          <div class="form-group">
            <label>Tipo de mídia</label>
            <div class="radio-group">
              <div class="radio-pill">
                <input type="radio" id="cmtImage" name="cmediaType" value="image" checked />
                <label for="cmtImage">🖼  Imagem</label>
              </div>
              <div class="radio-pill">
                <input type="radio" id="cmtVideo" name="cmediaType" value="video" />
                <label for="cmtVideo">🎬  Vídeo</label>
              </div>
            </div>
          </div>

          <div class="form-group" id="cgrpImage">
            <label>Arte (imagem)</label>
            <div class="upload-area" id="cDropArea">
              <div class="upload-icon">📁</div>
              <p>Clique ou arraste a imagem aqui</p>
              <span class="small">JPG, PNG ou WEBP — comprimida automaticamente</span>
              <input type="file" id="cFileInput" accept="image/*" hidden />
            </div>
            <div class="upload-preview" id="cPreview">
              <button type="button" class="remove" id="cRemovePreview">×</button>
              <img id="cPreviewImg" alt="" src="" />
            </div>
          </div>

          <div class="form-group" id="cgrpVideo" style="display:none;">
            <label>URL do vídeo</label>
            <input type="url" id="cVideoUrl" placeholder="YouTube, Vimeo, SharePoint, Google Drive ou link direto (.mp4)" />
            <div class="hint">YouTube/Vimeo serão embedados; .mp4 abre player nativo.</div>
          </div>

          <div class="form-group">
            <label>Copy (opcional)</label>
            <textarea id="cPieceCopy" placeholder="Cole aqui o texto/copy da peça..." maxlength="3000"></textarea>
          </div>

          <div class="form-group">
            <label>Legenda (opcional)</label>
            <textarea id="cPieceCaption" placeholder="Texto que vai acompanhar a publicação (caption do post)..." maxlength="3000"></textarea>
          </div>

          <div class="form-group">
            <label>Link da Peça (opcional)</label>
            <input type="url" id="cPieceLink" placeholder="https://... (Sharepoint, Drive, etc.)" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" type="button" data-close>Cancelar</button>
          <button class="btn-primary" type="button" id="conceptSave">Criar criativo</button>
        </div>
      `;
      this._open(html, (modal) => {
        // Wire-up igual ao openPiece
        const fileInput = modal.querySelector('#cFileInput');
        const dropArea = modal.querySelector('#cDropArea');
        const preview = modal.querySelector('#cPreview');
        const previewImg = modal.querySelector('#cPreviewImg');
        const grpImage = modal.querySelector('#cgrpImage');
        const grpVideo = modal.querySelector('#cgrpVideo');
        let imageData = null;

        modal.querySelectorAll('input[name="cmediaType"]').forEach(r => {
          r.addEventListener('change', () => {
            const v = modal.querySelector('input[name="cmediaType"]:checked').value;
            grpImage.style.display = v === 'image' ? '' : 'none';
            grpVideo.style.display = v === 'video' ? '' : 'none';
          });
        });

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));
        dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          dropArea.classList.remove('drag');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
        });
        modal.querySelector('#cRemovePreview').addEventListener('click', () => {
          imageData = null;
          preview.classList.remove('show');
          fileInput.value = '';
        });

        async function handleFile(file) {
          if (!file.type.startsWith('image/')) { Toast.show('Selecione uma imagem.', 'error'); return; }
          try {
            Toast.show('Comprimindo imagem...', 'default');
            imageData = await compressImage(file);
            previewImg.src = imageData;
            preview.classList.add('show');
          } catch (e) {
            Toast.show('Erro ao processar imagem.', 'error');
          }
        }

        modal.querySelector('#conceptSave').addEventListener('click', async () => {
          const title = modal.querySelector('#conceptTitle').value.trim();
          const description = modal.querySelector('#conceptDesc').value.trim();
          const variantLabel = modal.querySelector('#variantLabel').value.trim() || 'Única';
          const mediaType = modal.querySelector('input[name="cmediaType"]:checked').value;
          const copy = modal.querySelector('#cPieceCopy').value.trim();
          const caption = modal.querySelector('#cPieceCaption').value.trim();
          const linkUrl = modal.querySelector('#cPieceLink').value.trim();
          if (!title) { Toast.show('Informe o título do criativo.', 'error'); return; }

          let mediaUrl = '';
          let videoEmbedUrl = null;
          if (mediaType === 'image') {
            if (!imageData) { Toast.show('Suba uma imagem.', 'error'); return; }
            mediaUrl = imageData;
          } else {
            const u = modal.querySelector('#cVideoUrl').value.trim();
            if (!u) { Toast.show('Informe a URL do vídeo.', 'error'); return; }
            mediaUrl = u;
            videoEmbedUrl = toEmbedUrl(u);
          }

          const btn = modal.querySelector('#conceptSave');
          const orig = btn.textContent;
          btn.disabled = true; btn.textContent = 'Salvando...';
          try {
            const concept = await Store.addConcept(campaignId, { title, description });
            await Store.addVariant(concept.id, {
              name: title,                  // Nome da peça-variação default = título do criativo
              mediaType, mediaUrl, videoEmbedUrl,
              copy, caption, linkUrl,
              variantLabel, variantOrder: 0
            });
            Toast.show('Criativo criado.', 'success');
            this._close();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
            btn.disabled = false; btn.textContent = orig;
          }
        });
      });
    },

    /** Adiciona uma variação a um criativo existente. */
    async openAddVariant(campaignId, conceptId) {
      let concept;
      try {
        concept = await Store.getConcept(conceptId);
        if (!concept) { Toast.show('Criativo não encontrado.', 'error'); return; }
      } catch (err) { safeError(err); return; }

      // Quantas variações já existem? Pra sugerir rótulo "Opção B"/"C"/etc. e definir variant_order
      let existingCount = 0;
      try { existingCount = (await Store.loadVariants(conceptId)).length; } catch (_) {}
      const suggestedLabel = `Opção ${String.fromCharCode(64 + existingCount + 1)}`; // B, C, D...

      const html = `
        <div class="modal-header">
          <div>
            <h2>Adicionar Variação</h2>
            <div class="modal-sub">Nova variação em <strong>${escapeHtml(concept.title)}</strong>.</div>
          </div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Rótulo da variação</label>
            <input type="text" id="vLabel" placeholder="Ex: Vermelha · CTA amarelo" maxlength="80" autofocus value="${escapeHtml(suggestedLabel)}" />
            <div class="hint">Como o cliente vai diferenciar essa variação das outras.</div>
          </div>

          <div class="form-group">
            <label>Tipo de mídia</label>
            <div class="radio-group">
              <div class="radio-pill">
                <input type="radio" id="vmtImage" name="vmediaType" value="image" checked />
                <label for="vmtImage">🖼  Imagem</label>
              </div>
              <div class="radio-pill">
                <input type="radio" id="vmtVideo" name="vmediaType" value="video" />
                <label for="vmtVideo">🎬  Vídeo</label>
              </div>
            </div>
          </div>

          <div class="form-group" id="vgrpImage">
            <label>Arte (imagem)</label>
            <div class="upload-area" id="vDropArea">
              <div class="upload-icon">📁</div>
              <p>Clique ou arraste a imagem aqui</p>
              <span class="small">JPG, PNG ou WEBP — comprimida automaticamente</span>
              <input type="file" id="vFileInput" accept="image/*" hidden />
            </div>
            <div class="upload-preview" id="vPreview">
              <button type="button" class="remove" id="vRemovePreview">×</button>
              <img id="vPreviewImg" alt="" src="" />
            </div>
          </div>

          <div class="form-group" id="vgrpVideo" style="display:none;">
            <label>URL do vídeo</label>
            <input type="url" id="vVideoUrl" placeholder="YouTube, Vimeo, SharePoint, Google Drive ou link direto (.mp4)" />
          </div>

          <div class="form-group">
            <label>Copy (opcional)</label>
            <textarea id="vCopy" placeholder="Cole aqui o texto/copy da peça..." maxlength="3000"></textarea>
          </div>

          <div class="form-group">
            <label>Legenda (opcional)</label>
            <textarea id="vCaption" placeholder="Texto da publicação (caption do post)..." maxlength="3000"></textarea>
          </div>

          <div class="form-group">
            <label>Link da peça (opcional)</label>
            <input type="url" id="vLink" placeholder="https://... (Sharepoint, Drive, etc.)" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" type="button" data-close>Cancelar</button>
          <button class="btn-primary" type="button" id="variantSave">Adicionar variação</button>
        </div>
      `;
      this._open(html, (modal) => {
        const fileInput = modal.querySelector('#vFileInput');
        const dropArea = modal.querySelector('#vDropArea');
        const preview = modal.querySelector('#vPreview');
        const previewImg = modal.querySelector('#vPreviewImg');
        const grpImage = modal.querySelector('#vgrpImage');
        const grpVideo = modal.querySelector('#vgrpVideo');
        let imageData = null;

        modal.querySelectorAll('input[name="vmediaType"]').forEach(r => {
          r.addEventListener('change', () => {
            const v = modal.querySelector('input[name="vmediaType"]:checked').value;
            grpImage.style.display = v === 'image' ? '' : 'none';
            grpVideo.style.display = v === 'video' ? '' : 'none';
          });
        });

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));
        dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          dropArea.classList.remove('drag');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
        });
        modal.querySelector('#vRemovePreview').addEventListener('click', () => {
          imageData = null;
          preview.classList.remove('show');
          fileInput.value = '';
        });

        async function handleFile(file) {
          if (!file.type.startsWith('image/')) { Toast.show('Selecione uma imagem.', 'error'); return; }
          try {
            Toast.show('Comprimindo imagem...', 'default');
            imageData = await compressImage(file);
            previewImg.src = imageData;
            preview.classList.add('show');
          } catch (e) {
            Toast.show('Erro ao processar imagem.', 'error');
          }
        }

        modal.querySelector('#variantSave').addEventListener('click', async () => {
          const variantLabel = modal.querySelector('#vLabel').value.trim();
          const mediaType = modal.querySelector('input[name="vmediaType"]:checked').value;
          const copy = modal.querySelector('#vCopy').value.trim();
          const caption = modal.querySelector('#vCaption').value.trim();
          const linkUrl = modal.querySelector('#vLink').value.trim();
          if (!variantLabel) { Toast.show('Informe o rótulo da variação.', 'error'); return; }

          let mediaUrl = '';
          let videoEmbedUrl = null;
          if (mediaType === 'image') {
            if (!imageData) { Toast.show('Suba uma imagem.', 'error'); return; }
            mediaUrl = imageData;
          } else {
            const u = modal.querySelector('#vVideoUrl').value.trim();
            if (!u) { Toast.show('Informe a URL do vídeo.', 'error'); return; }
            mediaUrl = u;
            videoEmbedUrl = toEmbedUrl(u);
          }

          const btn = modal.querySelector('#variantSave');
          const orig = btn.textContent;
          btn.disabled = true; btn.textContent = 'Salvando...';
          try {
            await Store.addVariant(conceptId, {
              name: concept.title,
              mediaType, mediaUrl, videoEmbedUrl,
              copy, caption, linkUrl,
              variantLabel, variantOrder: existingCount
            });
            Toast.show('Variação adicionada.', 'success');
            this._close();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
            btn.disabled = false; btn.textContent = orig;
          }
        });
      });
    },

    async openPiece(campaignId, editId = null) {
      const isEdit = !!editId;
      let existing = null;
      if (isEdit) {
        try {
          existing = await Store.getPiece(campaignId, editId);
          if (!existing) { Toast.show('Peça não encontrada.', 'error'); return; }
        } catch (err) { safeError(err); return; }
      }

      const curMediaType = isEdit ? existing.media_type : 'image';
      const html = `
        <div class="modal-header">
          <div>
            <h2>${isEdit ? 'Editar Peça' : 'Nova Peça'}</h2>
            <div class="modal-sub">${isEdit ? 'Atualize os dados da peça.' : 'Suba a arte ou link de vídeo, com nome, copy e legenda.'}</div>
          </div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Tipo de mídia</label>
            <div class="radio-group">
              <div class="radio-pill">
                <input type="radio" id="mtImage" name="mediaType" value="image" ${curMediaType === 'image' ? 'checked' : ''} />
                <label for="mtImage">🖼  Imagem</label>
              </div>
              <div class="radio-pill">
                <input type="radio" id="mtVideo" name="mediaType" value="video" ${curMediaType === 'video' ? 'checked' : ''} />
                <label for="mtVideo">🎬  Vídeo</label>
              </div>
            </div>
          </div>

          <div class="form-group" id="grpImage" style="${curMediaType === 'image' ? '' : 'display:none;'}">
            <label>Arte (imagem)${isEdit ? ' — opcional, deixe em branco para manter a atual' : ''}</label>
            <div class="upload-area" id="dropArea">
              <div class="upload-icon">📁</div>
              <p>Clique ou arraste a imagem aqui</p>
              <span class="small">JPG, PNG ou WEBP — comprimida automaticamente</span>
              <input type="file" id="fileInput" accept="image/*" hidden />
            </div>
            <div class="upload-preview ${isEdit && existing.media_type === 'image' ? 'show' : ''}" id="preview">
              <button type="button" class="remove" id="removePreview">×</button>
              <img id="previewImg" alt="" src="${isEdit && existing.media_type === 'image' ? existing.media_url : ''}" />
            </div>
          </div>

          <div class="form-group" id="grpVideo" style="${curMediaType === 'video' ? '' : 'display:none;'}">
            <label>URL do vídeo</label>
            <input type="url" id="videoUrl" placeholder="YouTube, Vimeo, SharePoint, Google Drive ou link direto (.mp4)" value="${isEdit && existing.media_type === 'video' ? escapeHtml(existing.media_url) : ''}" />
            <div class="hint">YouTube/Vimeo serão embedados; .mp4 abre player nativo.</div>
            <div class="warn-box" id="spPersonalWarn" style="display:none;">
              <strong>⚠️ Atenção: SharePoint pessoal não embeda.</strong>
              URLs <code>*-my.sharepoint.com</code> (OneDrive Business) são bloqueadas pela Microsoft em iframes — o vídeo vai mostrar "conexão recusada".
              <br><br>
              <strong>Recomendações:</strong>
              <ul>
                <li>Faça upload em <strong>YouTube</strong> (privado/não listado) ou <strong>Vimeo</strong></li>
                <li>Ou use <strong>SharePoint corporativo</strong> (sem o <code>-my</code> no domínio)</li>
                <li>Ou hospede em <strong>Google Drive</strong> e use o link de compartilhamento</li>
              </ul>
              Se preferir manter o link assim mesmo, o cliente verá só o botão "Abrir em nova aba".
            </div>
          </div>

          <div class="form-group">
            <label>Nome da peça</label>
            <input type="text" id="pieceName" placeholder="Ex: Banner Instagram Stories — variante A" maxlength="120" value="${isEdit ? escapeHtml(existing.name) : ''}" />
          </div>

          <div class="form-group">
            <label>Copy</label>
            <textarea id="pieceCopy" placeholder="Cole aqui o texto/copy da peça..." maxlength="3000">${isEdit ? escapeHtml(existing.copy || '') : ''}</textarea>
            <div class="hint">Headline, sub, CTA — tudo que está dentro da peça.</div>
          </div>

          <div class="form-group">
            <label>Legenda</label>
            <textarea id="pieceCaption" placeholder="Texto que vai acompanhar a publicação (descrição do post, caption do Instagram, etc.)..." maxlength="3000">${isEdit ? escapeHtml(existing.caption || '') : ''}</textarea>
            <div class="hint">Texto da publicação fora da peça (caption do post).</div>
          </div>

          <div class="form-group">
            <label>Link da Peça</label>
            <input type="url" id="pieceLink" placeholder="https://... (Sharepoint, Drive, etc.)" value="${isEdit ? escapeHtml(existing.link_url || '') : ''}" />
            <div class="hint">Link pro arquivo original (Sharepoint, Google Drive, Dropbox).</div>
          </div>
        </div>
        <div class="modal-footer">
          ${isEdit ? `
            <div class="version-warning">
              <span class="version-warning-icon">ⓘ</span>
              <span>Salvar criará a <strong>v${(existing.version || 1) + 1}</strong> e reseta o status para <strong>Pendente</strong>.</span>
            </div>
          ` : ''}
          <button class="btn-secondary" type="button" data-close>Cancelar</button>
          <button class="btn-primary" type="button" id="pieceSave">${isEdit ? 'Salvar alterações' : 'Adicionar peça'}</button>
        </div>
      `;
      this._open(html, (modal) => {
        const fileInput = modal.querySelector('#fileInput');
        const dropArea = modal.querySelector('#dropArea');
        const preview = modal.querySelector('#preview');
        const previewImg = modal.querySelector('#previewImg');
        const grpImage = modal.querySelector('#grpImage');
        const grpVideo = modal.querySelector('#grpVideo');
        let imageData = null; // só atribuído se user trocar a imagem
        let imageRemoved = false; // edit: marcou pra remover

        modal.querySelectorAll('input[name="mediaType"]').forEach(r => {
          r.addEventListener('change', () => {
            const v = modal.querySelector('input[name="mediaType"]:checked').value;
            grpImage.style.display = v === 'image' ? '' : 'none';
            grpVideo.style.display = v === 'video' ? '' : 'none';
          });
        });

        // Mostra warning quando admin cola URL SharePoint pessoal
        const videoUrlInput = modal.querySelector('#videoUrl');
        const spWarn = modal.querySelector('#spPersonalWarn');
        const updateSpWarn = () => {
          if (!videoUrlInput || !spWarn) return;
          spWarn.style.display = isSharePointPersonal(videoUrlInput.value) ? '' : 'none';
        };
        if (videoUrlInput) {
          videoUrlInput.addEventListener('input', updateSpWarn);
          videoUrlInput.addEventListener('paste', () => setTimeout(updateSpWarn, 0));
          updateSpWarn(); // Estado inicial (edição)
        }

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));
        dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          dropArea.classList.remove('drag');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
        });
        modal.querySelector('#removePreview').addEventListener('click', () => {
          imageData = null;
          imageRemoved = true;
          preview.classList.remove('show');
          fileInput.value = '';
        });

        async function handleFile(file) {
          if (!file.type.startsWith('image/')) {
            Toast.show('Selecione uma imagem.', 'error');
            return;
          }
          try {
            Toast.show('Comprimindo imagem...', 'default');
            imageData = await compressImage(file);
            imageRemoved = false;
            previewImg.src = imageData;
            preview.classList.add('show');
          } catch (e) {
            Toast.show('Erro ao processar imagem.', 'error');
          }
        }

        modal.querySelector('#pieceSave').addEventListener('click', async () => {
          const mediaType = modal.querySelector('input[name="mediaType"]:checked').value;
          const name = modal.querySelector('#pieceName').value.trim();
          const copy = modal.querySelector('#pieceCopy').value.trim();
          const caption = modal.querySelector('#pieceCaption').value.trim();
          const linkUrl = modal.querySelector('#pieceLink').value.trim();
          if (!name) { Toast.show('Informe o nome da peça.', 'error'); return; }

          let mediaUrl = '';
          let videoEmbedUrl = null;

          if (mediaType === 'image') {
            if (imageData) {
              mediaUrl = imageData;
            } else if (isEdit && existing.media_type === 'image' && !imageRemoved) {
              mediaUrl = existing.media_url; // mantém a atual
            } else {
              Toast.show('Suba uma imagem.', 'error'); return;
            }
          } else {
            const u = modal.querySelector('#videoUrl').value.trim();
            if (!u) { Toast.show('Informe a URL do vídeo.', 'error'); return; }
            mediaUrl = u;
            videoEmbedUrl = toEmbedUrl(u);
          }

          const btn = modal.querySelector('#pieceSave');
          const originalLabel = btn.textContent;
          btn.disabled = true; btn.textContent = 'Salvando...';
          try {
            if (isEdit) {
              await Store.updatePiece(campaignId, editId, {
                name, copy, caption, linkUrl, mediaType, mediaUrl, videoEmbedUrl
              });
              Toast.show('Peça atualizada.', 'success');
            } else {
              await Store.addPiece(campaignId, { name, mediaType, mediaUrl, videoEmbedUrl, copy, caption, linkUrl });
              Toast.show('Peça adicionada.', 'success');
            }
            this._close();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
            btn.disabled = false; btn.textContent = originalLabel;
          }
        });
      });
    },

    async openPieceDetail(campaignId, pieceId) {
      // Loading inicial
      this._open(`
        <div class="modal-header">
          <div><h2>Carregando...</h2></div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">${loadingHtml('Carregando peça...')}</div>
      `, null, 'modal-lg');

      let campaign, piece, comments;
      try {
        [campaign, piece, comments] = await Promise.all([
          Store.getCampaign(campaignId),
          Store.getPiece(campaignId, pieceId),
          Store.loadComments(pieceId)
        ]);
      } catch (err) {
        safeError(err);
        this._close();
        return;
      }

      if (!piece || !campaign) {
        Toast.show('Peça não encontrada.', 'error');
        this._close();
        return;
      }

      // Estado compartilhado entre renderInner e wireUp (escopo de openPieceDetail)
      let currentPiece = piece;

      const renderInner = async () => {
        // refresh do estado da peça (caso aprovação tenha alterado)
        const pp = await Store.getPiece(campaignId, pieceId);
        currentPiece = pp;  // expõe pra wireUp
        const cms = await Store.loadComments(pieceId, true);
        const statusLabel = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Reprovada' }[pp.status];

        // ============ Lógica de pins ============
        const FIVE_MIN_MS = 5 * 60 * 1000;
        const currentVersion = pp.version || 1;
        const currentUser = (window.WhirlpoolAuth.getUserName() || '').trim();
        const isClient = !window.WhirlpoolAuth.isAdmin();

        // Pins visíveis: comments com pin da versão ATUAL (ordenados por criação)
        const visiblePins = cms
          .filter(c => c.pin_x != null && c.pin_y != null && c.pin_version === currentVersion)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const pinNumberById = new Map(visiblePins.map((c, i) => [c.id, i + 1]));

        const canEditPin = (c) => {
          if (!isClient) return false;
          if ((c.author || '').trim() !== currentUser) return false;
          const ageMs = Date.now() - new Date(c.created_at).getTime();
          return ageMs < FIVE_MIN_MS;
        };
        const canDeleteComment = (c) => {
          if (c.kind !== 'comment') return false;
          if (!isClient) return false;
          if ((c.author || '').trim() !== currentUser) return false;
          const ageMs = Date.now() - new Date(c.created_at).getTime();
          return ageMs < FIVE_MIN_MS;
        };

        const pinsOverlayHtml = visiblePins.map((c, i) => {
          const editable = canEditPin(c);
          const tooltip = `${(c.text || '').substring(0, 80)} — ${c.author || ''}`;
          return `
            <button type="button" class="pin${editable ? ' pin-editable' : ''}"
                    data-comment-id="${c.id}"
                    data-num="${i + 1}"
                    style="left: ${c.pin_x}%; top: ${c.pin_y}%;"
                    title="${escapeHtml(tooltip)}">
              <span class="pin-num">${i + 1}</span>
            </button>
          `;
        }).join('');

        let mediaHtml = '';
        if (pp.media_type === 'image') {
          mediaHtml = `
            <div class="piece-image-wrap" data-pin-mode="off">
              <img src="${pp.media_url}" alt="${escapeHtml(pp.name)}" class="piece-image">
              <div class="pin-overlay">${pinsOverlayHtml}</div>
              <div class="pin-banner">
                <span class="pin-banner-text">📍 Clique na imagem para marcar o ponto deste comentário</span>
                <button type="button" class="pin-btn pin-btn-skip">Pular marcação</button>
                <button type="button" class="pin-btn pin-btn-cancel">Cancelar</button>
              </div>
            </div>
          `;
        } else if (pp.media_type === 'video') {
          // Estratégia:
          //  1) Se temos URL transformada (YouTube/Vimeo/SharePoint/Drive) → iframe com ela
          //  2) Se a URL original aparenta ser arquivo de vídeo direto (.mp4 etc) → <video> nativo
          //  3) Caso contrário (link de página que não conhecemos) → iframe com a URL original
          const embedUrl = pp.video_embed_url || (pp.media_url && !isDirectVideoFile(pp.media_url) ? pp.media_url : null);
          const originalUrl = pp.media_url || pp.video_embed_url || '';
          const isPersonalSP = isSharePointPersonal(originalUrl);

          // Notice específico pra SharePoint pessoal (que NÃO embeda nunca)
          const personalSPNotice = isPersonalSP ? `
            <div class="video-sp-notice">
              <strong>⚠️ SharePoint pessoal não permite embed.</strong>
              Esse vídeo está hospedado em OneDrive Business, que bloqueia visualização embutida por padrão de segurança da Microsoft.
              Clique em <strong>"Abrir em nova aba"</strong> abaixo pra ver o vídeo.
            </div>` : '';

          // Link de fallback (sempre visível abaixo do iframe)
          const fallbackLink = originalUrl ? `
            <a class="video-fallback-link" href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener">
              <span>Vídeo não carregou?</span> <strong>Abrir em nova aba ↗</strong>
            </a>` : '';

          if (embedUrl && !isPersonalSP) {
            mediaHtml = `
              <div class="video-frame-wrap">
                <iframe src="${escapeHtml(embedUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"></iframe>
              </div>
              ${fallbackLink}`;
          } else if (pp.media_url && isDirectVideoFile(pp.media_url)) {
            mediaHtml = `
              <video src="${escapeHtml(pp.media_url)}" controls></video>
              ${fallbackLink}`;
          } else if (isPersonalSP) {
            mediaHtml = `
              <div class="video-frame-wrap video-frame-placeholder">
                <div class="video-sp-icon">🔒</div>
                ${personalSPNotice}
              </div>
              ${fallbackLink}`;
          } else {
            mediaHtml = `
              <div class="video-frame-wrap video-frame-placeholder">
                <div style="font-size:32px; margin-bottom:8px;">🎬</div>
                <p style="font-size:14px; opacity:0.9;">Vídeo sem URL configurada</p>
              </div>`;
          }
        }

        return `
          <div class="modal-header">
            <div>
              <h2>${escapeHtml(pp.name)} <span class="version-tag">v${pp.version || 1}</span></h2>
              <div class="modal-sub">${escapeHtml(campaign.name)} • ${escapeHtml(campaign.type)} • Criada ${relativeTime(pp.created_at)}</div>
            </div>
            <button class="modal-close" type="button" data-close>×</button>
          </div>
          <div class="piece-detail" data-status="${pp.status}">
            <div class="piece-left">
              <div class="piece-media">${mediaHtml}</div>
              ${pp.link_url ? `
                <a class="piece-link-block" href="${escapeHtml(pp.link_url)}" target="_blank" rel="noopener noreferrer">
                  <span class="piece-link-icon">🔗</span>
                  <span class="piece-link-text">
                    <span class="piece-link-label">Arquivo original</span>
                    <span class="piece-link-host">${escapeHtml((function(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'abrir link'}})(pp.link_url))}</span>
                  </span>
                  <span class="piece-link-arrow">↗</span>
                </a>
              ` : ''}
            </div>
            <div class="piece-side">
              ${pp.copy ? `
                <div class="copy-block">
                  <div class="label">Copy</div>
                  <p>${escapeHtml(pp.copy)}</p>
                </div>
              ` : ''}
              ${pp.caption ? `
                <div class="copy-block caption-block">
                  <div class="label">Legenda</div>
                  <p>${escapeHtml(pp.caption)}</p>
                </div>
              ` : ''}

              <div class="action-row">
                <button class="btn-approve ${pp.status === 'approved' ? 'active' : ''}" id="btnApprove" type="button">
                  ✓ ${pp.status === 'approved' ? 'Aprovada' : 'Aprovar'}
                </button>
                <button class="btn-reject ${pp.status === 'rejected' ? 'active' : ''}" id="btnReject" type="button">
                  ✗ ${pp.status === 'rejected' ? 'Reprovada' : 'Reprovar'}
                </button>
              </div>

              <div class="section-title">Histórico (${cms.length})</div>
              <div class="comments-list" id="commentsList">
                ${cms.length === 0 ? `
                  <div style="font-size:12px; color:var(--muted); text-align:center; padding:14px;">
                    Sem comentários ainda.
                  </div>
                ` : cms.map(cm => {
                  const hasPin = cm.pin_x != null && cm.pin_y != null;
                  const pinIsCurrent = hasPin && cm.pin_version === currentVersion;
                  const pinNumber = pinIsCurrent ? pinNumberById.get(cm.id) : null;
                  const pinBadge = hasPin
                    ? (pinIsCurrent
                        ? `<span class="comment-pin-badge" title="Marcado no ponto ${pinNumber}">📍 ${pinNumber}</span>`
                        : `<span class="comment-pin-badge old" title="Pin de versão anterior">📍 v${cm.pin_version}</span>`)
                    : '';
                  const canDel = canDeleteComment(cm);
                  const isAction = cm.kind && cm.kind.startsWith('action');
                  const kindClass = cm.kind === 'action' ? 'action action-approved'
                    : cm.kind === 'action-rejected' ? 'action action-rejected'
                    : cm.kind === 'action-update' ? 'action action-update'
                    : cm.kind === 'action-created' ? 'action action-created'
                    : '';
                  // Avatar com a inicial do autor (semântica da ação fica na cor/tooltip).
                  const actionTitle = cm.kind === 'action' ? 'Aprovou'
                    : cm.kind === 'action-rejected' ? 'Reprovou'
                    : cm.kind === 'action-update' ? 'Editou'
                    : cm.kind === 'action-created' ? 'Criou'
                    : 'Comentou';
                  const avatarIcon = `<span class="comment-action-icon" title="${escapeHtml(cm.author)} — ${actionTitle}">${escapeHtml(initials(cm.author))}</span>`;
                  // Markdown só em comentários normais; ações têm texto fixo
                  const textHtml = isAction ? escapeHtml(cm.text) : renderCommentText(cm.text);
                  return `
                    <div class="comment ${kindClass}"
                         data-comment-id="${cm.id}"
                         data-pin-id="${pinIsCurrent ? cm.id : ''}">
                      <div class="comment-head">
                        ${avatarIcon}
                        ${pinBadge}
                        <span class="comment-author">${escapeHtml(cm.author)}</span>
                        <span class="comment-date">${formatDate(cm.created_at)}</span>
                        ${canDel ? `<button type="button" class="comment-delete" data-id="${cm.id}" title="Excluir comentário">×</button>` : ''}
                      </div>
                      <p class="comment-text">${textHtml}</p>
                    </div>
                  `;
                }).join('')}
              </div>

              <form class="comment-form" id="commentForm">
                <input type="text" id="commentInput" placeholder="Escreva um comentário..." maxlength="500" autocomplete="off" />
                ${(isClient && pp.media_type === 'image') ? `
                  <button type="button" id="btnPinComment" class="btn-pin-comment" title="Enviar marcando um ponto na imagem">📍</button>
                ` : ''}
                <button type="submit">Enviar</button>
              </form>
              <div class="comment-hint">
                Formatação:
                <code>**negrito**</code>
                <code>_itálico_</code>
                <code>[link](url)</code>
              </div>

              ${(window.WhirlpoolAuth.isAdmin() || (pp.version || 1) > 1) ? `
                <div class="piece-side-footer">
                  ${(pp.version || 1) > 1 ? `
                    <button class="btn-ghost btn-history" id="btnHistory" type="button" title="Ver versões anteriores">
                      <span class="history-icon">⟳</span> Histórico
                    </button>
                  ` : ''}
                  ${window.WhirlpoolAuth.isAdmin() ? `
                    <button class="btn-ghost" id="btnEditPiece" type="button">✎ Editar peça</button>
                    <button class="btn-ghost btn-ghost-danger" id="btnDeletePiece" type="button">Excluir</button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      };

      const wireUp = (modal) => {
        const author = window.WhirlpoolAuth.getUserName() || 'Anônimo';
        const btnApprove = modal.querySelector('#btnApprove');
        const btnReject = modal.querySelector('#btnReject');

        btnApprove.addEventListener('click', async () => {
          const cur = await Store.getPiece(campaignId, pieceId);
          if (cur.status === 'approved') { Toast.show('Já está aprovada.'); return; }
          btnApprove.disabled = true; btnReject.disabled = true;
          try {
            await Store.updatePieceStatus(campaignId, pieceId, 'approved', author);
            Toast.show('Peça aprovada.', 'success');
            await rerender();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
            btnApprove.disabled = false; btnReject.disabled = false;
          }
        });

        btnReject.addEventListener('click', async () => {
          const cur = await Store.getPiece(campaignId, pieceId);
          if (cur.status === 'rejected') { Toast.show('Já está reprovada.'); return; }
          btnApprove.disabled = true; btnReject.disabled = true;
          try {
            await Store.updatePieceStatus(campaignId, pieceId, 'rejected', author);
            Toast.show('Peça reprovada.', 'success');
            await rerender();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
            btnApprove.disabled = false; btnReject.disabled = false;
          }
        });

        // ============ Lógica de Pin / criação de comentário ============
        let pinModeText = null;

        const wrapEl = modal.querySelector('.piece-image-wrap');
        const imgEl = modal.querySelector('.piece-image');
        const submitBtn = modal.querySelector('#commentForm button[type="submit"]');
        const inputEl = modal.querySelector('#commentInput');

        const enterPinMode = (text) => {
          if (!wrapEl) return false;
          pinModeText = text;
          wrapEl.dataset.pinMode = 'on';
          if (submitBtn) submitBtn.disabled = true;
          return true;
        };
        const exitPinMode = () => {
          if (wrapEl) wrapEl.dataset.pinMode = 'off';
          pinModeText = null;
          if (submitBtn) submitBtn.disabled = false;
        };
        const savePinAndComment = async (text, x, y) => {
          if (submitBtn) submitBtn.disabled = true;
          try {
            const opts = (x != null && y != null)
              ? { pinX: x, pinY: y, pinVersion: (currentPiece && currentPiece.version) || 1 }
              : {};
            await Store.addComment(pieceId, author, text, opts);
            if (inputEl) inputEl.value = '';
            await rerender();
            const list = document.getElementById('commentsList');
            if (list) list.scrollTop = list.scrollHeight;
          } catch (err) {
            safeError(err);
          } finally {
            exitPinMode();
          }
        };

        // SUBMIT padrão: envia direto sem pin (volta ao comportamento clássico)
        modal.querySelector('#commentForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const text = inputEl.value.trim();
          if (!text) return;
          await savePinAndComment(text, null, null);
        });

        // Botão 📍 (cliente em image): ativa pin mode com texto pré-validado
        const btnPinComment = modal.querySelector('#btnPinComment');
        if (btnPinComment) {
          btnPinComment.addEventListener('click', (e) => {
            e.preventDefault();
            const text = inputEl.value.trim();
            if (!text) {
              Toast.show('Escreva o comentário primeiro, depois marque o ponto.', 'error');
              inputEl.focus();
              return;
            }
            enterPinMode(text);
          });
        }

        // Click na imagem em modo de pin → captura coords e salva
        if (imgEl) {
          imgEl.addEventListener('click', async (e) => {
            if (!wrapEl || wrapEl.dataset.pinMode !== 'on') return;
            const rect = imgEl.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            await savePinAndComment(pinModeText, x, y);
          });
        }

        // Botões de "Pular" e "Cancelar" no banner de modo
        const skipBtn = modal.querySelector('.pin-btn-skip');
        if (skipBtn) {
          skipBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await savePinAndComment(pinModeText, null, null);
          });
        }
        const cancelBtn = modal.querySelector('.pin-btn-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exitPinMode();
          });
        }

        // ESC sai do modo
        const escHandler = (e) => {
          if (e.key === 'Escape' && wrapEl && wrapEl.dataset.pinMode === 'on') {
            exitPinMode();
          }
        };
        document.addEventListener('keydown', escHandler);
        // Garante remoção quando modal fecha (será limpo no _close)
        if (this._extraCleanup) this._extraCleanup.push(() => document.removeEventListener('keydown', escHandler));

        // Click no pin → scroll pro comment
        modal.querySelectorAll('.pin').forEach(pin => {
          pin.addEventListener('click', (e) => {
            // Se em modo de criação, ignora
            if (wrapEl && wrapEl.dataset.pinMode === 'on') return;
            e.stopPropagation();
            const id = pin.dataset.commentId;
            const cm = modal.querySelector(`.comment[data-comment-id="${id}"]`);
            if (cm) {
              cm.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cm.classList.add('comment-flash');
              setTimeout(() => cm.classList.remove('comment-flash'), 1400);
            }
          });
        });

        // Hover comment com pin → destaca pin
        modal.querySelectorAll('.comment[data-pin-id]').forEach(c => {
          const id = c.dataset.pinId;
          if (!id) return;
          const findPin = () => modal.querySelector(`.pin[data-comment-id="${id}"]`);
          c.addEventListener('mouseenter', () => { const p = findPin(); if (p) p.classList.add('is-active'); });
          c.addEventListener('mouseleave', () => { const p = findPin(); if (p) p.classList.remove('is-active'); });
        });

        // Excluir comment próprio (< 5min)
        modal.querySelectorAll('.comment-delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (!confirm('Excluir este comentário?')) return;
            try {
              await Store.deleteComment(pieceId, id);
              Toast.show('Comentário excluído.', 'success');
              await rerender();
            } catch (err) {
              safeError(err);
            }
          });
        });

        // Drag-and-drop pra mover pin (só pins editáveis)
        let dragging = null;
        modal.querySelectorAll('.pin.pin-editable').forEach(pin => {
          pin.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragging = { pin, moved: false };
            pin.classList.add('is-dragging');
          });
        });
        const onMove = (e) => {
          if (!dragging || !imgEl) return;
          dragging.moved = true;
          const rect = imgEl.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          dragging.pin.style.left = x + '%';
          dragging.pin.style.top = y + '%';
        };
        const onUp = async (e) => {
          if (!dragging) return;
          const wasMoved = dragging.moved;
          const pin = dragging.pin;
          pin.classList.remove('is-dragging');
          const id = pin.dataset.commentId;
          dragging = null;
          if (!wasMoved || !imgEl) return;
          const rect = imgEl.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          try {
            await Store.updateCommentPin(pieceId, id, x, y);
          } catch (err) {
            safeError(err);
            await rerender();
          }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        if (this._extraCleanup) {
          this._extraCleanup.push(() => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          });
        }

        const btnEditPiece = modal.querySelector('#btnEditPiece');
        if (btnEditPiece) btnEditPiece.addEventListener('click', () => {
          this._close();
          Modals.openPiece(campaignId, pieceId);
        });

        const btnHistory = modal.querySelector('#btnHistory');
        if (btnHistory) btnHistory.addEventListener('click', () => {
          Modals.openVersionsHistory(campaignId, pieceId);
        });

        const btnDeletePiece = modal.querySelector('#btnDeletePiece');
        if (btnDeletePiece) btnDeletePiece.addEventListener('click', async () => {
          if (!confirm('Excluir esta peça? Não pode ser desfeito.')) return;
          try {
            await Store.deletePiece(campaignId, pieceId);
            Toast.show('Peça excluída.', 'success');
            this._close();
            App.renderCampaignView(campaignId);
          } catch (err) {
            safeError(err);
          }
        });
      };

      const rerender = async () => {
        const modal = document.getElementById('appModal');
        if (!modal) return;
        modal.innerHTML = await renderInner();
        modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this._close()));
        wireUp(modal);
      };

      // Render inicial
      const modal = document.getElementById('appModal');
      modal.innerHTML = await renderInner();
      modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this._close()));
      wireUp(modal);
    },

    // ----- Internos -----
    _backdrop: null,
    _modal: null,
    _escHandler: null,

    /** Modal: Histórico de versões da peça (read-only). */
    async openVersionsHistory(campaignId, pieceId) {
      // Loading inicial
      this._open(`
        <div class="modal-header">
          <div><h2>Histórico de Versões</h2></div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body">${loadingHtml('Carregando versões...')}</div>
      `, null, 'modal-lg');

      let current, versions;
      try {
        [current, versions] = await Promise.all([
          Store.getPiece(campaignId, pieceId),
          Store.loadPieceVersions(pieceId, true)
        ]);
      } catch (err) {
        safeError(err);
        this._close();
        return;
      }

      if (!current) {
        Toast.show('Peça não encontrada.', 'error');
        this._close();
        return;
      }

      const statusLabel = (s) => ({ pending: 'Pendente', approved: 'Aprovada', rejected: 'Reprovada' }[s] || s);

      const versionCardHtml = (v, isCurrent) => {
        let mediaThumb = '';
        if (v.media_type === 'image') {
          mediaThumb = `<img src="${v.media_url}" alt="${escapeHtml(v.name)}" loading="lazy">`;
        } else if (v.media_type === 'video') {
          mediaThumb = `<div class="video-placeholder"><span>▶ Vídeo</span></div>`;
        }
        return `
          <article class="version-card${isCurrent ? ' is-current' : ''}">
            <div class="version-thumb">${mediaThumb}</div>
            <div class="version-info">
              <div class="version-head">
                <span class="version-tag big">v${v.version}${isCurrent ? ' • atual' : ''}</span>
                <span class="version-status status-${v.status}">
                  <span class="dot"></span>${statusLabel(v.status)}
                </span>
              </div>
              <div class="version-meta">
                ${isCurrent
                  ? `Criada ${formatDate(v.created_at)}`
                  : `Snapshot ${formatDate(v.snapshot_at)} ${v.snapshot_by ? '· por <strong>' + escapeHtml(v.snapshot_by) + '</strong>' : ''}`}
              </div>
              ${v.copy ? `<div class="version-block"><span class="vlabel">Copy</span><p>${escapeHtml(v.copy)}</p></div>` : ''}
              ${v.caption ? `<div class="version-block"><span class="vlabel">Legenda</span><p>${escapeHtml(v.caption)}</p></div>` : ''}
              ${v.link_url ? `<div class="version-block"><span class="vlabel">Link da peça</span><p><a href="${escapeHtml(v.link_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(v.link_url)}</a></p></div>` : ''}
            </div>
          </article>
        `;
      };

      const allVersions = [
        // versão atual primeiro (não está em piece_versions)
        { ...current, snapshot_at: null, snapshot_by: null, _isCurrent: true },
        ...versions
      ];

      // Modo de visualização (Lista ou Comparar)
      let mode = 'list';
      // Default: A = mais antiga, B = atual
      let compareAIdx = allVersions.length - 1;
      let compareBIdx = 0;

      const renderBody = () => {
        const m = document.getElementById('appModal');
        if (!m) return;
        const body = m.querySelector('.versions-body');
        if (!body) return;

        // Toggle Lista/Comparar (só faz sentido com 2+ versões)
        const canCompare = allVersions.length >= 2;
        const toggleHtml = canCompare ? `
          <div class="versions-mode-toggle">
            <button type="button" class="${mode === 'list' ? 'active' : ''}" data-mode="list">📋 Lista</button>
            <button type="button" class="${mode === 'compare' ? 'active' : ''}" data-mode="compare">⇆ Comparar</button>
          </div>
        ` : '';

        if (allVersions.length === 1) {
          body.innerHTML = `
            <div class="empty-state">
              <div class="icon">📜</div>
              <h3>Nenhuma versão anterior</h3>
              <p>Quando esta peça for editada, as versões anteriores aparecerão aqui.</p>
            </div>
          `;
          return;
        }

        if (mode === 'list') {
          body.innerHTML = `
            ${toggleHtml}
            <div class="versions-list">
              ${allVersions.map(v => versionCardHtml(v, !!v._isCurrent)).join('')}
            </div>
          `;
        } else {
          // Modo compare
          const vA = allVersions[compareAIdx];
          const vB = allVersions[compareBIdx];
          const diffs = diffVersions(vA, vB);
          const diffCount = Object.values(diffs).filter(Boolean).length;

          const optionLabel = (v) => `v${v.version}${v._isCurrent ? ' (atual)' : ''}`;
          const selectOptions = (selected) => allVersions
            .map((v, i) => `<option value="${i}" ${i === selected ? 'selected' : ''}>${optionLabel(v)}</option>`)
            .join('');

          body.innerHTML = `
            ${toggleHtml}
            <div class="compare-toolbar">
              <label>Versão A
                <select id="cmpA">${selectOptions(compareAIdx)}</select>
              </label>
              <span class="swap-icon">⇆</span>
              <label>Versão B
                <select id="cmpB">${selectOptions(compareBIdx)}</select>
              </label>
              <span class="diff-badge ${diffCount === 0 ? 'zero' : ''}">
                ${diffCount === 0 ? 'Sem diferenças' : `${diffCount} ${diffCount === 1 ? 'diferença' : 'diferenças'}`}
              </span>
            </div>
            <div class="compare-view">
              ${compareSideHtml(vA, diffs)}
              ${compareSideHtml(vB, diffs)}
            </div>
          `;

          body.querySelector('#cmpA').addEventListener('change', (e) => {
            compareAIdx = parseInt(e.target.value, 10);
            renderBody();
          });
          body.querySelector('#cmpB').addEventListener('change', (e) => {
            compareBIdx = parseInt(e.target.value, 10);
            renderBody();
          });
        }

        body.querySelectorAll('[data-mode]').forEach(btn => {
          btn.addEventListener('click', () => {
            mode = btn.dataset.mode;
            renderBody();
          });
        });
      };

      const inner = `
        <div class="modal-header">
          <div>
            <h2>Histórico — ${escapeHtml(current.name)}</h2>
            <div class="modal-sub">${allVersions.length} ${allVersions.length === 1 ? 'versão' : 'versões'} no total · versão atual <strong>v${current.version || 1}</strong></div>
          </div>
          <button class="modal-close" type="button" data-close>×</button>
        </div>
        <div class="modal-body versions-body"></div>
        <div class="modal-footer">
          <button class="btn-secondary" type="button" data-close>Fechar</button>
        </div>
      `;

      const m = document.getElementById('appModal');
      m.innerHTML = inner;
      m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this._close()));
      renderBody();
    },

    _open(innerHtml, onReady, sizeClass = '') {
      this._close(true);

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.id = 'appBackdrop';

      const modal = document.createElement('div');
      modal.className = 'modal' + (sizeClass ? ' ' + sizeClass : '');
      modal.id = 'appModal';
      modal.innerHTML = innerHtml;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => backdrop.classList.add('show'));

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this._close();
      });
      modal.querySelectorAll('[data-close]').forEach(b => {
        b.addEventListener('click', () => this._close());
      });

      this._escHandler = (e) => { if (e.key === 'Escape') this._close(); };
      document.addEventListener('keydown', this._escHandler);

      this._backdrop = backdrop;
      this._modal = modal;
      this._extraCleanup = [];

      if (onReady) onReady(modal);
    },

    _close(silent = false) {
      const bd = document.getElementById('appBackdrop');
      if (bd) bd.remove();
      document.body.style.overflow = '';
      if (this._escHandler) {
        document.removeEventListener('keydown', this._escHandler);
        this._escHandler = null;
      }
      if (Array.isArray(this._extraCleanup)) {
        this._extraCleanup.forEach(fn => { try { fn(); } catch(_){} });
      }
      this._extraCleanup = [];
      this._backdrop = null;
      this._modal = null;
    }
  };

  // ============ BOOT ============
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
