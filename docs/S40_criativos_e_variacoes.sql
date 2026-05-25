-- ============================================================
-- S40 — Criativos (peça-conceito) + Variações + Comentário Geral
-- ============================================================
-- Introduz a hierarquia:
--   Campanha → Criativo → Variação → Versões/Comentários/Pins
--
-- "Criativo" (piece_concepts) é a peça-conceito. Tem 1 ou N variações.
-- "Variação" continua sendo a tabela pieces (com concept_id setado).
-- "Comentário geral" são comments com concept_id (e piece_id NULL).
--
-- Migration é IDEMPOTENTE — pode rodar várias vezes sem quebrar.
-- Toda peça existente vira 1 criativo com 1 variação chamada "Única".
--
-- Rodar no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) TABELA piece_concepts (criativos)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 2) COLUNAS NOVAS em pieces (concept_id, variant_label, variant_order)
-- ─────────────────────────────────────────────────────────────
alter table public.pieces add column if not exists concept_id uuid references public.piece_concepts(id) on delete cascade;
alter table public.pieces add column if not exists variant_label text;
alter table public.pieces add column if not exists variant_order integer not null default 0;

-- ─────────────────────────────────────────────────────────────
-- 3) BACKFILL — cada piece existente vira 1 concept com 1 variação
-- ─────────────────────────────────────────────────────────────
do $$
declare
  rec record;
  new_concept_id uuid;
begin
  for rec in
    select id, campaign_id, name, created_at
      from public.pieces
     where concept_id is null
     order by created_at
  loop
    insert into public.piece_concepts (campaign_id, title, created_at, updated_at)
    values (rec.campaign_id, rec.name, rec.created_at, rec.created_at)
    returning id into new_concept_id;

    update public.pieces
       set concept_id    = new_concept_id,
           variant_label = coalesce(variant_label, 'Única'),
           variant_order = coalesce(variant_order, 0)
     where id = rec.id;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4) concept_id em pieces vira NOT NULL (só depois do backfill)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.pieces where concept_id is null) then
    alter table public.pieces alter column concept_id set not null;
  end if;
end $$;

create index if not exists idx_pieces_concept on public.pieces(concept_id);

-- ─────────────────────────────────────────────────────────────
-- 5) COMMENTS aceita concept_id (pra comentários gerais do criativo)
-- ─────────────────────────────────────────────────────────────
alter table public.comments
  add column if not exists concept_id uuid references public.piece_concepts(id) on delete cascade;

-- piece_id passa a ser nullable (comentário geral não tem peça-alvo)
alter table public.comments alter column piece_id drop not null;

-- Constraint XOR: comentário deve referenciar EXATAMENTE 1 dos dois
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

-- ─────────────────────────────────────────────────────────────
-- 6) RLS + POLICY na nova tabela (mesmo padrão das outras)
-- ─────────────────────────────────────────────────────────────
alter table public.piece_concepts enable row level security;

drop policy if exists "anon all" on public.piece_concepts;
create policy "anon all" on public.piece_concepts
  for all to anon, authenticated
  using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 7) REALTIME (idempotente)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'piece_concepts'
  ) then
    alter publication supabase_realtime add table public.piece_concepts;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 8) DIAGNÓSTICO (opcional — comentado por padrão)
-- ─────────────────────────────────────────────────────────────
-- Quantos criativos foram criados pelo backfill?
-- select count(*) as total_concepts from public.piece_concepts;
--
-- Quantas peças têm concept_id setado?
-- select count(*) filter (where concept_id is not null) as com_concept,
--        count(*) filter (where concept_id is null) as sem_concept,
--        count(*) as total
--   from public.pieces;
--
-- Listar criativos com contagem de variações:
-- select pc.title, pc.created_at, count(p.id) as variacoes
--   from public.piece_concepts pc
--   left join public.pieces p on p.concept_id = pc.id
--  group by pc.id, pc.title, pc.created_at
--  order by pc.created_at desc;
