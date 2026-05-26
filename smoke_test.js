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
  'public/assets/social-store.js',
  'public/assets/aprovacao.css',
  'public/assets/aprovacao.js',
  'public/assets/bottom-sheet.css',
  'public/assets/bottom-sheet.js',
  'public/social/social.css',
  'public/social/social.js',
  'docs/social_schema.sql',
  'docs/social_seed_junho.sql',
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
  { file: 'public/assets/header.js', re: /id: 'aprovacao'/,                label: "NAV_ITEMS contem id 'aprovacao'" },
  { file: 'public/assets/header.js', re: /id: 'arquivos'/,                 label: "NAV_ITEMS contem id 'arquivos'" },
  { file: 'public/assets/header.css',re: /--success: #50E596/,             label: '--success no :root (regra ouro #10)' },
  { file: 'public/assets/header.css',re: /\bwhp-header\b/,                 label: 'classe whp-header (renomeacao mlh-)' },
  { file: 'public/index.html',       re: /Whirlpool Brasil/,               label: 'index menciona Whirlpool Brasil' },
  { file: 'public/index.html',       re: /#0D436B/,                        label: 'index usa navy Whirlpool' },
  { file: 'public/index.html',       re: /#00A0DD/,                        label: 'index usa blue Whirlpool' },
  { file: 'public/index.html',       re: /--success/,                      label: 'index :root tem --success' },
  { file: 'public/social.html',      re: /social-store\.js/,               label: 'social.html carrega social-store.js' },
  { file: 'public/social.html',      re: /soMesSelect/,                    label: 'social.html tem seletor de mes' },
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
// SECAO 7 · CHECKS S2 · ajustes visuais
// ============================================================
console.log(`\n${YEL}7. Ajustes S2 aplicados${RST}`);

// 7a) Jornada removida do NAV_ITEMS
const headerJs = read('public/assets/header.js');
if (!/id:\s*'jornada'/.test(headerJs)) ok("NAV_ITEMS sem 'jornada' (desabilitada S2)");
else ko("NAV_ITEMS AINDA tem 'jornada' — devia ter sido removido");

// 7b) Index sem card de Jornada
const indexHtml = read('public/index.html');
if (!/href="\/jornada"/.test(indexHtml)) ok("index.html sem card de Jornada");
else ko("index.html AINDA tem card de Jornada");

// 7c) Index sem gradientes blue->green (devem ser navy->blue ou blue->navy)
const blueGreenInIndex = /linear-gradient[^;]*var\(--blue\)[^;]*var\(--green\)/.test(indexHtml)
                       || /linear-gradient[^;]*var\(--green\)[^;]*var\(--blue\)/.test(indexHtml);
if (!blueGreenInIndex) ok("index.html sem gradient blue<->green");
else ko("index.html AINDA tem gradient blue<->green");

// 7d) header.css sem gradientes whp-green <-> whp-blue (perfil/admin)
const headerCss = read('public/assets/header.css');
const greenBlueGrad = /linear-gradient[^;]*--whp-green[^;]*--whp-blue/.test(headerCss)
                    || /linear-gradient[^;]*--whp-blue[^;]*--whp-green/.test(headerCss);
if (!greenBlueGrad) ok("header.css sem gradient whp-green<->whp-blue (perfil/admin azuis)");
else ko("header.css AINDA tem gradient verde-azul em perfil/admin");

// 7e) ajuda.css sem rgba(80,229,150) — verde como decoracao
const ajudaCss = read('public/ajuda/ajuda.css');
if (!/80,\s*229,\s*150/.test(ajudaCss)) ok("ajuda.css sem rgba verde decorativo");
else ko("ajuda.css AINDA tem rgba(80,229,150,...)");

// 7f) Verdes semanticos preservados no ajuda.html (botao Aprovar, status, KPI)
const ajudaHtml = read('public/ajuda.html');
if (/#50E596|#16A34A/.test(ajudaHtml)) ok("ajuda.html preserva verdes semanticos (botao Aprovar, status)");
else ko("ajuda.html perdeu verdes semanticos — UX de aprovacao fica inconsistente");

// 7g) 3 areas em vez de 4
if (/As 3 áreas/.test(ajudaHtml) && !/As 4 áreas/.test(ajudaHtml)) ok("ajuda mostra '3 areas' (sem Jornada)");
else ko("ajuda ainda fala em '4 areas'");

// ============================================================
// SECAO 8 · FEATURE SOCIAL (S2 parte 2)
// ============================================================
console.log(`\n${YEL}8. Feature Social${RST}`);

const socialStoreJs = read('public/assets/social-store.js');
const socialJs = read('public/social/social.js');
const socialCss = read('public/social/social.css');
const socialHtml = read('public/social.html');

const socialChecks = [
  { test: /window\.SocialStore\s*=/.test(socialStoreJs), label: 'social-store expõe window.SocialStore' },
  { test: /approvePost|rejectPost|reopenPost/.test(socialStoreJs), label: 'social-store tem approve/reject/reopen' },
  { test: /createComentario|listComentarios/.test(socialStoreJs), label: 'social-store tem CRUD de comentários' },
  { test: /listHistorico/.test(socialStoreJs), label: 'social-store tem historico' },
  { test: /\bsubscribe\b/.test(socialStoreJs), label: 'social-store tem realtime subscribe' },
  { test: /so-card-strip|so-card-mock|so-card-tag/.test(socialCss), label: 'social.css tem classes do card' },
  { test: /so-drawer/.test(socialCss), label: 'social.css tem drawer lateral' },
  { test: /so-modal/.test(socialCss), label: 'social.css tem modal de reprovação' },
  { test: /data-linha="institucional"/.test(socialCss), label: 'social.css tem token por linha editorial' },
  { test: /svgCarrossel|svgEstatico|svgReels/.test(socialJs), label: 'social.js gera mockup SVG por formato' },
  { test: /openRejectModal/.test(socialJs), label: 'social.js abre modal de reprovação' },
  { test: /motivo\.trim\(\)/.test(socialJs) || /motivo\b/.test(socialStoreJs), label: 'reprovação exige motivo (não-vazio)' },
  { test: /soFiltersTipo|soFiltersLinha|soFiltersStatus/.test(socialHtml), label: 'social.html tem containers de filtros' },
  { test: /WhirlpoolAuth/.test(socialJs), label: 'social.js usa WhirlpoolAuth pra identificar autor' },
];
for (const c of socialChecks) {
  if (c.test) ok(c.label);
  else ko(c.label);
}

// schema SQL
const sqlSchema = read('docs/social_schema.sql');
const sqlSeed   = read('docs/social_seed_junho.sql');
const schemaChecks = [
  { test: /CREATE TABLE.*social_meses/i.test(sqlSchema), label: 'schema cria social_meses' },
  { test: /CREATE TABLE.*social_posts/i.test(sqlSchema), label: 'schema cria social_posts' },
  { test: /CREATE TABLE.*social_comentarios/i.test(sqlSchema), label: 'schema cria social_comentarios' },
  { test: /CREATE TABLE.*social_historico/i.test(sqlSchema), label: 'schema cria social_historico' },
  { test: /supabase_realtime/.test(sqlSchema), label: 'schema habilita realtime' },
  { test: /'2026-06'/.test(sqlSeed) && /Junho 2026/.test(sqlSeed), label: 'seed popula Junho 2026' },
  { test: (sqlSeed.match(/\(\d{1,2}, DATE/g) || []).length === 12, label: 'seed tem exatamente 12 posts' },
];
for (const c of schemaChecks) {
  if (c.test) ok(c.label);
  else ko(c.label);
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
