/**
 * PILOTO — PESQUISA RH | PLANEJAMENTO & GESTÃO
 */

const PRH_CONFIG = Object.freeze({
  deckId: '1axfQX9FW1U4EIlnhJKDA2XizGoERMGNNXF8nmPCOpSI',
  area: 'Planejamento & Gestão',
  logoColorId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',
  logoNegativeId: '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  expectedRatio: 16 / 9,
  slidesFixos: 7,   // capa, kpis, comparação, critérios, 1 de cada comentário, ação
  maxComments: 5   // por slide de comentários
});

const PRH_DS = Object.freeze({
  colors: Object.freeze({
    brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
    brandSoft: '#93C5FD', premium: '#60A5FA', bg: '#F8FAFC', card: '#FFFFFF',
    text: '#151E49', body: '#475569', muted: '#94A3B8', lines: '#E2E8F0',
    grid: '#EEF2F7', green: '#10B981', orange: '#F97316', red: '#EF4444'
  }),
  fonts: Object.freeze({ title: 'Montserrat', body: 'Open Sans' }),
  margin: 30,
  headerY: 62,
  contentY: 78
});

const PRH_ASSET_CACHE = {};

function PRH_gerarApresentacaoPlanejamentoGestao() {
  const inicio = new Date();
  Logger.log('PRH_: início do piloto para "' + PRH_CONFIG.area + '".');
  Logger.log('PRH_: ATENÇÃO — o conteúdo atual do deck ' + PRH_CONFIG.deckId + ' será substituído.');

  try {
    if (typeof lerRespostas_ !== 'function' || typeof agregarRespostas_ !== 'function') {
      throw new Error('Dependências ausentes: copie este arquivo para o mesmo projeto de sheets.gs.');
    }
    if (typeof ID_PLANILHA === 'undefined' || !ID_PLANILHA) {
      throw new Error('ID_PLANILHA não está definido em sheets.gs.');
    }

    const registros = lerRespostas_();
    const modelo = PRH_montarModeloPlanejamentoGestao_(registros);
    const roteiro = PRH_definirRoteiro_(modelo);
    const deck = SlidesApp.openById(PRH_CONFIG.deckId);

    if (!deck || String(deck.getId()) !== PRH_CONFIG.deckId) {
      throw new Error('Validação de segurança falhou: o deck aberto não corresponde ao ID autorizado.');
    }

    PRH_reconstruirDeck_(deck, modelo, roteiro);
    const segundos = Math.round((new Date().getTime() - inicio.getTime()) / 1000);
    Logger.log('PRH_: concluído — ' + roteiro.length + ' slides, área "' + modelo.area + '", ' + segundos + 's.');
    Logger.log('PRH_: ' + deck.getUrl());
    return { ok: true, deckId: PRH_CONFIG.deckId, slides: roteiro.length, area: modelo.area };
  } catch (erro) {
    Logger.log('PRH_: FALHA — ' + (erro && erro.stack ? erro.stack : erro));
    throw erro;
  }
}

function PRH_montarModeloPlanejamentoGestao_(registros) {
  if (!Array.isArray(registros)) throw new Error('A fonte de respostas não devolveu uma lista.');
  if (!registros.length) throw new Error('A aba Respostas está vazia; nenhum deck foi alterado.');

  const alvoNormalizado = PRH_normalizar_(PRH_CONFIG.area);
  const daArea = registros.filter(function (r) {
    return r && PRH_normalizar_(r.area) === alvoNormalizado;
  });
  if (!daArea.length) {
    const areas = PRH_unicos_(registros.map(function (r) { return r && r.area; }).filter(Boolean));
    throw new Error('Área "' + PRH_CONFIG.area + '" não encontrada. Áreas disponíveis: ' + areas.join(', '));
  }

  const agregadoArea = agregarRespostas_(daArea);
  const nomes = Object.keys(agregadoArea.areas);
  if (nomes.length !== 1) throw new Error('Filtro de escopo retornou mais de uma área.');
  const area = agregadoArea.areas[nomes[0]];
  const liberaExterno = area.externo.avaliadores >= MINIMO_EXTERNO && area.externo.media !== null;
  const liberaAuto = area.auto.avaliadores >= MINIMO_AUTOAVALIACAO && area.auto.media !== null;

  const benchmarks = PRH_calcularBenchmarksSeguros_(registros);
  const criterios = PERGUNTAS.filter(function (p) { return p.tipo === 'rating'; }).map(function (p) {
    const d = area.perguntas[p.nome] || {};
    const ext = d.externo || { media: null, qtd: 0 };
    const aut = d.auto || { media: null, qtd: 0 };
    const externa = liberaExterno && ext.media !== null ? PRH_arredondar_(ext.media) : null;
    const auto = liberaAuto && aut.media !== null ? PRH_arredondar_(aut.media) : null;
    return {
      nome: p.nome,
      secao: p.secao,
      externa: externa,
      auto: auto,
      diferenca: externa !== null && auto !== null ? PRH_arredondar_(auto - externa) : null,
      nExterno: liberaExterno ? ext.qtd : null,
      benchmark: benchmarks.porPergunta[p.nome] === undefined ? null : benchmarks.porPergunta[p.nome]
    };
  });

  const comentarios = PRH_selecionarComentarios_(daArea, liberaExterno, liberaAuto);
  const notaExterna = liberaExterno ? PRH_arredondar_(area.externo.media) : null;
  const notaAuto = liberaAuto ? PRH_arredondar_(area.auto.media) : null;
  const diferenca = notaExterna !== null && notaAuto !== null
    ? PRH_arredondar_(notaAuto - notaExterna) : null;

  const modelo = {
    area: PRH_CONFIG.area,
    geradoEm: Utilities.formatDate(new Date(), PRH_CONFIG.timezone, "dd/MM/yyyy 'às' HH:mm"),
    minimoExterno: MINIMO_EXTERNO,
    minimoAuto: MINIMO_AUTOAVALIACAO,
    nExterno: area.externo.avaliadores,
    nAuto: area.auto.avaliadores,
    liberaExterno: liberaExterno,
    liberaAuto: liberaAuto,
    notaExterna: notaExterna,
    notaAuto: notaAuto,
    diferenca: diferenca,
    notaEmpresa: benchmarks.geral,
    nEmpresa: benchmarks.avaliacoes,
    // Quanto a área está acima (+) ou abaixo (−) da média da empresa.
    contraEmpresa: notaExterna !== null && benchmarks.geral !== null
      ? PRH_arredondar_(notaExterna - benchmarks.geral) : null,
    criterios: criterios,
    comentarios: comentarios
  };
  return modelo;
}

