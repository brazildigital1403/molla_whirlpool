-- ============================================================
-- S44 — SYNC DA JORNADA COM MÍDIA v3 + CRONOGRAMA v2
-- Data:    14/05/2026
-- Aplicar: Supabase Dashboard → SQL Editor → Run
--
-- O que faz:
--   • 4 UPDATEs em eventos defasados
--   • 6 INSERTs de eventos novos (5 da proposta + 1 do "Opção C")
--   • SELECT final pra conferência
--
-- Segurança:
--   Tudo em transação. Se algo parecer errado no SELECT do fim,
--   troque o COMMIT pelo ROLLBACK que nada é gravado.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOCO 1 · UPDATEs (4 eventos defasados)
-- ============================================================

-- 1.1 · Lançamento Onda 1 (18/05) — descrição atualizada com 28 dias + LinkedIn
UPDATE events
SET
  descricao    = 'Início oficial da campanha. Onda 1 de 28 dias (R$ 102K bruto · 30% da verba). Vai ao ar: manifesto principal, peça estática conceito, vídeo institucional LinkedIn e Lead Gen Corretores. Foco: reconhecimento + captação B2B.',
  link_interno = '/plano-midia#ondas'
WHERE titulo      = 'Lançamento — Onda 1 (maio)'
  AND data_inicio = '2026-05-18';

-- 1.2 · Leitura 30/05 — passa a ser intermediária (Onda 1 só termina em 14/06)
UPDATE events
SET
  titulo       = 'Leitura intermediária · Onda 1',
  descricao    = 'Análise consolidada de VTR, CPM e engajamento dos lotes A/B 1 e 2. Criativos vencedores recebem maior parcela do orçamento dentro da própria Onda 1. A Onda 1 segue até 14/06.',
  link_interno = '/cronograma'
WHERE titulo      = 'Leitura + Escala dos vencedores'
  AND data_inicio = '2026-05-30';

-- 1.3 · Onda 2 — datas corrigidas: 15/06 a 12/07 (28 dias · R$ 136K)
UPDATE events
SET
  data_inicio  = '2026-06-15',
  data_fim     = '2026-07-12',
  descricao    = 'Onda 2 (28 dias · R$ 136K bruto · 40% da verba). Pico de atenção da Copa. Meta com maior frequência + YouTube com cortes curtos + LinkedIn institucional V2 + Engajamento B2B (Document Ad). Foco: escala + frequência + intensificação B2B.',
  link_interno = '/plano-midia#ondas'
WHERE titulo      = 'Onda 2 — Intensificação na Copa'
  AND data_inicio = '2026-06-01';

-- 1.4 · Onda 3 — datas corrigidas: 13/07 a 31/07 (19 dias · R$ 102K)
UPDATE events
SET
  data_inicio  = '2026-07-13',
  data_fim     = '2026-07-31',
  descricao    = 'Onda 3 (19 dias · R$ 102K bruto · 30% da verba). Retargeting Meta + LinkedIn Retargeting B2B + reforço institucional. Foco: reimpactar quem viu, gerar ação leve e fechar jornada B2B.',
  link_interno = '/plano-midia#ondas'
WHERE titulo      = 'Onda 3 — Otimização e consolidação'
  AND data_inicio = '2026-07-01';


-- ============================================================
-- BLOCO 2 · INSERTs (6 eventos novos)
-- ============================================================

-- 2.1 · LP de Corretores publicada (15/05) — pré-requisito Lead Gen LinkedIn
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'LP de Corretores no ar',
  'outros',
  '2026-05-15',
  NULL,
  'Pré-requisito de produção: landing page dedicada para corretores publicada antes do lançamento. Sustenta a campanha Lead Gen LinkedIn da Onda 1 e recebe os cliques pagos com pixel de retargeting Meta e LinkedIn instalado.',
  '/plano-midia#linkedin'
);

-- 2.2 · Aprovação peças LinkedIn (06/05 a 18/05) — antes do lançamento
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'Aprovação peças LinkedIn',
  'aprovacao',
  '2026-05-06',
  '2026-05-18',
  'Aprovação das peças da camada B2B do LinkedIn antes do lançamento: vídeo institucional, Lead Gen Form (corretores) e estáticos de apoio. Ondas 1, 2 e 3.',
  '/aprovacao'
);

-- 2.3 · Fim da Onda 1 + escala pra Onda 2 (14/06) — Opção C confirmada
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'Fim da Onda 1 + escala para Onda 2',
  'midia',
  '2026-06-14',
  NULL,
  'Encerramento oficial da Onda 1. Análise final dos lotes A/B + escala dos criativos vencedores. Preparação para o pico de mídia da Onda 2 (Intensificação) que começa em 15/06.',
  '/cronograma'
);

-- 2.4 · LinkedIn Engajamento B2B (18/06) — 3ª campanha LinkedIn exclusiva Onda 2
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'LinkedIn · Engajamento B2B (Document Ad)',
  'midia',
  '2026-06-18',
  NULL,
  'Início da 3ª campanha LinkedIn (exclusiva da Onda 2 · R$ 10K bruto). Document Ad com conteúdo aprofundado sobre proteção e Whirlpool Foundation. Captura público qualificado para o retargeting da Onda 3.',
  '/plano-midia#linkedin'
);

-- 2.5 · LinkedIn Retargeting (15/07) — virada estratégica na Onda 3
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'LinkedIn · Retargeting B2B',
  'midia',
  '2026-07-15',
  NULL,
  'Virada da estratégia LinkedIn na Onda 3: começa o retargeting de leads frios + reforço institucional. Fecha a jornada B2B impactando quem engajou nas Ondas 1 e 2.',
  '/plano-midia#linkedin'
);

-- 2.6 · Última escala antes do encerramento (29/07)
INSERT INTO events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
VALUES (
  'Última escala · pré-encerramento',
  'midia',
  '2026-07-29',
  NULL,
  'Última leitura consolidada da campanha. Análise de performance acumulada antes do encerramento em 31/07. Base para o relatório final.',
  '/cronograma'
);


-- ============================================================
-- CONFERÊNCIA · linha do tempo completa após sync
-- ============================================================
SELECT
  data_inicio,
  data_fim,
  categoria,
  titulo
FROM events
ORDER BY data_inicio ASC, created_at ASC;


-- ============================================================
-- Se o SELECT acima estiver OK → rode:    COMMIT;
-- Se quiser desfazer tudo →                ROLLBACK;
-- ============================================================
COMMIT;
