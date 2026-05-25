#!/usr/bin/env node
/**
 * Smoke test do Hub Whirlpool Brasil
 * Roda do raiz do projeto: node smoke_test.js
 *
 * Valida:
 *   1. Arquivos esperados existem
 *   2. Arquivos descartados foram removidos
 *   3. Strings proibidas (MetLife, cores antigas, mlh-, etc) zeradas
 *   4. Strings obrigatórias presentes (Whirlpool, paleta nova, --success, etc)
 *   5. Config Supabase populada corretamente
 *   6. Senhas e roles corretos
 *
 * Sai com codigo 0 se tudo verde, 1 se alguma falha.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ============================================================
// HELPERS
// ============================================================
const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YEL   = '\x1b[33m';
const DIM   = '\x1b[2m';
const RST   = '\x1b[0m';

let pass = 0;
let fail = 0;
const failures = [];

function ok(msg) { console.log(`  ${GREEN}✓${RST} ${msg}`); pass++; }
function ko(msg) { console.log(`  ${RED}✗${RST} ${msg}`); fail++; failures.push(msg); }

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkText(dir, exts) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walkText(full, exts));
    else if (exts.has(path.extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

// ============================================================
// SECAO 1 · ARQUIVOS EXPERADOS
// ============================================================
console.log(`\n${YEL}1. Arquivos esperados${RST}`);
const MUST_EXIST = [
  'README.md',
  'HANDOFF.md',
  'package.json',
  'vercel.json',
  'docs/CONFIG_NOVO_CLIENTE.md',
  'docs/ROADMAP.md',
  'docs/schema.sql',
  'public/index.html',
  'public/login.html',
  'public/ajuda.html',
  'public/jornada.html',
  'public/social.html',
  'public/aprovacao.html',
  'public/arquivos.html',
  'public/img/logo_whirlpool.webp',
  'public/img/logo_whirlpool_white.png',
  'public/img/logo_molla.svg',
  'public/assets/auth.js',
  'public/assets/config.js',
  'public/assets/header.css',
  'public/assets/header.js',
  'public/assets/breadcrumb.css',
  'public/assets/footer.css',
  'public/assets/supabase-store.js',
  'public/assets/events-store.js',
  'public/assets/files-store.js',
  'public/assets/aprovacao.css',
  'public/assets/aprovacao.js',
  'public/assets/bottom-sheet.css',
  'public/assets/bottom-sheet.js',
];
for (const f of MUST_EXIST) {
  if (exists(f)) ok(f);
  else ko(`FALTANDO: ${f}`);
}

// ============================================================
// SECAO 2 · ARQUIVOS QUE DEVEM TER SIDO REMOVIDOS
// ============================================================
console.log(`\n${YEL}2. Arquivos removidos (legado MetLife)${RST}`);
const MUST_NOT_EXIST = [
  'public/cronograma.html',
  'public/plano-midia.html',
  'public/performance.html',
  'public/performance',
  'public/muito-alem-do-jogo.html',
  'public/blitz.html',
  'public/blitz',
  'public/elemidia.html',
  'public/elemidia',
  'public/img/logo_metlife.svg',
  'REFERENCIA_metlife_README.md',
  'docs/REFERENCIA_metlife_MASTER.md',
];
for (const f of MUST_NOT_EXIST) {
  if (!exists(f)) ok(`removido: ${f}`);
  else ko(`AINDA EXISTE (devia ter saido): ${f}`);
}

// ============================================================
// SECAO 3 · STRINGS PROIBIDAS NO public/
// ============================================================
console.log(`\n${YEL}3. Residuais MetLife / paleta antiga no public/${RST}`);

const PUBLIC_TEXT_FILES = walkText(
  path.join(ROOT, 'public'),
  new Set(['.html', '.js', '.css', '.json'])
);

const FORBIDDEN_PATTERNS = [
  { re: /\bMetLife\b/,        label: 'MetLife (capital)' },
  { re: /\bmetlife\b/,        label: 'metlife (minusculo)' },
  { re: /\bmlh-/,             label: 'classe mlh-' },
  { re: /\bmlh[A-Z]/,         label: 'id mlh* camelCase' },
  { re: /--mlh-/,             label: 'css var --mlh-' },
  { re: /#003B5C/i,           label: 'hex navy antigo (#003B5C)' },
  { re: /#2DB5DF/i,           label: 'hex blue antigo (#2DB5DF)' },
  { re: /#27C7BD/i,           label: 'hex teal antigo (#27C7BD)' },
  { re: /#EEF6F8/i,           label: 'hex light antigo (#EEF6F8)' },
];

for (const pattern of FORBIDDEN_PATTERNS) {
  const hits = [];
  for (const file of PUBLIC_TEXT_FILES) {
    const content = fs.readFileSync(file, 'utf8');
    if (pattern.re.test(content)) {
      hits.push(path.relative(ROOT, file));
    }
  }
  if (hits.length === 0) ok(`zero ocorrencias de: ${pattern.label}`);
  else ko(`${pattern.label} ainda em: ${hits.join(', ')}`);
}

// ============================================================
// SECAO 4 · STRINGS OBRIGATORIAS
// ============================================================
console.log(`\n${YEL}4. Identidade Whirlpool aplicada${RST}`);

const REQUIRED = [
  { file: 'public/assets/auth.js',   re: /WhirlpoolAuth/,                  label: 'WhirlpoolAuth global' },
  { file: 'public/assets/auth.js',   re: /'whirlpool2026'/,                label: "senha 'whirlpool2026'" },
  { file: 'public/assets/auth.js',   re: /'molla@2026@'/,                  label: "senha 'molla@2026@'" },
  { file: 'public/assets/auth.js',   re: /KEY_AUTH = 'whirlpool_auth'/,    label: "localStorage 'whirlpool_auth'" },
  { file: 'public/assets/config.js', re: /WhirlpoolConfig/,                label: 'WhirlpoolConfig global' },
  { file: 'public/assets/config.js', re: /exyqqiquhiswrhcpdemf\.supabase\.co/, label: 'SUPABASE_URL real' },
  { file: 'public/assets/config.js', re: /sb_publishable_vXIcUhTY/,        label: 'publishable key real' },
  { file: 'public/assets/header.js', re: /id: 'social'/,                   label: "NAV_ITEMS contem id 'social'" },
  { file: 'public/assets/header.js', re: /id: 'jornada'/,                  label: "NAV_ITEMS contem id 'jornada'" },
  { file: 'public/assets/header.js', re: /id: 'aprovacao'/,                label: "NAV_ITEMS contem id 'aprovacao'" },
  { file: 'public/assets/header.js', re: /id: 'arquivos'/,                 label: "NAV_ITEMS contem id 'arquivos'" },
  { file: 'public/assets/header.css',re: /--success: #50E596/,             label: '--success no :root (regra ouro #10)' },
  { file: 'public/assets/header.css',re: /\bwhp-header\b/,                 label: 'classe whp-header (renomeacao mlh-)' },
  { file: 'public/index.html',       re: /Whirlpool Brasil/,               label: 'index menciona Whirlpool Brasil' },
  { file: 'public/index.html',       re: /#0D436B/,                        label: 'index usa navy Whirlpool' },
  { file: 'public/index.html',       re: /#00A0DD/,                        label: 'index usa blue Whirlpool' },
  { file: 'public/index.html',       re: /--success/,                      label: 'index :root tem --success' },
  { file: 'public/social.html',      re: /em construção/i,                 label: 'social.html eh placeholder' },
  { file: 'vercel.json',             re: /"\/social"/,                     label: 'vercel.json tem rota /social' },
  { file: 'vercel.json',             re: /"\/jornada"/,                    label: 'vercel.json tem rota /jornada' },
];

for (const r of REQUIRED) {
  if (!exists(r.file)) {
    ko(`${r.label} — arquivo nao existe (${r.file})`);
    continue;
  }
  const content = read(r.file);
  if (r.re.test(content)) ok(r.label);
  else ko(`${r.label} — nao achou padrao em ${r.file}`);
}

// ============================================================
// SECAO 5 · ROTAS DESCARTADAS NAO PODEM EXISTIR NO vercel.json
// ============================================================
console.log(`\n${YEL}5. Rotas descartadas removidas do vercel.json${RST}`);
const vercelJson = read('vercel.json');
const DROPPED_ROUTES = ['/cronograma', '/plano-midia', '/performance', '/blitz', '/elemidia', '/muito-alem-do-jogo'];
for (const route of DROPPED_ROUTES) {
  const re = new RegExp(`"${route}"`);
  if (!re.test(vercelJson)) ok(`rota ${route} removida`);
  else ko(`vercel.json AINDA tem rota: ${route}`);
}

// ============================================================
// SECAO 6 · CONSISTENCIA DE LOGO
// ============================================================
console.log(`\n${YEL}6. Logo Whirlpool nas referencias${RST}`);
const pagesWithLogo = ['public/index.html', 'public/login.html', 'public/assets/header.js'];
for (const f of pagesWithLogo) {
  const content = read(f);
  if (/logo_whirlpool\.webp/.test(content)) ok(`${f} aponta pra logo_whirlpool.webp`);
  else ko(`${f} nao aponta pra logo_whirlpool.webp`);
}

// ============================================================
// RESUMO
// ============================================================
console.log(`\n${YEL}===========================================${RST}`);
console.log(`  ${GREEN}${pass} verde${RST} · ${fail > 0 ? RED : DIM}${fail} vermelho${RST}`);
console.log(`${YEL}===========================================${RST}`);

if (fail > 0) {
  console.log(`\n${RED}FALHAS:${RST}`);
  for (const m of failures) console.log(`  · ${m}`);
  process.exit(1);
}
console.log(`\n${GREEN}✅ Tudo verde. Pronto pra empacotar.${RST}`);
process.exit(0);
