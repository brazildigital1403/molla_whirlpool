-- ============================================================
-- Whirlpool Brasil · Seed Junho/2026
-- ------------------------------------------------------------
-- Popula social_meses + 12 publicações da pré-pauta de Junho.
-- Idempotente: se já existir o mês '2026-06', não duplica.
-- Rodar UMA VEZ após social_schema.sql.
-- ============================================================

-- ============================================================
-- 1) MÊS · Junho 2026
-- ============================================================
INSERT INTO social_meses (slug, ano, mes, nome, tema, estrategia, campanha, conceito)
VALUES (
  '2026-06',
  2026,
  6,
  'Junho 2026',
  'Precisão que classifica',
  'Placas, filtros e mecanismos',
  'Campanha Copa do Mundo 2026 + Always On',
  'O mês conecta o universo técnico ao espírito da Copa do Mundo 2026: assim como uma seleção vencedora depende de cada jogador no lugar certo, um reparo perfeito depende da peça certa instalada do jeito certo.'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2) POSTS · 12 publicações de Junho
--    Insere usando subquery pra pegar mes_id pelo slug.
-- ============================================================
WITH m AS (SELECT id FROM social_meses WHERE slug = '2026-06')
INSERT INTO social_posts
  (mes_id, numero, data_post, peca, linha_editorial, formato, tipo, tema, explicacao)