function PRH_calcularBenchmarksSeguros_(registros) {
  const porArea = {};
  registros.forEach(function (r) {
    if (!r || r.ehAuto) return;
    const nome = String(r.area || '').trim();
    if (!nome) return;
    if (!porArea[nome]) porArea[nome] = {};
    porArea[nome][String(r.idAvaliacao || '')] = true;
  });
  const elegiveis = {};
  Object.keys(porArea).forEach(function (nome) {
    if (Object.keys(porArea[nome]).length >= MINIMO_EXTERNO) elegiveis[nome] = true;
  });

  const acc = {};
  registros.forEach(function (r) {
    if (!r || r.ehAuto || !elegiveis[r.area] || r.tipo !== 'rating') return;
    if (r.resposta === 'na' || r.resposta === '' || r.resposta === null) return;
    const nota = Number(r.resposta);
    if (isNaN(nota)) return;
    if (!acc[r.pergunta]) acc[r.pergunta] = { soma: 0, qtd: 0, ids: {} };
    acc[r.pergunta].soma += nota;
    acc[r.pergunta].qtd++;
    acc[r.pergunta].ids[String(r.area) + '|' + String(r.idAvaliacao)] = true;
  });

  const porPergunta = {};
  let somaGeral = 0, qtdGeral = 0;
  const avaliacoesGerais = {};
  Object.keys(acc).forEach(function (pergunta) {
    const d = acc[pergunta];
    if (Object.keys(d.ids).length >= MINIMO_EXTERNO && d.qtd > 0) {
      porPergunta[pergunta] = PRH_arredondar_(d.soma / d.qtd);
      somaGeral += d.soma;
      qtdGeral += d.qtd;
      Object.keys(d.ids).forEach(function (id) { avaliacoesGerais[id] = true; });
    }
  });

  return {
    porPergunta: porPergunta,
    // Média da empresa: todas as notas externas das áreas elegíveis, juntas.
    // É ponderada por avaliação, não por área — uma área muito avaliada pesa
    // mais. É a mesma conta que a pessoa faria somando a coluna inteira.
    geral: qtdGeral > 0 ? PRH_arredondar_(somaGeral / qtdGeral) : null,
    avaliacoes: Object.keys(avaliacoesGerais).length
  };
}

/**
 * Devolve os comentários já anonimizados, separados pelas duas perguntas
 * abertas: o que a área faz bem e o que pode melhorar. Cada grupo vira um
 * slide próprio.
 */
