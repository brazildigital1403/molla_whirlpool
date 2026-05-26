/* ============================================================
   Whirlpool Brasil — Header Global (injeção via JS)
   ------------------------------------------------------------
   Detecta a rota atual e marca o link ativo automaticamente.
   Em mobile, transforma a navegação em hamburguer + drawer
   lateral esquerdo.

   Suporta navegação hierárquica:
     • Itens 'link' apontam direto pra uma rota
     • Itens 'group' têm children e abrem como dropdown (desktop)
       ou accordion colapsado (mobile drawer)
     • Itens 'disabled' têm badge "Em breve" e não clicam
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // ESTRUTURA HIERÁRQUICA DOS ITENS DE NAVEGAÇÃO
  // ============================================================
  //   type: 'link'   → vai pra href direto
  //   type: 'group'  → dropdown desktop / accordion mobile
  //                    com children: [{ href, id, label, disabled?, badge? }]
  const NAV_ITEMS = [
    {
      type: 'link',
      href: '/social',
      id: 'social',
      label: 'Social'
    },
    {
      type: 'link',
      href: '/aprovacao',
      id: 'aprovacao',
      label: 'Aprovação'
    },
    {
      type: 'link',
      href: '/arquivos',
      id: 'arquivos',
      label: 'Arquivos'
    }
  ];

  // ============================================================
  // ROUTE → ACTIVE ID MAP (derivado automaticamente do NAV_ITEMS)
  // ============================================================
  function buildRouteMap() {
    const map = {
      '/': 'home',
      '/index.html': 'home',
      '/ajuda': 'ajuda',
      '/ajuda.html': 'ajuda'
    };
    NAV_ITEMS.forEach(item => {
      if (item.type === 'link') {
        map[item.href] = item.id;
        map[item.href + '.html'] = item.id;
      } else if (item.type === 'group' && Array.isArray(item.children)) {
        item.children.forEach(child => {
          if (child.disabled) return;
          map[child.href] = child.id;
          map[child.href + '.html'] = child.id;
        });
      }
    });
    return map;
  }
  const ROUTE_MAP = buildRouteMap();

  // ============================================================
  // ACTIVE-STATE HELPERS
  // ============================================================
  function activeRouteFromPath() {
    const p = window.location.pathname.replace(/\/$/, '') || '/';
    return ROUTE_MAP[p] || 'home';
  }

  // Dado o id ativo (filho), retorna o id do grupo pai se houver — ou null
  function findParentGroupId(activeId) {
    for (const item of NAV_ITEMS) {
      if (item.type !== 'group') continue;
      if (!Array.isArray(item.children)) continue;
      if (item.children.some(c => c.id === activeId)) return item.id;
    }
    return null;
  }

  function escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ============================================================
  // HEADER DESKTOP (com dropdowns)
  // ============================================================
  function buildHeaderHtml(activeId) {
    const activeParentId = findParentGroupId(activeId);
    const isActive = (id) => id === activeId ? 'active' : '';
    const isAdmin = !!(window.WhirlpoolAuth && window.WhirlpoolAuth.isAdmin && window.WhirlpoolAuth.isAdmin());
    const userName = (window.WhirlpoolAuth && window.WhirlpoolAuth.getUserName) ? (window.WhirlpoolAuth.getUserName() || '') : '';
    const initials = userName ? userName.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() : '';
    const userChip = userName
      ? `<span class="whp-user-chip" title="${escapeAttr(userName)}"><span class="whp-user-avatar">${escapeAttr(initials)}</span><span class="whp-user-name">${escapeAttr(userName)}</span></span>`
      : '';
    const roleChip = isAdmin
      ? '<span class="whp-role-chip whp-role-admin" title="Perfil Molla — administra campanhas e peças">Admin</span>'
      : '';

    const navItemsHtml = NAV_ITEMS.map(item => {
      if (item.type === 'link') {
        return `<a href="${escapeAttr(item.href)}" class="whp-nav-link ${isActive(item.id)}" data-nav-id="${escapeAttr(item.id)}">${escapeAttr(item.label)}</a>`;
      }
      if (item.type === 'group') {
        const parentActive = activeParentId === item.id ? 'active' : '';
        const childrenHtml = (item.children || []).map(child => {
          if (child.disabled) {
            const badge = child.badge ? `<span class="whp-dropdown-badge">${escapeAttr(child.badge)}</span>` : '';
            return `<span class="whp-dropdown-item is-disabled" aria-disabled="true" title="Em breve">${escapeAttr(child.label)}${badge}</span>`;
          }
          return `<a href="${escapeAttr(child.href)}" class="whp-dropdown-item ${isActive(child.id)}" data-nav-id="${escapeAttr(child.id)}">${escapeAttr(child.label)}</a>`;
        }).join('');
        return `
          <div class="whp-nav-group" data-group-id="${escapeAttr(item.id)}">
            <button type="button"
                    class="whp-nav-link whp-nav-trigger ${parentActive}"
                    aria-haspopup="true"
                    aria-expanded="false"
                    data-group-id="${escapeAttr(item.id)}">
              ${escapeAttr(item.label)}
              <span class="whp-nav-caret" aria-hidden="true">▾</span>
            </button>
            <div class="whp-dropdown" role="menu" aria-label="${escapeAttr(item.label)}">
              ${childrenHtml}
            </div>
          </div>
        `;
      }
      return '';
    }).join('\n          ');

    return `
      <div class="whp-inner">
        <button class="whp-hamburger" id="whpHamburgerBtn" type="button" aria-label="Abrir menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <a class="whp-logo" href="/" aria-label="Central do Cliente">
          <img src="/img/logo_pecas_originais.png" alt="Peças Originais" />
        </a>
        <nav class="whp-nav" aria-label="Navegação principal">
          ${navItemsHtml}
        </nav>
        <div class="whp-actions">
          ${userChip}
          ${roleChip}
          <a class="whp-btn-help ${isActive('ajuda')}" href="/ajuda" title="Como usar a plataforma" aria-label="Ajuda">?</a>
          <button class="whp-btn-logout" id="whpLogoutBtn" type="button">Sair</button>
        </div>
      </div>
    `;
  }

  // ============================================================
  // DRAWER MOBILE (com accordion colapsado)
  //
  // Drawer é renderizado como SIBLING do .whp-header (filho direto do body).
  // Motivo: o .whp-header usa backdrop-filter, que cria contexto de stacking
  // em iOS Safari e PRENDE position:fixed filhos dentro dos limites do header
  // (~60px). Mantendo o drawer fora do header, ele se posiciona corretamente
  // em relação ao viewport.
  // ============================================================
  function buildDrawerHtml(activeId) {
    const activeParentId = findParentGroupId(activeId);
    const isActive = (id) => id === activeId ? 'active' : '';
    const isAdmin = !!(window.WhirlpoolAuth && window.WhirlpoolAuth.isAdmin && window.WhirlpoolAuth.isAdmin());
    const userName = (window.WhirlpoolAuth && window.WhirlpoolAuth.getUserName) ? (window.WhirlpoolAuth.getUserName() || '') : '';
    const initials = userName ? userName.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() : '';

    const drawerItems = NAV_ITEMS.map(item => {
      if (item.type === 'link') {
        return `<a href="${escapeAttr(item.href)}" class="whp-drawer-link ${isActive(item.id)}" data-nav-id="${escapeAttr(item.id)}">${escapeAttr(item.label)}</a>`;
      }
      if (item.type === 'group') {
        const parentActive = activeParentId === item.id ? 'active' : '';
        // Accordion expande automaticamente apenas se um filho está ativo
        const isExpanded = activeParentId === item.id;
        const childrenHtml = (item.children || []).map(child => {
          if (child.disabled) {
            const badge = child.badge ? `<span class="whp-drawer-badge">${escapeAttr(child.badge)}</span>` : '';
            return `<span class="whp-drawer-sublink is-disabled" aria-disabled="true">${escapeAttr(child.label)}${badge}</span>`;
          }
          return `<a href="${escapeAttr(child.href)}" class="whp-drawer-sublink ${isActive(child.id)}" data-nav-id="${escapeAttr(child.id)}">${escapeAttr(child.label)}</a>`;
        }).join('');
        return `
          <div class="whp-drawer-group ${isExpanded ? 'is-expanded' : ''}" data-group-id="${escapeAttr(item.id)}">
            <button type="button"
                    class="whp-drawer-link whp-drawer-trigger ${parentActive}"
                    aria-expanded="${isExpanded ? 'true' : 'false'}"
                    data-group-id="${escapeAttr(item.id)}">
              <span>${escapeAttr(item.label)}</span>
              <span class="whp-drawer-caret" aria-hidden="true">▾</span>
            </button>
            <div class="whp-drawer-submenu">
              ${childrenHtml}
            </div>
          </div>
        `;
      }
      return '';
    }).join('\n          ');

    return `
      <div class="whp-drawer-backdrop" id="whpDrawerBackdrop" aria-hidden="true"></div>
      <div class="whp-drawer" id="whpDrawer" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
        <div class="whp-drawer-head">
          <a class="whp-drawer-logo" href="/" aria-label="Central do Cliente">
            <img src="/img/logo_pecas_originais.png" alt="Peças Originais" />
          </a>
          <button class="whp-drawer-close" id="whpDrawerClose" type="button" aria-label="Fechar menu">×</button>
        </div>
        ${userName ? `
          <div class="whp-drawer-user">
            <span class="whp-drawer-user-avatar">${escapeAttr(initials)}</span>
            <div class="whp-drawer-user-info">
              <span class="whp-drawer-user-name">${escapeAttr(userName)}</span>
              ${isAdmin ? '<span class="whp-drawer-user-role">Admin · Molla</span>' : '<span class="whp-drawer-user-role">Cliente</span>'}
            </div>
          </div>
        ` : ''}
        <div class="whp-drawer-nav" role="navigation" aria-label="Navegação principal mobile">
          ${drawerItems}
          <a href="/ajuda" class="whp-drawer-link whp-drawer-link-help ${isActive('ajuda')}"><span class="whp-drawer-help-icon">?</span> Ajuda</a>
        </div>
        <div class="whp-drawer-foot">
          <button class="whp-drawer-logout" id="whpDrawerLogoutBtn" type="button">Sair</button>
        </div>
      </div>
    `;
  }

  // ============================================================
  // DROPDOWN BEHAVIOR (desktop)
  // ============================================================
  function wireDropdowns(headerEl) {
    const groups = headerEl.querySelectorAll('.whp-nav-group');
    groups.forEach(group => {
      const trigger = group.querySelector('.whp-nav-trigger');
      if (!trigger) return;

      const close = () => {
        group.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      };
      const open = () => {
        // Fecha outros dropdowns antes
        groups.forEach(g => {
          if (g !== group) {
            g.classList.remove('is-open');
            const t = g.querySelector('.whp-nav-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
        group.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      };
      const toggle = () => {
        if (group.classList.contains('is-open')) close();
        else open();
      };

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });

      // Hover abre (desktop) — fechar via outside click ou Esc
      group.addEventListener('mouseenter', () => {
        if (window.matchMedia && window.matchMedia('(min-width: 761px)').matches) open();
      });
      group.addEventListener('mouseleave', () => {
        if (window.matchMedia && window.matchMedia('(min-width: 761px)').matches) close();
      });
    });

    // Clique fora fecha todos
    document.addEventListener('click', (e) => {
      groups.forEach(group => {
        if (!group.contains(e.target)) {
          group.classList.remove('is-open');
          const t = group.querySelector('.whp-nav-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Esc fecha todos
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        groups.forEach(group => {
          group.classList.remove('is-open');
          const t = group.querySelector('.whp-nav-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  // ============================================================
  // ACCORDION BEHAVIOR (mobile drawer)
  // ============================================================
  function wireDrawerAccordion(drawerRoot) {
    const groups = drawerRoot.querySelectorAll('.whp-drawer-group');
    groups.forEach(group => {
      const trigger = group.querySelector('.whp-drawer-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const expanded = group.classList.toggle('is-expanded');
        trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    });
  }

  // ============================================================
  // DRAWER OPEN/CLOSE
  // ============================================================
  function openDrawer() {
    const drawer = document.getElementById('whpDrawer');
    const backdrop = document.getElementById('whpDrawerBackdrop');
    const hamburger = document.getElementById('whpHamburgerBtn');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('is-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('whp-drawer-open');
  }

  function closeDrawer() {
    const drawer = document.getElementById('whpDrawer');
    const backdrop = document.getElementById('whpDrawerBackdrop');
    const hamburger = document.getElementById('whpHamburgerBtn');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.classList.remove('is-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('whp-drawer-open');
  }

  function handleLogout() {
    if (confirm('Deseja sair?') && window.WhirlpoolAuth) {
      window.WhirlpoolAuth.logout();
    }
  }

  // ============================================================
  // INJECT
  // ============================================================
  function inject() {
    if (document.querySelector('.whp-header')) return;

    const activeId = activeRouteFromPath();

    // 1) Cria o header (sticky, com backdrop-filter)
    const wrapper = document.createElement('div');
    wrapper.className = 'whp-header';
    wrapper.setAttribute('role', 'banner');
    wrapper.innerHTML = buildHeaderHtml(activeId);
    document.body.insertBefore(wrapper, document.body.firstChild);

    // 2) Cria o drawer como SIBLING do header.
    //    Crucial pra Safari iOS — ver comentário acima.
    const drawerWrap = document.createElement('div');
    drawerWrap.className = 'whp-drawer-root';
    drawerWrap.innerHTML = buildDrawerHtml(activeId);
    document.body.appendChild(drawerWrap);

    // Botões de logout (header e drawer)
    const logoutBtn = document.getElementById('whpLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const drawerLogoutBtn = document.getElementById('whpDrawerLogoutBtn');
    if (drawerLogoutBtn) drawerLogoutBtn.addEventListener('click', handleLogout);

    // Hamburguer e fechar
    const hamburger = document.getElementById('whpHamburgerBtn');
    const drawerClose = document.getElementById('whpDrawerClose');
    const backdrop = document.getElementById('whpDrawerBackdrop');
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // ESC fecha drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    // Se sair do mobile pra desktop com drawer aberto, fecha automaticamente
    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(min-width: 761px)');
      const handler = (ev) => { if (ev.matches) closeDrawer(); };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler); // Safari antigo
    }

    // Liga comportamentos de dropdown (desktop) e accordion (mobile)
    wireDropdowns(wrapper);
    wireDrawerAccordion(drawerWrap);

    // Expõe altura real do header como CSS var (pra elementos sticky)
    function updateHeaderHeight() {
      const inner = wrapper.querySelector('.whp-inner');
      const h = (inner ? inner.offsetHeight : wrapper.offsetHeight) || 60;
      document.documentElement.style.setProperty('--whp-header-h', h + 'px');
    }
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    window.addEventListener('load', updateHeaderHeight);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
