/* Lista de arquivos — links do SharePoint
   Atualizar com links reais. Cada item:
   - id: identificador único (kebab-case)
   - nome: título do arquivo
   - tipo: ppt | pdf | imagem | planilha | kv | video
   - descricao: linha curta de contexto
   - url: link público SharePoint
   - data: AAAA-MM-DD da última atualização
*/
window.ARQUIVOS_DATA = {
  arquivos: [
    {
      id: 'kv-copa-principal',
      nome: 'KV Principal — É tempo de Copa',
      tipo: 'kv',
      descricao: 'Key visual master da campanha, formatos 1:1 e 16:9.',
      url: 'https://sharepoint.com/sites/metlife/SitePages/kv-copa-principal.aspx',
      data: '2026-05-01',
    },
    {
      id: 'kv-blitz-watch',
      nome: 'KV Blitz e Watch Party',
      tipo: 'kv',
      descricao: 'Visuais para ações de Blitz e Watch Party, com promotores e brindes.',
      url: 'https://sharepoint.com/sites/metlife/SitePages/kv-blitz.aspx',
      data: '2026-04-28',
    },
    {
      id: 'apresentacao-blitz-watchparty',
      nome: 'Apresentação Blitz & Watch Party',
      tipo: 'ppt',
      descricao: 'Deck completo de Blitz e Watch Party — versão final apresentada ao cliente.',
      url: 'https://sharepoint.com/sites/metlife/Documents/blitz-watchparty.pptx',
      data: '2026-02-25',
    },
    {
      id: 'apresentacao-plano-tatico',
      nome: 'Plano Tático de Mídia — Apresentação',
      tipo: 'ppt',
      descricao: 'Estratégia, distribuição por canal e investimento bruto da campanha.',
      url: 'https://sharepoint.com/sites/metlife/Documents/plano-tatico.pptx',
      data: '2026-04-15',
    },
    {
      id: 'briefing-campanha',
      nome: 'Briefing oficial da campanha',
      tipo: 'pdf',
      descricao: 'Conceito, objetivos, target e diretrizes para todas as frentes.',
      url: 'https://sharepoint.com/sites/metlife/Documents/briefing.pdf',
      data: '2026-04-10',
    },
    {
      id: 'proposta-elemidia',
      nome: 'Proposta Elemidia — Edifícios',
      tipo: 'planilha',
      descricao: 'Mídia em painéis de edifícios em São Paulo — orçamento R$ 90k.',
      url: 'https://sharepoint.com/sites/metlife/Documents/elemidia.xlsx',
      data: '2026-05-08',
    },
    {
      id: 'foto-promotores',
      nome: 'Fotos dos uniformes dos promotores',
      tipo: 'imagem',
      descricao: 'Pacote de fotos do uniforme oficial MetLife para uso em peças.',
      url: 'https://sharepoint.com/sites/metlife/Documents/uniformes',
      data: '2026-03-20',
    },
    {
      id: 'video-conceito',
      nome: 'Vídeo conceito da campanha (15s)',
      tipo: 'video',
      descricao: 'Vídeo principal da campanha em 16:9 e 9:16, com legendas.',
      url: 'https://sharepoint.com/sites/metlife/Documents/conceito-15s.mp4',
      data: '2026-04-22',
    },
  ],
};