function PRH_selecionarComentarios_(registros, liberaExterno, liberaAuto) {
  const vistos = {};
  const abertas = PERGUNTAS.filter(function (p) { return p.tipo === 'texto'; });
  const chavePositiva = abertas[0] ? PRH_normalizar_(abertas[0].nome) : '';
  const chaveMelhoria = abertas[1] ? PRH_normalizar_(abertas[1].nome) : '';

  const grupos = { positivos: [], melhorias: [] };
  registros.forEach(function (r) {
    if (!r || r.tipo !== 'texto') return;
    if (r.ehAuto ? !liberaAuto : !liberaExterno) return;
    if (String(r.resposta || '').trim() === '') return;

    const pergunta = PRH_normalizar_(r.pergunta);
    const destino = pergunta === chavePositiva ? 'positivos' : (pergunta === chaveMelhoria ? 'melhorias' : null);
    if (!destino) return;

    const texto = PRH_anonimizarComentario_(r.resposta);
    if (!texto) return;
    const chave = destino + '|' + PRH_normalizar_(texto);
    if (vistos[chave]) return;
    vistos[chave] = true;

    grupos[destino].push({ origem: r.ehAuto ? 'Autoavaliação' : 'Percepção externa', texto: texto });
  });

  // Percepção externa antes da autoavaliação; dentro de cada origem, o trecho
  // mais longo primeiro, para o comentário mais substancial abrir a lista.
  // É uma ordem, não um ranking de relevância — e o rodapé diz isso.
  Object.keys(grupos).forEach(function (k) {
    grupos[k].sort(function (a, b) {
      if (a.origem !== b.origem) return a.origem === 'Percepção externa' ? -1 : 1;
      if (b.texto.length !== a.texto.length) return b.texto.length - a.texto.length;
      return a.texto.localeCompare(b.texto, 'pt-BR');
    });
  });

  return {
    positivos: grupos.positivos,
    melhorias: grupos.melhorias,
    tituloPositivos: abertas[0] ? abertas[0].nome : 'Pontos fortes',
    tituloMelhorias: abertas[1] ? abertas[1].nome : 'Pontos a melhorar'
  };
}

function PRH_anonimizarComentario_(texto) {
  let t = String(texto || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato removido]');
  t = t.replace(/https?:\/\/\S+/gi, '[link removido]');
  t = t.replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-.\s]?\d{4}/g, '[contato removido]');
  return PRH_limitarTexto_(t, 220);
}

function PRH_definirRoteiro_(m) {
  // Os comentários entram todos: cada bloco vira quantos slides forem precisos,
  // PRH_CONFIG.maxComments por slide. Lista vazia ainda rende um slide, com a
  // explicação de por que não há nada para mostrar.
  const paginas = function (lista, id, titulo) {
    const total = Math.max(1, Math.ceil(lista.length / PRH_CONFIG.maxComments));
    const saida = [];
    for (let i = 0; i < total; i++) {
      saida.push({ id: id + ':' + i, titulo: titulo + (total > 1 ? ' (' + (i + 1) + '/' + total + ')' : '') });
    }
    return saida;
  };

  return [
    { id: 'capa', titulo: 'Pesquisa de satisfação interdepartamental' },
    { id: 'kpis', titulo: 'Indicadores-chave' },
    { id: 'comparacao', titulo: 'Autoavaliação × percepção externa' },
    { id: 'criterios', titulo: 'Os sete critérios' }
  ]
    .concat(paginas(m.comentarios.positivos, 'fortes', m.comentarios.tituloPositivos))
    .concat(paginas(m.comentarios.melhorias, 'melhorias', m.comentarios.tituloMelhorias))
    .concat([{ id: 'acao', titulo: 'Plano de ação para validação' }]);
}

function PRH_reconstruirDeck_(deck, modelo, roteiro) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  if (!W || !H || Math.abs(W / H - PRH_CONFIG.expectedRatio) > 0.015) {
    throw new Error('O deck alvo não está em 16:9 (dimensões atuais: ' + W + ' × ' + H + ' pt).');
  }
  // O total varia com a quantidade de comentários, então o piso é o que não muda.
  if (roteiro.length < PRH_CONFIG.slidesFixos) {
    throw new Error('Roteiro inválido: esperado ao menos ' + PRH_CONFIG.slidesFixos + ' slides, montados ' + roteiro.length + '.');
  }

  const anteriores = deck.getSlides().slice();
  const novos = [];
  try {
    roteiro.forEach(function (item, indice) {
      const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
      novos.push(slide);
      PRH_desenharSlide_(slide, deck, item.id, modelo, indice + 1);
      Logger.log('PRH_: slide ' + (indice + 1) + '/' + roteiro.length + ' — ' + item.titulo + '.');
    });
  } catch (erro) {
    Logger.log('PRH_: desenho interrompido; removendo somente os novos slides e preservando a versão anterior.');
    novos.forEach(function (slide) {
      try { slide.remove(); } catch (falhaRollback) { Logger.log('PRH_: falha no rollback de um slide novo: ' + falhaRollback); }
    });
    try { deck.saveAndClose(); } catch (falhaSalvar) { Logger.log('PRH_: falha ao salvar rollback: ' + falhaSalvar); }
    throw erro;
  }

  Logger.log('PRH_: ' + roteiro.length + ' novos slides prontos; iniciando substituição do conteúdo anterior.');
  anteriores.forEach(function (slide) { slide.remove(); });
  if (deck.getSlides().length !== roteiro.length) throw new Error('Contagem final de slides divergente.');
  deck.saveAndClose();
}

