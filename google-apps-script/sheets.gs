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
 * Formato recebido: { pesquisa_id, sua_area, avaliacoes: [{ area_avaliada, is_autoavaliacao, respostas: {q0..q7}, abertas: {q8,q9} }] }
 * Grava uma linha por (área avaliada x pergunta).
 */
function saveResponseToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');

    let sheet = ss.getSheetByName('Respostas');
    if (!sheet) {
      sheet = ss.insertSheet('Respostas');
      createResponsesHeader(sheet);
    }

    const respondentId = Utilities.getUuid();
    const timestamp = data.timestamp || new Date().toISOString();
    const suaArea = data.sua_area || '';
    const rows = [];

    (data.avaliacoes || []).forEach(function(avaliacao) {
      const areaAvaliada = avaliacao.area_avaliada || '';
      const isAuto = !!avaliacao.is_autoavaliacao;

      const respostas = avaliacao.respostas || {};
      for (const key in respostas) {
        const qIdx = parseInt(key.replace('q', ''), 10);
        rows.push([
          timestamp,
          respondentId,
          suaArea,
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
          respondentId,
          suaArea,
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

    return {
      success: true,
      id: respondentId,
      timestamp: timestamp
    };

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
    'Respondente ID',
    'Sua Área',
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
    'Planejamento & Gestão', 'Administrativo/Secretarias', 'Arquitetura',
    'Comercial/Marketing', 'Diretoria', 'Engenharia', 'Facilities',
    'Financeiro/Contábil', 'Jurídico', 'Propriedades', 'Recursos Humanos',
    'Tecnologia da Informação'
  ];

  for (let r = 0; r < 2; r++) {
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
      sua_area: suaArea,
      avaliacoes: avaliacoes,
      timestamp: new Date(Date.now() - r * 3600000).toISOString()
    });
  }

  Logger.log('Respostas de teste inseridas!');
}

/**
 * Calcula estatísticas (média geral por área avaliada) a partir das notas objetivas
 */
function calculateStats() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');
  const respostasSheet = ss.getSheetByName('Respostas');
  const analiseSheet = ss.getSheetByName('ANALISE');

  if (!respostasSheet || !analiseSheet) return;

  const data = respostasSheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Colunas: Timestamp | Respondente ID | Sua Área | Área Avaliada | Autoavaliação | Pergunta | Tipo | Resposta
  const statsByArea = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const areaAvaliada = row[3];
    const tipo = row[6];
    const resposta = row[7];

    if (tipo !== 'rating' || resposta === 'na' || resposta === '') continue;

    const nota = parseFloat(resposta);
    if (isNaN(nota)) continue;

    if (!statsByArea[areaAvaliada]) {
      statsByArea[areaAvaliada] = { count: 0, soma: 0 };
    }
    statsByArea[areaAvaliada].count++;
    statsByArea[areaAvaliada].soma += nota;
  }

  if (analiseSheet.getMaxRows() > 1) {
    analiseSheet.deleteRows(2, analiseSheet.getMaxRows() - 1);
  }

  for (const area in statsByArea) {
    const stats = statsByArea[area];
    const media = (stats.soma / stats.count).toFixed(2);
    analiseSheet.appendRow([area, stats.count, media]);
  }

  Logger.log('Estatísticas calculadas!');
}
