/* ============================================================
   Bottom Sheet — JS leve
   ------------------------------------------------------------
   Auto-wire via data attributes:
     <button data-bs-open="painelId">Filtrar</button>
     <button data-bs-close>Fechar</button>

   RELOCATION STRATEGY:
   Em mobile, move os .bs-panel pra serem filhos diretos do <body>.
   Em desktop, restaura pro parent original (toolbar). Motivo: vários
   toolbars têm propriedades que criam stacking context (backdrop-filter,
   transform, etc) que prendem position:fixed filhos dentro dos limites
   do ancestral. Mantendo o panel no body em mobile, ele se posiciona
   corretamente em relação ao viewport.

   API global: window.MetLifeBottomSheet.open(id) / .close(id)
   ============================================================ */

(function () {
  'use strict';

  // Guarda o parent original de cada panel pra restaurar ao voltar pra desktop
  const originalParents = new WeakMap();

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  }

  function moveToBody(panel) {
    if (!panel) return;
    // Salva o parent original na primeira vez que o vê
    if (!originalParents.has(panel) && panel.parentElement && panel.parentElement !== document.body) {
      originalParents.set(panel, panel.parentElement);
    }
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
  }

  function restoreToOriginal(panel) {
    if (!panel) return;
    const orig = originalParents.get(panel);
    if (orig && panel.parentElement === document.body) {
      orig.appendChild(panel);
    }
  }

  /** Avalia viewport e move panels pro body (mobile) ou de volta (desktop) */
  function syncPanels() {
    const mobile = isMobile();
    document.querySelectorAll('.bs-panel').forEach(panel => {
      if (mobile) moveToBody(panel);
      else restoreToOriginal(panel);
    });
  }

  function open(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    // Em mobile, garante que o panel está no body antes de abrir
    // (cobre panels criados dinamicamente após o DOMContentLoaded)
    if (isMobile()) moveToBody(panel);
    panel.classList.add('is-open');
    document.body.classList.add('bs-open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function close(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    // Só remove body class se não tem outro sheet aberto
    const stillOpen = document.querySelector('.bs-panel.is-open');
    if (!stillOpen) document.body.classList.remove('bs-open');
  }

  function closeAll() {
    document.querySelectorAll('.bs-panel.is-open').forEach(p => close(p));
  }

  // Wire global de cliques
  document.addEventListener('click', (e) => {
    // Trigger pra abrir
    const opener = e.target.closest('[data-bs-open]');
    if (opener) {
      e.preventDefault();
      open(opener.getAttribute('data-bs-open'));
      return;
    }
    // Botão de fechar dentro do panel
    const closer = e.target.closest('[data-bs-close]');
    if (closer) {
      e.preventDefault();
      const panel = closer.closest('.bs-panel');
      if (panel) close(panel);
      return;
    }
    // Clique no backdrop fecha tudo
    if (e.target === document.body && document.body.classList.contains('bs-open')) {
      closeAll();
    }
  });

  // Tocar fora do panel — detecta clique fora dos panels abertos
  document.addEventListener('touchstart', (e) => {
    if (!document.body.classList.contains('bs-open')) return;
    const openPanel = document.querySelector('.bs-panel.is-open');
    if (openPanel && !openPanel.contains(e.target) && !e.target.closest('[data-bs-open]')) {
      closeAll();
    }
  }, { passive: true });
  document.addEventListener('mousedown', (e) => {
    if (!document.body.classList.contains('bs-open')) return;
    const openPanel = document.querySelector('.bs-panel.is-open');
    if (openPanel && !openPanel.contains(e.target) && !e.target.closest('[data-bs-open]')) {
      closeAll();
    }
  });

  // ESC fecha
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  // Sincroniza panels no load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncPanels);
  } else {
    syncPanels();
  }

  // Re-sincroniza quando atravessa o breakpoint mobile <-> desktop
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(max-width: 760px)');
    const handler = () => syncPanels();
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  // API global
  window.MetLifeBottomSheet = {
    open: open,
    close: (id) => close(document.getElementById(id)),
    closeAll: closeAll,
    sync: syncPanels, // pra páginas que renderizam panel dinamicamente
  };
})();