function PRH_desenharSlide_(slide, deck, id, m, numero) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  if (id === 'capa') return PRH_slideCapa_(slide, W, H, m);
  PRH_fundoClaro_(slide);

  // Slides de comentário: o subtítulo é só a área — a data já está na capa e
  // no rodapé de todo o resto, e aqui ela roubava atenção do texto das pessoas.
  const parte = id.split(':');
  if (parte[0] === 'fortes' || parte[0] === 'melhorias') {
    const positivo = parte[0] === 'fortes';
    const lista = positivo ? m.comentarios.positivos : m.comentarios.melhorias;
    const titulo = (positivo ? m.comentarios.tituloPositivos : m.comentarios.tituloMelhorias).toUpperCase();
    // Duas páginas seguidas com o mesmo título deixam quem folheia sem saber
    // se avançou; o contador no cabeçalho resolve.
    const totalPaginas = Math.max(1, Math.ceil(lista.length / PRH_CONFIG.maxComments));
    const marcador = totalPaginas > 1 ? '  ·  ' + (Number(parte[1]) + 1) + '/' + totalPaginas : '';
    PRH_header_(slide, W, titulo + marcador, m.area);
    PRH_slideComentarios_(slide, W, H, lista, positivo ? PRH_DS.colors.green : PRH_DS.colors.orange, Number(parte[1]));
    PRH_rodape_(slide, W, H, numero);
    return;
  }

  PRH_header_(slide, W, PRH_tituloPorId_(id), m.area + ' · Atualizado em ' + m.geradoEm);
  if (id === 'kpis') PRH_slideKpis_(slide, W, H, m);
  else if (id === 'comparacao') PRH_slideComparacao_(slide, W, H, m);
  else if (id === 'criterios') PRH_slideCriterios_(slide, W, H, m);
  else if (id === 'acao') PRH_slideAcao_(slide, W, H, m);
  else throw new Error('Tipo de slide desconhecido: ' + id);
  PRH_rodape_(slide, W, H, numero);
}

function PRH_tituloPorId_(id) {
  const mapa = {
    kpis: 'INDICADORES-CHAVE',
    comparacao: 'AUTOAVALIAÇÃO × PERCEPÇÃO EXTERNA', criterios: 'OS SETE CRITÉRIOS',
    acao: 'PLANO DE AÇÃO PARA VALIDAÇÃO'
  };
  return mapa[id] || id;
}

function PRH_slideCapa_(slide, W, H, m) {
  slide.getBackground().setSolidFill(PRH_DS.colors.brandDark);
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, 0, 0, 7, H, PRH_DS.colors.brandLight, null);
  const halo = PRH_shape_(slide, SlidesApp.ShapeType.ELLIPSE, W - 270, -80, 430, 430, PRH_DS.colors.brandLight, null, 0.16);
  halo.sendToBack();
  PRH_logo_(slide, PRH_CONFIG.logoNegativeId, 42, 28, 130, 36, true);
  PRH_texto_(slide, 44, 116, 560, 20, 'PESQUISA DE SATISFAÇÃO INTERDEPARTAMENTAL', { fs: 9, min: 8, bold: true, color: PRH_DS.colors.premium, family: PRH_DS.fonts.title, oneLine: true });
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, 44, 145, 68, 4, PRH_DS.colors.premium, null);
  PRH_texto_(slide, 40, 164, 620, 100, 'PLANEJAMENTO\n& GESTÃO', { fs: 40, min: 32, bold: true, color: '#FFFFFF', family: PRH_DS.fonts.title, spacing: 100 });
  PRH_texto_(slide, 44, 275, 500, 28, 'Piloto executivo · resultados dinâmicos da pesquisa', { fs: 14, min: 11, color: '#CBD5E1', family: PRH_DS.fonts.body, oneLine: true });
  PRH_pill_(slide, 44, 318, 265, 28, 'ATUALIZADO EM ' + m.geradoEm.toUpperCase(), PRH_DS.colors.brandMed, '#FFFFFF');
  PRH_texto_(slide, 44, H - 38, W - 88, 14, 'CAPITAL REALTY · USO INTERNO', { fs: 7, min: 7, bold: true, color: '#CBD5E1', family: PRH_DS.fonts.title, oneLine: true });
}

function PRH_slideKpis_(slide, W, H, m) {
  const cards = [
    { l: 'AVALIAÇÕES EXTERNAS', v: String(m.nExterno), n: 'corte: ' + m.minimoExterno, c: PRH_DS.colors.brandLight },
    { l: 'MÉDIA EXTERNA', v: PRH_numOuND_(m.notaExterna), n: 'escala de 1 a 5', c: PRH_DS.colors.brandMed },
    { l: 'AUTOAVALIAÇÕES', v: String(m.nAuto), n: 'corte: ' + m.minimoAuto, c: PRH_DS.colors.premium },
    { l: 'MÉDIA AUTO', v: PRH_numOuND_(m.notaAuto), n: 'escala de 1 a 5', c: PRH_DS.colors.brandLight },
    { l: 'AUTO − EXTERNA', v: m.diferenca === null ? 'N/D' : PRH_numSinal_(m.diferenca), n: 'diferença matemática', c: m.diferenca === null ? PRH_DS.colors.muted : PRH_DS.colors.orange }
  ];
  const gap = 12, x = 30, y = 92, cw = (W - 60 - gap * 4) / 5;
  cards.forEach(function (d, i) { PRH_kpi_(slide, x + i * (cw + gap), y, cw, 102, d); });
  // A metade de baixo ficou livre de propósito — a definir.
}

