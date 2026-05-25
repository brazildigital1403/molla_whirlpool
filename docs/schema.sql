-- ============================================================
-- Whirlpool Brasil — Schema Aprovação de Peças (Supabase / Postgres)
-- ============================================================
-- Rodar no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new
-- ============================================================

-- 1) TABELAS
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pieces (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  media_type text not null check (media_type in ('image','video')),
  media_url text not null,
  video_embed_url text,
  copy text not null default '',
  caption text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- Migration retroativa (caso a tabela já exista sem a coluna caption)
alter table public.pieces add column if not exists caption text not null default '';

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  author text not null default 'Anônimo',
  text text not null,
  kind text not null default 'comment' check (kind in ('comment','action','action-rejected')),
  created_at timestamptz not null default now()
);

-- 2) INDEXES
create index if not exists idx_pieces_campaign on public.pieces(campaign_id);
create index if not exists idx_pieces_status on public.pieces(status);
create index if not exists idx_pieces_created on public.pieces(created_at desc);
create index if not exists idx_comments_piece on public.comments(piece_id);
create index if not exists idx_comments_created on public.comments(created_at);
create index if not exists idx_campaigns_created on public.campaigns(created_at desc);

-- 3) RLS habilitado em todas as tabelas
alter table public.campaigns enable row level security;
alter table public.pieces enable row level security;
alter table public.comments enable row level security;

-- 4) POLICIES — abertas (controle de acesso é via senha do app)
drop policy if exists "anon all" on public.campaigns;
create policy "anon all" on public.campaigns
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "anon all" on public.pieces;
create policy "anon all" on public.pieces
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists "anon all" on public.comments;
create policy "anon all" on public.comments
  for all to anon, authenticated
  using (true) with check (true);

-- 5) REALTIME (publicações para sync ao vivo no futuro)
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.pieces;
alter publication supabase_realtime add table public.comments;

-- ============================================================
-- S08 — Histórico de Versões (snapshots automáticos)
-- ============================================================

-- 1) Versão atual da peça
alter table public.pieces add column if not exists version integer not null default 1;
alter table public.pieces add column if not exists link_url text;

-- 2) Tabela de snapshots de versões anteriores
create table if not exists public.piece_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  version integer not null,
  name text not null,
  media_type text not null,
  media_url text not null,
  video_embed_url text,
  copy text not null default '',
  caption text not null default '',
  link_url text,
  status text not null,
  snapshot_at timestamptz not null default now(),
  snapshot_by text
);

create index if not exists idx_piece_versions_piece on public.piece_versions(piece_id);
create index if not exists idx_piece_versions_at on public.piece_versions(snapshot_at desc);

alter table public.piece_versions enable row level security;

drop policy if exists "anon all" on public.piece_versions;
create policy "anon all" on public.piece_versions
  for all to anon, authenticated
  using (true) with check (true);

alter publication supabase_realtime add table public.piece_versions;

-- 3) Permitir kind 'action-update' nos comentários
alter table public.comments drop constraint if exists comments_kind_check;
alter table public.comments add constraint comments_kind_check
  check (kind in ('comment','action','action-rejected','action-update','action-created'));

-- ============================================================
-- S09 — Pins ancorados na imagem (comentários geo-referenciados)
-- ============================================================
alter table public.comments add column if not exists pin_x numeric(5,2);
alter table public.comments add column if not exists pin_y numeric(5,2);
alter table public.comments add column if not exists pin_version integer;

-- ============================================================
-- S19 — Arquivos & Downloads (links SharePoint gerenciáveis)
-- ============================================================
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('ppt','pdf','imagem','planilha','kv','video')),
  descricao text not null default '',
  url text not null,
  data date,
  created_at timestamptz not null default now()
);

create index if not exists idx_files_tipo on public.files(tipo);
create index if not exists idx_files_data on public.files(data desc);
create index if not exists idx_files_created_at on public.files(created_at desc);

alter table public.files enable row level security;

drop policy if exists "anon all" on public.files;
create policy "anon all" on public.files
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (idempotente — não falha se já estiver publicado)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'files'
  ) then
    alter publication supabase_realtime add table public.files;
  end if;
end $$;

