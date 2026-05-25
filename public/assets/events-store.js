/* ============================================================
   events-store.js — CRUD + cache + realtime para tabela `events`
   Mesmo padrão resiliente do files-store.js (sempre define
   window.EventsStore, mesmo se faltar dependência).
   ============================================================ */
(function () {
  'use strict';

  const missing = [];
  if (!window.WhirlpoolConfig)           missing.push('config.js (window.WhirlpoolConfig)');
  if (!window.supabase)                missing.push('supabase-js do CDN (window.supabase)');
  if (window.supabase && !window.supabase.createClient) missing.push('supabase.createClient');

  if (missing.length) {
    console.error('[events-store] dependências ausentes:', missing.join(', '));
    const errMsg = 'Dependência ausente no carregamento: ' + missing.join(', ');
    const reject = () => Promise.reject(new Error(errMsg));
    window.EventsStore = {
      _failed: true,
      _missingDeps: missing,
      list: reject, create: reject, update: reject, delete: reject, ping: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  let supabase;
  try {
    supabase = window.supabase.createClient(
      window.WhirlpoolConfig.SUPABASE_URL,
      window.WhirlpoolConfig.SUPABASE_KEY
    );
  } catch (e) {
    console.error('[events-store] erro ao criar cliente Supabase:', e);
    const reject = () => Promise.reject(e);
    window.EventsStore = {
      _failed: true,
      _initError: e,
      list: reject, create: reject, update: reject, delete: reject, ping: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  const cache = { events: null };
  let channel = null;

  const EventsStore = {
    /** Lista todos os eventos ordenados por data_inicio asc. */
    async list(force = false) {
      if (!force && cache.events) return cache.events;
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('data_inicio', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      cache.events = data || [];
      return cache.events;
    },

    async create(ev) {
      const payload = {
        titulo: (ev.titulo || '').trim(),
        categoria: ev.categoria,
        data_inicio: ev.data_inicio,
        data_fim: ev.data_fim || null,
        descricao: (ev.descricao || '').trim(),
        link_interno: (ev.link_interno || '').trim() || null,
      };
      const { data, error } = await supabase.from('events').insert(payload).select().single();
      if (error) {
        console.error('[events-store] INSERT falhou:', error, '\n  payload:', payload);
        // Mensagem amigável pra check constraint violado
        if (/check constraint|categoria_check/i.test(error.message || '')) {
          throw new Error(`Categoria "${payload.categoria}" rejeitada pelo banco. O check constraint pode estar desatualizado — rode o bloco S23 do docs/schema.sql no Supabase Dashboard.`);
        }
        throw error;
      }
      cache.events = null;
      return data;
    },

    async update(id, fields) {
      const payload = {};
      ['titulo', 'categoria', 'data_inicio', 'data_fim', 'descricao', 'link_interno'].forEach(k => {
        if (fields[k] !== undefined) {
          payload[k] = (typeof fields[k] === 'string') ? fields[k].trim() : fields[k];
          if (payload[k] === '') payload[k] = (k === 'descricao') ? '' : null;
        }
      });
      const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single();
      if (error) {
        console.error('[events-store] UPDATE falhou:', error, '\n  payload:', payload);
        if (/check constraint|categoria_check/i.test(error.message || '')) {
          throw new Error(`Categoria "${payload.categoria}" rejeitada pelo banco. O check constraint pode estar desatualizado — rode o bloco S23 do docs/schema.sql no Supabase Dashboard.`);
        }
        throw error;
      }
      cache.events = null;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      cache.events = null;
      return true;
    },

    async ping() {
      const { error } = await supabase.from('events').select('id', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      return true;
    },

    subscribe(callback) {
      try {
        if (channel) supabase.removeChannel(channel);
        channel = supabase
          .channel('events-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
            cache.events = null;
            try { callback(); } catch (e) { console.error('[events-store] callback erro:', e); }
          })
          .subscribe();
        return channel;
      } catch (e) {
        console.warn('[events-store] subscribe falhou:', e);
        return null;
      }
    },

    invalidate() { cache.events = null; },
  };

  window.EventsStore = EventsStore;
})();