function PRH_slideComparacao_(slide, W, H, m) {
  const x = 48, chartW = 430;
  PRH_card_(slide, 30, 82, 480, 244, PRH_DS.colors.brandLight);
  PRH_texto_(slide, x, 94, 300, 17, 'MÉDIAS GERAIS · ESCALA 1–5', { fs: 9, min: 8, bold: true, color: PRH_DS.colors.brandMed, family: PRH_DS.fonts.title, oneLine: true });
  PRH_barraNota_(slide, x, 118, chartW, 'Percepção externa', m.notaExterna, PRH_DS.colors.brandMed, m.nExterno);
  PRH_barraNota_(slide, x, 188, chartW, 'Autoavaliação', m.notaAuto, PRH_DS.colors.brandLight, m.nAuto);
  PRH_barraNota_(slide, x, 258, chartW, 'Média da empresa', m.notaEmpresa, PRH_DS.colors.muted, m.nEmpresa);

  PRH_card_(slide, 526, 82, W - 556, 244, PRH_DS.colors.orange);
  PRH_texto_(slide, 542, 98, W - 588, 18, 'DIFERENÇA', { fs: 9, min: 8, bold: true, color: PRH_DS.colors.orange, family: PRH_DS.fonts.title, oneLine: true });
  PRH_texto_(slide, 542, 126, W - 588, 50, m.diferenca === null ? 'N/D' : PRH_numSinal_(m.diferenca), { fs: 28, min: 20, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, oneLine: true });
  PRH_texto_(slide, 542, 186, W - 588, 62, m.diferenca === null
    ? 'Comparação retida até ambos os lados alcançarem seus cortes.'
    : PRH_frasePosicao_('A autoavaliação está', m.diferenca, 'a percepção externa'),
    { fs: 9.5, min: 7.5, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 118 });
  PRH_texto_(slide, 542, 254, W - 588, 62, m.contraEmpresa === null
    ? 'Comparação com a empresa retida pelo mesmo corte.'
    : PRH_frasePosicao_('A área está', m.contraEmpresa, 'a média da empresa'),
    { fs: 9.5, min: 7.5, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 118 });
}

/** "A área está 0,12 ponto acima da média da empresa." */
function PRH_frasePosicao_(sujeito, delta, referencia) {
  const d = Math.abs(delta);
  if (d < 0.005) return sujeito + ' no mesmo nível que ' + referencia + '.';
  const de = referencia.indexOf('a ') === 0 ? 'd' + referencia : 'de ' + referencia;
  return sujeito + ' ' + PRH_num_(d) + ' ponto' + (d > 1 ? 's' : '') +
    (delta > 0 ? ' acima ' : ' abaixo ') + de + '.';
}

