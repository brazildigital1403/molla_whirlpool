-- ============================================================
-- Whirlpool Brasil · Junho 2026 v2
-- ------------------------------------------------------------
-- Adiciona coluna interacao_story em social_posts.
-- Limpa os posts antigos de Junho (cascade limpa comentários e histórico).
-- Re-insere os 16 posts da pré-pauta v2.
--
-- Roda 1x no SQL Editor do Supabase. É idempotente:
-- - A migration usa IF NOT EXISTS
-- - O DELETE só apaga onde slug = '2026-06'
-- - O INSERT roda só se não tiver os posts ainda
-- ============================================================

-- 1) MIGRATION · adiciona coluna interacao_story
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS interacao_story TEXT;

-- 2) LIMPEZA · apaga posts antigos de Junho 2026
DELETE FROM social_posts
 WHERE mes_id = (SELECT id FROM social_meses WHERE slug = '2026-06');

-- 3) ATUALIZA tema/estratégia do mês (a planilha v2 manteve igual,
--    mas idempotente garante consistência)
UPDATE social_meses
   SET nome       = 'Junho 2026',
       tema       = 'Precisão que classifica',
       estrategia = 'Placas, filtros e mecanismos',
       campanha   = 'Campanha Copa do Mundo 2026 + Always On',
       conceito   = 'O mês conecta o universo técnico ao espírito da Copa do Mundo 2026: assim como uma seleção vencedora depende de cada jogador no lugar certo, um reparo perfeito depende da peça certa instalada do jeito certo.'
 WHERE slug = '2026-06';

-- Se por acaso o mês ainda não existe, cria
INSERT INTO social_meses (slug, ano, mes, nome, tema, estrategia, campanha, conceito)
VALUES (
  '2026-06', 2026, 6,
  'Junho 2026',
  'Precisão que classifica',
  'Placas, filtros e mecanismos',
  'Campanha Copa do Mundo 2026 + Always On',
  'O mês conecta o universo técnico ao espírito da Copa do Mundo 2026: assim como uma seleção vencedora depende de cada jogador no lugar certo, um reparo perfeito depende da peça certa instalada do jeito certo.'
)
ON CONFLICT (slug) DO NOTHING;

-- 4) SEED · 16 posts novos de Junho
WITH m AS (SELECT id FROM social_meses WHERE slug = '2026-06')
INSERT INTO social_posts
  (mes_id, numero, data_post, peca, linha_editorial, formato, tipo, tema, explicacao, interacao_story)
