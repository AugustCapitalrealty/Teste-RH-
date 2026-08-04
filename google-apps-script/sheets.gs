/**
 * Textos das perguntas (mesma ordem usada no main.gs) — usado só para deixar a planilha legível
 */
const QUESTION_TEXTS = [
  'Clareza da comunicação',
  'Cordialidade',
  'Transparência da comunicação',
  'Velocidade de resposta',
  'Cumprimento de prazos (SLA)',
  'Qualidade das soluções entregues',
  'Parceria estratégica',
  'Grau de esforço / simplicidade',
  'O que esta área faz muito bem?',
  'O que esta área poderia melhorar?'
];

/**
 * Salva resposta em Google Sheets.
 * Formato recebido: { pesquisa_id, avaliacoes: [{ area_avaliada, is_autoavaliacao, respostas: {q0..q7}, abertas: {q8,q9} }] }
 *
 * Cada área avaliada vira um grupo de linhas com um ID aleatório PRÓPRIO (não compartilhado
 * entre as áreas de uma mesma pessoa) — isso evita que alguém consiga juntar todas as respostas
 * de um mesmo respondente cruzando um ID comum, replicando o desacoplamento por avaliação que o
 * projeto original (Lovable) garante via "avaliacao_id" + sort_key aleatório.
 */
function saveResponseToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');

    let sheet = ss.getSheetByName('Respostas');
    if (!sheet) {
      sheet = ss.insertSheet('Respostas');
      createResponsesHeader(sheet);
    }

    const timestamp = data.timestamp || new Date().toISOString();
    const rows = [];

    (data.avaliacoes || []).forEach(function(avaliacao) {
      const avaliacaoId = Utilities.getUuid(); // ID próprio desta área, não ligado às demais
      const areaAvaliada = avaliacao.area_avaliada || '';
      const isAuto = !!avaliacao.is_autoavaliacao;

      const respostas = avaliacao.respostas || {};
      for (const key in respostas) {
        const qIdx = parseInt(key.replace('q', ''), 10);
        rows.push([
          timestamp,
          avaliacaoId,
          areaAvaliada,
          isAuto ? 'Sim' : 'Não',
          QUESTION_TEXTS[qIdx] || key,
          'rating',
          respostas[key]
        ]);
      }

      const abertas = avaliacao.abertas || {};
      for (const key in abertas) {
        if (!abertas[key]) continue; // comentário vazio não é gravado
        const qIdx = parseInt(key.replace('q', ''), 10);
        rows.push([
          timestamp,
          avaliacaoId,
          areaAvaliada,
          isAuto ? 'Sim' : 'Não',
          QUESTION_TEXTS[qIdx] || key,
          'texto',
          abertas[key]
        ]);
      }
    });

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return { success: true };

  } catch (error) {
    Logger.log('Erro ao salvar em Sheets: ' + error);
    throw error;
  }
}

/**
 * Cria header da aba Respostas
 */
function createResponsesHeader(sheet) {
  const headers = [
    'Timestamp',
    'Avaliação ID',
    'Área Avaliada',
    'Autoavaliação',
    'Pergunta',
    'Tipo',
    'Resposta'
  ];

  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#667eea');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');

  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Cria aba CONFIG se não existir
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');

  let configSheet = ss.getSheetByName('CONFIG');
  if (!configSheet) {
    configSheet = ss.insertSheet('CONFIG', 0);
    configSheet.appendRow(['Chave', 'Valor']);
    configSheet.appendRow(['pesquisa_id', 'pesquisa_360']);
    configSheet.appendRow(['titulo_pesquisa', 'Pesquisa de Satisfação Interdepartamental']);
    configSheet.appendRow(['status', 'ativa']);
    configSheet.appendRow(['criado_em', new Date().toISOString()]);

    configSheet.getRange(1, 1, 1, 2).setBackground('#764ba2').setFontColor('#ffffff').setFontWeight('bold');
  }

  let analiseSheet = ss.getSheetByName('ANALISE');
  if (!analiseSheet) {
    analiseSheet = ss.insertSheet('ANALISE');
    analiseSheet.appendRow(['Área Avaliada', 'Total Notas', 'Média Geral']);
    analiseSheet.getRange(1, 1, 1, 3).setBackground('#764ba2').setFontColor('#ffffff').setFontWeight('bold');
  }

  Logger.log('Spreadsheet inicializado com sucesso!');
}

/**
 * Função para testar - cria dados de exemplo (2 respondentes avaliando todas as áreas)
 */
function seedTestData() {
  const areas = [
    'Planejamento & Gestão', 'Administrativo/Secretárias', 'Arquitetura',
    'Comercial/Marketing', 'Deminvest', 'Diretoria', 'Engenharia', 'Facilities',
    'Financeiro/Contábil', 'Jurídico', 'Propriedades', 'Recursos Humanos',
    'Tecnologia da Informação'
  ];

  for (let r = 0; r < 6; r++) {
    const suaArea = areas[r];
    const avaliacoes = areas.map(function(area) {
      const respostas = {};
      for (let q = 0; q < 8; q++) {
        respostas['q' + q] = String(Math.floor(Math.random() * 5) + 1);
      }
      return {
        area_avaliada: area,
        is_autoavaliacao: area === suaArea,
        respostas: respostas,
        abertas: { q8: 'Comentário de teste', q9: 'Sugestão de teste' }
      };
    });

    saveResponseToSheet({
      avaliacoes: avaliacoes,
      timestamp: new Date(Date.now() - r * 3600000).toISOString()
    });
  }

  Logger.log('Respostas de teste inseridas!');
}