/** Os sete critérios em colunas: externa e autoavaliação lado a lado. */
function PRH_slideCriterios_(slide, W, H, m) {
  const esquerda = 52, base = 306, alturaMax = 190, topo = base - alturaMax;
  const larguraPlot = W - esquerda - 30, grupo = larguraPlot / m.criterios.length;
  const larguraBarra = 30, folga = (grupo - larguraBarra * 2 - 6) / 2;

  PRH_legendaAutoExterna_(slide, W - 250, 80);

  // Grade horizontal de 1 a 5, com a escala à esquerda.
  for (let v = 0; v <= 5; v++) {
    const gy = base - alturaMax * v / 5;
    PRH_linha_(slide, esquerda - 6, gy, esquerda + larguraPlot, gy, v === 0 ? PRH_DS.colors.lines : PRH_DS.colors.grid, v === 0 ? 1 : 0.6);
    PRH_texto_(slide, 24, gy - 7, 22, 14, String(v), { fs: 7, min: 6, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true, align: 'right' });
  }

  // Os traços da empresa vão ANTES das colunas: no Slides a ordem de inserção
  // é a ordem de empilhamento, então as barras cobrem o miolo do traço e sobram
  // só as pontas, de cada lado do grupo. Assim o traço nunca corta o rótulo.
  m.criterios.forEach(function (c, i) {
    if (c.benchmark === null) return;
    const gx = esquerda + i * grupo;
    const by = base - alturaMax * Number(c.benchmark) / 5;
    PRH_linha_(slide, gx + folga - 10, by, gx + folga + larguraBarra * 2 + 16, by, PRH_DS.colors.orange, 1.5);
  });

  m.criterios.forEach(function (c, i) {
    const gx = esquerda + i * grupo;
    [{ valor: c.externa, cor: PRH_DS.colors.brandLight, dx: folga },
     { valor: c.auto, cor: PRH_DS.colors.premium, dx: folga + larguraBarra + 6 }].forEach(function (b) {
      const bx = gx + b.dx;
      if (b.valor === null) {
        PRH_texto_(slide, bx - 6, base - 22, larguraBarra + 12, 14, 'N/D', { fs: 7, min: 6, bold: true, color: PRH_DS.colors.muted, family: PRH_DS.fonts.title, oneLine: true, align: 'center' });
        return;
      }
      const altura = Math.max(2, alturaMax * Number(b.valor) / 5);
      PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, bx, base - altura, larguraBarra, altura, b.cor, null);
      // O rótulo vai dentro do topo da coluna. Flutuando acima, ele disputava
      // espaço com o traço da empresa sempre que os dois valores eram próximos.
      const cabeDentro = altura >= 22;
      PRH_texto_(slide, bx - 8, cabeDentro ? base - altura + 3 : base - altura - 15, larguraBarra + 16, 14,
        PRH_num_(b.valor), { fs: 7.6, min: 6.2, bold: true, color: cabeDentro ? '#FFFFFF' : b.cor, family: PRH_DS.fonts.title, oneLine: true, align: 'center' });
    });
    PRH_texto_(slide, gx + 2, base + 8, grupo - 4, 42, c.nome, { fs: 6.6, min: 5.6, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.body, align: 'center', spacing: 110 });
  });

  PRH_texto_(slide, esquerda, topo - 14, 300, 13, 'ESCALA DE 1 A 5', { fs: 6.5, min: 6, bold: true, color: PRH_DS.colors.muted, family: PRH_DS.fonts.title, oneLine: true });
  PRH_texto_(slide, 38, H - 48, W - 76, 14, 'O traço laranja em cada grupo é a média da empresa naquele critério — referência, sem ranking.', { fs: 7, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
}

/** Legenda compartilhada pelas duas versões do slide de critérios. */
function PRH_legendaAutoExterna_(slide, x, y) {
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, y + 4, 10, 8, PRH_DS.colors.brandLight, null);
  PRH_texto_(slide, x + 15, y, 92, 14, 'Percepção externa', { fs: 7, min: 6, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, oneLine: true });
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x + 112, y + 4, 10, 8, PRH_DS.colors.premium, null);
  PRH_texto_(slide, x + 127, y, 78, 14, 'Autoavaliação', { fs: 7, min: 6, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, oneLine: true });
}