-- ============================================================
-- S21 — Jornada da Campanha (Cronograma Macro)
-- Visão temporal de todas as ações: blitz, watch parties, mídia,
-- eventos, aprovações etc. Editável via UI admin (role 'molla').
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null check (categoria in ('midia','blitz','watch','evento','aprovacao','campanha','outros')),
  data_inicio date not null,
  data_fim date,
  descricao text not null default '',
  link_interno text,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_data on public.events(data_inicio);
create index if not exists idx_events_categoria on public.events(categoria);

alter table public.events enable row level security;

drop policy if exists "anon all" on public.events;
create policy "anon all" on public.events
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

-- SEED opcional (descomenta as linhas abaixo se quiser pré-popular alguns
-- eventos da campanha pra ver a tela com dados):
--
-- insert into public.events (titulo, categoria, data_inicio, descricao, link_interno) values
--   ('Blitz Brasil x Marrocos', 'blitz', '2026-06-13', 'Blitz na Vila Madalena ou Pinheiros, das 17h até o início do jogo às 19h em Nova Jersey.', '/blitz'),
--   ('Blitz Brasil x Haiti', 'blitz', '2026-06-19', 'Blitz na Vila Madalena ou Pinheiros, das 19h até o início do jogo às 21h30 em Filadélfia.', '/blitz'),
--   ('Blitz Escócia x Brasil', 'blitz', '2026-06-24', 'Blitz na Vila Madalena ou Pinheiros, das 17h até o início do jogo às 19h em Miami.', '/blitz'),
--   ('Watch Party Espaço VIP', 'watch', '2026-07-01', 'Reserva de espaço VIP em bar tradicional de transmissão. Data conforme avanço do Brasil.', '/blitz'),
--   ('Watch Party Cinema Time!', 'watch', '2026-07-13', 'Watch Party na final da Copa do Mundo, em parceria com rede de cinema.', '/blitz');

-- ============================================================
-- S22 — Seed da Jornada com ações reais do site
-- Idempotente: usa WHERE NOT EXISTS por (titulo, data_inicio).
-- Pode rodar múltiplas vezes sem duplicar.
-- ============================================================
insert into public.events (titulo, categoria, data_inicio, data_fim, descricao, link_interno)
select * from (values
  ('Proposta Elemidia entregue',                  'campanha',  date '2026-05-08', null,                'Apresentação da proposta de mídia em edifícios para período de 18/05 a 31/05.', '/elemidia'),
  ('Lançamento — Onda 1 (maio)',                  'campanha',  date '2026-05-18', null,                'Início oficial da campanha. Onda 1 de 14 dias com lançamento dos criativos A/B.', '/cronograma'),
  ('Elemidia — Mídia em edifícios',               'midia',     date '2026-05-18', date '2026-05-31',   'Inserções em painéis Elemidia em prédios comerciais de São Paulo. Orçamento R$ 90k.', '/elemidia'),
  ('Marco A/B 1',                                 'midia',     date '2026-05-22', null,                'Primeiro marco de leitura dos lotes A/B da Onda 1.', '/cronograma'),
  ('Marco A/B 2',                                 'midia',     date '2026-05-26', null,                'Segundo marco de leitura A/B. Análise de VTR, CPM e engajamento.', '/cronograma'),
  ('Leitura + Escala dos vencedores',             'midia',     date '2026-05-30', null,                'Análise consolidada da Onda 1. Criativos vencedores recebem maior parcela do orçamento e seguem para Onda 2.', '/cronograma'),
  ('Onda 2 — Intensificação na Copa',             'campanha',  date '2026-06-01', date '2026-06-30',   'Pico de intensidade durante o período da Copa do Mundo. Concentração de mídia + ativações de campo.', '/plano-midia'),
  ('Blitz Brasil x Marrocos',                     'blitz',     date '2026-06-13', null,                'Blitz na Vila Madalena ou Pinheiros, das 17h até o início do jogo às 19h em Nova Jersey.', '/blitz'),
  ('Blitz Brasil x Haiti',                        'blitz',     date '2026-06-19', null,                'Blitz na Vila Madalena ou Pinheiros, das 19h até o início do jogo às 21h30 em Filadélfia.', '/blitz'),
  ('Blitz Escócia x Brasil',                      'blitz',     date '2026-06-24', null,                'Blitz na Vila Madalena ou Pinheiros, das 17h até o início do jogo às 19h em Miami.', '/blitz'),
  ('Onda 3 — Otimização e consolidação',          'campanha',  date '2026-07-01', date '2026-07-31',   'Última onda da campanha. Foco em otimização e consolidação de aprendizados pós-Copa.', '/plano-midia'),
  ('Watch Party · Cinema Time!',                  'watch',     date '2026-07-13', null,                'Watch Party na final da Copa do Mundo, em parceria com rede de cinema. Whirlpool Stadium ambientado.', '/blitz'),
  ('Encerramento da campanha',                    'campanha',  date '2026-07-31', null,                'Marco de encerramento. Análise final de performance e relatório consolidado.', '/cronograma')
) as v(titulo, categoria, data_inicio, data_fim, descricao, link_interno)
where not exists (
  select 1 from public.events e
  where e.titulo = v.titulo and e.data_inicio = v.data_inicio
);

