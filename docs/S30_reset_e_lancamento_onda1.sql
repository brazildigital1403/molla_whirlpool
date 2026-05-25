-- =============================================================
-- S30 — Reset das peças de teste + cadastro do Lançamento Onda 1
-- Aplicar no Supabase Dashboard → SQL Editor
-- =============================================================
-- O QUE ESTE SCRIPT FAZ:
--   1) Estende o check constraint de `kind` em comments pra incluir 'action-created'
--      (necessário pra audit log da S29 funcionar em peças novas)
--   2) Apaga TODAS as campanhas/peças/comentários/versões existentes
--   3) Cria a campanha "Lançamento Onda 1"
--   4) Cadastra 7 peças com os links de SharePoint enviados pelo cliente
--
-- AVISO IMPORTANTE — SharePoint pessoal:
--   Todos os links são `mollaincentive-my.sharepoint.com` (OneDrive Business).
--   A Microsoft bloqueia embed por design — o app vai exibir o placeholder
--   âmbar com "Abrir em nova aba" pra cada peça. Pra ter player embutido
--   real, hospedar em YouTube/Vimeo ou SharePoint corporativo (sem o `-my`).
-- =============================================================

-- 1) FIX DO CONSTRAINT (kind precisa aceitar 'action-created' — S29)
alter table public.comments drop constraint if exists comments_kind_check;
alter table public.comments add constraint comments_kind_check
  check (kind in ('comment','action','action-rejected','action-update','action-created'));

-- 2) LIMPA tudo (CASCADE pega comments, piece_versions, comment_pins automaticamente)
delete from comments;
delete from piece_versions;
delete from pieces;
delete from campaigns;

-- 3) CRIA CAMPANHA + INSERE PEÇAS (atômico via bloco PL/pgSQL)
do $$
declare
  cid uuid;