/** Comentários em sequência, um por linha. Usado pelos dois slides abertos. */
function PRH_slideComentarios_(slide, W, H, lista, cor, pagina) {
  if (!lista.length) {
    PRH_card_(slide, 30, 92, W - 60, 190, PRH_DS.colors.muted);
    PRH_texto_(slide, 54, 125, W - 108, 100, 'Nenhum comentário pode ser exibido nesta pergunta. O bloco qualitativo respeita o corte de cada origem e não usa conteúdo abaixo do mínimo.', { fs: 16, min: 12, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, spacing: 116, middle: true });
    return;
  }

  const x = 30, w = W - 60, y = 78, linhaH = 48, gap = 6;
  const inicio = (pagina || 0) * PRH_CONFIG.maxComments;
  const mostrados = lista.slice(inicio, inicio + PRH_CONFIG.maxComments);

  // Quando todos os trechos vêm da mesma origem, um selo por linha só repete
  // a mesma palavra cinco vezes. Nesse caso a origem vira uma nota única no
  // alto, e a linha fica com o texto inteiro.
  const misturado = mostrados.some(function (c) { return c.origem !== mostrados[0].origem; });
  if (!misturado) {
    PRH_texto_(slide, x, 64, w, 13, 'Todos os trechos abaixo: ' + mostrados[0].origem.toLowerCase() + '.',
      { fs: 7.5, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true, align: 'right' });
  }
  const larguraTexto = misturado ? w - 178 : w - 68;

  mostrados.forEach(function (c, i) {
    const ry = y + i * (linhaH + gap);
    PRH_card_(slide, x, ry, w, linhaH, cor);
    PRH_texto_(slide, x + 14, ry, 26, linhaH, PRH_inteiro_(inicio + i + 1), { fs: 15, min: 11, bold: true, color: cor, family: PRH_DS.fonts.title, oneLine: true, middle: true });
    PRH_texto_(slide, x + 44, ry + 5, larguraTexto, linhaH - 10, '“' + c.texto + '”', { fs: 9.2, min: 6.8, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 116, middle: true });
    if (misturado) {
      const corOrigem = c.origem === 'Autoavaliação' ? PRH_DS.colors.premium : PRH_DS.colors.brandLight;
      PRH_pill_(slide, x + w - 124, ry + 15, 110, 18, c.origem.toUpperCase(), corOrigem, '#FFFFFF');
    }
  });

  const nota = 'Trechos sem identificação; contatos e links removidos. Ordem por origem e extensão — não é ranking.' +
    (lista.length > PRH_CONFIG.maxComments
      ? ' ' + PRH_inteiro_(lista.length) + ' comentários no total, ' + PRH_inteiro_(PRH_CONFIG.maxComments) + ' por slide.'
      : '');
  PRH_texto_(slide, 38, H - 48, W - 76, 14, nota, { fs: 7.5, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
}

function PRH_slideAcao_(slide, W, H) {
  const cols = [
    { t: '1 · PRIORIDADE', body: '[EDITÁVEL] Definir qual fato automático merece investigação.', c: PRH_DS.colors.brandLight },
    { t: '2 · AÇÃO', body: '[EDITÁVEL] Descrever a iniciativa sem atribuir causa ainda não validada.', c: PRH_DS.colors.brandMed },
    { t: '3 · RESPONSÁVEL', body: '[EDITÁVEL] Nomear uma pessoa responsável e áreas de apoio.', c: PRH_DS.colors.premium },
    { t: '4 · PRAZO E EVIDÊNCIA', body: '[EDITÁVEL] Informar data, indicador de sucesso e fonte de comprovação.', c: PRH_DS.colors.orange }
  ];
  const gap = 12, x = 30, y = 94, cw = (W - 60 - gap * 3) / 4;
  cols.forEach(function (d, i) {
    const cx = x + i * (cw + gap);
    PRH_card_(slide, cx, y, cw, 180, d.c);
    PRH_pill_(slide, cx + 12, y + 15, cw - 24, 23, d.t, d.c, '#FFFFFF');
    PRH_texto_(slide, cx + 14, y + 56, cw - 28, 94, d.body, { fs: 10.2, min: 8, color: PRH_DS.colors.text, family: PRH_DS.fonts.body, spacing: 122 });
  });
}

function PRH_fundoClaro_(slide) { slide.getBackground().setSolidFill(PRH_DS.colors.bg); }

function PRH_header_(slide, W, titulo, subtitulo) {
  PRH_shape_(slide, SlidesApp.ShapeType.ELLIPSE, W - 350, -80, 450, 450, PRH_DS.colors.brandLight, null, 0.03).sendToBack();
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, 30, 13, 5, 36, PRH_DS.colors.brandLight, null);
  PRH_texto_(slide, 44, 6, W - 230, 30, titulo, { fs: 19, min: 12, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, oneLine: true, middle: true });
  PRH_texto_(slide, 44, 34, W - 230, 18, subtitulo, { fs: 9.5, min: 7.5, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, oneLine: true, middle: true });
  PRH_logo_(slide, PRH_CONFIG.logoColorId, W - 142, 14, 112, 32, false);
  PRH_linha_(slide, 0, 62, W, 62, PRH_DS.colors.lines, 1);
  PRH_linha_(slide, 30, 62, 140, 62, PRH_DS.colors.brandLight, 3);
}

/** O rótulo é opcional: os dois decks usam o mesmo rodapé com textos diferentes. */
function PRH_rodape_(slide, W, H, numero, rotulo) {
  PRH_texto_(slide, 30, H - 19, W - 60, 10, (rotulo || 'PILOTO PLANEJAMENTO & GESTÃO') + '  ·  ' + String(numero).padStart(2, '0'),{ fs: 6.5, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
}

function PRH_card_(slide, x, y, w, h, cor) {
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, y, w, h, PRH_DS.colors.card, PRH_DS.colors.lines);
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, y, 4, h, cor || PRH_DS.colors.brandLight, null);
}

function PRH_kpi_(slide, x, y, w, h, d) {
  PRH_card_(slide, x, y, w, h, d.c);
  PRH_texto_(slide, x + 12, y + 8, w - 18, 15, d.l, { fs: 7.3, min: 6, bold: true, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, oneLine: true });
  PRH_texto_(slide, x + 12, y + 27, w - 20, 42, d.v, { fs: 22, min: 15, bold: true, color: d.c, family: PRH_DS.fonts.title, oneLine: true, middle: true });
  PRH_texto_(slide, x + 12, y + 77, w - 20, 14, d.n, { fs: 7, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
}

function PRH_barraNota_(slide, x, y, w, label, valor, cor, n) {
  PRH_texto_(slide, x, y, 200, 16, label, { fs: 10, min: 8, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, oneLine: true });
  const quantas = Number(n) === 1 ? '1 resposta' : PRH_inteiro_(n) + ' respostas';
  PRH_texto_(slide, x, y + 16, 200, 13, quantas, { fs: 7.5, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
  PRH_texto_(slide, x + w - 110, y, 110, 24, valor === null ? 'N/D' : PRH_num_(valor), { fs: 15, min: 11, bold: true, color: cor, family: PRH_DS.fonts.title, oneLine: true, align: 'right' });
  PRH_escalaBarra_(slide, x, y + 33, w, 16, valor, cor);
}

function PRH_escalaBarra_(slide, x, y, w, h, valor, cor) {
  PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, y, w, h, PRH_DS.colors.grid, null);
  for (let i = 1; i < 5; i++) PRH_linha_(slide, x + (w * i / 5), y, x + (w * i / 5), y + h, '#CBD5E1', 0.6);
  if (valor !== null && !isNaN(valor)) {
    const largura = Math.max(0, Math.min(w, w * Number(valor) / 5));
    if (largura > 0) PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, y, largura, h, cor, null);
  }
}

function PRH_pill_(slide, x, y, w, h, texto, fundo, corTexto) {
  PRH_shape_(slide, SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h, fundo, null);
  PRH_texto_(slide, x - 7, y, w + 14, h, texto, { fs: 7, min: 5.8, bold: true, color: corTexto, family: PRH_DS.fonts.title, oneLine: true, align: 'center', middle: true });
}

function PRH_shape_(slide, tipo, x, y, w, h, fill, border, alpha) {
  const s = slide.insertShape(tipo, x, y, w, h);
  if (fill && alpha !== undefined) s.getFill().setSolidFill(fill, alpha);
  else if (fill) s.getFill().setSolidFill(fill);
  else s.getFill().setTransparent();
  if (border) {
    s.getBorder().getLineFill().setSolidFill(border);
    s.getBorder().setWeight(1);
  } else s.getBorder().setTransparent();
  return s;
}

function PRH_linha_(slide, x1, y1, x2, y2, cor, peso) {
  const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x1, y1, x2, y2);
  l.getLineFill().setSolidFill(cor);
  l.setWeight(peso || 1);
  return l;
}

function PRH_texto_(slide, x, y, w, h, texto, op) {
  const t = String(texto === null || texto === undefined ? '' : texto);
  if (!t) return null;
  const o = op || {}, family = o.family || PRH_DS.fonts.body;
  const factor = family === PRH_DS.fonts.title ? 0.58 : 0.52;
  const lineFactor = (o.spacing || 118) / 100 * 1.18;
  let fs = o.fs || 10, min = o.min || 6.5;
  if (o.oneLine) {
    while (fs > min && t.length * fs * factor * (o.bold ? 1.04 : 1) > Math.max(12, w - 14)) fs -= 0.25;
  } else {
    while (fs > min) {
      const chars = Math.max(1, Math.floor((w - 14) / (fs * factor)));
      const linhas = t.split('\n').reduce(function (soma, linha) { return soma + Math.max(1, Math.ceil(linha.length / chars)); }, 0);
      if (linhas * fs * lineFactor <= h) break;
      fs -= 0.25;
    }
  }
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  if (o.middle) box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const tr = box.getText();
  tr.setText(t).getTextStyle().setFontSize(fs).setBold(!!o.bold).setForegroundColor(o.color || PRH_DS.colors.body).setFontFamily(family);
  tr.getParagraphStyle().setParagraphAlignment(
    o.align === 'center' ? SlidesApp.ParagraphAlignment.CENTER : o.align === 'right' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START
  ).setLineSpacing(Math.max(100, o.spacing || 118));
  return box;
}

function PRH_logo_(slide, id, x, y, w, h, negativo) {
  try {
    if (!PRH_ASSET_CACHE[id]) PRH_ASSET_CACHE[id] = DriveApp.getFileById(id).getBlob();
    const img = slide.insertImage(PRH_ASSET_CACHE[id]);
    const iw = img.getWidth(), ih = img.getHeight();
    const escala = Math.min(w / iw, h / ih);
    img.setWidth(iw * escala).setHeight(ih * escala);
    img.setLeft(x + (w - iw * escala) / 2).setTop(y + (h - ih * escala) / 2);
    return true;
  } catch (erro) {
    Logger.log('PRH_: asset indisponível (' + id + '); aplicado fallback textual. ' + erro);
    PRH_texto_(slide, x, y, w, h, 'CAPITAL REALTY', { fs: 10, min: 7, bold: true, color: negativo ? '#FFFFFF' : PRH_DS.colors.brandDark, family: PRH_DS.fonts.title, oneLine: true, middle: true, align: 'center' });
    return false;
  }
}

function PRH_arredondar_(v) { return Math.round(Number(v) * 100) / 100; }
function PRH_num_(v) { return Number(v).toLocaleString(PRH_CONFIG.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/** Contagem: nunca leva casa decimal — "12 respostas", não "12,00 respostas". */
function PRH_inteiro_(v) { return Number(v).toLocaleString(PRH_CONFIG.locale, { maximumFractionDigits: 0 }); }
function PRH_numOuND_(v) { return v === null || v === undefined ? 'N/D' : PRH_num_(v); }
function PRH_numSinal_(v) { return (Number(v) > 0 ? '+' : '') + PRH_num_(v); }
function PRH_limitarTexto_(t, max) { return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'; }
function PRH_unicos_(lista) { const m = {}; return lista.filter(function (v) { const k = String(v); if (m[k]) return false; m[k] = true; return true; }).sort(); }
function PRH_normalizar_(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}
