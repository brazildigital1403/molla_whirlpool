/* ============================================================
   files-store.js — CRUD + cache + realtime para tabela `files`
   Resiliente: sempre define window.FilesStore (mesmo se faltar
   dependência) com mensagens de erro claras para o usuário.
   ============================================================ */
(function () {
  'use strict';

  // --- Detecção de dependências faltando ---
  const missing = [];
  if (!window.WhirlpoolConfig)           missing.push('config.js (window.WhirlpoolConfig)');
  if (!window.supabase)                missing.push('supabase-js do CDN (window.supabase)');
  if (window.supabase && !window.supabase.createClient) missing.push('supabase.createClient');

  if (missing.length) {
    console.error('[files-store] dependências ausentes:', missing.join(', '));
    // Mesmo assim define um stub pra a UI não quebrar — todos os métodos sinalizam erro claro
    const errMsg = 'Dependência ausente no carregamento: ' + missing.join(', ');
    const reject = () => Promise.reject(new Error(errMsg));
    window.FilesStore = {
      _failed: true,
      _missingDeps: missing,
      list: reject, create: reject, update: reject, delete: reject, ping: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  // --- Inicialização normal ---
  let supabase;
  try {
    supabase = window.supabase.createClient(
      window.WhirlpoolConfig.SUPABASE_URL,
      window.WhirlpoolConfig.SUPABASE_KEY
    );
  } catch (e) {
    console.error('[files-store] erro ao criar cliente Supabase:', e);
    const reject = () => Promise.reject(e);
    window.FilesStore = {
      _failed: true,
      _initError: e,
      list: reject, create: reject, update: reject, delete: reject, ping: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  const cache = { files: null };
  let channel = null;

  const FilesStore = {
    /** Lista todos os arquivos. Cache local. */
    async list(force = false) {
      if (!force && cache.files) return cache.files;
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('data', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      cache.files = data || [];
      return cache.files;
    },

    /** Cria novo arquivo. Retorna o registro inserido. */
    async create(file) {
      const payload = {
        nome: (file.nome || '').trim(),
        tipo: file.tipo,
        descricao: (file.descricao || '').trim(),
        url: (file.url || '').trim(),
        data: file.data || null,
      };
      const { data, error } = await supabase.from('files').insert(payload).select().single();
      if (error) throw error;
      cache.files = null;
      return data;
    },

    /** Atualiza campos. */
    async update(id, fields) {
      const payload = {};
      ['nome', 'tipo', 'descricao', 'url', 'data'].forEach(k => {
        if (fields[k] !== undefined) {
          payload[k] = (typeof fields[k] === 'string') ? fields[k].trim() : fields[k];
        }
      });
      const { data, error } = await supabase.from('files').update(payload).eq('id', id).select().single();
      if (error) throw error;
      cache.files = null;
      return data;
    },

    /** Exclui por id. */
    async delete(id) {
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw error;
      cache.files = null;
      return true;
    },

    /** Healthcheck — confirma que a tabela existe. */
    async ping() {
      const { error } = await supabase.from('files').select('id', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      return true;
    },

    /** Subscribe a changes em tempo real. callback() recebido a cada mudança. */
    subscribe(callback) {
      try {
        if (channel) supabase.removeChannel(channel);
        channel = supabase
          .channel('files-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => {
            cache.files = null;
            try { callback(); } catch (e) { console.error('[files-store] callback erro:', e); }
          })
          .subscribe();
        return channel;
      } catch (e) {
        console.warn('[files-store] subscribe falhou (não-bloqueante):', e);
        return null;
      }
    },

    /** Limpa cache forçando recarga. */
    invalidate() { cache.files = null; },
  };

  window.FilesStore = FilesStore;
})();
