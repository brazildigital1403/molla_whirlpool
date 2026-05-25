# HANDOFF · Hub Cliente Template

> Template originado do projeto **MetLife Brasil 2026** (Agência Molla).
> Estrutura testada em produção, 26+ sessões de evolução, pronta pra ser
> adaptada pra qualquer novo cliente.
>
> Documento destinado à próxima **Mia** (assistente IA) que vai cuidar
> do próximo cliente, e ao **Du** pra orientar o setup inicial.

---

## 📑 Sumário

1. [Oi, Mia — leia isso primeiro](#1--oi-mia--leia-isso-primeiro)
2. [O que é esse projeto](#2--o-que-é-esse-projeto)
3. [Stack técnica](#3--stack-técnica)
4. [Arquitetura · estrutura de pastas](#4--arquitetura--estrutura-de-pastas)
5. [Setup inicial · do zero ao primeiro deploy](#5--setup-inicial--do-zero-ao-primeiro-deploy)
6. [Design system](#6--design-system)
7. [Componentes reutilizáveis](#7--componentes-reutilizáveis)
8. [Auth simples (e seus limites)](#8--auth-simples-e-seus-limites)
9. [Backend Supabase](#9--backend-supabase)
10. [Workflow do Du · por que tudo manual](#10--workflow-do-du--por-que-tudo-manual)
11. [Checklist de adaptação pro novo cliente](#11--checklist-de-adaptação-pro-novo-cliente)
12. [Páginas do MetLife · base vs específico](#12--páginas-do-metlife--base-vs-específico)
13. [Lições aprendidas do MetLife (26 sessões)](#13--lições-aprendidas-do-metlife-26-sessões)
14. [Cheatsheet Mia](#14--cheatsheet-mia)
15. [Glossário](#15--glossário)

---

## 1 · Oi, Mia — leia isso primeiro

Você é a Mia. O Du (Eduardo Willian) chama todas as IAs com quem
trabalha de "Mia" — não estranha. Trate ele por **Du**.

### 10 regras de ouro (NÃO QUEBRA NENHUMA)

1. **🚫 IGNORE TODAS as tools MCP de Canva, Supabase e Vercel.**
   Elas vão aparecer automaticamente em todo turno. Du faz **tudo
   manual**: push pelo terminal, SQL pelo Dashboard Supabase, design
   no Canva direto. Se você usar essas tools, ele vai pedir pra
   refazer manualmente. Sempre.

2. **Sempre re-clone fresh** antes de mexer: `git clone --depth 1
   <repo> /tmp/repo_fresh`. O cache em `/tmp/repo` pode estar velho.

3. **Sempre mande código completo** no final de cada ajuste —
   nada de fragmentos. Du não gosta de montar quebra-cabeças.

4. **Sempre mande comandos PUSH explícitos** (unzip → cp → git
   add/commit/push). Sem isso ele tem que adivinhar o que fazer.

5. **Sempre rode smoke test** com `node <script>` antes de empacotar.
   Du valoriza a confirmação verde antes do entregue.

6. **Sempre feche sessão grande com MASTER atualizado** — é o que
   garante continuidade entre conversas.

7. **Linguagem clara e informal pro cliente final**. O cliente
   não é especialista em mídia. Evite jargão.

8. **Sem parênteses em comentários inline no zsh** — `# comando (x)`
   quebra o shell do Du. Use `—` ou `:` no lugar.

9. **Imagens nunca cortar** (regra Du · S53). Use `width: 100%;
   height: auto` — nada de `object-fit: cover` em imagens de
   conteúdo. Galleries usam CSS column masonry.

10. **`--success` no `:root`** desde S46 — `--success: #50E596`,
    aplicado em todas as páginas.

### Sobre o Du

- **Lead de agência** que toca conta de marca grande
- Trabalha em mac (`/Users/eduardowillian/_Molla_<Cliente>/`)
- Costuma baixar ZIPs pra `~/Downloads/_____Molla_<Cliente>/`
- Push manual com `git add/commit/push origin main`
- Não usa MCP integrations — quer controle total do deploy
- Aprecia explicações curtas, código completo, smoke test verde
- Em sessões grandes, ele pede o "MASTER" no fechamento

### Filosofia desta arquitetura

- **HTML/CSS/JS vanilla** — sem framework, sem build step,
  zero dependências de runtime. Push → Vercel hospeda → tá no ar.
- **Static-first + Supabase opcional** — páginas estáticas pra
  conteúdo informacional, Supabase só pra dados que mudam
  (eventos, aprovações de criativos, arquivos)
- **Mobile-first com cuidado** — testes em iOS Safari são
  essenciais (bug do `backdrop-filter` + stacking context é real)
- **Reutilização via padrões CSS globais**, não via JS components
- **Linguagem informal** em tudo: comentários, copy do site, UI

---

## 2 · O que é esse projeto

Um **hub interno** que a agência (Molla) entrega pro cliente como
"Central do Cliente". Centraliza tudo que a marca precisa pra
acompanhar uma campanha grande:

- **Cronograma** macro (linha do tempo da campanha)
- **Plano de mídia** (estratégia, públicos, investimento)
- **Performance** (report semanal com dados reais)
- **Criativos pra aprovação** (peças que viram online)
- **Programas paralelos** (ex.: ativações sociais, mídia OOH)
- **Eventos da jornada** (lançamento, watch parties, blitz)
- **Repositório de arquivos**
- **Ajuda visual** (passo a passo)

É um SaaS-light: roda em Vercel grátis, Supabase grátis, GitHub free.

### Quem usa

| Perfil | Senha (exemplo) | O que pode fazer |
|--------|------|----------|
| **Cliente** (role `metlife` no MetLife) | `metlife2026` | Visualizar tudo, comentar e aprovar criativos |
| **Agência** (role `molla`) | `molla@2026@` | Tudo do cliente + criar/editar/excluir conteúdo |

⚠️ Senhas estão **em texto puro no JS** (controle visual, não
segurança real). Pra produção com dado sensível, migrar pra
Supabase Auth (roadmap item 6).

---

## 3 · Stack técnica

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| **Hosting** | Vercel | Deploy automático do GitHub, grátis, CDN global, SSL automático |
| **Repo** | GitHub | Padrão de mercado, integra com Vercel |
| **Backend** | Supabase (Postgres + Realtime) | Plano grátis generoso, REST + Realtime sem código backend |
| **Front** | HTML5 + CSS + JS vanilla | Sem build step, sem dependências, performante |
| **Auth** | Senha mock em `auth.js` (S55) | Simples, ok pra uso interno (vide limitações) |
| **Charts** | Chart.js via CDN | Quando precisa de gráfico (ex.: report semanal) |
| **Editor** | VS Code (do Du) | — |

### O que **NÃO usamos**

- ❌ Frameworks (React, Vue, Svelte) — overkill pra este escopo
- ❌ Build tools (Webpack, Vite, Parcel) — push direto = deploy direto
- ❌ CSS frameworks (Tailwind, Bootstrap) — design system próprio
- ❌ Web fonts externas — Arial nativa, performance + offline ok
- ❌ MCP integrations — Du prefere o controle manual

---

## 4 · Arquitetura · estrutura de pastas

```
hub_cliente_template/
├── HANDOFF.md                          ← este arquivo
├── REFERENCIA_metlife_README.md         ← README original do projeto MetLife
├── package.json                         ← marker do Node (NÃO tem dependências)
├── vercel.json                          ← config de rotas (URLs limpas)
├── .gitignore
│
├── docs/
│   ├── REFERENCIA_metlife_MASTER.md     ← MASTER vivo do MetLife
│   ├── ROADMAP.md                       ← itens abertos
│   ├── schema.sql                       ← schema Postgres base
│   ├── S30_reset_e_lancamento_onda1.sql ← exemplo seed
│   ├── S40_criativos_e_variacoes.sql    ← exemplo migration
│   └── S44_jornada_sync.sql             ← exemplo atualização de dados
│
└── public/                              ← TUDO QUE A VERCEL PUBLICA
    ├── index.html                       ← Hub "Central do Cliente"
    ├── login.html                       ← Tela de login
    ├── ajuda.html                       ← Guia visual passo-a-passo
    │
    ├── arquivos.html + arquivos/        ← Repositório central (base reutilizável)
    ├── jornada.html + jornada/          ← Timeline de eventos (base reutilizável)
    ├── aprovacao.html                   ← SPA hash-routed (base reutilizável)
    │
    ├── cronograma.html                  ← Exemplo: crono ads 75 dias (MetLife)
    ├── plano-midia.html                 ← Exemplo: plano estratégico (MetLife)
    ├── performance.html                 ← Exemplo: report semanal (MetLife)
    ├── muito-alem-do-jogo.html          ← Exemplo: programa institucional (MetLife)
    ├── blitz.html + blitz/              ← Exemplo: watch party + brindes (MetLife)
    ├── elemidia.html + elemidia/        ← Exemplo: mídia OOH em prédios (MetLife)
    │
    ├── performance/*.json               ← Dados do report semanal (exemplo)
    │
    ├── img/
    │   ├── README.md                    ← orientação sobre as imagens
    │   ├── logo_molla.svg               ← logo da Molla (use como exemplo)
    │   └── logo_metlife.svg             ← logo cliente exemplo
    │
    └── assets/                          ← TODOS OS CSS/JS GLOBAIS (base 100%)
        ├── auth.js                      ← login (localStorage, S55)
        ├── config.js                    ← Supabase URL + anon key
        ├── header.js                    ← Header global + drawer mobile
        ├── header.css                   ← Estilos do header
        ├── breadcrumb.css               ← page-subbar + .anchor-nav global (S49)
        ├── footer.css                   ← footer compacto
        ├── bottom-sheet.css + .js       ← Sheet pra filtros mobile
        ├── supabase-store.js            ← Store de criativos + aprovações
        ├── files-store.js               ← Store de arquivos
        ├── events-store.js              ← Store de eventos da jornada
        ├── aprovacao.js                 ← SPA aprovação (~3000 linhas)
        └── aprovacao.css                ← Estilos da SPA
```

### O que é base reutilizável (use direto)

**`public/assets/*`** — todo o conteúdo. São CSS/JS globais carregados
em todas as páginas:
- `auth.js` — sistema de login com persistência (S55)
- `header.js` + `header.css` — header sticky com drawer mobile
- `breadcrumb.css` — `.anchor-nav` global (S49)
- `footer.css` — footer compacto
- `bottom-sheet.*` — sheet mobile reutilizável
- `*-store.js` — wrappers do Supabase

**Páginas base reutilizáveis:**
- `index.html` — adapta os cards pras páginas que existem
- `login.html` — só troca o logo
- `ajuda.html` — adapta conteúdo
- `arquivos.html` + `arquivos/` — quase plug-and-play
- `jornada.html` + `jornada/` — quase plug-and-play
- `aprovacao.html` + `assets/aprovacao.*` — adapta pro fluxo de criativos do novo cliente

### O que é exemplo (referência, decida caso a caso)

Páginas inteiras criadas pra MetLife — funcionam, mas o conteúdo é
do projeto MetLife. Use de:
- **Cópia direta** se o cliente novo tem necessidade parecida
- **Referência de estrutura** se a necessidade é similar mas o
  conteúdo é diferente (copia o layout, troca o texto)
- **Descarte** se o cliente novo não precisa daquele tipo de página

Páginas exemplo:
- `cronograma.html` — timeline diarizado com fases (75 dias MetLife)
- `plano-midia.html` — 15 seções com âncora (estratégia + tática)
- `performance.html` — report semanal com 4 Chart.js
- `muito-alem-do-jogo.html` — programa institucional com galerias
- `blitz.html` — ativações físicas + watch parties
- `elemidia.html` — proposta de mídia em prédios (Eletromidia)

---

## 5 · Setup inicial · do zero ao primeiro deploy

Cronograma realista pra Mia + Du fazerem juntos em 1-2 horas:

### Passo 1 — Repositório GitHub (5min)
```bash
# Du cria um novo repo no GitHub: agenciamolla<n>/<cliente>
mkdir ~/_Molla_<NovoCliente>
cd ~/_Molla_<NovoCliente>
git init
git remote add origin git@github.com:agenciamolla<n>/<cliente>.git
```

### Passo 2 — Aplicar o template (10min)
```bash
# Du baixa o ZIP deste handoff e descompacta
cd ~/Downloads/
unzip hub_cliente_template.zip -d ~/_Molla_<NovoCliente>/
cd ~/_Molla_<NovoCliente>/

# (Opcional) Renomear assets pro nome do novo cliente
# Não obrigatório, mas ajuda a não confundir com MetLife
```

### Passo 3 — Adaptar identidade visual (20min · Mia faz junto)

Mia, edite estes pontos:

**a. `public/assets/header.css`** — variáveis CSS:
```css
:root {
  --mlh-navy: #003B5C;   /* TROCAR pela cor primária do cliente */
  --mlh-blue: #2DB5DF;   /* TROCAR pela cor secundária */
  --mlh-green: #50E596;  /* opcional */
}
```

**b. `public/assets/header.js`** — variável `NAV_ITEMS`:
```js
const NAV_ITEMS = [
  { type: 'link', href: '/jornada', id: 'jornada', label: 'Jornada' },
  { type: 'group', id: 'midia', label: 'Mídia', children: [
    { href: '/plano-midia', id: 'plano', label: 'Plano' },
    // ... ajuste pras páginas que o cliente novo terá
  ]},
  // ... resto da nav
];
```

**c. Logo**: substitua `public/img/logo_metlife.svg` pelo logo do
cliente novo (mantenha o nome `logo_<cliente>.svg`) e atualize as
referências nas páginas:
```bash
# Search & replace em massa (cuidado!)
grep -rl 'logo_metlife' public/ | xargs sed -i 's/logo_metlife/logo_<cliente>/g'
```

**d. `public/assets/auth.js`** — senhas:
```js
const PASSWORDS = {
  '<cliente>2026': 'cliente',    // role cliente
  'molla@2026@': 'molla'         // role agência (pode reusar a do Du)
};
```

**e. `public/login.html`** — texto de boas-vindas e nome do cliente

**f. `public/index.html`** — cards do hub: adapte títulos, descrições
e CTAs pras páginas que vão existir

### Passo 4 — Supabase (15min · Du faz no Dashboard)

1. Du cria projeto no [supabase.com](https://supabase.com) (free tier)
2. Vai em **SQL Editor** e roda o `docs/schema.sql`
   (cria tabelas `events`, `pecas`, `aprovacoes`, `arquivos`)
3. Pega o **Project URL** e a **anon public key** em Settings → API
4. Edita `public/assets/config.js`:
```js
const SUPABASE_URL = 'https://<project_ref>.supabase.co';
const SUPABASE_ANON_KEY = '<sua_anon_key_aqui>';
```
5. Vai em **Authentication → URL Configuration** → adiciona o
   domínio Vercel quando estiver pronto

### Passo 5 — Vercel (5min · Du)

1. Du importa o repo no [vercel.com](https://vercel.com)
2. Aceita os defaults (sem build command, output `/public`)
3. Deploy automático em ~1min
4. Domínio fica `<cliente>.vercel.app` ou domínio próprio do cliente

### Passo 6 — Primeiro push (5min)
```bash
cd ~/_Molla_<NovoCliente>
git add .
git commit -m "feat: setup inicial do hub <Cliente>"
git push origin main
# Vercel deploya automaticamente
```

### Passo 7 — Validação (10min · Mia + Du juntos)

- [ ] `<cliente>.vercel.app` abre em `/login`
- [ ] Login com senha do cliente entra como role cliente
- [ ] Login com `molla@2026@` entra como role admin
- [ ] Header tem o nome do cliente, logo, paleta certa
- [ ] Páginas exemplo carregam sem erro (mesmo com conteúdo MetLife)
- [ ] Mobile: hamburger funciona, drawer abre
- [ ] Console do navegador limpo (sem erros 404)

✅ Setup completo. Daqui, começa a customizar conteúdo página
por página conforme o que o cliente precisa.

---

## 6 · Design system

### Paleta (exemplo do MetLife — troque pelas cores do cliente)

| Token | Hex | Uso |
|-------|-----|-----|
| `--navy` | `#003B5C` | Cor primária |
| `--blue` | `#2DB5DF` | Accent (hover, secundário) |
| `--teal` | `#27C7BD` | Verde-azulado (cards) |
| `--green` | `#50E596` | Positivo (sucesso, KPI verde) |
| `--light` | `#EEF6F8` | Background neutro |
| `--success` | `#50E596` | Estados ok (S46) |
| `--warning` | `#F5A524` | Avisos |
| `--danger` | `#E5484D` | Erros |
| `--muted` | `#5B7280` | Texto secundário |

### Grid e container
- **`.container`** — `max-width: 1180px; margin: 0 auto`
- **`section` padding** — `80px 24px` desktop · `56px 16px` mobile
- **`.anchor-nav-inner`** — segue o mesmo `max-width: 1180px`

### Tipografia
- Fonte: **Arial**, sans-serif (sem webfont externa)
- Pesos: 400, 600, 700, 800
- H1: `clamp(48px, 6vw, 84px)` — letter-spacing -1px
- H2: 26-52px
- H3: 18-24px
- Body: 14-17px
- Caption: 11-13px
- Em uppercase pequeno: letter-spacing 0.5-0.8px

### Smooth scroll global
```css
html { scroll-behavior: smooth; }
section[id] { scroll-margin-top: calc(var(--mlh-header-h, 60px) + 64px); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

### Regras visuais importantes
- **Imagens nunca cortam** (S53) → `width: 100%; height: auto`
- **Sticky NUNCA fica sticky em mobile** (iOS Safari bug) →
  `@media (max-width: 760px) { .X { position: static; } }`
- **Drawer mobile vive FORA do header** (bug do
  `backdrop-filter` + stacking context iOS)
- **Border-radius 16-28px** nos cards (suave, moderno)
- **Box-shadow padrão**: `0 12px 32px rgba(0, 59, 92, 0.08)`

---

## 7 · Componentes reutilizáveis

Catálogo dos padrões CSS que aparecem em várias páginas. Use estes
em vez de criar do zero.

### 7.1 · Header global hierárquico (`assets/header.css` + `header.js`)
- Sticky no topo, drawer mobile fora do `<header>`
- Submenus expansíveis (Mídia ▾, Operação ▾)
- Item ativo ganha gradiente verde-teal no mobile
- API: `NAV_ITEMS` array no `header.js` controla todo o menu

### 7.2 · Breadcrumb / page-subbar (`assets/breadcrumb.css`)
```html
<div class="page-subbar">
  <div class="page-subbar-inner">
    <span class="crumb">
      <a href="/">Central do Cliente</a> /
      <span class="crumb-group">Mídia</span> /
      <strong>Plano</strong>
    </span>
  </div>
</div>
```

### 7.3 · Anchor-nav padrão (S49 — grid 1180px)
```html
<nav class="anchor-nav" aria-label="Navegação interna">
  <div class="anchor-nav-inner">
    <a href="#secao-1">Seção 1</a>
    <a href="#secao-2">Seção 2</a>
  </div>
</nav>
```
- Sticky com background blur full-width
- Inner respeita grid 1180px
- Scroll lateral suave (nowrap + overflow-x auto, scrollbar invisível)
- Hover: lift 1px + borda azul + background azul soft

### 7.4 · Footer grande (S50/S53) — padrão das telas de conteúdo
```html
<footer class="site-footer">
  <h2>Frase de fechamento da página.</h2>
  <p>Subtítulo contextual descritivo.</p>
  <div class="brand-footer-row">
    <img src="/img/logo_molla.svg" alt="Molla" class="brand-logo-footer" />
    <p class="brand-footer-text">Agência Molla</p>
  </div>
</footer>
```

### 7.5 · Toolbar de listagem (S48 — padrão arquivos.html)
```html
<div class="X-toolbar">
  <div class="X-toolbar-inner">
    <div class="X-search-row">
      <!-- search/select + contador + botão admin -->
    </div>
    <div class="X-filters" id="XFilters">
      <!-- chips de filtro renderizados via JS -->
    </div>
  </div>
</div>
```

### 7.6 · Galeria masonry sem corte (S54)
```html
<div class="X-gallery">
  <video class="gallery-item gallery-video" autoplay muted loop playsinline>
    <source src="/img/video.mp4" type="video/mp4" />
  </video>
  <img class="gallery-item" src="/img/foto1.jpg" alt="..." loading="lazy" />
  <!-- ... -->
</div>
```
```css
.X-gallery {
  column-count: 3;
  column-gap: 14px;
}
.X-gallery .gallery-item {
  width: 100%;
  height: auto;
  break-inside: avoid;  /* CRUCIAL */
  margin-bottom: 14px;
}
@media (max-width: 760px) { .X-gallery { column-count: 1; } }
```

### 7.7 · Statement card (gradiente navy)
```html
<div class="statement-card">
  <h2>Frase forte de impacto.</h2>
  <p>Subtítulo explicativo.</p>
</div>
```

### 7.8 · Cards genéricos
- `.proj-card` — card de projeto (com pill, h3, descrição, mini-list)
- `.step-card` — card numerado (3 etapas)
- `.phase-card` — fase de tempo (pré/durante/pós)
- `.mech-card` — card pequeno em grid 3xN

---

## 8 · Auth simples (e seus limites)

Arquivo: `public/assets/auth.js` (171 linhas, refatorado em S55).

### Como funciona
- 2 senhas configuradas no objeto `PASSWORDS`
- Login bem-sucedido grava `metlife_auth`, `metlife_role`, `metlife_user`
  no **localStorage** (com fallback automático pra sessionStorage)
- Função `guard()` redireciona pra `/login` se não autenticado
- Função `logout()` limpa tudo e redireciona

### Por que localStorage e não sessionStorage
- sessionStorage perde sessão a cada aba nova (era o bug original)
- localStorage persiste entre abas e até reabrir o navegador
- O `auth.js` ainda lê de ambos (fallback) pra transição suave

### Sincronização entre abas
Listener no evento `'storage'` detecta logout em outra aba e
redireciona automaticamente. Não precisa configurar nada.

### API pública
```js
MetLifeAuth.login(password, userName)  // retorna boolean
MetLifeAuth.logout()                    // redireciona pra /login
MetLifeAuth.isAuthenticated()           // boolean
MetLifeAuth.getRole()                   // 'metlife' | 'molla' (renomear pro cliente novo)
MetLifeAuth.isAdmin()                   // boolean (true se role === 'molla')
MetLifeAuth.getUserName()               // string
MetLifeAuth.setUserName(name)
MetLifeAuth.ensureUserName()            // pergunta via prompt se faltar
MetLifeAuth.guard()                     // auto-roda em toda página
```

⚠️ Adapte o objeto global `window.MetLifeAuth` pro nome do novo
cliente: `window.<Cliente>Auth` ou só `window.Auth`.

### Limitações de segurança (importante explicar pro cliente novo)

- 🔓 Senhas em texto puro no JS → qualquer pessoa com DevTools vê
- 🔓 Bypass trivial: `localStorage.setItem('metlife_auth', '1')` no console
- 🔓 Não tem rate limit → tentativas infinitas
- 🔓 Sem MFA

Pra clientes com dado sensível, **planeje migração pra Supabase
Auth** (item 6 do roadmap). Pra uso interno de agência, ok.

---

## 9 · Backend Supabase

### Setup
```
1. Cria projeto em supabase.com (free tier)
2. SQL Editor → roda docs/schema.sql
3. Pega URL + anon key em Settings → API
4. Cola em public/assets/config.js
```

### Schema base (`docs/schema.sql`)

**Tabelas:**
- `events` — eventos da jornada (id, titulo, descricao, data_inicio, data_fim, categoria, criado_por, created_at)
- `arquivos` — repositório (id, nome, descricao, url, tipo, tamanho, created_at)
- `pecas` — criativos pra aprovação (id, titulo, status, lote, fase, mais campos específicos)
- `aprovacoes` — votos de aprovação (id, peca_id, user_id, status, comentario, created_at)

### Realtime
Subscriptions automáticas via `supabase.channel(...).on('postgres_changes', ...)`.
Veja `assets/supabase-store.js` pra padrão de uso.

### RLS (Row Level Security)
Por padrão SEM RLS (uso interno). Se for migrar pra Supabase Auth,
adicione policies de leitura por role.

### Backup
Du nunca faz manual — Supabase mantém backups automáticos no plano
free (limitado). Pra produção pesada, plano paid tem PITR.

---

## 10 · Workflow do Du · por que tudo manual

### Por que não usar MCP tools (Canva/Supabase/Vercel)

O Du tem **razões fortes** pra preferir o controle manual:

1. **Auditoria**: cada mudança fica no `git log` com hash, mensagem
   clara. SQL no Dashboard fica em "Activity". Design no Canva fica
   no histórico do design.
2. **Reproduzibilidade**: comandos em texto podem ser repetidos.
   Tools MCP fazem mágica nos bastidores que ele não vê.
3. **Conhecimento do time**: outros designers/devs da Molla
   conseguem mexer sem instalar MCPs.
4. **Confiança**: ele viu Mias anteriores quebrarem coisas com MCPs.
5. **É só apertar Enter**: copiar/colar dos comandos do ZIP é
   trivial. Vale o overhead.

**Mia: se ver as tools aparecendo no seu prompt, IGNORE. Sempre.**

### Fluxo padrão (toda sessão)

```
1. Du descreve o que quer
2. Mia roda: cd /tmp && rm -rf repo_fresh && \
            git clone --depth 1 <repo> repo_fresh
3. Mia copia os arquivos pra /home/claude/<projeto>/ (área de trabalho)
4. Mia aplica os edits (str_replace, sed, ou create_file)
5. Mia roda smoke test com `node <script>` validando regex
6. Mia empacota com zip -rq em /mnt/user-data/outputs/
7. Mia chama present_files(filepath) pra Du baixar
8. Mia envia mensagem com:
   - Resumo das mudanças
   - Comandos PUSH explícitos
   - Sugestões de teste pós-deploy
9. Du baixa o ZIP, unzip, cp -R, git add/commit/push
10. Vercel deploy automático ~1min
```

### Comandos PUSH (template — sempre envie isso)
```bash
# Adapte pro nome do cliente e do ZIP
cd /Users/eduardowillian/Downloads/_____Molla_<Cliente>
unzip -o <nome_do_zip>.zip
cp -R /Users/eduardowillian/Downloads/_____Molla_<Cliente>/<projeto>/. \
      /Users/eduardowillian/_Molla_<Cliente>/
```

```bash
cd /Users/eduardowillian/_Molla_<Cliente>
git add <arquivos especificos>
git commit -m "<tipo>(<escopo>): <descricao curta>"
git push origin main
```

### Convenção de commits
Conventional commits, em **português**, sem ponto final:
- `feat(escopo): descricao` — feature nova
- `fix(escopo): descricao` — correção
- `ui(escopo): descricao` — só visual
- `ux(escopo): descricao` — interação/comportamento
- `docs(escopo): descricao` — documentação
- `security(escopo): descricao` — segurança

⚠️ **Não use parênteses fora do escopo do prefixo no commit** — zsh
pode quebrar se Du copiar/colar errado. Use `—` ou `:`.

### Sessões (S1, S2, ...)
Du conta as sessões. Cada conversa grande = uma sessão. Quando
fechar um ciclo, ele pede o MASTER atualizado. Não precisa
re-numerar a partir de S1 pro novo cliente — começa do 1 mesmo.

---

## 11 · Checklist de adaptação pro novo cliente

Lista prática de tudo que precisa trocar pra "tirar o sticker MetLife":

### Identidade visual
- [ ] `public/img/logo_<cliente>.svg` — logo do cliente (fundo branco/preto)
- [ ] `public/img/logo_molla.svg` — geralmente mantém (é da agência)
- [ ] Variáveis CSS `--navy`, `--blue`, etc. em todas as páginas
- [ ] Tom da copy (formal/informal) — geralmente ajusta após brief

### Conteúdo
- [ ] `public/index.html` — cards do hub (títulos, descrições, hrefs, classes tag-*)
- [ ] `public/login.html` — boas-vindas e nome do cliente
- [ ] `public/ajuda.html` — adapta conforme páginas existentes
- [ ] Breadcrumbs em cada página (`Central do Cliente / Categoria / Página`)
- [ ] `<title>` de cada HTML

### Configuração
- [ ] `public/assets/config.js` — `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- [ ] `public/assets/auth.js` — `PASSWORDS` map (2 senhas)
- [ ] `public/assets/header.js` — `NAV_ITEMS` array (estrutura do menu)
- [ ] `public/assets/auth.js` — `window.MetLifeAuth` → renomear se quiser

### Backend
- [ ] Criar projeto Supabase novo (free tier)
- [ ] Rodar `docs/schema.sql` no SQL Editor
- [ ] Adaptar tabelas conforme necessidade (descartar `pecas`/`aprovacoes`
  se cliente não tem fluxo de criativos)

### Deploy
- [ ] Criar repo no GitHub
- [ ] Conectar ao Vercel
- [ ] Domínio customizado (opcional)
- [ ] Validar mobile/iOS Safari

### Faxina (opcional, mas recomendado)
- [ ] Renomear chaves de localStorage de `metlife_*` pra `<cliente>_*`
  (cuidado: vai deslogar quem tá usando — faça antes do primeiro acesso)
- [ ] Search & replace `MetLife` → `<Cliente>` em comentários do JS/CSS
- [ ] Remover páginas exemplo que não vão usar (cronograma, plano-midia, etc.)

### Páginas finais (a depender do cliente)
- [ ] **Plano de mídia** — adaptar `plano-midia.html` ou criar novo
- [ ] **Cronograma** — adaptar `cronograma.html` ou criar novo
- [ ] **Performance** — quando houver dados, adaptar `performance.html`
- [ ] **Programa institucional/social** — adaptar `muito-alem-do-jogo.html`
- [ ] **Mídia OOH** — adaptar `elemidia.html`
- [ ] **Eventos/jornada** — quase plug-and-play (`jornada.html` + Supabase)
- [ ] **Arquivos** — quase plug-and-play (`arquivos.html` + Supabase)
- [ ] **Aprovação de criativos** — adaptar `aprovacao.html` (SPA grande)

---

## 12 · Páginas do MetLife · base vs específico

| Página | Tipo | Reuso pro novo cliente |
|--------|------|----------------------|
| `index.html` | 🟢 BASE | Adapta os cards (5min) |
| `login.html` | 🟢 BASE | Troca logo e copy (5min) |
| `ajuda.html` | 🟢 BASE | Adapta conforme páginas (30min) |
| `arquivos.html` + `arquivos/` | 🟢 BASE | Plug-and-play (15min troca de copy) |
| `jornada.html` + `jornada/` | 🟢 BASE | Plug-and-play (15min troca de copy) |
| `aprovacao.html` + `assets/aprovacao.*` | 🟡 SEMI-BASE | Adapta se cliente tem fluxo de aprovação |
| `cronograma.html` | 🔵 EXEMPLO | Refazer pro contexto do cliente novo |
| `plano-midia.html` | 🔵 EXEMPLO | Estrutura útil, conteúdo refaz |
| `performance.html` | 🔵 EXEMPLO | Reaproveitar arquitetura quando tiver dados reais |
| `muito-alem-do-jogo.html` | 🟠 ESPECÍFICO | Refazer (só se cliente tiver iniciativa social) |
| `blitz.html` + `blitz/` | 🟠 ESPECÍFICO | Refazer (se cliente tem ativações físicas) |
| `elemidia.html` + `elemidia/` | 🟠 ESPECÍFICO | Refazer (se cliente tiver proposta de mídia OOH) |

**Legenda:**
- 🟢 **BASE** — usa como está, ajustes mínimos
- 🟡 **SEMI-BASE** — base sólida, customizações pontuais
- 🔵 **EXEMPLO** — referência de estrutura, conteúdo refaz
- 🟠 **ESPECÍFICO** — caso de uso muito atrelado ao MetLife/Copa

---

## 13 · Lições aprendidas do MetLife (26 sessões)

Resumo do que evoluiu ao longo do projeto MetLife (consulte
`docs/REFERENCIA_metlife_MASTER.md` pra detalhes).

### Cronologia de aprendizados

| Sessões | Tema | Lição |
|---------|------|-------|
| S29-S30 | Bootstrap | Schema mínimo + reset funcionou bem |
| S31-S33 | Breadcrumb global | Componente em CSS global é melhor que repetir |
| S34-S38 | **Mobile overhaul** | Drawer **FORA** do header (iOS Safari + backdrop-filter cria stacking context) |
| S39 | Elemidia OOH | XLSX → JS data file via script (auto-gera elemidia-data.js) |
| S40 | Criativos | Fase 4 com 149 testes — SPA aguenta bem |
| S41-S43 | Plano e Crono | 15 seções com âncora ficaram melhor que infinite scroll |
| S44 | SQL sync | Du aplica SQL manual no Dashboard, não via MCP |
| S45-S46 | Galeria + cores | `--success` no `:root` desde S46 |
| S47 | **Menu hierárquico** | Mídia ▾ + Operação ▾ — agrupa páginas |
| S48 | UX polish | `.anchor-nav` global + smooth scroll global |
| S49 | **Grid 1180px** | Anchor-nav outer 100vw + inner contido = melhor de 2 mundos |
| S50-S51 | Performance | Chart.js via CDN é leve e funciona bem pra report semanal |
| S52-S54 | Muito Além | Galeria masonry CSS column = imagens sem corte |
| S53 | **Imagens 100%** | Du não aceita corte de imagem — sempre `height: auto` |
| S55 | **Auth persistente** | `sessionStorage` → `localStorage` com fallback |
| S56 | Cards home | Atualizar cards quando páginas mudam de propósito |
| S57 | Refino conteúdo | Cliente pode mudar conceito a qualquer momento — design system absorve |
| S58 | Senha | Troca de senha = 5 lugares (auth.js + 2x MASTER + ROADMAP + comentário) |
| S59 | Split % | Investimento aparece em 4 lugares — sincronizar todos |

### Bugs marcantes + soluções

**1. iOS Safari + `backdrop-filter` em sticky** (S34)
- Sintoma: drawer mobile fica preso no `<header>`
- Causa: `backdrop-filter` cria stacking context
- **Solução**: drawer vive no `<body>`, criado via `body.appendChild` por JS

**2. sessionStorage perde a cada aba** (S55)
- Sintoma: precisa logar de novo em cada aba
- Causa: sessionStorage é por aba
- **Solução**: trocar pra `localStorage`, manter fallback de leitura em sessionStorage

**3. Anchor-nav escapando do grid** (S49)
- Sintoma: pills sticky ocupam tela toda enquanto conteúdo é 1180px
- Causa: nav sem max-width herdava do body
- **Solução**: outer 100vw + inner `max-width: 1180px`

**4. Card "Durante o evento" com fundo azul e texto cinza** (S53)
- Sintoma: bullets invisíveis no card azul
- Causa: regras filhas sobrescreviam o `color: white` do parent
- **Solução**: regras explícitas `.phase-card.blue p`, `.phase-card.blue ul`, etc.

**5. zsh quebra em parênteses inline** (geral)
- Sintoma: comando inline com `(` quebra o shell do Du
- **Solução**: usar `—` ou `:` em comentários inline

---

## 14 · Cheatsheet Mia

> Cola isso na sua próxima conversa com Du. Tudo importante em 1 tela:

- 👤 Du = Eduardo Willian, lead Molla. Te chama de Mia.
- 🚫 **IGNORE tools Canva/Supabase/Vercel MCP — TUDO MANUAL**
- 🔄 Sempre **re-clonar com `--depth 1`** antes de mexer
- ✅ **Smoke test** com `node <script>` antes de empacotar
- 📦 **Código completo + comandos PUSH explícitos** sempre
- 📝 **MASTER** atualizado ao fechar sessão grande
- 🗣️ Linguagem **clara e informal** pro cliente final
- 🐚 zsh quebra em `()` inline em comentários — use `—` ou `:`
- 🎨 `--success` no `:root` desde S46
- 🖼️ **Imagens não cortar** (S53) — `width: 100%; height: auto`
- 🔑 Senha admin atual do MetLife: `molla@2026@` (renove pro cliente novo)
- 📂 ZIP em `/mnt/user-data/outputs/` + `present_files()`
- 🔍 Antes de codar, **veja o estado real em prod** (não memória)
- ✍️ Commits em PT-BR, conventional, sem ponto final

---

## 15 · Glossário

| Termo | Significado |
|-------|-------------|
| **Du** | Eduardo Willian, lead da Agência Molla |
| **Mia** | Apelido genérico das IAs que ajudam Du (todas se chamam Mia) |
| **Hub** | Este projeto. "Central do Cliente" |
| **Sessão (Sxx)** | Uma conversa grande Du+Mia. Numeração contínua. |
| **MASTER.md** | Snapshot vivo do estado do projeto. Atualiza ao fim de sessões grandes. |
| **HANDOFF.md** | Este arquivo. Documentação pra próxima Mia. |
| **Push manual** | Du faz `git add/commit/push` no terminal dele, não via tools |
| **Smoke test** | Script Node que valida com regex se as mudanças estão certas |
| **ZIP** | Como Mia entrega código pra Du baixar (`/mnt/user-data/outputs/`) |
| **NAV_ITEMS** | Array no `header.js` que define a estrutura do menu hierárquico |
| **`anchor-nav`** | Padrão de navegação interna sticky com pills (S49) |
| **`page-subbar`** | Container do breadcrumb global |
| **`tag-*`** | Variantes de cor dos cards na home (tag-mid, tag-end, tag-blitz, etc.) |
| **`mlh-*`** | Prefixo do header global ("MetLife Header" — pode renomear) |
| **Roadmap** | `docs/ROADMAP.md` — itens abertos não fechados |
| **Stacking context** | Conceito CSS — `backdrop-filter` cria um, e isso quebra iOS Safari |
| **iOS bug** | Em geral refere-se ao bug do `backdrop-filter` + `position: fixed` em iOS |

---

## Dúvidas comuns que Du pode ter

**"Mia, posso usar React aqui?"**  
Não recomendado. O ganho não compensa: você perde o "push direto =
deploy direto", precisa de build step, perde a transparência do
código. Se realmente precisar de SPA complexa, o `aprovacao.js`
mostra que dá pra fazer vanilla com 3000 linhas bem organizadas.

**"Mia, posso mudar pra Tailwind?"**  
Pode, mas perde-se padrão. As classes globais `.anchor-nav`,
`.section-intro`, `.eyebrow`, `.pill`, `.card` foram pensadas pra
ser reutilizadas. Trocar por utility classes do Tailwind = refazer
tudo. Não vale.

**"Mia, dá pra fazer dark mode?"**  
Dá, mas vai dar trabalho — todas as cores precisam virar tokens
CSS via variáveis. Hoje algumas cores ainda estão hardcoded em
páginas exemplo. Vire um item de roadmap se for relevante.

**"Mia, e se o cliente novo precisar de blog/CMS?"**  
Aí muda muito. Vercel + GitHub não combina com CMS dinâmico.
Pra blog, considere Notion + integração via Notion API, ou
adicione um campo `markdown` em uma tabela Supabase. Pra CMS
real, troque a stack (Strapi, Sanity, etc.).

**"Mia, dá pra hospedar em outro lugar (Netlify, Cloudflare)?"**  
Dá tranquilo. Só precisa adaptar `vercel.json` pro equivalente
(`_redirects` no Netlify, `_routes.json` no CF Pages). O resto
do código é estático e roda em qualquer host.

---

*HANDOFF mantido por Mia · documento vivo ·
última revisão pós-S59 (25/05/2026)*

Boa sorte, Mia. Quando o Du chegar com o novo cliente, leia este
arquivo do topo até aqui antes da primeira pergunta. Tudo que
você precisa pra começar bem tá aqui. 🚀
