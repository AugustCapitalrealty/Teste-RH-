/**
 * Entry point - Render a página inicial do formulário
 */
function doGet(e) {
  const html = HtmlService.createHtmlOutput(getFormHTML());
  html.setWidth(1000);
  html.setHeight(800);
  return html;
}

/**
 * POST handler - Recebe dados do formulário
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Valida dados
    if (!data.pesquisa_id || !data.avaliacoes) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Dados inválidos" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Salva em Sheets
    saveResponseToSheet(data);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Resposta salva com sucesso!"
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro ao processar formulário: " + error);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função chamada do formulário HTML via google.script.run
 */
function submitForm(data) {
  try {
    saveResponseToSheet(data);
    return {
      success: true,
      message: "Resposta salva com sucesso!"
    };
  } catch (error) {
    Logger.log("Erro ao salvar resposta: " + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Retorna o HTML do formulário — layout "uma pergunta por tela, todas as áreas de uma vez",
 * réplica o mais fiel possível do fluxo de resposta do projeto original (Lovable):
 * paleta navy #151E49, fundo cinza claro, escala emoji compacta com cores 1-5 (vermelho→verde).
 * Adaptado para funcionar sem login (Google Apps Script + Sheets).
 */
function getFormHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesquisa RH 360º - Capital Realty</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy: #151E49;
      --navy-04: rgba(21,30,73,0.04);
      --navy-10: rgba(21,30,73,0.10);
      --navy-40: rgba(21,30,73,0.40);
      --bg: #F6F7F9;
      --card: #FFFFFF;
      --border: #DADFE7;
      --muted: #EAEDF1;
      --muted-fg: #657386;
      --success: #21C45D;
      --e1: #E63351;
      --e2: #F47125;
      --e3: #F9B310;
      --e4: #73B82E;
      --e5: #24A85B;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      min-height: 100vh;
      color: var(--navy);
    }

    /* ==== TOP NAV ==== */
    .topnav {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .topnav-inner {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 34px; height: 34px;
      border-radius: 8px;
      background: var(--navy);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 15px;
    }

    .brand-name { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: var(--navy); line-height: 1.2; }
    .brand-sub { font-size: 11px; color: var(--muted-fg); line-height: 1.2; }

    .page { padding: 24px 16px; }

    .container {
      max-width: 760px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      padding: 24px;
      position: relative;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--navy-10);
      border-radius: 999px;
      margin-bottom: 22px;
      overflow: hidden;
    }

    .progress-fill { height: 100%; background: var(--navy); border-radius: 999px; transition: width 0.3s; }

    h1 { color: var(--navy); text-align: center; margin-bottom: 10px; font-size: 24px; font-weight: 700; }

    .stage-intro { text-align: center; }
    .stage-intro h2 { font-size: 22px; color: var(--navy); margin-bottom: 8px; font-weight: 600; }
    .stage-intro p { font-size: 14px; color: var(--muted-fg); line-height: 1.6; margin-bottom: 16px; }

    .info-box {
      background: #f0f2f8;
      border-left: 4px solid var(--navy);
      padding: 15px 15px 15px 30px;
      margin: 20px 0;
      border-radius: 8px;
      font-size: 13px;
      color: #444;
      text-align: left;
    }

    .info-box strong { display: block; margin-bottom: 8px; color: var(--navy); font-size: 13px; letter-spacing: 0.03em; }
    .info-box ul { margin: 0; padding-left: 18px; line-height: 1.7; }

    .anon-tip {
      background: #eafaf0;
      border: 1.5px solid #b7e6c9;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 12.5px;
      color: #1e6b3e;
      line-height: 1.5;
      text-align: left;
    }

    .badges { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }

    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
      cursor: help;
    }

    .badge-green { background: #e8f7ee; color: #1e8a4c; }
    .badge-blue { background: var(--navy-10); color: var(--navy); }

    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin: 20px 0;
      text-align: left;
    }

    .info-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
    .info-card .label { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted-fg); text-transform: uppercase; margin-bottom: 4px; }
    .info-card .value { font-size: 14px; font-weight: 600; color: var(--navy); }

    .area-picker { text-align: left; margin: 24px 0; }
    .area-picker label { text-align: center; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

    .chip {
      padding: 8px 16px;
      border: 1.5px solid var(--border);
      border-radius: 999px;
      background: #fff;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      color: #444;
    }

    .chip:hover { border-color: var(--navy); color: var(--navy); }
    .chip.selected { background: var(--navy); border-color: var(--navy); color: #fff; font-weight: 600; }

    label { display: block; margin-bottom: 12px; font-weight: 600; color: var(--navy); font-size: 15px; }

    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      height: 72px;
      transition: border-color 0.2s;
    }

    textarea:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px var(--navy-10); }

    .char-counter { font-size: 11px; color: var(--muted-fg); text-align: right; margin-top: 4px; }
    .char-counter.ok { color: #1e8a4c; }

    /* ==== SURVEY STEP HEADER ==== */
    .step-header { margin-bottom: 18px; }
    .step-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .step-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted-fg); text-transform: uppercase; }
    .section-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
    .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted-fg); text-transform: uppercase; }

    .answered-count {
      font-size: 11px; color: var(--muted-fg);
      background: var(--muted);
      padding: 2px 8px; border-radius: 999px;
      transition: all 0.2s;
    }
    .answered-count.complete { background: #e8f7ee; color: #1e8a4c; font-weight: 700; }

    .question-text { font-size: 18px; font-weight: 600; color: var(--navy); line-height: 1.4; }

    /* ==== QUESTION CARD (um card, áreas em linhas) ==== */
    .question-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--card);
      overflow: hidden;
    }

    .area-row {
      padding: 10px 14px;
      border-top: 1px solid var(--border);
      background: transparent;
      transition: background 0.15s;
    }

    .area-row:first-child { border-top: none; }
    .area-row.self { background: var(--navy-04); border-left: 4px solid var(--navy); }
    .area-row.answered { background: rgba(33,196,93,0.04); }

    .area-row-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--navy); margin-bottom: 8px; }

    .self-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
      background: var(--navy-10); color: var(--navy);
      padding: 2px 6px; border-radius: 4px;
    }

    .check-ok { color: var(--success); font-weight: 700; font-size: 13px; margin-left: auto; }

    .scale-labels {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
      font-size: 11px; font-weight: 700; color: var(--muted-fg); margin-bottom: 6px;
    }
    .scale-labels .lo { grid-column: span 2; }
    .scale-labels .hi { grid-column: span 3; text-align: right; }

    .rating-group { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 6px; }

    .emoji-btn {
      display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;
      padding: 4px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: #fff;
      font-family: inherit;
      color: var(--muted-fg);
      cursor: pointer;
      transition: all 0.15s;
    }

    .emoji-btn span.em { font-size: 18px; line-height: 1; }
    .emoji-btn span.num { font-size: 11px; font-weight: 700; color: var(--muted-fg); }

    .emoji-btn:hover { transform: scale(1.05); border-color: var(--navy-40); }
    .emoji-btn:active { transform: scale(0.96); }

    .emoji-btn.selected { color: #fff; transform: scale(1.05); box-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1); }
    .emoji-btn.selected span.num { color: rgba(255,255,255,.95); }
    .emoji-btn.selected[data-nota="1"] { background: var(--e1); border-color: var(--e1); }
    .emoji-btn.selected[data-nota="2"] { background: var(--e2); border-color: var(--e2); }
    .emoji-btn.selected[data-nota="3"] { background: var(--e3); border-color: var(--e3); }
    .emoji-btn.selected[data-nota="4"] { background: var(--e4); border-color: var(--e4); }
    .emoji-btn.selected[data-nota="5"] { background: var(--e5); border-color: var(--e5); }

    .na-btn {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 4px 8px;
      border: 2px dashed var(--border);
      border-radius: 12px;
      background: transparent;
      font-family: inherit;
      font-size: 11px; font-weight: 600;
      color: var(--muted-fg);
      cursor: pointer;
      transition: all 0.15s;
    }

    .na-btn:hover { border-color: var(--muted-fg); }
    .na-btn.selected { background: var(--muted); color: var(--navy); border-color: rgba(101,115,134,.6); }

    /* ==== NAVIGATION ==== */
    .navigation { display: flex; gap: 12px; margin-top: 24px; justify-content: space-between; }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px; font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-prev { background: var(--muted); color: var(--navy); }
    .btn-prev:hover { background: #dfe3ea; }

    .btn-next, .btn-submit, .btn-confirm { background: var(--navy); color: #fff; flex: 1; }
    .btn-next:hover:not(:disabled), .btn-submit:hover:not(:disabled), .btn-confirm:hover:not(:disabled) {
      background: #0e1533; transform: translateY(-1px);
    }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .footer-disclaimer { margin-top: 18px; font-size: 11.5px; color: var(--muted-fg); text-align: center; line-height: 1.5; }

    .success-message { display: none; text-align: center; padding: 40px; }
    .success-message h2 { font-size: 26px; color: var(--navy); margin-bottom: 15px; font-weight: 700; }
    .success-message p { font-size: 15px; color: var(--muted-fg); line-height: 1.6; }

    .already-done { display: none; text-align: center; padding: 40px; }
    .already-done h2 { font-size: 22px; color: var(--navy); margin-bottom: 12px; font-weight: 700; }
    .already-done p { font-size: 15px; color: var(--muted-fg); line-height: 1.6; }

    /* ==== MODALS ==== */
    .modal-overlay { position: fixed; inset: 0; background: rgba(21,30,73,0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; }
    .modal-box { background: #fff; border-radius: 16px; max-width: 440px; width: 100%; padding: 28px; box-shadow: 0 12px 40px rgba(0,0,0,0.25); }
    .modal-box h3 { font-size: 19px; color: var(--navy); margin-bottom: 6px; font-weight: 700; }
    .modal-subtitle { font-size: 13px; color: var(--muted-fg); margin-bottom: 18px; line-height: 1.5; }
    .modal-list { list-style: none; margin-bottom: 20px; }
    .modal-list li { font-size: 13px; color: #444; line-height: 1.5; margin-bottom: 12px; padding-left: 22px; position: relative; }
    .modal-list li::before { content: "✓"; position: absolute; left: 0; color: var(--success); font-weight: 700; }
    .modal-list li strong { color: var(--navy); display: block; }
    .modal-body-text { font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 20px; }
    .modal-actions { display: flex; gap: 10px; }

    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="topnav">
    <div class="topnav-inner">
      <div class="brand-logo">CR</div>
      <div>
        <div class="brand-name">CAPITAL REALTY</div>
        <div class="brand-sub">Hub de Pesquisas RH</div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="container">
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

      <!-- JÁ RESPONDEU (bloqueio local) -->
      <div id="stageAlreadyDone" class="already-done">
        <h2>✅ Você já respondeu esta pesquisa</h2>
        <p>Suas respostas já foram registradas anonimamente neste navegador. Cada colaborador participa apenas uma vez por ciclo.</p>
      </div>

      <!-- INTRO -->
      <div id="stageIntro" class="stage-intro">
        <h1>📊 Pesquisa RH 360º</h1>
        <div class="badges">
          <span class="badge badge-green" title="Impossível associar respostas a pessoas. Resultados só aparecem por área com pelo menos 5 respostas.">🛡️ Pesquisa Anônima · k=5</span>
          <span class="badge badge-blue">🏢 Capital Realty</span>
        </div>

        <h2>Pesquisa de Satisfação Interdepartamental</h2>
        <p>Avalie todas as áreas com as quais você interage. Suas respostas são totalmente anônimas.</p>

        <div class="info-box">
          <strong>⚙️ COMO FUNCIONA</strong>
          <ul>
            <li>Cada tela tem <strong>1 pergunta</strong>, respondida para <strong>todas as áreas</strong></li>
            <li>Selecione a opção que melhor representa sua experiência 😞 😕 😐 🙂 😄 — ou <strong>N/A</strong> se você não tem interação com aquela área</li>
            <li><strong>Autoavaliação:</strong> você também avalia a sua própria área, para comparar com a percepção das outras</li>
            <li>São <strong>8 perguntas objetivas</strong> + <strong>2 comentários obrigatórios</strong></li>
          </ul>
        </div>

        <div class="info-cards">
          <div class="info-card">
            <div class="label">Sua área</div>
            <div class="value" id="cardSuaArea">—</div>
          </div>
          <div class="info-card">
            <div class="label">Áreas a avaliar</div>
            <div class="value" id="cardAreasAvaliar">—</div>
          </div>
          <div class="info-card">
            <div class="label">Autoavaliação</div>
            <div class="value">Sua área</div>
          </div>
        </div>

        <div class="area-picker">
          <label>Qual é a sua área? *</label>
          <div class="chips" id="areaChips"></div>
        </div>

        <div class="navigation">
          <button class="btn btn-next" id="btnStart" onclick="startSurvey()" disabled>Começar →</button>
        </div>
      </div>

      <!-- SURVEY -->
      <div id="stageSurvey" class="hidden">
        <div class="step-header">
          <div class="step-row">
            <span class="step-label" id="stepLabel"></span>
          </div>
          <div class="section-row">
            <span class="section-label" id="sectionLabel"></span>
            <span class="answered-count" id="answeredCount"></span>
          </div>
          <div class="question-text" id="questionText"></div>
        </div>

        <div id="anonTipHolder"></div>
        <div id="questionsContainer"></div>

        <div class="navigation">
          <button class="btn btn-prev" id="btnPrev" onclick="previousStep()">← Anterior</button>
          <button class="btn btn-next" id="btnNext" onclick="nextStep()">Próximo →</button>
          <button class="btn btn-submit hidden" id="btnSubmit" onclick="openConfirmModal()">Enviar</button>
        </div>

        <div class="footer-disclaimer">🔒 A área que você escolheu no início serve apenas para montar sua lista de avaliação — ela nunca é gravada junto às suas respostas, notas ou comentários.</div>
      </div>

      <!-- SUCCESS -->
      <div id="stageSuccess" class="success-message">
        <h2>Obrigado(a) por participar! 🎉</h2>
        <p>Suas avaliações foram registradas de forma totalmente anônima. Nenhuma informação gravada permite associar essas respostas a você.</p>
      </div>
    </div>
  </div>

  <!-- MODAL DE ANONIMATO (uma vez por navegador) -->
  <div id="anonModal" class="modal-overlay hidden">
    <div class="modal-box">
      <h3>🔒 Sua resposta é 100% anônima</h3>
      <p class="modal-subtitle">Antes de começar, entenda como protegemos sua identidade nesta pesquisa.</p>
      <ul class="modal-list">
        <li><strong>Não gravamos quem você é</strong>Sua resposta não fica vinculada ao seu nome, e-mail ou área avaliadora.</li>
        <li><strong>k = 5 — anonimato por grupo</strong>Resultados só aparecem para o RH quando uma área tem pelo menos 5 respostas.</li>
        <li><strong>Comentários liberados só depois</strong>Os textos abertos ficam ocultos até o ciclo ser encerrado, embaralhados em ordem aleatória.</li>
      </ul>
      <div class="modal-actions">
        <button class="btn btn-confirm" onclick="closeAnonModal()">Entendi, começar</button>
      </div>
    </div>
  </div>

  <!-- MODAL DE CONFIRMAÇÃO DE ENVIO -->
  <div id="confirmModal" class="modal-overlay hidden">
    <div class="modal-box">
      <h3>🔒 Enviar respostas?</h3>
      <p class="modal-body-text">Suas respostas serão gravadas anonimamente e não poderão ser alteradas depois. Após o envio sua identidade não é mais associada a nenhuma resposta.</p>
      <div class="modal-actions">
        <button class="btn btn-prev" style="flex:1" onclick="closeConfirmModal()">Cancelar</button>
        <button class="btn btn-confirm" id="btnConfirmSubmit" onclick="confirmSubmit()">Confirmar envio 🔒</button>
      </div>
    </div>
  </div>

  <script>
    const AREAS = [
      "Planejamento & Gestão",
      "Administrativo/Secretarias",
      "Arquitetura",
      "Comercial/Marketing",
      "Diretoria",
      "Engenharia",
      "Facilities",
      "Financeiro/Contábil",
      "Jurídico",
      "Propriedades",
      "Recursos Humanos",
      "Tecnologia da Informação"
    ];

    // 8 perguntas objetivas + 2 comentários, na mesma ordem e textos do projeto original
    const QUESTIONS = [
      { type: "rating", secao: "Comunicação", texto: "Como você avalia a clareza da comunicação dessa área?", familia: "satisfacao" },
      { type: "rating", secao: "Comunicação", texto: "Como você avalia a cordialidade dessa área?", familia: "satisfacao" },
      { type: "rating", secao: "Comunicação", texto: "Como você avalia a transparência da comunicação dessa área?", familia: "satisfacao" },
      { type: "rating", secao: "Agilidade (SLA)", texto: "Como você avalia a velocidade de resposta dessa área?", familia: "satisfacao" },
      { type: "rating", secao: "Agilidade (SLA)", texto: "Como você avalia o cumprimento dos prazos acordados por essa área?", familia: "satisfacao" },
      { type: "rating", secao: "Qualidade de entrega", texto: "Como você avalia a assertividade e a qualidade das soluções entregues por essa área?", familia: "satisfacao" },
      { type: "rating", secao: "Parceria e colaboração", texto: "O quanto você sente que essa área atua como uma parceira estratégica do seu setor?", familia: "concordancia" },
      { type: "rating", secao: "Grau de esforço", texto: "Esta área simplifica a resolução dos problemas ou solicitações do meu setor?", familia: "concordancia" },
      { type: "text", secao: "Comentários", texto: "O que esta área faz muito bem?", placeholder: "Ex.: a área é muito ágil e me responde sempre no mesmo dia." },
      { type: "text", secao: "Comentários", texto: "O que esta área poderia melhorar na interação com o seu setor?", placeholder: "Ex.: alinhar prazos antes de iniciar uma demanda nova." }
    ];

    const EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];
    const LABELS_SAT = ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"];
    const LABELS_CON = ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"];
    const MIN_CHARS = 3;
    const STORAGE_SEEN_KEY = 'anon_intro_seen_pesquisa_360';
    const STORAGE_DONE_KEY = 'submitted_pesquisa_360';
    const ANON_TIP_HTML = '<div class="anon-tip">🛡️ <strong>Dica de anonimato:</strong> não inclua nomes, e-mails ou telefones. Os textos só serão lidos pelo RH depois do ciclo encerrar, em ordem aleatória.</div>';

    let currentStep = 0;
    let suaArea = '';
    let orderedAreas = []; // sua área primeiro, depois as demais em ordem alfabética
    const answers = {}; // "questionIdx_areaIdx" -> "1".."5" | "na" | texto

    function safeStorageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeStorageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

    const chipsContainer = document.getElementById('areaChips');
    AREAS.forEach(area => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.area = area;
      chip.textContent = area;
      chip.addEventListener('click', () => {
        document.querySelectorAll('#areaChips .chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        suaArea = area;
        const outras = AREAS.filter(a => a !== area).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        orderedAreas = [area, ...outras];
        document.getElementById('cardSuaArea').textContent = area;
        document.getElementById('cardAreasAvaliar').textContent = outras.length;
        document.getElementById('btnStart').disabled = false;
      });
      chipsContainer.appendChild(chip);
    });

    function updateProgress() {
      const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
    }

    function isAreaAnswered(stepIdx, areaIdx) {
      const q = QUESTIONS[stepIdx];
      const key = stepIdx + '_' + areaIdx;
      if (q.type === 'rating') return !!answers[key];
      return ((answers[key] || '').trim().length >= MIN_CHARS);
    }

    function updateAnsweredCount() {
      const answered = orderedAreas.filter((_, i) => isAreaAnswered(currentStep, i)).length;
      const el = document.getElementById('answeredCount');
      el.textContent = answered + '/' + orderedAreas.length;
      el.classList.toggle('complete', answered === orderedAreas.length);
    }

    function renderStep() {
      const q = QUESTIONS[currentStep];

      document.getElementById('stepLabel').textContent = 'Etapa ' + (currentStep + 1) + ' de ' + QUESTIONS.length;

      if (q.type === 'rating') {
        const ratingIdx = QUESTIONS.slice(0, currentStep + 1).filter(x => x.type === 'rating').length;
        const totalRating = QUESTIONS.filter(x => x.type === 'rating').length;
        document.getElementById('sectionLabel').textContent = q.secao + ' · Pergunta ' + ratingIdx + ' de ' + totalRating;
      } else {
        const textIdx = QUESTIONS.slice(0, currentStep + 1).filter(x => x.type === 'text').length;
        const totalText = QUESTIONS.filter(x => x.type === 'text').length;
        document.getElementById('sectionLabel').textContent = q.secao + ' · Comentário ' + textIdx + ' de ' + totalText;
      }

      document.getElementById('questionText').textContent = q.texto;
      document.getElementById('anonTipHolder').innerHTML = q.type === 'text' ? ANON_TIP_HTML : '';

      const container = document.getElementById('questionsContainer');
      container.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'question-card';

      if (q.type === 'rating') {
        const labels = q.familia === 'satisfacao' ? LABELS_SAT : LABELS_CON;

        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;
          const answered = !!answers[key];

          const row = document.createElement('div');
          row.className = 'area-row' + (isSelf ? ' self' : '') + (answered ? ' answered' : '');
          row.innerHTML = \`
            <div class="area-row-title">\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}\${answered ? '<span class="check-ok">✓</span>' : ''}</div>
            <div class="scale-labels"><span class="lo">😞 \${labels[0]}</span><span class="hi">\${labels[4]} 😄</span></div>
            <div class="rating-group" data-key="\${key}">
              \${EMOJIS.map((emoji, i) => \`
                <button type="button" class="emoji-btn" data-value="\${i + 1}" data-nota="\${i + 1}" data-key="\${key}"><span class="em">\${emoji}</span><span class="num">\${i + 1}</span></button>
              \`).join('')}
            </div>
            <button type="button" class="emoji-btn na-btn" data-value="na" data-key="\${key}">N/A — não tenho interação com essa área</button>
          \`;
          wrapper.appendChild(row);
        });

        container.appendChild(wrapper);

        wrapper.querySelectorAll('.emoji-btn').forEach(btn => {
          const key = btn.dataset.key;
          const value = btn.dataset.value;
          if (answers[key] === value) btn.classList.add('selected');
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('[data-key="' + key + '"]').forEach(b => { if (b.classList.contains('emoji-btn')) b.classList.remove('selected'); });
            btn.classList.add('selected');
            answers[key] = value;
            const row = btn.closest('.area-row');
            if (row) {
              row.classList.add('answered');
              const title = row.querySelector('.area-row-title');
              if (title && !title.querySelector('.check-ok')) {
                const chk = document.createElement('span');
                chk.className = 'check-ok';
                chk.textContent = '✓';
                title.appendChild(chk);
              }
            }
            updateAnsweredCount();
            updateNextButtonState();
          });
        });
      } else {
        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;
          const currentVal = answers[key] || '';

          const row = document.createElement('div');
          row.className = 'area-row' + (isSelf ? ' self' : '');
          row.innerHTML = \`
            <div class="area-row-title">\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
            <textarea data-key="\${key}" placeholder="\${q.placeholder}">\${currentVal}</textarea>
            <div class="char-counter" data-counter-for="\${key}">\${currentVal.trim().length} / \${MIN_CHARS} mín.</div>
          \`;
          wrapper.appendChild(row);
        });

        container.appendChild(wrapper);

        wrapper.querySelectorAll('textarea[data-key]').forEach(ta => {
          const key = ta.dataset.key;
          updateCharCounter(key, ta.value);
          ta.addEventListener('input', () => {
            answers[key] = ta.value;
            updateCharCounter(key, ta.value);
            updateAnsweredCount();
            updateNextButtonState();
          });
        });
      }

      const isLast = currentStep === QUESTIONS.length - 1;
      document.getElementById('btnPrev').classList.toggle('hidden', currentStep === 0);
      document.getElementById('btnNext').classList.toggle('hidden', isLast);
      document.getElementById('btnSubmit').classList.toggle('hidden', !isLast);

      updateAnsweredCount();
      updateNextButtonState();
      updateProgress();
    }

    function updateCharCounter(key, value) {
      const el = document.querySelector('[data-counter-for="' + key + '"]');
      if (!el) return;
      const len = value.trim().length;
      el.textContent = len + ' / ' + MIN_CHARS + ' mín.';
      el.classList.toggle('ok', len >= MIN_CHARS);
    }

    function stepIsComplete(stepIdx) {
      return orderedAreas.every((_, i) => isAreaAnswered(stepIdx, i));
    }

    function updateNextButtonState() {
      const complete = stepIsComplete(currentStep);
      document.getElementById('btnNext').disabled = !complete;
      document.getElementById('btnSubmit').disabled = !complete;
    }

    function startSurvey() {
      document.getElementById('stageIntro').classList.add('hidden');
      document.getElementById('stageSurvey').classList.remove('hidden');
      currentStep = 0;
      renderStep();
    }

    function nextStep() {
      if (!stepIsComplete(currentStep)) {
        alert('Por favor, responda para todas as áreas antes de continuar');
        return;
      }
      if (currentStep < QUESTIONS.length - 1) {
        currentStep++;
        renderStep();
        window.scrollTo(0, 0);
      }
    }

    function previousStep() {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
        window.scrollTo(0, 0);
      }
    }

    function openConfirmModal() {
      if (!stepIsComplete(currentStep)) {
        alert('Por favor, responda para todas as áreas antes de enviar');
        return;
      }
      document.getElementById('confirmModal').classList.remove('hidden');
    }

    function closeConfirmModal() { document.getElementById('confirmModal').classList.add('hidden'); }

    function confirmSubmit() {
      const btn = document.getElementById('btnConfirmSubmit');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const avaliacoes = orderedAreas.map((area, areaIdx) => {
        const respostas = {};
        const abertas = {};
        QUESTIONS.forEach((q, qIdx) => {
          const val = answers[qIdx + '_' + areaIdx];
          if (q.type === 'rating') {
            respostas['q' + qIdx] = val || 'na';
          } else {
            abertas['q' + qIdx] = (val || '').trim();
          }
        });
        return { area_avaliada: area, is_autoavaliacao: areaIdx === 0, respostas: respostas, abertas: abertas };
      });

      const data = { pesquisa_id: 'pesquisa_360', avaliacoes: avaliacoes, timestamp: new Date().toISOString() };

      google.script.run.withSuccessHandler(() => {
        safeStorageSet(STORAGE_DONE_KEY, '1');
        document.getElementById('confirmModal').classList.add('hidden');
        document.getElementById('stageSurvey').classList.add('hidden');
        document.getElementById('stageSuccess').classList.remove('hidden');
      }).withFailureHandler((error) => {
        console.error('Erro:', error);
        btn.disabled = false;
        btn.textContent = 'Confirmar envio 🔒';
        alert('Erro ao salvar: ' + error);
      }).submitForm(data);
    }

    function closeAnonModal() {
      safeStorageSet(STORAGE_SEEN_KEY, '1');
      document.getElementById('anonModal').classList.add('hidden');
    }

    // ==== Inicialização ====
    if (safeStorageGet(STORAGE_DONE_KEY)) {
      document.getElementById('stageIntro').classList.add('hidden');
      document.getElementById('stageAlreadyDone').classList.remove('hidden');
    } else if (!safeStorageGet(STORAGE_SEEN_KEY)) {
      document.getElementById('anonModal').classList.remove('hidden');
    }
  </script>
</body>
</html>
  `;
}
