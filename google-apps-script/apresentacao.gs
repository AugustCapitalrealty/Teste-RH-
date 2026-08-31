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
  slideCount: 7,
  maxComments: 4
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
    fonte: 'Planilha ' + ID_PLANILHA,
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

function PRH_selecionarComentarios_(registros, liberaExterno, liberaAuto) {
  const vistos = {};
  const todos = registros.filter(function (r) {
    if (!r || r.tipo !== 'texto') return false;
    if (r.ehAuto ? !liberaAuto : !liberaExterno) return false;
    return String(r.resposta || '').trim() !== '';
  }).map(function (r) {
    return {
      origem: r.ehAuto ? 'Autoavaliação' : 'Percepção externa',
      pergunta: String(r.pergunta || ''),
      texto: PRH_anonimizarComentario_(r.resposta)
    };
  }).filter(function (c) {
    const chave = PRH_normalizar_(c.origem + '|' + c.pergunta + '|' + c.texto);
    if (!c.texto || vistos[chave]) return false;
    vistos[chave] = true;
    return true;
  });

  todos.sort(function (a, b) {
    return (a.pergunta + a.origem + a.texto).localeCompare(b.pergunta + b.origem + b.texto, 'pt-BR');
  });
  return todos.slice(0, PRH_CONFIG.maxComments);
}

function PRH_anonimizarComentario_(texto) {
  let t = String(texto || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato removido]');
  t = t.replace(/https?:\/\/\S+/gi, '[link removido]');
  t = t.replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-.\s]?\d{4}/g, '[contato removido]');
  return PRH_limitarTexto_(t, 220);
}

function PRH_definirRoteiro_() {
  return [
    { id: 'capa', titulo: 'Pesquisa de satisfação interdepartamental' },
    { id: 'kpis', titulo: 'Indicadores-chave' },
    { id: 'comparacao', titulo: 'Autoavaliação × percepção externa' },
    { id: 'criterios', titulo: 'Os sete critérios' },
    { id: 'voz', titulo: 'Voz qualitativa anonimizada' },
    { id: 'acao', titulo: 'Plano de ação para validação' },
    { id: 'metodologia', titulo: 'Metodologia e encerramento' }
  ];
}

function PRH_reconstruirDeck_(deck, modelo, roteiro) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  if (!W || !H || Math.abs(W / H - PRH_CONFIG.expectedRatio) > 0.015) {
    throw new Error('O deck alvo não está em 16:9 (dimensões atuais: ' + W + ' × ' + H + ' pt).');
  }
  if (roteiro.length !== PRH_CONFIG.slideCount) throw new Error('Roteiro inválido: esperado ' + PRH_CONFIG.slideCount + ' slides.');

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

  Logger.log('PRH_: oito novos slides prontos; iniciando substituição explícita do conteúdo anterior.');
  anteriores.forEach(function (slide) { slide.remove(); });
  if (deck.getSlides().length !== roteiro.length) throw new Error('Contagem final de slides divergente.');
  deck.saveAndClose();
}

function PRH_desenharSlide_(slide, deck, id, m, numero) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  if (id === 'capa') return PRH_slideCapa_(slide, W, H, m);
  PRH_fundoClaro_(slide);
  PRH_header_(slide, W, PRH_tituloPorId_(id), m.area + ' · Atualizado em ' + m.geradoEm);
  if (id === 'kpis') PRH_slideKpis_(slide, W, H, m);
  else if (id === 'comparacao') PRH_slideComparacao_(slide, W, H, m);
  else if (id === 'criterios') PRH_slideCriterios_(slide, W, H, m);
  else if (id === 'voz') PRH_slideVoz_(slide, W, H, m);
  else if (id === 'acao') PRH_slideAcao_(slide, W, H, m);
  else if (id === 'metodologia') PRH_slideMetodologia_(slide, W, H, m);
  else throw new Error('Tipo de slide desconhecido: ' + id);
  PRH_rodape_(slide, W, H, numero);
}

