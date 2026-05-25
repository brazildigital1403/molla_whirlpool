# 🗺️ Roadmap — MetLife Brasil 2026

Lista viva de melhorias e features candidatas pro hub. Ordem por prioridade
sugerida (não por ordem de execução). Atualizar conforme decidir cada sessão.

---

## ✅ Concluídos

- **Jornada da Campanha** (S21–S22) — visão temporal de todas as ações,
  filtrável por categoria, com CRUD admin via Supabase. Seed inicial com 13
  eventos reais aplicado em S22.
- **Vídeo iframe na Aprovação** (S25–S26) — peças com vídeo agora embutem
  player de YouTube/Vimeo/SharePoint corporativo/Google Drive direto. Fallback
  gracioso pra SharePoint pessoal (com aviso explicativo).
- **Dashboard na home da Aprovação** (S27) — visão consolidada de todas as
  campanhas com KPIs (pendentes/aprovadas/reprovadas/total) + barra de
  progresso + filtro "Com pendência" pra focar em quem precisa de atenção.
- **Comparação V1 vs V2 lado a lado** (S27) — modal de Histórico agora tem
  toggle Lista/Comparar. Modo compare mostra 2 versões lado a lado com
  destaque visual nas diferenças (campo a campo) + selects pra escolher
  qualquer combinação.
- **Audit log na timeline** (S29) — peças agora registram criação, edição
  (versionamento), aprovação e reprovação como eventos visuais na sidebar
  de comentários, com ícone específico (＋ / ✎ / ✓ / ✕) e cor por tipo.
  Histórico completo de "quem fez o quê quando" sem sair da peça.
- **Markdown leve nos comentários** (S29) — comentários aceitam `**negrito**`,
  `_itálico_`, `[texto](url)` e autolink de URLs. XSS bloqueado (links
  `javascript:` ignorados, HTML escapado). Hint visual abaixo do input.
- **Criativos + Variações — Fase 1 Backend** (S40) — modelo de dados novo
  com hierarquia `Criativo → Variações → Versões`. Migration SQL idempotente
  (`docs/S40_criativos_e_variacoes.sql`), nova tabela `piece_concepts`,
  pieces com `concept_id` + `variant_label` + `variant_order`, comments
  aceita `concept_id` (comentário geral do criativo) com constraint XOR.
  12 métodos novos no Store (loadConcepts, addConcept, addVariant,
  aggregateStatus, loadConceptComments, etc). API antiga 100% compatível:
  `addPiece` sem `conceptId` cria criativo-pai com 1 variação "Única"
  silenciosamente. 30 testes novos.
- **Criativos + Variações — Fase 2 UI Listagem** (S40) — listagem da
  campanha passa a mostrar **criativos** (não mais peças soltas). Card
  com 1 variação "Única" renderiza igual ao antigo, mas ganha botão
  discreto "+ Variação". Card com 2+ variações vira **concept-card**
  com galeria horizontal de thumbs, status agregado ("2/5 aprovadas"),
  botão "+ Variação", mini-btn de editar criativo. Modal **"Novo Criativo"**
  substitui "+ Nova Peça": campos título + descrição + 1ª variação
  inline. Modal **"+ Adicionar Variação"** com label sugerido (Opção B/C/D…).
  Filtros (Todos/Pendentes/Aprovados/Reprovados) agora agregam por
  criativo. KPIs continuam contando variações (unidade de decisão).
  43 testes novos.
- **Criativos + Variações — Fase 3 ConceptView** (S40) — nova tela
  dedicada ao detalhe do criativo (`#/c/<cid>/k/<kid>/v/<vid>`). Layout
  com header (breadcrumb + status agregado + ações), **galeria horizontal**
  de variações com thumb selecionada destacada em azul, **área de foco**
  com preview + painel direito de aprovação/reprovação e comentários
  por variação (pins incluídos), navegação ← → (teclado + botões),
  **accordion "Comentário geral do criativo"** no rodapé usando os
  métodos `loadConceptComments`/`addConceptComment`. Reusa toda a infra
  de pins (overlay, drag, edit < 5min), versionamento (botão Histórico)
  e edição de variação (modal `openPiece` antigo). Click em qualquer
  thumb da listagem da campanha agora navega pra esta tela.
  39 testes novos.
