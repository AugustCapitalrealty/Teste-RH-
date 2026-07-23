/**
 * Salva resposta em Google Sheets
 */
function saveResponseToSheet(data) {
  try {
    // Abre o spreadsheet pelo ID
    const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');

    // Cria aba "Respostas" se não existir
    let sheet = ss.getSheetByName('Respostas');
    if (!sheet) {
      sheet = ss.insertSheet('Respostas');
      createResponsesHeader(sheet);
    }

    // Prepara row para inserir
    const row = [
      new Date().toISOString(),
      data.departamento,
      data.respostas.pergunta_1 || '',
      data.respostas.pergunta_2 || '',
      data.respostas.pergunta_3 || '',
      data.comentario || '',
      Utilities.getUuid() // ID único
    ];

    // Insere na próxima linha vazia
    sheet.appendRow(row);

    // Retorna resultado
    return {
      success: true,
      id: row[6],
      timestamp: row[0]
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
    'Departamento',
    'Pergunta 1 - Comunicação',
    'Pergunta 2 - Qualidade',
    'Pergunta 3 - Parceria',
    'Comentário',
    'ID'
  ];

  sheet.appendRow(headers);

  // Formata header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#667eea');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');

  // Auto-resize colunas
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Cria aba CONFIG se não existir
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');

  // Cria aba CONFIG
  let configSheet = ss.getSheetByName('CONFIG');
  if (!configSheet) {
    configSheet = ss.insertSheet('CONFIG', 0);
    configSheet.appendRow(['Chave', 'Valor']);
    configSheet.appendRow(['pesquisa_id', 'pesquisa_001']);
    configSheet.appendRow(['titulo_pesquisa', 'Pesquisa RH 360º']);
    configSheet.appendRow(['status', 'ativa']);
    configSheet.appendRow(['criado_em', new Date().toISOString()]);

    // Formata
    configSheet.getRange(1, 1, 1, 2).setBackground('#764ba2').setFontColor('#ffffff').setFontWeight('bold');
  }

  // Cria aba ANALISE se não existir
  let analiseSheet = ss.getSheetByName('ANALISE');
  if (!analiseSheet) {
    analiseSheet = ss.insertSheet('ANALISE');
    analiseSheet.appendRow(['Departamento', 'Total Respostas', 'Média Comunicação', 'Média Qualidade', 'Média Parceria', 'Média Geral']);
    analiseSheet.getRange(1, 1, 1, 6).setBackground('#764ba2').setFontColor('#ffffff').setFontWeight('bold');
  }

  Logger.log('Spreadsheet inicializado com sucesso!');
}

/**
 * Função para testar - cria dados de exemplo
 */
function seedTestData() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');
  const respostasSheet = ss.getSheetByName('Respostas');
  if (!respostasSheet) {
    createResponsesHeader(ss.insertSheet('Respostas'));
  }

  // Adiciona 10 respostas de teste
  const departamentos = ['RH', 'TI', 'Comercial', 'Operações'];
  for (let i = 0; i < 10; i++) {
    const row = [
      new Date(Date.now() - i * 3600000).toISOString(),
      departamentos[Math.floor(Math.random() * 4)],
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1,
      'Comentário de teste ' + i,
      Utilities.getUuid()
    ];
    respostasSheet.appendRow(row);
  }

  Logger.log('10 respostas de teste inseridas!');
}

/**
 * Calcula estatísticas das respostas
 */
function calculateStats() {
  const ss = SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g');
  const respostasSheet = ss.getSheetByName('Respostas');
  const analiseSheet = ss.getSheetByName('ANALISE');

  if (!respostasSheet || !analiseSheet) return;

  const data = respostasSheet.getDataRange().getValues();
  if (data.length < 2) return; // Sem dados além do header

  // Agrupa por departamento
  const statsByDept = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dept = row[1];
    const p1 = parseFloat(row[2]) || 0;
    const p2 = parseFloat(row[3]) || 0;
    const p3 = parseFloat(row[4]) || 0;

    if (!statsByDept[dept]) {
      statsByDept[dept] = {
        count: 0,
        p1: 0,
        p2: 0,
        p3: 0
      };
    }

    statsByDept[dept].count++;
    statsByDept[dept].p1 += p1;
    statsByDept[dept].p2 += p2;
    statsByDept[dept].p3 += p3;
  }

  // Limpa a aba ANALISE (exceto header)
  if (analiseSheet.getMaxRows() > 1) {
    analiseSheet.deleteRows(2, analiseSheet.getMaxRows() - 1);
  }

  // Insere estatísticas
  for (const dept in statsByDept) {
    const stats = statsByDept[dept];
    const avgP1 = (stats.p1 / stats.count).toFixed(2);
    const avgP2 = (stats.p2 / stats.count).toFixed(2);
    const avgP3 = (stats.p3 / stats.count).toFixed(2);
    const avgGeral = ((parseFloat(avgP1) + parseFloat(avgP2) + parseFloat(avgP3)) / 3).toFixed(2);

    analiseSheet.appendRow([
      dept,
      stats.count,
      avgP1,
      avgP2,
      avgP3,
      avgGeral
    ]);
  }

  Logger.log('Estatísticas calculadas!');
}