function PRH_tituloPorId_(id) {
  const mapa = {
    kpis: 'INDICADORES-CHAVE',
    comparacao: 'AUTOAVALIAÇÃO × PERCEPÇÃO EXTERNA', criterios: 'OS SETE CRITÉRIOS',
    voz: 'VOZ QUALITATIVA ANONIMIZADA', acao: 'PLANO DE AÇÃO PARA VALIDAÇÃO',
    metodologia: 'METODOLOGIA E ENCERRAMENTO'
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

function PRH_slideCriterios_(slide, W, H, m) {
  const x = 30, y = 82, rowH = 35, labelW = 210, chartX = x + labelW, chartW = 300;
  PRH_texto_(slide, chartX, y, chartW, 15, '1                    2                    3                    4                    5', { fs: 6.5, min: 6, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
  m.criterios.forEach(function (c, i) {
    const ry = y + 20 + i * rowH;
    if (i % 2 === 0) PRH_shape_(slide, SlidesApp.ShapeType.RECTANGLE, x, ry - 3, W - 60, rowH - 2, '#FFFFFF', null);
    PRH_texto_(slide, x + 8, ry, labelW - 16, 25, c.nome, { fs: 8.2, min: 6.5, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.body, middle: true });
    PRH_escalaBarra_(slide, chartX, ry + 6, chartW, 12, c.externa, PRH_DS.colors.brandLight);
    PRH_texto_(slide, chartX + chartW + 9, ry, 42, 24, PRH_numOuND_(c.externa), { fs: 10, min: 8, bold: true, color: PRH_DS.colors.brandMed, family: PRH_DS.fonts.title, oneLine: true, middle: true });
    if (c.benchmark !== null) {
      PRH_texto_(slide, chartX + chartW + 50, ry, 95, 24, 'Empresa ' + PRH_num_(c.benchmark), { fs: 7, min: 6, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true, middle: true });
    }
  });
  PRH_texto_(slide, 38, H - 50, W - 76, 15, 'Benchmark da empresa: consolidado externo somente de áreas elegíveis; exibido como referência, sem ranking.', { fs: 7, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
}

function PRH_slideVoz_(slide, W, H, m) {
  if (!m.comentarios.length) {
    PRH_card_(slide, 30, 92, W - 60, 190, PRH_DS.colors.muted);
    PRH_texto_(slide, 54, 125, W - 108, 100, 'Nenhum comentário pode ser exibido neste momento. O bloco qualitativo respeita o corte de cada origem e não usa conteúdo abaixo do mínimo.', { fs: 16, min: 12, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, spacing: 116, middle: true });
    return;
  }
  const gap = 14, x = 30, y = 84, cw = (W - 60 - gap) / 2, ch = 112;
  m.comentarios.forEach(function (c, i) {
    const cx = x + (i % 2) * (cw + gap), cy = y + Math.floor(i / 2) * (ch + gap);
    PRH_card_(slide, cx, cy, cw, ch, c.origem === 'Autoavaliação' ? PRH_DS.colors.premium : PRH_DS.colors.brandLight);
    PRH_pill_(slide, cx + 14, cy + 11, 105, 17, c.origem.toUpperCase(), c.origem === 'Autoavaliação' ? PRH_DS.colors.premium : PRH_DS.colors.brandLight, '#FFFFFF');
    PRH_texto_(slide, cx + 14, cy + 36, cw - 28, 60, '“' + c.texto + '”', { fs: 9.2, min: 7, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 118 });
  });
  PRH_texto_(slide, 38, H - 50, W - 76, 15, 'Trechos sem ID de avaliação; contatos e links são removidos automaticamente. A seleção não representa frequência.', { fs: 7, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
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
  PRH_texto_(slide, 42, 301, W - 84, 34, 'Este slide é deliberadamente um canvas: o gerador não cria diagnóstico, causalidade, responsável ou compromisso em nome da equipe.', { fs: 9.5, min: 8, bold: true, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 116, middle: true });
}

function PRH_slideMetodologia_(slide, W, H, m) {
  const x = 30, y = 84, gap = 14, cw = (W - 60 - gap) / 2;
  PRH_card_(slide, x, y, cw, 222, PRH_DS.colors.brandLight);
  PRH_texto_(slide, x + 16, y + 14, cw - 32, 20, 'COMO OS NÚMEROS SÃO FORMADOS', { fs: 10, min: 8, bold: true, color: PRH_DS.colors.brandMed, family: PRH_DS.fonts.title, oneLine: true });
  const metodo = [
    'Fonte: aba Respostas da planilha configurada em ID_PLANILHA.',
    'Escopo: somente “' + m.area + '”.',
    'Médias: respostas válidas de 1 a 5; “na” não entra no cálculo.',
    'Cortes: externo ≥ ' + m.minimoExterno + '; autoavaliação ≥ ' + m.minimoAuto + '.',
    'Benchmark: externo consolidado apenas de áreas que alcançaram o corte.',
    'Comentários: sem ID, com contatos removidos e limitados a ' + PRH_CONFIG.maxComments + ' trechos.'
  ];
  PRH_texto_(slide, x + 16, y + 47, cw - 32, 157, metodo.map(function (v) { return '• ' + v; }).join('\n'), { fs: 8.7, min: 7, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 132 });

  PRH_card_(slide, x + cw + gap, y, cw, 222, PRH_DS.colors.premium);
  PRH_texto_(slide, x + cw + gap + 16, y + 14, cw - 32, 20, 'PRÓXIMO PASSO', { fs: 10, min: 8, bold: true, color: PRH_DS.colors.brandMed, family: PRH_DS.fonts.title, oneLine: true });
  PRH_texto_(slide, x + cw + gap + 16, y + 51, cw - 32, 82, 'Validar a estrutura visual, a ordem da narrativa e os campos editáveis com Planejamento & Gestão.', { fs: 15, min: 11, bold: true, color: PRH_DS.colors.text, family: PRH_DS.fonts.title, spacing: 112 });
  PRH_texto_(slide, x + cw + gap + 16, y + 148, cw - 32, 52, '[EDITÁVEL] Registrar decisão sobre expansão do modelo para as demais áreas.', { fs: 9.5, min: 8, color: PRH_DS.colors.body, family: PRH_DS.fonts.body, spacing: 118 });
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

function PRH_rodape_(slide, W, H, numero) {
  PRH_texto_(slide, 30, H - 19, W - 60, 10, 'PILOTO PLANEJAMENTO & GESTÃO  ·  ' + String(numero).padStart(2, '0'), { fs: 6.5, min: 6.5, color: PRH_DS.colors.muted, family: PRH_DS.fonts.body, oneLine: true });
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