- **Criativos + Variações — Fase 4 Polish** (S40 — completa!) —
  atalhos teclado completos no ConceptView: **A** aprova, **R** reprova,
  **C** foca no campo de comentário (sai do estado atual e digita), além
  do ← → da Fase 3. Atalhos ignorados quando cursor está em input
  (exceto C, que move foco PRA input). Hint visual com `<kbd>` no
  cv-focus-head (só desktop). **Tabs mobile** no painel direito:
  Aprovação | Comentários alterna conteúdo em telas ≤ 720px; desktop
  mostra ambos lado a lado. **Transições suaves** (220ms fade-in do
  foco, pop discreto da thumb selecionada) respeitando
  `prefers-reduced-motion`. Acessibilidade: `aria-selected` nos tabs.
  37 testes novos. **S40 fechado**: 4 fases, 149 testes novos,
  zero regressão nos 318 testes pré-S40.

## 🟢 Próximas sessões

_S40 fechado! Próxima escolha aberta — opções organizadas abaixo por prioridade._

---

## 🔥 Alto impacto

### 1. Notificações de aprovação (e-mail/Slack)
Disparar e-mail (Resend, Supabase Edge Function) ou Slack quando:
- Peça nova é submetida
- Comentário é postado
- Status muda (aprovado/reprovado)

Destrava o ciclo de aprovação na prática — não fica refém de "o cliente entrou
no sistema?".

### 2. Brand Guide / Briefing
Página `/marca` com logo, paleta, fonts, tom de voz, "do's and don'ts".
Hoje tudo espalhado em PowerPoint. Plugar no Supabase pra editar via admin.

---

## 🪄 Quick wins (1-2h cada)

### 3. Atalhos de teclado na Aprovação
- `A` aprova
- `R` reprova
- `J/K` navega entre peças
- `C` foca no campo de comentário

### 4. Tags/labels nas peças
"TV", "Digital", "OOH", "9:16", "16:9". Permite filtrar dentro de uma campanha.

---

## 🏗️ Estruturais (médio prazo)

### 10. Login real (Supabase Auth)
Hoje 2 senhas compartilhadas (`metlife2026`, `molla@2026@`). Quando alguém sai,
todo mundo precisa trocar. Migrar pra Supabase Auth (e-mail + magic link).
Ganhos: audit log automático, perfis por pessoa, controle granular de
permissões.

### 11. Cronograma A/B, Mídia e Elemidia plugados no Supabase
Hoje os 3 são dados hardcoded em arquivos `.js`. Se MetLife pedir mudança,
Mia precisa refazer código. Editáveis pelo admin (igual Arquivos virou) =
autonomia total.

### 12. Migrations separadas
Quebrar o `schema.sql` em `001_initial.sql`, `002_pins.sql`, `003_files.sql`,
`004_events.sql` etc. Mais profissional e fácil de aplicar em ambiente novo.

### 13. Storage do Supabase pra peças críticas
Hoje peças apontam pra URL externa. Se a URL morrer, peça quebra. Considerar
upload direto no Storage do Supabase pras peças importantes.

---

## 🌟 Nice to have (não fazer agora)

- **KPIs/analytics da campanha** — pós-Copa quando tiver dados reais.
- **Modo apresentação fullscreen** — pra pitches em reunião.
- **PWA / instalar como app** — bom pra mobile.
- **Dark mode** — estética.
- **Export/print** — gerar PDF de campanha aprovada.
- **Estado offline** — service worker + cache.

---

## 🧪 DevEx / Operacional

- **CI** — rodar os testes em cada PR (GitHub Actions).
- **Backup automatizado** do Supabase (já vem com Pro mas confirmar).
- **Monitoring** — Plausible/Umami pra analytics, Sentry pra erros.
- **Auditar config.js** — `SUPABASE_KEY` consistente em todo store
  (já corrigido na S19.2 mas vale uma passada geral).

---

_Última atualização: S21 — Jornada da Campanha._
