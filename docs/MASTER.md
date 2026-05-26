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
| Produção | https://molla-whirlpool.vercel.app |
| Supabase | https://exyqqiquhiswrhcpdemf.supabase.co |
| Pasta local (Du) | `~/Library/CloudStorage/GoogleDrive-eduardo@brazildigital.ag/Meu Drive/BRAZILDIGITAL/SITES/WHIRLPOOL_BRASIL` |

## ⚙️ Config Vercel

- Framework Preset: **Other** (não Next.js — a Vercel auto-detecta errado no primeiro import)
- Output Directory: **`public`**
- Build/Install Commands: vazios

## 🎨 Identidade visual

| Token | Hex | Função |
|---|---|---|
| `--navy` | `#0D436B` | Títulos, cor primária |
| `--blue` | `#00A0DD` | Accent, detalhes |
| `--success` | `#50E596` | Estados positivos (no `:root` global) |
| `--light` | `#F1F5F9` | Fundo de boxes |
| `--white` | `#FFFFFF` | Fundo geral |
| `--muted` | `#5B7280` | Texto secundário |

**Paleta das linhas editoriais (Social)**:

| Linha | Hex | Slug |
|---|---|---|
| Institucional / Comemorativo | `#0D436B` | `institucional` |
| Conhecimento de peças | `#00A0DD` | `conhecimento` |
| Resolução de problemas | `#F59E0B` | `resolucao` |
| Boas práticas | `#1E7BAB` | `boas_praticas` |
| Humor técnico | `#7C6EE8` | `humor` |

Logos em `public/img/`: `logo_whirlpool.webp` (preto, header/favicon), `logo_whirlpool_white.png` (branco, reserva), `logo_molla.svg` (footer).
Fonte: Arial nativa.
Gradientes globais: `navy → blue` (corporate; sem verdes na UI principal).

## 🔐 Senhas

| Role | Senha | Permissões |
|---|---|---|
| `cliente` | `whirlpool2026` | Ver tudo, comentar, aprovar |
| `molla` | `molla@2026@` | Tudo + reabrir aprovações + edit via Supabase Dashboard |

`public/assets/auth.js`. localStorage keys: `whirlpool_auth/role/user`. Global: `window.WhirlpoolAuth`.

## 🗺️ Estrutura de páginas

| Página | Rota | Status |
|---|---|---|
| Hub | `/` | ✅ no ar (3 cards: Social, Aprovação, Arquivos) |
| Login | `/login` | ✅ no ar |
| Social | `/social` | ✅ **NOVA (S2)** — pré-pauta editorial com aprovação |
| Aprovação | `/aprovacao` | ✅ no ar |
| Arquivos | `/arquivos` | ✅ no ar |
| Ajuda | `/ajuda` | ✅ no ar |
| Jornada | `/jornada` | 🔒 escondida (S2) — arquivo existe, removida do NAV_ITEMS + hub |

NAV_ITEMS atual: **Social · Aprovação · Arquivos** (linha única, sem grupos).

## 🗃️ Backend Supabase

Tabelas:
- `events`, `arquivos`, `pecas`, `aprovacoes` → schema base (`docs/schema.sql`)
- `social_meses`, `social_posts`, `social_comentarios`, `social_historico` → schema Social (`docs/social_schema.sql`)

Schemas pendentes de rodar (manual no SQL Editor):
- ⏳ `docs/schema.sql` (se ainda não rodou na S1)
- ⏳ `docs/social_schema.sql`
- ⏳ `docs/social_seed_junho.sql`

Realtime habilitado em events, files, pecas, aprovacoes, social_posts, social_comentarios, social_historico.

## 🎴 Feature Social (S2)

### Conceito
Pré-pauta editorial mensal apresentada como **cards visuais** em vez de planilha. Cliente aprova/reprova publicação a publicação, comenta em thread, vê histórico.

### Anatomia do card
- Faixa colorida pela linha editorial
- Data prominente (bloco DD/MMM)
- Chips: tipo (Campanha/Always On), linha editorial, formato
- Mockup SVG do formato (carrossel = 5 retângulos, estático = quadrado, reels = vertical 9:16, carrossel+reels = combo)
- Título + nº + peça
- Status badge + botão "Ver" que abre drawer

### Drawer de detalhe
- Mockup ampliado
- Tema + explicação completa
- Histórico de status (audit log)
- Thread de comentários (com role chip cliente/molla)
- Botões Aprovar / Reprovar (se pendente) ou Reabrir (se já decidido)

### Fluxo de aprovação
- **Aprovação**: 1 clique direto
- **Reprovação**: abre modal com textarea obrigatória; motivo vira primeiro comentário do thread + entry no histórico
- **Reabrir**: admin Molla volta status pra pendente

### Filtros (toolbar sticky)
- Tipo (Campanha / Always On)
- Linha editorial (5 chips coloridos)
- Peça (Mecanismo / Placa / Filtro / Geral / Sem peça)
- Formato (Carrossel / Estático / Reels / Carrossel+Reels)
- Status (Pendente / Aprovado / Reprovado)

### Multiplos meses
Seletor no topo. Trocar mês limpa filtros automaticamente. Estrutura SQL pronta pra qualquer ano/mês — basta inserir novo registro em `social_meses` + N em `social_posts`.

### Permissões V1
- Cliente vê tudo, aprova/reprova, comenta
- Admin (Molla) idem + botão "Reabrir"
- Edição de conteúdo dos posts: manual via Supabase Dashboard (UI de edit fica pra V2)

### Roadmap Social
- V2: notificações ao cliente quando muda algo
- V2: imagens de referência reais (upload por post, integração com `arquivos`)
- V2: UI de admin pra editar posts pelo site
- V2: visão calendário (alternativa aos cards)
- V2: filtro multi-select de mês ("ver tudo de 2026")

## 📜 Sessões

### S1 · Bootstrap (25/05/2026)

Adaptação do template MetLife → Whirlpool. Faxina total (138 hex + 263 rgba + 196 marca + 239 classes substituídos). Hub com 4 cards. Setup Vercel manual. Push inicial.

### S2 · Pintura azul + Social MVP (25/05/2026)

**Ajustes visuais**:
- Hub e Ajuda agora 100% azuis (sem gradientes verdes decorativos).
- Perfil/Admin chips no header com degradê `blue → navy`.
- Jornada removida do NAV_ITEMS + hub + ajuda (arquivo continua no repo).
- Verdes semânticos preservados (botão Aprovar, status, KPI) — convenção UX.

**Feature Social (do zero)**:
- Schema SQL completo: 4 tabelas + triggers + realtime (`docs/social_schema.sql`).
- Seed com 12 publicações de Junho/2026 da planilha real (`docs/social_seed_junho.sql`).
- `social-store.js`: CRUD + cache + realtime padrão Whirlpool.
- `social.html` + `social/social.css` + `social/social.js`: página completa com hero, filtros, grid de cards, drawer lateral, modal de reprovação, thread de comentários, histórico.
- Mockups SVG auto-gerados por formato (carrossel/estático/reels/carrossel+reels), coloridos pela linha editorial.
- Aprovação 1-clique, reprovação exige motivo (vira comentário inicial).
- Smoke test: 113 verdes, 0 vermelhos.

**Pendências reconhecidas pós-S2**:
- Rodar `social_schema.sql` + `social_seed_junho.sql` no Supabase.
- Validar visualmente no Vercel (mobile + desktop).
- V2: notificações, imagens de referência reais, UI de admin, visão calendário.

---

*MASTER mantido por Mia · S2 fechada em 25/05/2026.*
