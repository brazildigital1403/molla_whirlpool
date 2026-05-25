/* ============================================================
   Whirlpool Brasil — Auth Module (client-side simples)
   ------------------------------------------------------------
   ⚠️  Este módulo NÃO é seguro. É um controle de acesso visual,
   não uma camada de segurança real. As senhas estão em texto
   puro no source e qualquer pessoa com DevTools pode bypassar.
   Para uso interno apenas.

   2 perfis com 2 senhas:
   - 'whirlpool2026' → role 'cliente' (apenas comenta e aprova)
   - 'molla@2026@'   → role 'molla'   (administração: criar/editar/excluir)

   Persistência (S55):
   - Usa localStorage → sessão persiste entre abas/janelas e até
     mesmo após fechar e reabrir o navegador.
   - Fallback de LEITURA em sessionStorage pra não deslogar quem
     já estiver com sessão ativa no momento do deploy.
   ============================================================ */

(function () {
  'use strict';

  // 🔑 Senhas → roles. Edite aqui se precisar trocar.
  const PASSWORDS = {
    'whirlpool2026': 'cliente',
    'molla@2026@': 'molla'
  };

  // Chaves do storage
  const KEY_AUTH = 'whirlpool_auth';
  const KEY_USER = 'whirlpool_user';
  const KEY_ROLE = 'whirlpool_role';

  // Páginas que NÃO exigem autenticação
  const PUBLIC_PAGES = ['/login', '/login.html'];

  /* --------------------------------------------------------
     Storage helpers
     - get(): lê de localStorage, com fallback de sessionStorage
       pra preservar sessões ativas durante a migração.
     - set(): escreve em localStorage e LIMPA sessionStorage
       pra não deixar valor stale convivendo com o novo.
     - del(): apaga em ambos.
     -------------------------------------------------------- */
  function get(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (e) {
      // Storage pode estar bloqueado (modo privado em iOS antigo, etc.)
      return null;
    }
  }
  function set(key, value) {
    try {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } catch (e) {
      // Fallback: se localStorage falhar (quota cheia, modo privado),
      // ainda tenta sessionStorage pra pelo menos manter na aba atual.
      try { sessionStorage.setItem(key, value); } catch (e2) { /* nada a fazer */ }
    }
  }
  function del(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  const Auth = {
    /**
     * Tenta logar com a senha informada.
     * @param {string} password
     * @param {string} [userName] - opcional; se vier, salva como nome do usuário desta sessão
     * @returns {boolean}
     */
    login(password, userName) {
      const role = PASSWORDS[password];
      if (!role) return false;
      set(KEY_AUTH, '1');
      set(KEY_ROLE, role);
      const cleanName = (userName || '').trim();
      if (cleanName) {
        set(KEY_USER, cleanName);
      }
      return true;
    },

    /** Logout: limpa tudo e volta para o login. */
    logout() {
      del(KEY_AUTH);
      del(KEY_ROLE);
      del(KEY_USER);
      window.location.href = '/login';
    },

    /** Está autenticado? */
    isAuthenticated() {
      return get(KEY_AUTH) === '1';
    },

    /** Retorna o role atual ('cliente' ou 'molla'). */
    getRole() {
      return get(KEY_ROLE) || 'cliente';
    },

    /** Conveniência: o usuário tem permissão de administração? */
    isAdmin() {
      return this.getRole() === 'molla';
    },

    /**
     * Nome do usuário atual.
     * Lê com fallback automático (localStorage → sessionStorage).
     */
    getUserName() {
      return get(KEY_USER) || '';
    },

    /** Define o nome do usuário (persistido em localStorage). */
    setUserName(name) {
      const clean = (name || '').trim();
      if (clean) set(KEY_USER, clean);
    },

    /**
     * Garante que existe um nome de usuário. Defensivo apenas:
     * normalmente o nome vem do login. Se faltar, pergunta via prompt.
     */
    ensureUserName() {
      let name = this.getUserName();
      if (!name) {
        name = prompt('Como você quer ser identificado? (seu nome aparecerá nos comentários e aprovações)');
        if (name && name.trim()) {
          this.setUserName(name);
          return name.trim();
        }
        return '';
      }
      return name;
    },

    /** Guarda em uma página protegida — redireciona se não autenticado. */
    guard() {
      const path = window.location.pathname;
      const isPublic = PUBLIC_PAGES.some(p => path === p || path === p + '/');
      if (isPublic) return;

      if (!this.isAuthenticated()) {
        window.location.replace('/login');
      }
    },
  };

  // Expor globalmente
  window.WhirlpoolAuth = Auth;

  // Auto-guard: roda imediatamente em qualquer página que importar este script.
  Auth.guard();

  // Sincronização entre abas via 'storage' event:
  // se o usuário fizer logout em uma aba, todas as outras detectam e
  // são redirecionadas pro login automaticamente.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_AUTH && e.newValue === null) {
      const path = window.location.pathname;
      const isPublic = PUBLIC_PAGES.some(p => path === p || path === p + '/');
      if (!isPublic) {
        window.location.replace('/login');
      }
    }
  });
})();
