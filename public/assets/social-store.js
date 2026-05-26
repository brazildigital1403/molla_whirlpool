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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_meses' }, () => {
          cache.meses = null;
          try { callback({ table: 'meses' }); } catch (e) { console.error('[social-store] cb erro:', e); }
        })
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


  // ============================================================
  // ADMIN · CRUD de MESES
  // ============================================================
  /**
   * Cria um novo mês.
   * @param {{slug, ano, mes, nome, tema?, estrategia?, campanha?, conceito?}} data
   */
  async function createMes(data) {
    if (!data || !data.slug)  throw new Error('slug obrigatório (ex: 2026-07)');
    if (!data.ano || !data.mes) throw new Error('ano e mês obrigatórios');
    if (!data.nome)            throw new Error('nome obrigatório');

    const payload = {
      slug: data.slug,
      ano:  parseInt(data.ano, 10),
      mes:  parseInt(data.mes, 10),
      nome: data.nome.trim(),
      tema:       (data.tema       || '').trim() || null,
      estrategia: (data.estrategia || '').trim() || null,
      campanha:   (data.campanha   || '').trim() || null,
      conceito:   (data.conceito   || '').trim() || null,
    };
    const { data: created, error } = await supabase
      .from('social_meses').insert(payload).select().single();
    if (error) throw error;

    cache.meses = null;
    return created;
  }

  async function updateMes(id, data) {
    if (!id) throw new Error('id obrigatório');
    const payload = {};
    ['nome','tema','estrategia','campanha','conceito'].forEach(k => {
      if (data[k] !== undefined) payload[k] = (data[k] || '').trim() || null;
    });
    if (data.ano !== undefined) payload.ano = parseInt(data.ano, 10);
    if (data.mes !== undefined) payload.mes = parseInt(data.mes, 10);
    if (data.slug !== undefined) payload.slug = data.slug;

    const { data: updated, error } = await supabase
      .from('social_meses').update(payload).eq('id', id).select().single();
    if (error) throw error;

    cache.meses = null;
    return updated;
  }

  async function deleteMes(id) {
    if (!id) throw new Error('id obrigatório');
    const { error } = await supabase.from('social_meses').delete().eq('id', id);
    if (error) throw error;
    cache.meses = null;
    cache.postsByMes.delete(id);
    return true;
  }

  /**
   * Duplica SÓ a estrutura do mês (sem copiar posts).
   * O admin preenche os posts do zero no novo mês.
   */
  async function duplicateMes(sourceId, newData) {
    if (!sourceId) throw new Error('sourceId obrigatório');
    const meses = await listMeses(true);
    const src = meses.find(m => m.id === sourceId);
    if (!src) throw new Error('mês de origem não encontrado');

    return createMes({
      slug: newData.slug,
      ano:  newData.ano,
      mes:  newData.mes,
      nome: newData.nome || src.nome,
      tema:       newData.tema       !== undefined ? newData.tema       : '',
      estrategia: newData.estrategia !== undefined ? newData.estrategia : src.estrategia,
      campanha:   newData.campanha   !== undefined ? newData.campanha   : '',
      conceito:   newData.conceito   !== undefined ? newData.conceito   : '',
    });
  }


  // ============================================================
  // ADMIN · CRUD de POSTS
  // ============================================================
  /**
   * Cria post novo. Se numero não vier, calcula o próximo livre.
   */
  async function createPost(mesId, data) {
    if (!mesId)            throw new Error('mesId obrigatório');
    if (!data.data_post)   throw new Error('data_post obrigatória');
    if (!data.linha_editorial) throw new Error('linha editorial obrigatória');
    if (!data.formato)     throw new Error('formato obrigatório');
    if (!data.tema)        throw new Error('tema obrigatório');
    if (!data.explicacao)  throw new Error('explicação obrigatória');

    let numero = data.numero;
    if (!numero) {
      // auto-incremento: pega o maior número do mês + 1
      const posts = await listPosts(mesId, true);
      const max = posts.reduce((acc, p) => Math.max(acc, p.numero || 0), 0);
      numero = max + 1;
    }

    const payload = {
      mes_id:          mesId,
      numero:          parseInt(numero, 10),
      data_post:       data.data_post,
      peca:            (data.peca || '').trim() || null,
      linha_editorial: data.linha_editorial,
      formato:         data.formato,
      tipo:            data.tipo || 'always_on',
      tema:            data.tema.trim(),
      explicacao:      data.explicacao.trim(),
      status:          'pendente',
    };
    const { data: created, error } = await supabase
      .from('social_posts').insert(payload).select().single();
    if (error) throw error;

    cache.postsByMes.delete(mesId);
    return created;
  }

  async function updatePost(id, data) {
    if (!id) throw new Error('id obrigatório');
    const payload = {};
    if (data.numero !== undefined)          payload.numero          = parseInt(data.numero, 10);
    if (data.data_post !== undefined)       payload.data_post       = data.data_post;
    if (data.linha_editorial !== undefined) payload.linha_editorial = data.linha_editorial;
    if (data.formato !== undefined)         payload.formato         = data.formato;
    if (data.tipo !== undefined)            payload.tipo            = data.tipo;
    if (data.tema !== undefined)            payload.tema            = (data.tema || '').trim();
    if (data.explicacao !== undefined)      payload.explicacao      = (data.explicacao || '').trim();
    if (data.peca !== undefined)            payload.peca            = (data.peca || '').trim() || null;

    const { data: updated, error } = await supabase
      .from('social_posts').update(payload).eq('id', id).select().single();
    if (error) throw error;

    cache.postsByMes.clear();
    return updated;
  }

  async function deletePost(id) {
    if (!id) throw new Error('id obrigatório');
    const { error } = await supabase.from('social_posts').delete().eq('id', id);
    if (error) throw error;
    cache.postsByMes.clear();
    cache.comentariosByPost.delete(id);
    cache.historicoByPost.delete(id);
    return true;
  }


  // ============ EXPORT ============
  window.SocialStore = {
    listMeses, getMes,
    listPosts, approvePost, rejectPost, reopenPost,
    listComentarios, createComentario,
    listHistorico,
    subscribe, ping, calcStats,
    // admin CRUD
    createMes, updateMes, deleteMes, duplicateMes,
    createPost, updatePost, deletePost,
    invalidate() {
      cache.meses = null;
      cache.postsByMes.clear();
      cache.comentariosByPost.clear();
      cache.historicoByPost.clear();
    },
  };
})();
