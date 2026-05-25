# Hub Cliente Template

Template de hub interno de agência → cliente. Nasceu do projeto
**MetLife Brasil 2026** (Agência Molla) e foi testado em produção
ao longo de 26+ sessões de iteração.

## 🚀 Início rápido

1. **Leia o [HANDOFF.md](./HANDOFF.md)** — explica tudo (são 880 linhas, mas vale).
2. **Siga o [docs/CONFIG_NOVO_CLIENTE.md](./docs/CONFIG_NOVO_CLIENTE.md)** — checklist prático de adaptação.
3. **Crie repo no GitHub** → conecte na Vercel → crie projeto no Supabase.
4. **Adapte identidade visual** (logo, paleta, senhas, NAV_ITEMS).
5. **Primeiro push** → tá no ar.

## 📁 O que tem aqui

- `HANDOFF.md` — handoff completo pra próxima Mia (IA assistente) + Du
- `REFERENCIA_metlife_*` — README e MASTER originais do projeto MetLife
- `docs/` — schema SQL + roadmap + exemplos de migração
- `public/` — código completo (HTML/CSS/JS) pronto pra publicar

## 🔐 Senhas (defaults — TROQUE!)

Edite em `public/assets/auth.js`:

```js
const PASSWORDS = {
  'cliente2026': 'cliente',
  'molla@2026@': 'molla'
};
```

## 🧱 Stack

HTML/CSS/JS vanilla · Vercel · GitHub · Supabase · Chart.js (CDN).

Sem framework, sem build step. `git push` = deploy.

## 📜 Licença

Uso interno da Agência Molla.