SELECT m.id, p.numero, p.data_post, p.peca, p.linha_editorial, p.formato, p.tipo, p.tema, p.explicacao
FROM m, (VALUES

  -- 1 · 01/06 · Mecanismo · Boas práticas · Carrossel
  (1, DATE '2026-06-01', 'Mecanismo', 'boas_praticas', 'carrossel', 'always_on',
   'Vedação do mecanismo: os sinais externos que entregam o problema antes de qualquer outra coisa',
   'Foco nos sinais externos que indicam vedação comprometida no mecanismo: ruídos fora do padrão, vibração excessiva, resíduos visíveis, desempenho abaixo do esperado. Cada slide traz um sinal específico e o que ele indica sobre o estado do componente.'),

  -- 2 · 03/06 · Placa · Conhecimento de peças · Carrossel
  (2, DATE '2026-06-03', 'Placa', 'conhecimento', 'carrossel', 'always_on',
   'Placa com defeito ou problema na alimentação elétrica? Como o técnico diferencia antes de decidir',
   'Conteúdo de diagnóstico focado numa dúvida clássica: os sintomas de placa com defeito e os de instabilidade elétrica externa são parecidos. Cada slide traz um cenário e os indicadores que apontam para um caminho ou outro.'),

  -- 3 · 05/06 · Geral · Humor · Estático
  (3, DATE '2026-06-05', NULL, 'humor', 'estatico', 'always_on',
   'Quando o cliente descreve o problema x o que você encontra: são coisas completamente diferentes',
   'Meme de identificação clássico da vida do técnico: a descrição do cliente versus a realidade do aparelho. Tom leve, sem ridicularizar ninguém — o humor está na situação, não na pessoa. Entra antes do lançamento da campanha Copa para aliviar o ritmo e garantir engajamento orgânico antes da virada de campanha.'),

  -- 4 · 08/06 · Geral · Campanha Copa · Carrossel/Reels
  (4, DATE '2026-06-08', 'Geral', 'campanha', 'carrossel_reels', 'campanha',
   'A escalação das Peças Originais: o time titular que não sai de campo',
   'Lançamento da campanha Copa. Carrossel ou Reels apresentando as top peças originais como jogadores titulares de uma seleção. Cada slide = uma peça com sua posição em campo e função no time. Mecanismo como centroavante (quem finaliza o serviço), Placa de Controle como técnico (o cérebro), Filtro como zagueiro (bloqueia o que não pode passar).'),

  -- 5 · 10/06 · Filtro · Conhecimento de peças · Carrossel
  (5, DATE '2026-06-10', 'Filtro', 'conhecimento', 'carrossel', 'always_on',
   'Filtro: como esse componente se comunica com o restante do sistema e por que isso importa',
   'O filtro não age sozinho, ele condiciona o que chega nos outros componentes. Cada slide explora como a performance do filtro impacta diretamente o funcionamento do sistema: o que passa, o que é retido, como a pressão e o fluxo se comportam a partir dele.'),

  -- 6 · 12/06 · Placa · Campanha Copa · Estático
  (6, DATE '2026-06-12', 'Placa', 'campanha', 'estatico', 'campanha',
   'VAR do diagnóstico: quando o sintoma aponta pra placa mas o problema estava em outro lugar',
   'Segunda ativação da campanha Copa. Âncora a metáfora do VAR num caso técnico: situações em que os sintomas enganam e apontam para a placa, mas a causa raiz está em outro componente — mecanismo ou fiação. O VAR é a revisão aprofundada do diagnóstico antes de pedir a peça.'),

  -- 7 · 15/06 · Mecanismo · Resolução de problemas · Carrossel
  (7, DATE '2026-06-15', 'Mecanismo', 'resolucao', 'carrossel', 'always_on',
   'Mecanismo barulhento: o que cada tipo de ruído está indicando',
   'O ruído é a primeira informação que o cliente passa e o primeiro dado que o técnico tem antes de qualquer outra análise. Cada slide traz um tipo de ruído: batida, rangido, vibração excessiva, zumbido, e o que cada um indica sobre o estado do mecanismo.'),

  -- 8 · 17/06 · Geral · Campanha Copa · Estático
  (8, DATE '2026-06-17', NULL, 'campanha', 'estatico', 'campanha',
   'Substituição de urgência: quando a peça entra no segundo tempo e salva o jogo',
   'Terceira ativação da campanha Copa. Aborda a troca de peça em situação crítica — quando o aparelho para no meio do uso e precisa de atendimento rápido. A metáfora da substituição no segundo tempo posiciona a peça original como recurso confiável para situações de pressão.'),

  -- 9 · 21/06 · Geral · Institucional/Comemorativo · Carrossel
  (9, DATE '2026-06-21', NULL, 'institucional', 'carrossel', 'always_on',
   'Início do inverno: os eletros que mais trabalham agora e o que o técnico precisa saber',
   '21 de junho marca o início do inverno. Gancho para falar sobre aumento de demanda em aparelhos de aquecimento e impacto no volume de chamados técnicos. Conteúdo útil: quais eletros puxam mais chamado no inverno, quais peças aparecem com mais frequência, como se preparar para o volume.'),

  -- 10 · 23/06 · Geral · Campanha Copa · Carrossel
  (10, DATE '2026-06-23', 'Geral', 'campanha', 'carrossel', 'campanha',
   'O álbum de figurinhas das Peças Originais: colecione as que não podem faltar no seu kit',
   'Cada slide é uma "figurinha" de uma peça original — com nome, posição no time e um atributo técnico de destaque. Mecanismo: "centroavante titular, finaliza todo chamado". Filtro: "zagueiro insubstituível, barra o que não pode passar". Placa de Controle: "o cérebro do time, comanda tudo".'),

  -- 11 · 26/06 · Placa · Boas práticas · Carrossel
  (11, DATE '2026-06-26', 'Placa', 'boas_praticas', 'carrossel', 'always_on',
   'Placa respondendo como deveria: o que o técnico precisa confirmar antes de ir embora',
   'Conteúdo focado na confirmação técnica da placa antes de encerrar o serviço: tensão estável, comandos ativos, ciclos corretos, ausência de código de erro no display. Cada slide traz um ponto de verificação e o que ele confirma sobre o funcionamento da placa.'),

  -- 12 · 29/06 · Mecanismo · Campanha Copa · Estático
  (12, DATE '2026-06-29', 'Mecanismo', 'campanha', 'estatico', 'campanha',
   'Pênalti não se desperdiça: quando o mecanismo está calibrado, o resultado não falha',
   'Quinta ativação da campanha Copa. O mecanismo é o centroavante da escalação — quem finaliza o serviço. A metáfora do pênalti posiciona o mecanismo original como o componente que, quando está no lugar certo e funcionando como deve, garante o resultado sem margem pra erro.')

) AS p(numero, data_post, peca, linha_editorial, formato, tipo, tema, explicacao)
WHERE NOT EXISTS (
  SELECT 1 FROM social_posts sp
   WHERE sp.mes_id = (SELECT id FROM social_meses WHERE slug = '2026-06')
     AND sp.numero = p.numero
);

-- ============================================================
-- VERIFICAÇÃO · contagem após seed
-- ============================================================
-- SELECT slug, nome, tema FROM social_meses WHERE slug = '2026-06';
-- SELECT numero, data_post, linha_editorial, tipo, tema FROM social_posts
--   WHERE mes_id = (SELECT id FROM social_meses WHERE slug = '2026-06')
--   ORDER BY numero;
