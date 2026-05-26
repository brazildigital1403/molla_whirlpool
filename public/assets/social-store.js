/* ============================================================
   social-store.js — CRUD + cache + realtime para Social
   Tabelas: social_meses, social_posts, social_comentarios,
            social_historico
   API global: window.SocialStore
   ============================================================ */
(function () {
  'use strict';

  const missing = [];
  if (!window.WhirlpoolConfig)                           missing.push('config.js (window.WhirlpoolConfig)');
  if (!window.supabase)                                  missing.push('supabase-js (window.supabase)');
  if (window.supabase && !window.supabase.createClient)  missing.push('supabase.createClient');

  if (missing.length) {
    console.error('[social-store] dependências ausentes:', missing.join(', '));
    const errMsg = 'Dependência ausente: ' + missing.join(', ');
    const reject = () => Promise.reject(new Error(errMsg));
    window.SocialStore = {
      _failed: true,
      _missingDeps: missing,
      listMeses: reject, getMes: reject,
      listPosts: reject, approvePost: reject, rejectPost: reject,
      listComentarios: reject, createComentario: reject,
      listHistorico: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  let supabase;
  try {
    supabase = window.supabase.createClient(
      window.WhirlpoolConfig.SUPABASE_URL,
      window.WhirlpoolConfig.SUPABASE_KEY,
      { auth: { persistSession: false } }
    );
  } catch (e) {
    console.error('[social-store] erro ao criar cliente Supabase:', e);
    const reject = () => Promise.reject(e);
    window.SocialStore = {
      _failed: true,
      _initError: e,
      listMeses: reject, getMes: reject,
      listPosts: reject, approvePost: reject, rejectPost: reject,
      listComentarios: reject, createComentario: reject,
      listHistorico: reject,
      subscribe() { return null; },
      invalidate() {},
    };
    return;
  }

  // ============ CACHE ============
  const cache = {
    meses: null,                  // array | null
    postsByMes: new Map(),        // mes_id -> array de posts
    comentariosByPost: new Map(), // post_id -> array
    historicoByPost: new Map(),   // post_id -> array
  };
  let channel = null;


  // ============================================================
  // MESES
  // ============================================================
  async function listMeses(force = false) {
    if (!force && cache.meses) return cache.meses;
    const { data, error } = await supabase
      .from('social_meses')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });
    if (error) throw error;
    cache.meses = data || [];
    return cache.meses;
  }

  async function getMes(slug) {
    const meses = await listMeses();
    return meses.find(m => m.slug === slug) || null;
  }


  // ============================================================
  // POSTS
  // ============================================================
  async function listPosts(mesId, force = false) {
    if (!mesId) return [];
    if (!force && cache.postsByMes.has(mesId)) return cache.postsByMes.get(mesId);
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('mes_id', mesId)
      .order('numero', { ascending: true });
    if (error) throw error;
    const posts = data || [];
    cache.postsByMes.set(mesId, posts);
    return posts;
  }

  /**
   * Aprova um post (1 clique).
   * @param {string} postId
   * @param {{ autor: string, role: 'cliente'|'molla' }} actor
   */
  async function approvePost(postId, actor) {
    if (!postId) throw new Error('postId obrigatório');
    if (!actor || !actor.autor) throw new Error('autor obrigatório');

    const now = new Date().toISOString();

    // 1) buscar status atual pro histórico
    const { data: before, error: e0 } = await supabase
      .from('social_posts').select('status').eq('id', postId).single();
    if (e0) throw e0;

    // 2) update status
    const { data, error } = await supabase
      .from('social_posts')
      .update({
        status: 'aprovado',
        aprovado_por: actor.autor,
        aprovado_em: now,
        reprovado_por: null,
        reprovado_em: null,
        reprovacao_motivo: null,
      })
      .eq('id', postId)
      .select().single();
    if (error) throw error;

    // 3) histórico
    await supabase.from('social_historico').insert({
      post_id: postId,
      status_de: before ? before.status : null,
      status_para: 'aprovado',
      autor: actor.autor,
      role: actor.role || 'cliente',
      observacao: null,
    });

    // 4) invalida caches relevantes
    cache.postsByMes.clear();
    cache.historicoByPost.delete(postId);

    return data;
  }

  /**
   * Reprova um post (exige motivo obrigatório).
   * Cria ainda um comentário no thread com o motivo.
   * @param {string} postId
   * @param {string} motivo
   * @param {{ autor: string, role: 'cliente'|'molla' }} actor
   */
  async function rejectPost(postId, motivo, actor) {
    if (!postId) throw new Error('postId obrigatório');
    if (!motivo || !motivo.trim()) throw new Error('motivo obrigatório para reprovar');
    if (!actor || !actor.autor) throw new Error('autor obrigatório');

    const motivoLimpo = motivo.trim();
    const now = new Date().toISOString();
    const role = actor.role || 'cliente';

    const { data: before, error: e0 } = await supabase
      .from('social_posts').select('status').eq('id', postId).single();
    if (e0) throw e0;

    const { data, error } = await supabase
      .from('social_posts')
      .update({
        status: 'reprovado',
        reprovado_por: actor.autor,
        reprovado_em: now,
        reprovacao_motivo: motivoLimpo,
        aprovado_por: null,
        aprovado_em: null,
      })
      .eq('id', postId)
      .select().single();
    if (error) throw error;

    await supabase.from('social_historico').insert({
      post_id: postId,
      status_de: before ? before.status : null,
      status_para: 'reprovado',
      autor: actor.autor,
      role: role,
      observacao: motivoLimpo,
    });

    // Replica o motivo como comentário pra ficar visível no thread
    await supabase.from('social_comentarios').insert({
      post_id: postId,
      autor: actor.autor,
      role: role,
      texto: '🚫 Reprovado: ' + motivoLimpo,
    });

    cache.postsByMes.clear();
    cache.historicoByPost.delete(postId);
    cache.comentariosByPost.delete(postId);

    return data;
  }

  /**
   * Reabre um post — volta pra pendente. Útil em V2/admin.
   */
  async function reopenPost(postId, actor) {
    const { data: before } = await supabase
      .from('social_posts').select('status').eq('id', postId).single();

    const { data, error } = await supabase
      .from('social_posts')
      .update({
        status: 'pendente',
        aprovado_por: null,
        aprovado_em: null,
        reprovado_por: null,
        reprovado_em: null,
        reprovacao_motivo: null,
      })
      .eq('id', postId)
      .select().single();
    if (error) throw error;

    await supabase.from('social_historico').insert({
      post_id: postId,
      status_de: before ? before.status : null,
      status_para: 'pendente',
      autor: (actor && actor.autor) || 'sistema',
      role: (actor && actor.role) || 'molla',
      observacao: 'reaberto',
    });

    cache.postsByMes.clear();
    cache.historicoByPost.delete(postId);
    return data;
  }


  // ============================================================
  // COMENTÁRIOS
  // ============================================================
  async function listComentarios(postId, force = false) {
    if (!postId) return [];
    if (!force && cache.comentariosByPost.has(postId)) {
      return cache.comentariosByPost.get(postId);
    }
    const { data, error } = await supabase
      .from('social_comentarios')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const comentarios = data || [];
    cache.comentariosByPost.set(postId, comentarios);
    return comentarios;
  }

  async function createComentario(postId, texto, actor) {
    if (!postId) throw new Error('postId obrigatório');
    const textoLimpo = (texto || '').trim();
    if (!textoLimpo) throw new Error('texto vazio');
    if (!actor || !actor.autor) throw new Error('autor obrigatório');

    const { data, error } = await supabase
      .from('social_comentarios')
      .insert({
        post_id: postId,
        autor: actor.autor,
        role: actor.role || 'cliente',
        texto: textoLimpo,
      })
      .select().single();
    if (error) throw error;

    cache.comentariosByPost.delete(postId);
    return data;
  }


  // ============================================================
  // HISTÓRICO
  // ============================================================
  async function listHistorico(postId, force = false) {
    if (!postId) return [];
    if (!force && cache.historicoByPost.has(postId)) {
      return cache.historicoByPost.get(postId);
    }
    const { data, error } = await supabase
      .from('social_historico')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const historico = data || [];
    cache.historicoByPost.set(postId, historico);
    return historico;
  }


  // ============================================================
  // REALTIME · subscribe a TODAS as 3 tabelas Social
  // ============================================================
  function subscribe(callback) {
    try {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel('social-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => {
          cache.postsByMes.clear();
          try { callback({ table: 'posts' }); } catch (e) { console.error('[social-store] cb erro:', e); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_comentarios' }, (payload) => {
          if (payload && payload.new && payload.new.post_id) {
            cache.comentariosByPost.delete(payload.new.post_id);
          } else {
            cache.comentariosByPost.clear();
          }
          try { callback({ table: 'comentarios' }); } catch (e) { console.error('[social-store] cb erro:', e); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_historico' }, (payload) => {
          if (payload && payload.new && payload.new.post_id) {
            cache.historicoByPost.delete(payload.new.post_id);
          } else {
            cache.historicoByPost.clear();
          }
          try { callback({ table: 'historico' }); } catch (e) { console.error('[social-store] cb erro:', e); }
        })
        .subscribe();
      return channel;
    } catch (e) {
      console.warn('[social-store] subscribe falhou (não-bloqueante):', e);
      return null;
    }
  }


  // ============================================================
  // PING · healthcheck
  // ============================================================
  async function ping() {
    const { error } = await supabase
      .from('social_meses').select('id', { count: 'exact', head: true }).limit(1);
    if (error) throw error;
    return true;
  }


  // ============================================================
  // STATS helpers (locais — não vão ao banco)
  // ============================================================
  function calcStats(posts) {
    const total = posts.length;
    const aprovados = posts.filter(p => p.status === 'aprovado').length;
    const reprovados = posts.filter(p => p.status === 'reprovado').length;
    const pendentes = total - aprovados - reprovados;
    return { total, aprovados, reprovados, pendentes };
  }


  // ============ EXPORT ============
  window.SocialStore = {
    listMeses, getMes,
    listPosts, approvePost, rejectPost, reopenPost,
    listComentarios, createComentario,
    listHistorico,
    subscribe, ping, calcStats,
    invalidate() {
      cache.meses = null;
      cache.postsByMes.clear();
      cache.comentariosByPost.clear();
      cache.historicoByPost.clear();
    },
  };
})();