-- ============================================================
-- S23 — Fix do check constraint da tabela events
-- Caso o constraint tenha sido criado errado (com cedilha em
-- "aprovação" ou outras divergências), este bloco recria com a
-- lista correta. Idempotente — pode rodar múltiplas vezes.
-- ============================================================
do $$
declare
  cons_name text;
begin
  -- Localiza o nome do constraint atual (pode variar dependendo de quando foi criado)
  select conname into cons_name
    from pg_constraint
   where conrelid = 'public.events'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%categoria%';
  if cons_name is not null then
    execute format('alter table public.events drop constraint %I', cons_name);
  end if;
  alter table public.events
    add constraint events_categoria_check
    check (categoria in ('midia','blitz','watch','evento','aprovacao','campanha','outros'));
end $$;

-- Diagnóstico (opcional): ver constraint atual
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid = 'public.events'::regclass and contype = 'c';

-- ============================================================
-- S40 — Criativos (peça-conceito) + Variações + Comentário Geral
-- Introduz a hierarquia: Campanha → Criativo → Variação → Versões/Coments.
-- Migração completa em docs/S40_criativos_e_variacoes.sql
-- ============================================================

-- Tabela piece_concepts
create table if not exists public.piece_concepts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_piece_concepts_campaign on public.piece_concepts(campaign_id);
create index if not exists idx_piece_concepts_position on public.piece_concepts(position);
create index if not exists idx_piece_concepts_created on public.piece_concepts(created_at desc);

-- Colunas novas em pieces (cada peça é uma variação)
alter table public.pieces add column if not exists concept_id uuid references public.piece_concepts(id) on delete cascade;
alter table public.pieces add column if not exists variant_label text;
alter table public.pieces add column if not exists variant_order integer not null default 0;

-- Backfill defensivo (em novos deploys com pieces pré-existentes)
do $$
declare
  rec record;
  new_concept_id uuid;
begin
  for rec in select id, campaign_id, name, created_at from public.pieces where concept_id is null loop
    insert into public.piece_concepts (campaign_id, title, created_at, updated_at)
    values (rec.campaign_id, rec.name, rec.created_at, rec.created_at)
    returning id into new_concept_id;
    update public.pieces set concept_id = new_concept_id,
           variant_label = coalesce(variant_label, 'Única'),
           variant_order = coalesce(variant_order, 0)
     where id = rec.id;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from public.pieces where concept_id is null) then
    alter table public.pieces alter column concept_id set not null;
  end if;
end $$;

create index if not exists idx_pieces_concept on public.pieces(concept_id);

-- Comments aceita concept_id (comentário geral)
alter table public.comments add column if not exists concept_id uuid references public.piece_concepts(id) on delete cascade;
alter table public.comments alter column piece_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'comment_target_xor'
       and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comment_target_xor
      check ((piece_id is null) <> (concept_id is null));
  end if;
end $$;

create index if not exists idx_comments_concept on public.comments(concept_id);

alter table public.piece_concepts enable row level security;
drop policy if exists "anon all" on public.piece_concepts;
create policy "anon all" on public.piece_concepts
  for all to anon, authenticated
  using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'piece_concepts'
  ) then
    alter publication supabase_realtime add table public.piece_concepts;
  end if;
end $$;
