# MetLife Brasil 2026

Hub de deliverables estratégicos da campanha **MetLife Brasil 2026** — Agência Molla.

## 🚀 Stack

- **Hosting:** [Vercel](https://vercel.com/agenciamolla1403s-projects/metlife-brasil)
- **Repo:** [github.com/agenciamolla1403/metlife_brasil](https://github.com/agenciamolla1403/metlife_brasil)
- **Backend:** [Supabase](https://supabase.com) (Postgres + RLS)
- **Frontend:** Site estático (HTML + CSS + JS vanilla, sem build)

## 📂 Estrutura

```
metlife_brasil/
├── public/
│   ├── index.html              → Hub principal (3 cards)
│   ├── login.html              → Tela de senha
│   ├── cronograma.html         → Cronograma Diarizado A/B
│   ├── plano-midia.html        → Plano Tático de Mídia
│   ├── aprovacao.html          → Aprovação de Peças (SPA)
│   └── assets/
│       ├── auth.js             → Auth client-side + guard
│       ├── config.js           → URL e key do Supabase ⚙️
│       ├── supabase-store.js   → Camada de dados (CRUD + cache)
│       ├── aprovacao.css       → Estilos da feature
│       └── aprovacao.js        → SPA (router + views + modais)
├── vercel.json
├── package.json
├── .gitignore
└── README.md
```

## 🌐 Rotas em produção

| URL | Página | Auth? |
|-----|--------|-------|
| `/login` | Tela de senha | público |
| `/` | Hub central | protegida |
| `/cronograma` | Cronograma Diarizado A/B | protegida |
| `/plano-midia` | Plano Tático de Mídia | protegida |
| `/aprovacao` | Aprovação de Peças (SPA) | protegida |

## 🔐 Login

Senha padrão: **`metlife2026`**
Para alterar, edite a constante `PASSWORD` no topo de `public/assets/auth.js`.

> ⚠️ Não é segurança real — controle de acesso visual apenas. Uso interno.

## 🗄 Supabase — schema e configuração

### Configuração (cliente)

`public/assets/config.js`:
```js
window.MetLifeConfig = {
  SUPABASE_URL: 'https://nasgvdqvrpeftqibmgfk.supabase.co',
  SUPABASE_KEY: 'sb_publishable_***'
};
```

### Schema (rodar no SQL Editor do Supabase)

3 tabelas: `campaigns`, `pieces`, `comments` com RLS habilitado e policies abertas
para `anon` e `authenticated`. Realtime já publicado para evolução futura.
SQL completo em `docs/schema.sql` (ou pedir ao Mia).

### Limites atuais e evoluções planejadas

- **Imagens** vão como base64 inline na coluna `media_url` (TEXT). Funciona, mas pesa.
  - **Próxima evolução:** migrar para Supabase Storage (bucket público), salvando só URL.
- **Vídeos** são por URL (YouTube/Vimeo embed automático ou MP4 direto).
- **Realtime sync** entre devices: já está publicado no Postgres mas o cliente
  ainda não faz subscribe — **próxima evolução**.

## ✅ Aprovação de Peças

SPA na rota `/aprovacao` com:

- **Lista de campanhas** com mini-stats (total / aprovadas / reprovadas / pendentes)
- **Detalhe de campanha** com dashboard de KPIs e barra de progresso
- **Modal de peça** com mídia (imagem/vídeo embed/iframe), copy, histórico de comentários e botões aprovar/reprovar
- **Filtros** por status: Todas / Pendentes / Aprovadas / Reprovadas
- **Imagens** com upload local + compressão automática (JPEG ~80%, max 1400px)
- **Identidade do aprovador** registrada em comentários e ações

## 🛠 Desenvolvimento local

```bash
npm run dev
# abre em http://localhost:3000
```

## 🚢 Deploy

Push na branch `main` → Vercel faz deploy automático.

```bash
git add .
git commit -m "feat: descrição do ajuste"
git push origin main
```

---

© Agência Molla × MetLife Brasil — 2026
