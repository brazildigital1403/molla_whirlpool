# Hub Whirlpool Brasil · Agência Molla

Central do Cliente da Whirlpool Brasil — hub interno entregue pela
Agência Molla. Roda em Vercel + Supabase, sem build step.

## 🌐 Acessos

- **Produção (Vercel)**: a confirmar com o deploy
- **Repo**: https://github.com/brazildigital1403/molla_whirlpool
- **Supabase**: https://exyqqiquhiswrhcpdemf.supabase.co
- **Vercel project**: https://vercel.com/brazildigital1403s-projects/molla-whirlpool

## 🔐 Senhas (controle de acesso visual — não é segurança real)

Editar em `public/assets/auth.js`:

```js
const PASSWORDS = {
  'whirlpool2026': 'cliente',  // perfil cliente
  'molla@2026@':  'molla'      // perfil agência (admin)
};
```

## 📁 Estrutura

```
.
├── HANDOFF.md                ← doc viva do template (referência)
├── README.md                 ← este arquivo
├── package.json              ← marker Node, sem dependências
├── vercel.json               ← rotas limpas
├── docs/
│   ├── CONFIG_NOVO_CLIENTE.md
│   ├── ROADMAP.md
│   ├── schema.sql
│   └── S*.sql                ← exemplos de migration/seed
└── public/                   ← TUDO QUE A VERCEL PUBLICA
    ├── index.html            ← Hub (Jornada · Social · Aprovação · Arquivos)
    ├── login.html
    ├── ajuda.html
    ├── jornada.html  + jornada/
    ├── social.html           ← placeholder, aguarda briefing
    ├── aprovacao.html
    ├── arquivos.html + arquivos/
    ├── img/                  ← logos
    └── assets/               ← CSS/JS globais (header, auth, config, etc.)
```

## 🚀 Fluxo de deploy

```bash
git add .
git commit -m "feat(scopo): descricao curta"
git push origin main
# Vercel deploya automaticamente em ~1min
```

## 🎨 Paleta

- Navy escuro (títulos): `#0D436B`
- Azul claro (accent): `#00A0DD`
- Sucesso (`--success`, regra de ouro): `#50E596`
- Box light: `#F1F5F9`
- Fundo geral: `#FFFFFF`

## 📜 Licença

Uso interno — Agência Molla.