SELECT m.id, p.numero, p.data_post, p.peca, p.linha_editorial, p.formato, p.tipo, p.tema, p.explicacao, p.interacao_story
FROM m, (VALUES

  -- 1 · 01/06 · Mecanismo · Boas práticas · Carrossel
  (1, DATE '2026-06-01', 'Mecanismo', 'boas_praticas', 'carrossel', 'always_on',
   'Vedação do mecanismo: os sinais externos que entregam o problema antes de qualquer outra coisa',
   'Foco nos sinais externos que indicam vedação comprometida no mecanismo: ruídos fora do padrão, vibração excessiva, resíduos visíveis, desempenho abaixo do esperado. Cada slide traz um sinal específico e o que ele indica sobre o estado do componente.',
   E'Enquete: Você já acertou o diagnóstico só pelo ruído?\nSim, já cheguei sabendo / Só com o aparelho na mão'),

  -- 2 · 03/06 · Placa · Conhecimento de peças · Carrossel
  (2, DATE '2026-06-03', 'Placa', 'conhecimento', 'carrossel', 'always_on',
   'Placa com defeito ou problema na alimentação elétrica? Como o técnico diferencia antes de decidir',
   'Conteúdo de diagnóstico focado numa dúvida clássica: os sintomas de placa com defeito e os de instabilidade elétrica externa são parecidos. Cada slide traz um cenário e os indicadores que apontam para um caminho ou outro.',
   E'Quiz por slide: Aparelho liga e desliga sozinho.\nQual é o mais provável? Instabilidade elétrica / Placa com defeito\nSlide final: gabarito'),

  -- 3 · 05/06 · — · Humor · Estático
  (3, DATE '2026-06-05', NULL, 'humor', 'estatico', 'always_on',
   'Quando o cliente descreve o problema x o que você encontra: são coisas completamente diferentes',
   'Meme de identificação clássico da vida do técnico: a descrição do cliente versus a realidade do aparelho. Tom leve, sem ridicularizar ninguém — o humor está na situação, não na pessoa. Entra antes do lançamento da campanha Copa para aliviar o ritmo e garantir engajamento orgânico antes da virada de campanha.',
   E'Caixinha de texto: Qual foi a descrição mais absurda que um cliente já te deu?\nMelhores respostas repostadas no story seguinte'),

  -- 4 · 07/06 · Geral · Campanha · Reels
  (4, DATE '2026-06-07', 'Geral', 'campanha', 'reels', 'campanha',
   'A escalação das Peças Originais: o time titular que não sai de campo',
   'Lançamento da campanha Copa. Reels apresentando as top peças originais como jogadores titulares de uma seleção. Cada slide = uma peça com sua posição em campo e função no time. Mecanismo como centroavante (quem finaliza o serviço), Placa de Controle como técnico (o cérebro), Filtro como zagueiro (bloqueia o que não pode passar).',
   E'Qual posição você jogaria nesse time?\nEnquete: Você é mais... Mecanismo (finalizador) / Placa (estrategista)'),

  -- 5 · 09/06 · Filtro · Conhecimento · Carrossel
  (5, DATE '2026-06-09', 'Filtro', 'conhecimento', 'carrossel', 'always_on',
   'Filtro: como esse componente se comunica com o restante do sistema e por que isso importa',
   'O filtro não age sozinho, ele condiciona o que chega nos outros componentes. Cada slide explora como a performance do filtro impacta diretamente o funcionamento do sistema: o que passa, o que é retido, como a pressão e o fluxo se comportam a partir dele.',
   E'Caixinha de texto: Qual a sua maior dúvida na hora de checar o filtro?\nResposta técnica no story seguinte'),

  -- 6 · 11/06 · Placa · Campanha · Estático
  (6, DATE '2026-06-11', 'Placa', 'campanha', 'estatico', 'campanha',
   'VAR do diagnóstico: quando o sintoma aponta pra placa mas o problema estava em outro lugar',
   'Âncora a metáfora do VAR num caso técnico: situações em que os sintomas enganam e apontam para a placa, mas a causa raiz está em outro componente — mecanismo ou fiação. O VAR é a revisão aprofundada do diagnóstico antes de pedir a peça.',
   E'Enquete: Já errei o diagnóstico assim / Nunca me enganei\nCaixinha: Conta o caso. O que apontava pra placa e era outra coisa?'),

  -- 7 · 12/06 · — · Campanha (Dia dos Namorados) · Estático
  (7, DATE '2026-06-12', NULL, 'campanha', 'estatico', 'campanha',
   'Amor à primeira peça: o técnico que encontrou a original nunca mais voltou pra genérica. E na Copa, também não tem espaço pra reserva',
   'Post especial Dia dos Namorados mesclado com a campanha Copa. O técnico que se apaixona pela peça original e nunca mais volta para a genérica. Tom leve com pegada de declaração afetiva ao componente certo.',
   E'Enquete: Você é do tipo... Fiel à original / Já me aventurei na genérica\nCaixinha: Conta sua história de arrependimento com peça genérica'),

  -- 8 · 13/06 · — · Campanha · Estático · POST AO VIVO 1º jogo
  (8, DATE '2026-06-13', NULL, 'campanha', 'estatico', 'campanha',
   'POST AO VIVO - Jogo do Brasil (1º jogo Copa)',
   E'Versão VITÓRIA: meme de celebração conectando o resultado à campanha — ex: Igual peça original: entrou e resolveu.\n\nVersão DERROTA: humor leve com gancho técnico — ex: Calibragem é tudo. Próximo jogo a gente ajusta.',
   E'Enquete: O Brasil está pronto para o título?\nSim / Ainda precisa calibrar'),

  -- 9 · 15/06 · Mecanismo · Resolução · Reels
  (9, DATE '2026-06-15', 'Mecanismo', 'resolucao', 'reels', 'always_on',
   'Mecanismo barulhento: o que cada tipo de ruído está indicando',
   'O ruído é a primeira informação que o cliente passa e o primeiro dado que o técnico tem antes de qualquer outra análise. Cada slide traz um tipo de ruído: batida, rangido, vibração excessiva, zumbido, e o que cada um indica sobre o estado do mecanismo.',
   E'Quiz por slide: Rangido constante durante o ciclo indica...\nDesgaste de rolamento / Problema de vedação\nSlide final: gabarito com explicação'),

  -- 10 · 17/06 · — · Campanha · Estático
  (10, DATE '2026-06-17', NULL, 'campanha', 'estatico', 'campanha',
   'Substituição de urgência: quando a peça entra no segundo tempo e salva o jogo',
   'Aborda a troca de peça em situação crítica — quando o aparelho para no meio do uso e precisa de atendimento rápido. A metáfora da substituição no segundo tempo posiciona a peça original como recurso confiável para situações de pressão.',
   E'Enquete: Já ficou sem peça num chamado urgente?\nJá passei por isso / Nunca faltou'),

  -- 11 · 19/06 · — · Campanha · Estático · POST AO VIVO 2º jogo
  (11, DATE '2026-06-19', NULL, 'campanha', 'estatico', 'campanha',
   'POST AO VIVO - Jogo do Brasil (2º jogo Copa)',
   E'Versão VITÓRIA: conexão com campanha — ex: Duas vitórias seguidas? Isso é consistência de peça original.\n\nVersão DERROTA: Até o melhor técnico erra um diagnóstico. O importante é ajustar pra próxima.',
   E'Quiz: Qual peça representa o craque do jogo hoje?\nMecanismo / Placa / Filtro'),

  -- 12 · 21/06 · — · Institucional · Reels (início do inverno)
  (12, DATE '2026-06-21', NULL, 'institucional', 'reels', 'always_on',
   'Início do inverno: os eletros que mais trabalham agora e o que o técnico precisa saber',
   '21 de junho marca o início do inverno. Gancho para falar sobre aumento de demanda em aparelhos de aquecimento e impacto no volume de chamados técnicos. Conteúdo útil: quais eletros puxam mais chamado no inverno, quais peças aparecem com mais frequência, como se preparar para o volume.',
   E'Enquete: Qual aparelho mais aparece no inverno?\nAquecedor / Ar-condicionado (aquecimento)\nCaixinha: Qual peça mais substitui nessa época?'),

  -- 13 · 23/06 · Geral · Campanha · Carrossel
  (13, DATE '2026-06-23', 'Geral', 'campanha', 'carrossel', 'campanha',
   'O álbum de figurinhas das Peças Originais: colecione as que não podem faltar no seu kit',
   'Cada slide é uma "figurinha" de uma peça original — com nome, posição no time e um atributo técnico de destaque. Mecanismo: "centroavante titular, finaliza todo chamado". Filtro: "zagueiro insubstituível, barra o que não pode passar". Placa de Controle: "o cérebro do time, comanda tudo".',
   E'Você conhece o álbum? Adivinha a peça pelo atributo\nQuiz por slide: Barra o que não pode passar. Insubstituível. Quem é? Filtro / Mecanismo'),

  -- 14 · 24/06 · — · Campanha · Estático · POST AO VIVO 3º jogo
  (14, DATE '2026-06-24', NULL, 'campanha', 'estatico', 'campanha',
   'POST AO VIVO - Jogo do Brasil (3º jogo Copa)',
   E'Versão CLASSIFICAÇÃO: Time completo, kit completo. Passou de fase é diferente.\n\nVersão ELIMINAÇÃO: A temporada não acaba no primeiro chamado. A gente volta mais forte.',
   E'Caixinha: Qual foi o momento mais tenso pra você hoje?'),

  -- 15 · 26/06 · Placa · Boas práticas · Carrossel
  (15, DATE '2026-06-26', 'Placa', 'boas_praticas', 'carrossel', 'always_on',
   'Placa respondendo como deveria: o que o técnico precisa confirmar antes de ir embora',
   'Conteúdo focado na confirmação técnica da placa antes de encerrar o serviço: tensão estável, comandos ativos, ciclos corretos, ausência de código de erro no display. Cada slide traz um ponto de verificação e o que ele confirma sobre o funcionamento da placa.',
   E'Enquete: Você segue um checklist fixo antes de fechar o serviço?\nSempre, sem exceção / Depende do chamado'),

  -- 16 · 29/06 · Mecanismo · Campanha · Estático
  (16, DATE '2026-06-29', 'Mecanismo', 'campanha', 'estatico', 'campanha',
   'Pênalti não se desperdiça: quando o mecanismo está calibrado, o resultado não falha',
   'O mecanismo é o centroavante da escalação — quem finaliza o serviço. A metáfora do pênalti posiciona o mecanismo original como o componente que, quando está no lugar certo e funcionando como deve, garante o resultado sem margem pra erro.',
   E'Você confia no seu mecanismo como um pênalti na Copa?\nEnquete: Peça original ou genérica - você sente diferença?\nSinto muito diferença / Depende da peça')

) AS p(numero, data_post, peca, linha_editorial, formato, tipo, tema, explicacao, interacao_story);

-- ============================================================
-- VERIFICAÇÃO · conferência pós-execução
-- ============================================================
-- SELECT slug, nome, tema FROM social_meses WHERE slug = '2026-06';
-- SELECT numero, data_post, linha_editorial, tipo,
--        substring(tema, 1, 60) AS tema_trunc,
--        substring(interacao_story, 1, 50) AS story_trunc
--   FROM social_posts
--   WHERE mes_id = (SELECT id FROM social_meses WHERE slug = '2026-06')
--   ORDER BY numero;
