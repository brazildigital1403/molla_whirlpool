-- ============================================================
-- Whirlpool Brasil · Schema Social (pré-pauta editorial)
-- ------------------------------------------------------------
-- Estrutura para gerenciar pré-pauta mensal de social media,
-- com aprovação por publicação, comentários e histórico.
--
-- Rodar no SQL Editor do Supabase (uma vez).
-- Depois rodar social_seed_junho.sql para popular Junho 2026.
-- ============================================================

-- ============================================================
-- 1) TABELA · social_meses
--    Cada mês é uma pré-pauta completa.
-- ============================================================
CREATE TABLE IF NOT EXISTS social_meses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,         -- ex.: '2026-06'
  ano         INT  NOT NULL,
  mes         INT  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  nome        TEXT NOT NULL,                -- ex.: 'Junho 2026'
  tema        TEXT,                         -- ex.: 'Precisão que classifica'
  estrategia  TEXT,                         -- ex.: 'Placas, filtros e mecanismos'
  campanha    TEXT,                         -- ex.: 'Campanha Copa do Mundo 2026 + Always On'
  conceito    TEXT,                         -- texto longo do conceito do mês
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_meses_ano_mes ON social_meses(ano, mes);

-- ============================================================
-- 2) TABELA · social_posts
--    Cada publicação da pré-pauta.
-- ============================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_id             UUID NOT NULL REFERENCES social_meses(id) ON DELETE CASCADE,
  numero             INT  NOT NULL,
  data_post          DATE NOT NULL,

  peca               TEXT,                  -- 'Mecanismo' | 'Placa' | 'Filtro' | 'Geral' | NULL
  linha_editorial    TEXT NOT NULL,         -- 'institucional' | 'conhecimento' | 'resolucao' | 'boas_praticas' | 'humor'
  formato            TEXT NOT NULL,         -- 'carrossel' | 'estatico' | 'reels' | 'carrossel_reels'
  tipo               TEXT NOT NULL DEFAULT 'always_on' CHECK (tipo IN ('campanha','always_on')),

  tema               TEXT NOT NULL,         -- título do post
  explicacao         TEXT NOT NULL,         -- briefing completo

  status             TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  aprovado_por       TEXT,
  aprovado_em        TIMESTAMPTZ,
  reprovado_por      TEXT,
  reprovado_em       TIMESTAMPTZ,
  reprovacao_motivo  TEXT,                  -- texto obrigatório ao reprovar

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_mes      ON social_posts(mes_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status   ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_data     ON social_posts(data_post);
CREATE INDEX IF NOT EXISTS idx_social_posts_linha    ON social_posts(linha_editorial);
CREATE INDEX IF NOT EXISTS idx_social_posts_tipo     ON social_posts(tipo);

-- ============================================================
-- 3) TABELA · social_comentarios
--    Thread de comentários por publicação.
-- ============================================================
CREATE TABLE IF NOT EXISTS social_comentarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  autor       TEXT NOT NULL,                -- nome do usuário
  role        TEXT NOT NULL CHECK (role IN ('cliente','molla')),
  texto       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_comentarios_post ON social_comentarios(post_id, created_at);

-- ============================================================
-- 4) TABELA · social_historico
--    Audit log de mudanças de status.
--    Cada aprovação/reprovação gera 1 linha aqui.
-- ============================================================
CREATE TABLE IF NOT EXISTS social_historico (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  status_de     TEXT,                       -- estado anterior (NULL na criação)
  status_para   TEXT NOT NULL,
  autor         TEXT NOT NULL,
  role          TEXT NOT NULL,
  observacao    TEXT,                       -- ex.: motivo da reprovação
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_historico_post ON social_historico(post_id, created_at);

-- ============================================================
-- 5) TRIGGER · updated_at automático em social_posts e social_meses
-- ============================================================
CREATE OR REPLACE FUNCTION social_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON social_posts;
CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION social_set_updated_at();

DROP TRIGGER IF EXISTS trg_social_meses_updated_at ON social_meses;
CREATE TRIGGER trg_social_meses_updated_at
  BEFORE UPDATE ON social_meses
  FOR EACH ROW EXECUTE FUNCTION social_set_updated_at();

-- ============================================================
-- 6) REALTIME · habilita pub/sub nessas tabelas
-- ============================================================
-- Atenção: se a publication já existir, o ADD pode dar erro.
-- Rode com cuidado — pular se já estiver.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_meses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_comentarios;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_historico;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- 7) RLS POLICIES · "anon all" igual ao padrão do projeto
-- ------------------------------------------------------------
-- O projeto Whirlpool cria tabelas com RLS habilitado por padrão.
-- Sem nenhuma policy, a publishable key (anon) NÃO consegue ler
-- nada. Replicamos o mesmo padrão já usado em campaigns/files/etc.
-- ============================================================
DROP POLICY IF EXISTS "anon all" ON social_meses;
CREATE POLICY "anon all" ON social_meses
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon all" ON social_posts;
CREATE POLICY "anon all" ON social_posts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon all" ON social_comentarios;
CREATE POLICY "anon all" ON social_comentarios
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon all" ON social_historico;
CREATE POLICY "anon all" ON social_historico
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- FIM · Schema Social Whirlpool
-- ============================================================
