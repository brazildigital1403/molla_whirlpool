# Checklist de Configuração · Novo Cliente

> Passo a passo prático pra colocar um novo cliente no ar usando
> este template. Cobre setup técnico + adaptação visual.
>
> Estimativa: **1h30 a 2h** com Mia ajudando.

---

## ⏱️ Fase 1 · Setup técnico (30min)

### GitHub
- [ ] Criar repo `agenciamolla<n>/<cliente>` no GitHub
- [ ] Clonar pra `~/_Molla_<Cliente>/`
- [ ] Copiar conteúdo deste template pra lá:
  ```bash
  cd ~/Downloads/
  unzip hub_cliente_template.zip
  cp -R hub_cliente_template/* ~/_Molla_<Cliente>/
  cd ~/_Molla_<Cliente>
  git init && git remote add origin <url>
  ```

### Supabase
- [ ] Criar projeto novo em [supabase.com](https://supabase.com) (free tier)
- [ ] **SQL Editor** → rodar `docs/schema.sql`
- [ ] **Settings → API** → copiar URL + anon key
- [ ] Colar em `public/assets/config.js`:
  ```js
  const SUPABASE_URL = 'https://<project_ref>.supabase.co';
  const SUPABASE_ANON_KEY = '<sua_anon_key>';
  ```

### Vercel
- [ ] Importar repo em [vercel.com/new](https://vercel.com/new)
- [ ] Aceitar defaults (root `/`, output `public/`)
- [ ] Aguardar primeiro deploy (~1min)
- [ ] (Opcional) Adicionar domínio custom em Settings → Domains

---

## 🎨 Fase 2 · Identidade visual (30min)

### Logo
- [ ] Copiar SVG do logo do cliente pra `public/img/logo_<cliente>.svg`
- [ ] Manter `public/img/logo_molla.svg` (logo da agência no footer)
- [ ] Search & replace em massa:
  ```bash
  grep -rl 'logo_metlife' public/ | xargs sed -i '' 's/logo_metlife/logo_<cliente>/g'
  ```
  (No Linux remove o `''` depois do `-i`)

### Paleta de cores
- [ ] Editar `public/assets/header.css` — variáveis CSS no topo:
  ```css
  :root {
    --whp-navy: #0D436B;   /* cor primária do cliente */
    --whp-blue: #00A0DD;
    --whp-green: #50E596;
    --whp-teal: #00A0DD;
    --whp-light: #F1F5F9;
  }
  ```
- [ ] Conferir variáveis em cada HTML exemplo (algumas páginas
      têm `:root` próprio com tokens locais)
- [ ] Atualizar `public/img/logo_molla.svg` se mudou identidade da Molla

### Senhas
- [ ] Editar `public/assets/auth.js` (linhas 23-26):
  ```js
  const PASSWORDS = {
    '<cliente>2026': 'cliente',    // role cliente
    'molla@2026@': 'molla'          // role agência
  };
  ```
- [ ] Atualizar comentários no topo do arquivo (linhas 10-11)

---

## 🧭 Fase 3 · Estrutura de menu (15min)

### NAV_ITEMS
- [ ] Editar `public/assets/header.js` — array `NAV_ITEMS`:
  ```js
  const NAV_ITEMS = [
    { type: 'link', href: '/jornada', id: 'jornada', label: 'Jornada' },
    { type: 'group', id: 'midia', label: 'Mídia', children: [
      { href: '/plano-midia', id: 'plano', label: 'Plano' },
      // ajuste pras páginas reais do cliente
    ]},
    // ... 
  ];
  ```

### Breadcrumbs
- [ ] Em cada HTML usado, atualizar:
  ```html
  <span class="crumb-group">Mídia</span> / <strong>Plano</strong>
  ```

---

## 📝 Fase 4 · Conteúdo (45min — varia muito)

### Hub (`public/index.html`)
- [ ] Adaptar título do hero ("Central do Cliente <Cliente>")
- [ ] Cards — um pra cada página do novo cliente:
  - Adaptar `<span class="tag">`, `<h2>`, `<p>`, `<span class="cta">`
  - Ajustar `class="card tag-<variante>"` (mid/end/elem/blitz/arq/jor)
  - Atualizar `href`

### Login (`public/login.html`)
- [ ] Texto de boas-vindas
- [ ] Logo
- [ ] (Opcional) Imagem de fundo

### Ajuda (`public/ajuda.html`)
- [ ] Recriar passos pra refletir as páginas existentes

### Páginas exemplo (decidir caso a caso)
- [ ] `cronograma.html` — manter? adaptar? remover?
- [ ] `plano-midia.html` — manter? adaptar? remover?
- [ ] `performance.html` — só quando tiver dados reais do cliente
- [ ] `muito-alem-do-jogo.html` — só se o cliente tiver programa institucional
- [ ] `blitz.html` — só se cliente tem ativações físicas
- [ ] `elemidia.html` — só se cliente tiver proposta OOH

### Páginas base (geralmente mantém quase iguais)
- [ ] `arquivos.html` — adapta copy, mantém estrutura
- [ ] `jornada.html` — adapta copy, mantém estrutura
- [ ] `aprovacao.html` — adapta SE o cliente tiver fluxo de aprovação

---

## 🧹 Fase 5 · Faxina opcional (15min)

### Renomear chaves de auth
Por enquanto o `localStorage` usa chaves `whirlpool_auth`,
`whirlpool_role`, `whirlpool_user`. Se quiser renomear pro nome do
novo cliente:

- [ ] Editar `public/assets/auth.js` — substituir:
  - `KEY_AUTH` → `'<cliente>_auth'`
  - `KEY_USER` → `'<cliente>_user'`
  - `KEY_ROLE` → `'<cliente>_role'`
- [ ] Ajustar `window.WhirlpoolAuth` → `window.<Cliente>Auth` ou só `window.Auth`
- [ ] Atualizar referências em `aprovacao.js`, `header.js`, etc.

⚠️ Cuidado: se já tiver pessoas logadas com chaves antigas, elas
vão precisar logar de novo. Faça antes do primeiro acesso.

### Limpar referências Whirlpool em comentários
- [ ] `grep -rl 'Whirlpool' public/` — ver onde aparece
- [ ] Substituir em comentários (não em conteúdo real do cliente exemplo)

### Renomear assets
- [ ] (Opcional) Renomear classes `whp-*` no header.css/.js pra `<cliente>-*`
- [ ] (Opcional) Adaptar prefixos das classes locais

---

## ✅ Fase 6 · Validação final (10min)

- [ ] Abre `<cliente>.vercel.app` → redireciona pra `/login`
- [ ] Login com senha do cliente → entra como role cliente
- [ ] Login com `molla@2026@` → entra como role admin
- [ ] Header mostra logo + nome do cliente + paleta certa
- [ ] Todas as páginas linkadas no NAV_ITEMS carregam
- [ ] Mobile (≤760px): hamburguer abre, drawer funciona
- [ ] Console do navegador: sem erros 404 (procurar logos faltantes)
- [ ] iOS Safari (real device se possível): sticky funciona, drawer ok
- [ ] Logout em uma aba → outra aba também desloga (S55 working)

---

## 🚀 Primeiro push final

```bash
cd ~/_Molla_<Cliente>
git add .
git commit -m "feat: setup inicial completo do hub <Cliente>"
git push origin main
# Vercel deploya automaticamente
```

A partir daqui é evoluir página por página conforme o cliente
fornece briefing, materiais, dados.

**Boa sorte!** 🎯
