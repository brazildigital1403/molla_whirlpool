/* ============================================================
   Elemidia — Renderização das seções
   ============================================================ */
(function () {
  'use strict';

  if (!window.ELEMIDIA_DATA) {
    console.error('[elemidia] Dados não carregados.');
    return;
  }
  const D = window.ELEMIDIA_DATA;

  // ============ HELPERS ============
  const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmtBRL = (v) => v == null ? '—' : v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const fmtNum = (v, decimals = 0) => v == null ? '—' : v.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  });
  const fmtPct = (v) => v == null ? '—' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
  const fmtDecimal = (v) => v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tagFor = (midia) => {
    if (!midia) return '';
    const m = midia.toLowerCase();
    if (m.includes('residencia')) return 'is-residencial';
    if (m.includes('comercia')) return 'is-comercial';
    return '';
  };

  // ============ SEÇÃO 1: RESUMO DA PROPOSTA ============
  function renderResumo() {
    const r = D.resumo_proposta;
    const linhasHtml = r.linhas.map(l => `
      <tr>
        <td><span class="elem-tag is-digital">${escapeHtml(l.tipo)}</span></td>
        <td>${escapeHtml(l.praca)}</td>
        <td><span class="elem-tag ${tagFor(l.produto)}">${escapeHtml(l.produto)}</span></td>
        <td class="num">${fmtNum(l.periodo)}</td>
        <td>${escapeHtml(l.inicio)} a ${escapeHtml(l.fim)}</td>
        <td class="num">${fmtNum(l.telas_faces)}</td>
        <td class="num">${fmtNum(l.insercoes_diarias)}</td>
        <td class="num strong">${fmtNum(l.total_inser)}</td>
        <td class="num">${fmtBRL(l.valor_tabela)}</td>
        <td class="num">${fmtPct(l.desconto)}</td>
        <td class="num strong">${fmtBRL(l.valor_negociado)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="elem-info-grid">
        <div class="elem-info-card"><p class="elem-info-label">Cliente</p><p class="elem-info-value">${escapeHtml(r.cliente)}</p></div>
        <div class="elem-info-card"><p class="elem-info-label">Agência</p><p class="elem-info-value">${escapeHtml(r.agencia)}</p></div>
        <div class="elem-info-card"><p class="elem-info-label">Campanha</p><p class="elem-info-value">${escapeHtml(r.campanha)}</p></div>
        <div class="elem-info-card"><p class="elem-info-label">Período</p><p class="elem-info-value">${escapeHtml(r.periodo_label)}</p></div>
        <div class="elem-info-card">
          <p class="elem-info-label">Atendimento Comercial</p>
          <p class="elem-info-value">${escapeHtml(r.atendimento.nome)}<br>
            <a href="mailto:${escapeHtml(r.atendimento.email)}">${escapeHtml(r.atendimento.email)}</a><br>
            ${escapeHtml(r.atendimento.telefone)}</p>
        </div>
        <div class="elem-info-card">
          <p class="elem-info-label">Condições</p>
          <p class="elem-info-value">Pagamento: <strong>${escapeHtml(r.pagamento)}</strong><br>
            Validade: ${escapeHtml(String(r.validade_dias))} dias<br>
            Data: ${escapeHtml(r.data_proposta)}</p>
        </div>
      </div>

      <div class="elem-table-wrap">
        <div class="elem-table-scroll">
          <table class="elem-table">
            <thead>
              <tr>
                <th>Tipo</th><th>Praça</th><th>Produto</th>
                <th class="num">Período</th><th>Datas</th>
                <th class="num">Telas/Faces</th><th class="num">Inserções/Dia</th><th class="num">Total Inser.</th>
                <th class="num">Valor Tabela</th><th class="num">Desconto</th><th class="num">Valor Negociado</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
              <tr class="elem-table-footer">
                <td colspan="5"><strong>Total da Proposta</strong></td>
                <td class="num strong">${fmtNum(r.total.telas_faces)}</td>
                <td class="num">—</td>
                <td class="num strong">${fmtNum(r.total.total_inser)}</td>
                <td class="num strong">${fmtBRL(r.total.valor_tabela)}</td>
                <td class="num">${fmtPct(r.total.desconto)}</td>
                <td class="num strong">${fmtBRL(r.total.valor_negociado)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p style="margin-top:14px; font-size:12px; color:var(--elem-muted); font-style:italic;">${escapeHtml(r.nota)}</p>
    `;
    document.getElementById('resumoContent').innerHTML = html;
  }

  // ============ SEÇÃO 2: MÉTRICAS NO PERÍODO ============
  function renderMetricasPeriodo() {
    const m = D.metricas_periodo;
    const card = (data, title, klass) => `
      <div class="elem-metric-card ${klass}">
        <h3>${escapeHtml(title)}</h3>
        <div class="elem-metric-rows">
          ${data.universo != null ? `<div class="elem-metric-row"><span class="elem-metric-key">Universo</span><span class="elem-metric-val">${fmtNum(data.universo)}</span></div>` : ''}
          <div class="elem-metric-row"><span class="elem-metric-key">Investimento</span><span class="elem-metric-val">${fmtBRL(data.investimento)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Desconto</span><span class="elem-metric-val">${fmtPct(data.desconto)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Impactos</span><span class="elem-metric-val">${fmtNum(data.impactos)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">GRP</span><span class="elem-metric-val">${fmtNum(data.grp)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Alcance</span><span class="elem-metric-val">${fmtNum(data.alcance)}${data.alcance_pct ? ' <span class="elem-metric-sub">(' + fmtPct(data.alcance_pct) + ')</span>' : ''}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Frequência</span><span class="elem-metric-val">${fmtDecimal(data.frequencia)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">CPP</span><span class="elem-metric-val">${fmtBRL(data.cpp)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">CPM</span><span class="elem-metric-val">${fmtBRL(data.cpm)}</span></div>
        </div>
      </div>
    `;
    document.getElementById('metricasPeriodoContent').innerHTML = `
      <div class="elem-grid-3">
        ${card(m.sao_paulo, 'Total · São Paulo', 'is-feature')}
        ${m.residenciais ? card(m.residenciais, 'Edifícios Residenciais', 'is-residencial') : ''}
        ${m.comerciais ? card(m.comerciais, 'Edifícios Comerciais', 'is-comercial') : ''}
      </div>
    `;
  }

  // ============ SEÇÃO 3: MÉTRICAS POR PRODUTO ============
  function renderMetricasProduto() {
    const lista = D.metricas_produto;
    const container = document.getElementById('metricasProdutoContent');

    container.innerHTML = `
      <div class="elem-table-wrap">
        <div class="elem-table-tools">
          <input type="text" class="elem-search" id="prodSearch" placeholder="🔍 Buscar por edifício ou circuito..." />
          <select class="elem-filter" id="prodFilter">
            <option value="all">Todos os produtos</option>
            <option value="Edifícios Residenciais">Edifícios Residenciais</option>
            <option value="Edifícios Comerciais">Edifícios Comerciais</option>
          </select>
          <span class="elem-count" id="prodCount"></span>
        </div>
        <div class="elem-table-scroll">
          <table class="elem-table">
            <thead>
              <tr>
                <th>#</th><th>Circuito</th><th>Edifício</th><th>Produto</th>
                <th class="num">Telas</th><th class="num">Inser./Dia</th><th class="num">Inser. Totais</th>
                <th class="num">Valor Negociado</th><th class="num">CPM</th>
                <th class="num">Alcance</th><th class="num">Impactos</th><th class="num">GRP</th>
              </tr>
            </thead>
            <tbody id="prodTbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const search = document.getElementById('prodSearch');
    const filter = document.getElementById('prodFilter');
    const tbody = document.getElementById('prodTbody');
    const count = document.getElementById('prodCount');

    function render() {
      const q = (search.value || '').toLowerCase().trim();
      const f = filter.value;
      const filtered = lista.filter(p => {
        if (f !== 'all' && p.midia !== f) return false;
        if (q) {
          const hay = ((p.produto_nome || '') + ' ' + (p.circuito || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      count.textContent = `${filtered.length} produto${filtered.length === 1 ? '' : 's'}`;
      tbody.innerHTML = filtered.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${escapeHtml(p.circuito || '')}</strong></td>
          <td>${escapeHtml(p.produto_nome || '')}</td>
          <td><span class="elem-tag ${tagFor(p.midia)}">${escapeHtml((p.midia || '').replace('Edifícios ', ''))}</span></td>
          <td class="num">${fmtNum(p.telas_faces)}</td>
          <td class="num">${fmtNum(p.insercoes_diarias)}</td>
          <td class="num">${fmtNum(p.insercoes_totais)}</td>
          <td class="num strong">${fmtBRL(p.valor_negociado)}</td>
          <td class="num">${fmtBRL(p.cpm)}</td>
          <td class="num">${fmtNum(p.alcance)}</td>
          <td class="num">${fmtNum(p.impactos)}</td>
          <td class="num">${fmtNum(p.grp)}</td>
        </tr>
      `).join('') || '<tr><td colspan="12" class="elem-empty">Nenhum resultado.</td></tr>';
    }
    search.addEventListener('input', render);
    filter.addEventListener('change', render);
    render();
  }

  // ============ SEÇÃO 4: EDIFÍCIOS (resumo) ============
  function renderEdificios() {
    const e = D.edificios_resumo;
    const card = (data, klass) => `
      <div class="elem-metric-card ${klass}">
        <h3>${escapeHtml(data.produto || '')}</h3>
        <div class="elem-metric-rows">
          <div class="elem-metric-row"><span class="elem-metric-key">Praça</span><span class="elem-metric-val">${escapeHtml(data.praca || '')}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Período</span><span class="elem-metric-val">${fmtNum(data.periodo)} dias (${escapeHtml(data.inicio)} a ${escapeHtml(data.fim)})</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Telas / Faces</span><span class="elem-metric-val">${fmtNum(data.total_telas_faces)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Pontos</span><span class="elem-metric-val">${fmtNum(data.total_pontos)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Valor Tabela</span><span class="elem-metric-val">${fmtBRL(data.valor_tabela)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Desconto</span><span class="elem-metric-val">${fmtPct(data.desconto)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Valor Bruto Negociado</span><span class="elem-metric-val">${fmtBRL(data.valor_bruto_negociado)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Inser./Dia</span><span class="elem-metric-val">${fmtNum(data.insercoes_diarias)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Total Inserções</span><span class="elem-metric-val">${fmtNum(data.total_inser)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">Impactos no Período</span><span class="elem-metric-val">${fmtNum(data.impactos_periodo)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">CPM</span><span class="elem-metric-val">${fmtBRL(data.cpm)}</span></div>
          <div class="elem-metric-row"><span class="elem-metric-key">GRP</span><span class="elem-metric-val">${fmtDecimal(data.grp)}</span></div>
        </div>
      </div>
    `;
    document.getElementById('edificiosContent').innerHTML = `
      <div class="elem-grid-2">
        ${e.map(d => card(d, tagFor(d.produto))).join('')}
      </div>
    `;
  }

  // ============ SEÇÃO 5: REDE ============
  function renderRede() {
    const lista = D.rede;
    const container = document.getElementById('redeContent');

    // Bairros únicos pra filtro
    const bairros = [...new Set(lista.map(r => r.bairro).filter(Boolean))].sort();

    container.innerHTML = `
      <div class="elem-table-wrap">
        <div class="elem-table-tools">
          <input type="text" class="elem-search" id="redeSearch" placeholder="🔍 Buscar por edifício, endereço ou bairro..." />
          <select class="elem-filter" id="redeFilterTipo">
            <option value="all">Todos os tipos</option>
            <option value="Edifícios Residenciais">Residenciais</option>
            <option value="Edifícios Comerciais">Comerciais</option>
          </select>
          <select class="elem-filter" id="redeFilterBairro">
            <option value="all">Todos os bairros</option>
            ${bairros.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
          </select>
          <span class="elem-count" id="redeCount"></span>
        </div>
        <div class="elem-table-scroll">
          <table class="elem-table">
            <thead>
              <tr>
                <th>#</th><th>Edifício</th><th>Tipo</th>
                <th>Endereço</th><th>Bairro</th><th>Zona</th><th>CEP</th>
                <th class="num">Andares</th><th class="num">Apt./Empr.</th>
                <th class="num">Telas</th><th>Class.</th><th>Mapa</th>
              </tr>
            </thead>
            <tbody id="redeTbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const search = document.getElementById('redeSearch');
    const fTipo = document.getElementById('redeFilterTipo');
    const fBairro = document.getElementById('redeFilterBairro');
    const tbody = document.getElementById('redeTbody');
    const count = document.getElementById('redeCount');

    function render() {
      const q = (search.value || '').toLowerCase().trim();
      const t = fTipo.value;
      const b = fBairro.value;
      const filtered = lista.filter(r => {
        if (t !== 'all' && r.ativo !== t) return false;
        if (b !== 'all' && r.bairro !== b) return false;
        if (q) {
          const hay = ((r.produto_nome || '') + ' ' + (r.endereco || '') + ' ' + (r.bairro || '') + ' ' + (r.zona || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      count.textContent = `${filtered.length} edifício${filtered.length === 1 ? '' : 's'}`;
      tbody.innerHTML = filtered.map((r, i) => {
        const aptOrEmp = r.ativo && r.ativo.includes('Comercial')
          ? `${fmtNum(r.empresas)} empr.`
          : `${fmtNum(r.apartamentos)} apt.`;
        const mapsUrl = (r.lat != null && r.lng != null)
          ? `https://www.google.com/maps?q=${r.lat},${r.lng}` : null;
        return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(r.produto_nome || '')}</strong></td>
            <td><span class="elem-tag ${tagFor(r.ativo)}">${escapeHtml((r.ativo || '').replace('Edifícios ', ''))}</span></td>
            <td>${escapeHtml(r.endereco || '')}, ${escapeHtml(r.numero || '')}</td>
            <td>${escapeHtml(r.bairro || '')}</td>
            <td>${escapeHtml(r.zona || '')}</td>
            <td>${escapeHtml(r.cep || '')}</td>
            <td class="num">${fmtNum(r.andares)}</td>
            <td class="num">${aptOrEmp}</td>
            <td class="num">${fmtNum(r.total_telas_faces)}</td>
            <td>${r.classif ? `<span class="elem-tag is-aaa">${escapeHtml(r.classif)}</span>` : '—'}</td>
            <td>${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener" style="color:var(--elem-blue); font-weight:700; text-decoration:none;">📍 ver</a>` : '—'}</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="12" class="elem-empty">Nenhum resultado.</td></tr>';
    }
    [search, fTipo, fBairro].forEach(el => el.addEventListener('input', render));
    [fTipo, fBairro].forEach(el => el.addEventListener('change', render));
    render();
  }

  // ============ SEÇÃO 6: FATURAMENTO ============
  function renderFaturamento() {
    const f = D.faturamento;
    const linhasHtml = f.linhas.map(l => `
      <tr>
        <td><span class="elem-tag is-digital">${escapeHtml(l.tipo)}</span></td>
        <td>${escapeHtml(l.praca)}</td>
        <td><span class="elem-tag ${tagFor(l.produto)}">${escapeHtml(l.produto)}</span></td>
        <td class="num">${fmtNum(l.periodo)}</td>
        <td class="num">${fmtNum(l.telas_faces)}</td>
        <td class="num">${fmtNum(l.total_inser)}</td>
        <td class="num">${fmtBRL(l.valor_tabela)}</td>
        <td class="num">${fmtPct(l.desconto)}</td>
        <td class="num strong">${fmtBRL(l.valor_negociado)}</td>
      </tr>
    `).join('');

    document.getElementById('faturamentoContent').innerHTML = `
      <div class="elem-fat-info">${escapeHtml(f.endereco_completo || '')}</div>
      <div class="elem-fat-aviso">ⓘ ${escapeHtml(f.aviso_pis)}</div>
      <div class="elem-table-wrap">
        <div class="elem-table-scroll">
          <table class="elem-table">
            <thead>
              <tr>
                <th>Tipo</th><th>Praça</th><th>Produto</th>
                <th class="num">Período</th>
                <th class="num">Telas/Faces</th><th class="num">Total Inser.</th>
                <th class="num">Valor Tabela</th><th class="num">Desconto</th><th class="num">Valor Negociado</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
              <tr class="elem-table-footer">
                <td colspan="4"><strong>Total</strong></td>
                <td class="num strong">${fmtNum(f.total.telas_faces)}</td>
                <td class="num strong">${fmtNum(f.total.total_inser)}</td>
                <td class="num strong">${fmtBRL(f.total.valor_tabela)}</td>
                <td class="num">${fmtPct(f.total.desconto)}</td>
                <td class="num strong">${fmtBRL(f.total.valor_negociado)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ============ SEÇÃO 7: ESPECIFICAÇÕES TÉCNICAS ============
  function renderEspecificacoes() {
    const specs = D.especificacoes_tecnicas;
    const card = (s) => `
      <div class="elem-spec-card">
        <h3>${escapeHtml(s.ambiente || '')}</h3>
        <div class="elem-spec-row"><span class="elem-spec-key">Tipo</span><span class="elem-spec-val">${escapeHtml(s.tipo || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Estado</span><span class="elem-spec-val">${escapeHtml(s.estado || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Largura Total</span><span class="elem-spec-val">${escapeHtml(s.largura_total || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Altura Total</span><span class="elem-spec-val">${escapeHtml(s.altura_total || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Largura Visual</span><span class="elem-spec-val">${escapeHtml(s.largura_visual || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Altura Visual</span><span class="elem-spec-val">${escapeHtml(s.altura_visual || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Possui Barra</span><span class="elem-spec-val">${escapeHtml(s.possui_barra || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Tamanho da Barra</span><span class="elem-spec-val">${escapeHtml(s.tamanho_barra || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Bit Rate</span><span class="elem-spec-val">${fmtNum(s.bit_rate)}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Som</span><span class="elem-spec-val">${escapeHtml(s.som || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Duração</span><span class="elem-spec-val">${fmtNum(s.duracao)}s</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Codec</span><span class="elem-spec-val">${escapeHtml(s.codec || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Tamanho Máximo</span><span class="elem-spec-val">${escapeHtml(s.tamanho_max || '')}</span></div>
        <div class="elem-spec-row"><span class="elem-spec-key">Extensão</span><span class="elem-spec-val">${escapeHtml(s.extensao || '')}</span></div>
        ${s.produtos && s.produtos.length ? `
          <details class="elem-products-list">
            <summary>${s.produtos.length} produto${s.produtos.length === 1 ? '' : 's'} compatíveis ↓</summary>
            <ul>${s.produtos.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </details>
        ` : ''}
      </div>
    `;
    document.getElementById('especificacoesContent').innerHTML = `
      <div class="elem-grid-2">
        ${specs.map(card).join('')}
      </div>
    `;
  }

  // ============ INIT ============
  function init() {
    try {
      renderResumo();
      renderMetricasPeriodo();
      renderMetricasProduto();
      renderEdificios();
      renderRede();
      renderFaturamento();
      renderEspecificacoes();
    } catch (e) {
      console.error('[elemidia] Erro ao renderizar:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
