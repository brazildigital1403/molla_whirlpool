# MASTER · Hub Whirlpool Brasil

> Snapshot vivo do estado do projeto.
> Atualizar ao final de cada sessão grande.

---

## 🧭 Visão geral

- **Cliente**: Whirlpool Corporation (Whirlpool Brasil)
- **Agência**: Molla
- **Tipo**: Hub interno agência → cliente, padrão "Central do Cliente"
- **Stack**: HTML/CSS/JS vanilla + Vercel + Supabase + GitHub
- **Origem**: Adaptado do template `hub_cliente_template_v1` (MetLife)

## 🌐 Links

| Recurso | URL |
|---|---|
| Repo GitHub | https://github.com/brazildigital1403/molla_whirlpool |
| Vercel | https://vercel.com/brazildigital1403s-projects/molla-whirlpool |
| Supabase | https://exyqqiquhiswrhcpdemf.supabase.co |
| Produção (Vercel) | a confirmar após primeiro deploy |
| Pasta local (Du) | `~/Library/CloudStorage/GoogleDrive-eduardo@brazildigital.ag/Meu Drive/BRAZILDIGITAL/SITES/WHIRLPOOL_BRASIL` |

## 🎨 Identidade visual

| Token | Hex | Função |
|---|---|---|
| `--navy` | `#0D436B` | Títulos, cor primária |
| `--blue` | `#00A0DD` | Accent, detalhes |
| `--success` | `#50E596` | Estados positivos (no `:root` global) |
| `--light` | `#F1F5F9` | Fundo de boxes |
| `--white` | `#FFFFFF` | Fundo geral |
| `--muted` | `#5B7280` | Texto secundário |

- Logos em `public/img/`: `logo_whirlpool.webp` (preto, header/favicon), `logo_whirlpool_white.png` (branco, reserva), `logo_molla.svg` (footer).
- Fonte: Arial nativa (sem webfont externa).

## 🔐 Senhas

| Role | Senha | Permissões |
|---|---|---|
| `cliente` | `whirlpool2026` | Ver tudo, comentar, aprovar |
| `molla` | `molla@2026@` | Tudo + criar/editar/excluir (admin) |

Definidas em `public/assets/auth.js`. localStorage keys: `whirlpool_auth`, `whirlpool_role`, `whirlpool_user`.

## 🗺️ Estrutura de páginas

| Página | Rota | Tipo | Status |
|---|---|---|---|
| Hub | `/` | base | ✅ pronto |
| Login | `/login` | base | ✅ pronto |
| Jornada | `/jornada` | base | ✅ pronto (template, conteúdo no Supabase) |
| Social | `/social` | nova | 🚧 placeholder, aguarda briefing |
| Aprovação | `/aprovacao` | semi-base | ✅ pronto (template, conteúdo no Supabase) |
| Arquivos | `/arquivos` | base | ✅ pronto (template, conteúdo no Supabase) |
| Ajuda | `/ajuda` | base | ✅ pronto (refeito para 4 áreas) |

NAV_ITEMS atual em `public/assets/header.js`: Jornada · Social · Aprovação · Arquivos (sem grupos hierárquicos).

## 🗃️ Backend Supabase

- Schema base em `docs/schema.sql` (tabelas `events`, `arquivos`, `pecas`, `aprovacoes`).
- Ainda **falta rodar o SQL** no Dashboard Supabase do Whirlpool — Du faz manual.
- Realtime habilitado via `supabase.channel(...)`.

## 📜 Sessões

### S1 · Bootstrap (25/05/2026)

**Objetivo**: Adaptar template MetLife → Whirlpool. Fase 1+2+3+5 do CONFIG.

**Decisões importantes**:
- Páginas descartadas: cronograma, plano-midia, performance, blitz, elemidia, muito-alem-do-jogo.
- Página nova criada: `social` (placeholder).
- Faxina completa aplicada: `MetLife→Whirlpool`, `mlh-→whp-`, paleta inteira, localStorage keys, globals (Auth/Config/Store/BottomSheet).
- Senha cliente: `whirlpool2026`; admin mantém `molla@2026@`.
- `--success: #50E596` adicionado no `:root` global (header.css) — regra de ouro #10.
- Gradientes Whirlpool: `navy → blue` (em vez do `blue → green` do MetLife) pra cara mais corporate.

**Métricas da faxina**:
- 138 substituições de hex colors
- 263 substituições de `rgba()`
- 196 substituições de marca (MetLife/metlife/MetLifeAuth/etc.)
- 239 substituições de prefixo de classe (`mlh-` → `whp-`)
- Smoke test: 80 verdes, 0 vermelhos

**Próximos passos (Du faz manual)**:
1. Rodar `docs/schema.sql` no SQL Editor do Supabase Whirlpool.
2. Primeiro `git add . / commit / push` → Vercel deploya automático.
3. Validar acesso em `whirlpool.vercel.app` (ou domínio final) com as duas senhas.
4. Quando o briefing de Social chegar: passar pra Mia 2 trabalhar na página.

**Pendências reconhecidas**:
- `social.html` é placeholder visual — sem dados, sem calendário real.
- `ajuda.html` tem dicas que ainda mencionam "campanha" em alguns trechos (vocabulário neutro da aprovação) — manter por enquanto, ajustar se Du pedir.
- Domínio customizado não definido ainda.

---

*MASTER mantido por Mia · S1 fechada em 25/05/2026.*
