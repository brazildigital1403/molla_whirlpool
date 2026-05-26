-- ============================================================
-- Whirlpool Brasil · Migration · Admin de Social
-- ------------------------------------------------------------
-- Pra quem já rodou social_schema.sql antes do admin existir.
-- Só adiciona realtime na tabela social_meses (faltava).
--
-- Idempotente: se já estiver na publication, ignora.
-- ============================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_meses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- Verificação opcional · lista as tabelas com realtime ativo
-- ============================================================
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
--   AND tablename LIKE 'social_%';