begin
  -- Cria a campanha
  insert into campaigns (name, type)
  values ('Lançamento Onda 1', 'Lançamento')
  returning id into cid;

  -- Insere as 7 peças
  insert into pieces (campaign_id, name, media_type, media_url, video_embed_url, copy, caption, link_url, status, version)
  values
    (
      cid,
      'Feed (1:1) — 6 opções',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDhsCDqf9JmTJcneo11DWrVAT6sDKz-aSQvm_FWJDNxiPg?e=dJC1Qa',
      null,
      '6 criativos no formato 1:1 (feed) seguindo a direção "pergunta + assinatura": 2 focados em Planos Odontológicos ("Patrocinadora oficial do sorriso dos brasileiros"), 2 em Seguro de Vida ("Patrocinadora oficial do cuidado com os brasileiros") e 2 em Corretores ("Patrocinadora oficial do nosso time de craques").',
      'Mensagem simples e direta · Foco em pessoas · Base no KV aprovado · #MetLifeBrasil',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDhsCDqf9JmTJcneo11DWrVAT6sDKz-aSQvm_FWJDNxiPg?e=dJC1Qa',
      'pending',
      1
    ),
    (
      cid,
      'Stories / Reels (9:16) — 6 opções',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDwBows4V17Rrj0dqMOvawaAeYQwwameX5uerHLx2tuOCc?e=9j1eoJ',
      null,
      'As mesmas 6 mensagens da peça de Feed, agora no formato vertical 9:16 para Stories e Reels. Mantém a direção criativa (pergunta + assinatura), o tom e a paleta da campanha.',
      'Formato 9:16 · 6 variações · #MetLifeBrasil',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDwBows4V17Rrj0dqMOvawaAeYQwwameX5uerHLx2tuOCc?e=9j1eoJ',
      'pending',
      1
    ),
    (
      cid,
      'Vídeo 15s (1:1 · 9:16 · 16:9)',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDc-fd-QaRpRJqBkvn2VGtUAakDv1I8ut954mIBi1umYKg?e=RrlcSv',
      null,
      'Versão curta (15 segundos) do filme de lançamento em três formatos: quadrado 1:1 (feed), vertical 9:16 (Stories/Reels) e horizontal 16:9 (YouTube/web).',
      'Lançamento Onda 1 · Versão 15s · 3 aspectos',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgDc-fd-QaRpRJqBkvn2VGtUAakDv1I8ut954mIBi1umYKg?e=RrlcSv',
      'pending',
      1
    ),
    (
      cid,
      'Vídeo 30s (1:1 · 9:16 · 16:9)',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgAu1BOE4RKiRbiIjg1oZiURAc35XefcZKxs5tlvhr6w6P0?e=cJjlaf',
      null,
      'Versão longa (30 segundos) do filme de lançamento em três formatos: quadrado 1:1 (feed), vertical 9:16 (Stories/Reels) e horizontal 16:9 (YouTube/web). Pra peças de manifesto e patrocínios mais robustos.',
      'Lançamento Onda 1 · Versão 30s · 3 aspectos',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgAu1BOE4RKiRbiIjg1oZiURAc35XefcZKxs5tlvhr6w6P0?e=cJjlaf',
      'pending',
      1
    ),
    (
      cid,
      'Vídeo LinkedIn (1:1 · 16:9)',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBL_9ZYWF9uTrzc1nIGxdK_AVW2b8uNx1bx9W-yj3zC-EA?e=mcD48s',
      null,
      'Versões otimizadas para LinkedIn em dois formatos: quadrado 1:1 (feed mobile) e horizontal 16:9 (feed desktop). Pegada institucional com foco nos corretores e no time de craques.',
      'LinkedIn · 1:1 e 16:9 · #MetLifeBrasil #TimeDeCraques',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBL_9ZYWF9uTrzc1nIGxdK_AVW2b8uNx1bx9W-yj3zC-EA?e=mcD48s',
      'pending',
      1
    ),
    (
      cid,
      'Shorts 6s e 10s',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBw4w4j8ft3TK4No6_CK5KHATB51eODsXEOqHpUHnsBvfQ?e=p04Qzz',
      null,
      'Bumpers ultracurtos (6 e 10 segundos) para pré-roll do YouTube e formatos non-skippable. Mensagem direta com a assinatura da campanha.',
      'Bumper · 6s e 10s · YouTube pré-roll',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBw4w4j8ft3TK4No6_CK5KHATB51eODsXEOqHpUHnsBvfQ?e=p04Qzz',
      'pending',
      1
    ),
    (
      cid,
      'Short 15s',
      'video',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBSVF81fDtYQqGCm-1HxiUkATwgaXooDJcnF_eFatz3SfQ?e=GENuw4',
      null,
      'Versão short de 15 segundos para mídia paga em redes sociais e display de vídeo.',
      'Short · 15s',
      'https://mollaincentive-my.sharepoint.com/:f:/g/personal/eduardo_willian_agenciamolla_com_br/IgBSVF81fDtYQqGCm-1HxiUkATwgaXooDJcnF_eFatz3SfQ?e=GENuw4',
      'pending',
      1
    );

  raise notice 'S30 OK: Campanha "Lançamento Onda 1" criada com 7 peças.';
end $$;

-- 4) CONFERÊNCIA (opcional — executar pra ver o resultado)
select c.name as campanha, c.type as tipo,
       count(p.id) as total_pecas,
       sum(case when p.status = 'pending' then 1 else 0 end) as pendentes,
       sum(case when p.status = 'approved' then 1 else 0 end) as aprovadas,
       sum(case when p.status = 'rejected' then 1 else 0 end) as reprovadas
from campaigns c
left join pieces p on p.campaign_id = c.id
group by c.id, c.name, c.type;

-- Lista as 7 peças criadas
select p.name, p.media_type, p.status, p.version,
       case when length(p.copy) > 60 then substring(p.copy, 1, 60) || '...' else p.copy end as copy_preview
from pieces p
join campaigns c on c.id = p.campaign_id
where c.name = 'Lançamento Onda 1'
order by p.created_at;