// Anonimato por grupo: só mostra números de áreas com pelo menos K respondentes distintos
const K_MIN = 5;

// Critérios objetivos (perguntas de nota), na mesma ordem do formulário
const CRITERIOS = [
  'Clareza da comunicação',
  'Cordialidade',
  'Transparência da comunicação',
  'Velocidade de resposta',
  'Cumprimento de prazos (SLA)',
  'Qualidade das soluções entregues',
  'Parceria estratégica',
  'Grau de esforço / simplicidade'
];

/**
 * Calcula estatísticas por área avaliada, respeitando o anonimato k=5:
 * - conta RESPONDENTES DISTINTOS (por Avaliação ID), não linhas
 * - áreas com menos de K_MIN respostas ficam mascaradas ("— (n<5)")
 * - médias por critério + média geral
 * - bloco TOP/BOTTOM com as melhores e piores áreas (apenas as que têm n>=K_MIN)
 */
function calculateStats() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');
  const respostasSheet = ss.getSheetByName('Respostas');
  let analiseSheet = ss.getSheetByName('ANALISE');
  if (!respostasSheet) return;
  if (!analiseSheet) analiseSheet = ss.insertSheet('ANALISE');

  const data = respostasSheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Colunas: Timestamp | Avaliação ID | Área Avaliada | Autoavaliação | Pergunta | Tipo | Resposta
  // Estrutura: statsByArea[area] = { avaliacoes: Set(ids), criterios: { criterio: {soma,count} } }
  const statsByArea = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const avaliacaoId = row[1];
    const areaAvaliada = row[2];
    const pergunta = row[4];
    const tipo = row[5];
    const resposta = row[6];

    if (!areaAvaliada) continue;

    if (!statsByArea[areaAvaliada]) {
      statsByArea[areaAvaliada] = { avaliacoes: {}, criterios: {} };
    }
    // conta avaliação distinta (por área) para o k=5
    statsByArea[areaAvaliada].avaliacoes[avaliacaoId] = true;

    if (tipo !== 'rating' || resposta === 'na' || resposta === '') continue;
    const nota = parseFloat(resposta);
    if (isNaN(nota)) continue;

    if (!statsByArea[areaAvaliada].criterios[pergunta]) {
      statsByArea[areaAvaliada].criterios[pergunta] = { soma: 0, count: 0 };
    }
    statsByArea[areaAvaliada].criterios[pergunta].soma += nota;
    statsByArea[areaAvaliada].criterios[pergunta].count++;
  }

  // Reconstrói a aba ANALISE do zero
  analiseSheet.clear();

  const header = ['Área Avaliada', 'Respostas (n)', 'Média Geral'].concat(CRITERIOS);
  analiseSheet.appendRow(header);
  analiseSheet.getRange(1, 1, 1, header.length).setBackground('#151E49').setFontColor('#ffffff').setFontWeight('bold');

  const resumo = []; // para top/bottom: { area, n, media }

  Object.keys(statsByArea).sort().forEach(function(area) {
    const s = statsByArea[area];
    const n = Object.keys(s.avaliacoes).length;

    if (n < K_MIN) {
      const linha = [area, n + ' (n<' + K_MIN + ')', '— (n<' + K_MIN + ')'];
      for (let c = 0; c < CRITERIOS.length; c++) linha.push('—');
      analiseSheet.appendRow(linha);
      return;
    }

    // média por critério e média geral
    let somaGeral = 0, countGeral = 0;
    const mediasCriterio = CRITERIOS.map(function(crit) {
      const cc = s.criterios[crit];
      if (!cc || cc.count === 0) return '—';
      somaGeral += cc.soma; countGeral += cc.count;
      return (cc.soma / cc.count).toFixed(2);
    });
    const mediaGeral = countGeral > 0 ? (somaGeral / countGeral) : 0;

    resumo.push({ area: area, n: n, media: mediaGeral });
    analiseSheet.appendRow([area, n, mediaGeral.toFixed(2)].concat(mediasCriterio));
  });

  // Bloco TOP / BOTTOM (somente áreas com n>=K_MIN)
  if (resumo.length > 0) {
    resumo.sort(function(a, b) { return b.media - a.media; });
    const limit = Math.min(3, resumo.length);

    analiseSheet.appendRow([]);
    const topHeaderRow = analiseSheet.getLastRow() + 1;
    analiseSheet.appendRow(['🏆 MELHORES ÁREAS', 'Respostas (n)', 'Média Geral']);
    analiseSheet.getRange(topHeaderRow, 1, 1, 3).setBackground('#21C45D').setFontColor('#ffffff').setFontWeight('bold');
    for (let i = 0; i < limit; i++) analiseSheet.appendRow([resumo[i].area, resumo[i].n, resumo[i].media.toFixed(2)]);

    analiseSheet.appendRow([]);
    const botHeaderRow = analiseSheet.getLastRow() + 1;
    analiseSheet.appendRow(['⚠️ ÁREAS A MELHORAR', 'Respostas (n)', 'Média Geral']);
    analiseSheet.getRange(botHeaderRow, 1, 1, 3).setBackground('#E63351').setFontColor('#ffffff').setFontWeight('bold');
    for (let i = 0; i < limit; i++) {
      const item = resumo[resumo.length - 1 - i];
      analiseSheet.appendRow([item.area, item.n, item.media.toFixed(2)]);
    }
  }

  Logger.log('Estatísticas calculadas! (k=' + K_MIN + ')');
}
