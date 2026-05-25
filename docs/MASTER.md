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
| Produção (Vercel) | https://molla-whirlpool.vercel.app *(confirmar URL exata)* |
| Supabase | https://exyqqiquhiswrhcpdemf.supabase.co |
| Pasta local (Du) | `~/Library/CloudStorage/GoogleDrive-eduardo@brazildigital.ag/Meu Drive/BRAZILDIGITAL/SITES/WHIRLPOOL_BRASIL` |

## ⚙️ Config Vercel (importante pra próximas Mias)

- Framework Preset: **Other** (não Next.js — a Vercel auto-detecta errado no primeiro import)
- Output Directory: **`public`**
- Build Command: vazio
- Install Command: vazio

## 🎨 Identidade visual

| Token | Hex | Função |
|---|---|---|
| `--navy` | `#0D436B` | Títulos, cor primária |
| `--blue` | `#00A0DD` | Accent, detalhes |
| `--success` | `#50E596` | Estados positivos (no `:root` global) |
| `--light` | `#F1F5F9` | Fundo de boxes |
| `--white` | `#FFFFFF` | Fundo geral |
| `--muted` | `#5B7280` | Texto secundário |

- Logos em `public/img/`: `logo_whirlpool.webp` (preto — header/favicon), `logo_whirlpool_white.png` (branco — reserva), `logo_molla.svg` (footer).
- Fonte: Arial nativa.
- Gradientes: `navy → blue` (cara corporate; difere do `blue → green` do MetLife original).

## 🔐 Senhas

| Role | Senha | Permissões |
|---|---|---|
| `cliente` | `whirlpool2026` | Ver tudo, comentar, aprovar |
| `molla` | `molla@2026@` | Tudo + criar/editar/excluir (admin) |

Em `public/assets/auth.js`. localStorage keys: `whirlpool_auth`, `whirlpool_role`, `whirlpool_user`. Global: `window.WhirlpoolAuth`.

## 🗺️ Estrutura de páginas

| Página | Rota | Tipo | Status |
|---|---|---|---|
| Hub | `/` | base | ✅ no ar |
| Login | `/login` | base | ✅ no ar |
| Jornada | `/jornada` | base | ✅ no ar (aguarda schema.sql) |
| Social | `/social` | nova | 🚧 placeholder, aguarda briefing |
| Aprovação | `/aprovacao` | semi-base | ✅ no ar (aguarda schema.sql) |
| Arquivos | `/arquivos` | base | ✅ no ar (aguarda schema.sql) |
| Ajuda | `/ajuda` | base | ✅ no ar (refeito pra 4 áreas) |

NAV_ITEMS em `public/assets/header.js`: Jornada · Social · Aprovação · Arquivos (sem grupos hierárquicos).

## 🗃️ Backend Supabase

- Schema base em `docs/schema.sql` (tabelas `events`, `arquivos`, `pecas`, `aprovacoes`).
- ⏳ **Pendente**: rodar o SQL no dashboard. Sem isso as páginas dinâmicas ficam vazias.
- Realtime habilitado via `supabase.channel(...)`.
- RLS desabilitado (uso interno).

## 📜 Sessões

### S1 · Bootstrap (25/05/2026)

**Objetivo**: adaptar template MetLife → Whirlpool. Fases 1+2+3+5 do CONFIG.

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
- 196 substituições de marca
- 239 substituições de prefixo de classe
- Smoke test: 80/80 verde

**Atropelos resolvidos**:
- Pasta local não era repo Git → `git init` + remote add + push manual.
- `git add .` puxou lixo (template original, ZIPs, logos soltos da raiz) → limpeza com `rm -rf` + `.gitignore` reforçado + commit `chore(cleanup)`.
- Vercel detectou Next.js automaticamente → mudança manual no dashboard: Framework Preset = Other, Output Directory = `public`, Build/Install vazios.

**Próximos passos (Du faz manual)**:
1. ⏳ Rodar `docs/schema.sql` no SQL Editor do Supabase Whirlpool.
2. ⏳ Quando briefing de Social chegar: passar pra próxima Mia trabalhar na página.
3. ⏳ Domínio customizado (opcional).

**Pendências reconhecidas**:
- `social.html` é placeholder visual — sem dados, sem calendário real.
- `ajuda.html` ainda menciona "campanha" em alguns trechos do fluxo de Aprovação (vocabulário neutro, manter).
- Domínio customizado não definido.

---

*MASTER mantido por Mia · S1 fechada em 25/05/2026.*