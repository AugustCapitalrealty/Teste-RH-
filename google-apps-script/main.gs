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

    if (!data.pesquisa_id || !data.avaliacoes) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Dados inválidos" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    saveResponseToSheet(data);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: "Resposta salva com sucesso!" })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro ao processar formulário: " + error);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função chamada do formulário HTML via google.script.run
 */
function submitForm(data) {
  try {
    saveResponseToSheet(data);
    return { success: true, message: "Resposta salva com sucesso!" };
  } catch (error) {
    Logger.log("Erro ao salvar resposta: " + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Retorna o HTML do formulário — layout "uma pergunta por tela, todas as áreas de uma vez",
 * réplica o mais fiel possível do fluxo de resposta do projeto original (Lovable):
 * paleta navy #151E49, fundo cinza claro, escala emoji compacta com cores 1-5 (vermelho→verde),
 * header fixo com progresso + %, animações, foco acessível (aria + focus ring), autosave de rascunho.
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
      --navy-20: rgba(21,30,73,0.20);
      --navy-40: rgba(21,30,73,0.40);
      --bg: #F6F7F9;
      --card: #FFFFFF;
      --border: #DADFE7;
      --muted: #EAEDF1;
      --muted-fg: #657386;
      --success: #21C45D;
      --ring: #065CA9;
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
      z-index: 20;
    }

    .topnav-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }

    .brand-logo {
      width: 34px; height: 34px; border-radius: 8px;
      background: var(--navy); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 15px;
    }

    .brand-name { font-size: 14px; font-weight: 600; letter-spacing: 0.01em; color: var(--navy); line-height: 1.2; }
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

    /* ==== STICKY STEP HEADER ==== */
    .survey-sticky {
      position: sticky;
      top: 58px;
      z-index: 9;
      background: rgba(255,255,255,0.92);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
      margin: -24px -24px 16px;
      padding: 14px 24px 12px;
      border-bottom: 1px solid var(--border);
    }

    .step-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .step-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted-fg); text-transform: uppercase; }
    .step-pct { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted-fg); }

    .progress-bar { width: 100%; height: 8px; background: var(--navy-20); border-radius: 999px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--navy); border-radius: 999px; transition: width 0.3s; }

    .section-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
    .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted-fg); text-transform: uppercase; }

    .answered-count {
      font-size: 11px; color: var(--muted-fg);
      background: var(--muted);
      padding: 4px 10px; border-radius: 999px;
      transition: all 0.2s;
    }
    .answered-count.complete { background: #e8f7ee; color: #1e8a4c; font-weight: 700; }

    .question-text { font-size: 18px; font-weight: 600; color: var(--navy); line-height: 1.375; }

    /* ==== INTRO ==== */
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
      padding: 4px 12px; border-radius: 999px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
      cursor: help;
    }
    .badge-green { background: #e8f7ee; color: #1e8a4c; }
    .badge-blue { background: var(--navy-10); color: var(--navy); }

    .info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 20px 0; text-align: left; }
    .info-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
    .info-card .label { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted-fg); text-transform: uppercase; margin-bottom: 4px; }
    .info-card .value { font-size: 14px; font-weight: 600; color: var(--navy); }

    .area-picker { text-align: left; margin: 24px 0; }
    .area-picker label { text-align: center; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .chip {
      padding: 8px 16px; border: 1.5px solid var(--border); border-radius: 999px;
      background: #fff; font-family: inherit; font-size: 13px; cursor: pointer;
      transition: all 0.15s; color: #444;
    }
    .chip:hover { border-color: var(--navy); color: var(--navy); }
    .chip.selected { background: var(--navy); border-color: var(--navy); color: #fff; font-weight: 600; }

    label { display: block; margin-bottom: 12px; font-weight: 600; color: var(--navy); font-size: 15px; }

    textarea {
      width: 100%; padding: 8px 12px;
      border: 1px solid var(--border); border-radius: 10px;
      font-family: inherit; font-size: 14px; resize: vertical; height: 64px;
      transition: border-color 0.2s;
    }
    textarea:focus-visible { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px rgba(6,92,169,.15); }

    .char-counter { font-size: 10px; font-weight: 600; color: var(--muted-fg); text-align: right; margin-top: 4px; }
    .char-counter.ok { color: var(--success); }

    /* ==== QUESTION CARD ==== */
    .question-card { border: 1px solid var(--border); border-radius: 16px; background: var(--card); overflow: hidden; }

    .area-row { padding: 8px 12px; border-top: 1px solid var(--border); background: transparent; transition: background 0.15s; }
    .area-row:first-child { border-top: none; }
    .area-row.self { background: var(--navy-04); border-left: 4px solid var(--navy); }
    .area-row.answered { background: rgba(33,196,93,0.03); }

    .area-row-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--navy); margin-bottom: 8px; }

    .self-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
      background: var(--navy-10); color: var(--navy); padding: 2px 6px; border-radius: 4px;
    }
    .check-ok { color: var(--success); font-weight: 700; font-size: 13px; margin-left: auto; }

    .scale-labels { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; font-size: 11px; font-weight: 700; color: var(--muted-fg); margin-bottom: 6px; }
    .scale-labels .lo { grid-column: span 2; }
    .scale-labels .hi { grid-column: span 3; text-align: right; }

    .rating-group { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 6px; }

    .emoji-btn {
      display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;
      padding: 4px; border: 2px solid var(--border); border-radius: 12px;
      background: #fff; font-family: inherit; color: var(--muted-fg);
      cursor: pointer; transition: all 0.15s;
    }
    .emoji-btn span.em { font-size: 18px; line-height: 1; filter: grayscale(40%); transition: filter 0.15s, transform 0.15s; }
    .emoji-btn span.num { font-size: 10px; font-weight: 700; color: var(--muted-fg); }

    .emoji-btn:hover { transform: scale(1.05); border-color: var(--navy-40); }
    .emoji-btn:hover span.em { filter: grayscale(0); transform: scale(1.1); }
    .emoji-btn:active { transform: scale(0.95); }

    .emoji-btn.selected { color: #fff; transform: scale(1.05); box-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1); }
    .emoji-btn.selected span.em { filter: none; animation: scale-in 0.2s ease-out; }
    .emoji-btn.selected span.num { color: rgba(255,255,255,.95); }
    .emoji-btn.selected[data-nota="1"] { background: var(--e1); border-color: var(--e1); }
    .emoji-btn.selected[data-nota="2"] { background: var(--e2); border-color: var(--e2); }
    .emoji-btn.selected[data-nota="3"] { background: var(--e3); border-color: var(--e3); }
    .emoji-btn.selected[data-nota="4"] { background: var(--e4); border-color: var(--e4); }
    .emoji-btn.selected[data-nota="5"] { background: var(--e5); border-color: var(--e5); }

    .na-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 4px 8px; border: 2px dashed var(--border); border-radius: 12px;
      background: transparent; font-family: inherit; font-size: 11px; font-weight: 600;
      color: var(--muted-fg); cursor: pointer; transition: all 0.15s;
    }
    .na-btn:hover { border-color: var(--muted-fg); }
    .na-btn.selected { background: var(--muted); color: var(--navy); border-color: rgba(101,115,134,.6); }
    .na-btn strong { font-weight: 700; }
    .na-btn .na-tail { opacity: 0.7; }

    /* ==== FOCUS RINGS ==== */
    .emoji-btn:focus-visible, .na-btn:focus-visible, .chip:focus-visible, .btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--ring);
    }

    /* ==== NAVIGATION ==== */
    .navigation { display: flex; gap: 12px; margin-top: 24px; justify-content: space-between; }
    .btn { padding: 12px 24px; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }

    .btn-prev { background: transparent; border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(0,0,0,.05); color: var(--navy); }
    .btn-prev:hover:not(:disabled) { background: var(--muted); }

    .btn-next, .btn-submit, .btn-confirm { background: var(--navy); color: #fff; flex: 1; }
    .btn-next:hover:not(:disabled), .btn-submit:hover:not(:disabled), .btn-confirm:hover:not(:disabled) { background: #0e1533; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .footer-disclaimer { margin-top: 18px; font-size: 11px; color: var(--muted-fg); text-align: center; line-height: 1.5; }

    .success-message { text-align: center; padding: 40px; }
    .success-message .big-emoji { font-size: 56px; margin-bottom: 12px; }
    .success-message h2 { font-size: 26px; color: var(--navy); margin-bottom: 15px; font-weight: 700; }
    .success-message p { font-size: 15px; color: var(--muted-fg); line-height: 1.6; }

    .already-done { text-align: center; padding: 40px; }
    .already-done h2 { font-size: 22px; color: var(--navy); margin-bottom: 12px; font-weight: 700; }
    .already-done p { font-size: 15px; color: var(--muted-fg); line-height: 1.6; }

    /* ==== MODALS ==== */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
      animation: overlay-in 0.2s ease-out;
    }
    .modal-box {
      background: #fff; border-radius: 12px; max-width: 512px; width: 100%; padding: 24px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      animation: modal-in 0.2s ease-out;
    }
    .modal-box h3 { font-size: 18px; color: var(--navy); margin-bottom: 6px; font-weight: 600; }
    .modal-subtitle { font-size: 13px; color: var(--muted-fg); margin-bottom: 18px; line-height: 1.5; }
    .modal-list { list-style: none; margin-bottom: 20px; }
    .modal-list li { font-size: 13px; color: #444; line-height: 1.5; margin-bottom: 12px; padding-left: 22px; position: relative; }
    .modal-list li::before { content: "✓"; position: absolute; left: 0; color: var(--success); font-weight: 700; }
    .modal-list li strong { color: var(--navy); display: block; }
    .modal-body-text { font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 20px; }
    .modal-actions { display: flex; gap: 10px; }

    @keyframes scale-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    @media (prefers-reduced-motion: reduce) {
      .emoji-btn, .emoji-btn span.em, .btn, .modal-box, .modal-overlay, .progress-fill, .area-row {
        animation: none !important; transition: none !important;
      }
      .emoji-btn:hover { transform: none; }
      .emoji-btn:hover span.em { transform: none; }
    }

    @media (min-width: 640px) {
      .emoji-btn span.em { font-size: 20px; }
    }

    @media (max-width: 640px) {
      .scale-labels { font-size: 10px; }
      .container { padding: 18px; }
      .survey-sticky { margin: -18px -18px 16px; padding: 12px 18px 10px; }
    }

    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="topnav">
    <div class="topnav-inner">
      <div class="brand-logo">CR</div>
      <div>
        <div class="brand-name">Hub de Pesquisas</div>
        <div class="brand-sub">RH · Capital Realty</div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="container">

      <!-- JÁ RESPONDEU (bloqueio local) -->
      <div id="stageAlreadyDone" class="already-done hidden">
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
          <div class="info-card"><div class="label">Sua área</div><div class="value" id="cardSuaArea">—</div></div>
          <div class="info-card"><div class="label">Áreas a avaliar</div><div class="value" id="cardAreasAvaliar">—</div></div>
          <div class="info-card"><div class="label">Autoavaliação</div><div class="value">Sua área</div></div>
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
        <div class="survey-sticky">
          <div class="step-row">
            <span class="step-label" id="stepLabel"></span>
            <span class="step-pct" id="stepPct"></span>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        </div>

        <div class="section-row">
          <span class="section-label" id="sectionLabel"></span>
          <span class="answered-count" id="answeredCount"></span>
        </div>
        <div class="question-text" id="questionText"></div>

        <div id="anonTipHolder" style="margin-top:14px;"></div>
        <div id="questionsContainer" style="margin-top:14px;"></div>

        <div class="navigation">
          <button class="btn btn-prev" id="btnPrev" onclick="previousStep()">← Anterior</button>
          <button class="btn btn-next" id="btnNext" onclick="nextStep()">Próximo →</button>
          <button class="btn btn-submit hidden" id="btnSubmit" onclick="openConfirmModal()">Enviar</button>
        </div>

        <div class="footer-disclaimer">🔒 A área que você escolheu no início serve apenas para montar sua lista de avaliação — ela nunca é gravada junto às suas respostas, notas ou comentários.</div>
      </div>

      <!-- SUCCESS -->
      <div id="stageSuccess" class="success-message hidden">
        <div class="big-emoji">🎉</div>
        <h2>Obrigado por participar!</h2>
        <p>Suas avaliações foram registradas de forma totalmente anônima. Nenhuma informação gravada permite associar essas respostas a você.</p>
        <p style="margin-top: 16px; font-weight: 600; color: var(--navy);">Sua opinião ajuda a melhorar a colaboração entre as áreas. 💜</p>
      </div>
    </div>
  </div>

  <!-- MODAL DE ANONIMATO (uma vez por navegador) -->
  <div id="anonModal" class="modal-overlay hidden">
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="anonModalTitle">
      <h3 id="anonModalTitle">🔒 Sua resposta é 100% anônima</h3>
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
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
      <h3 id="confirmModalTitle">🔒 Enviar respostas?</h3>
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
      "Deminvest",
      "Diretoria",
      "Engenharia",
      "Facilities",
      "Financeiro/Contábil",
      "Jurídico",
      "Propriedades",
      "Recursos Humanos",
      "Tecnologia da Informação"
    ];

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
    const STORAGE_DRAFT_KEY = 'draft_pesquisa_360_v2';
    const ANON_TIP_HTML = '<div class="anon-tip">🛡️ <strong>Dica de anonimato:</strong> não inclua nomes, e-mails ou telefones. Os textos só serão lidos pelo RH depois do ciclo encerrar, em ordem aleatória.</div>';
    const USERCHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#151E49" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>';

    let currentStep = 0;
    let suaArea = '';
    let orderedAreas = [];
    const answers = {};

    function safeStorageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeStorageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
    function safeStorageRemove(key) { try { localStorage.removeItem(key); } catch (e) {} }

    function buildOrderedAreas(area) {
      const outras = AREAS.filter(a => a !== area).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return [area, ...outras];
    }

    function saveDraft() {
      safeStorageSet(STORAGE_DRAFT_KEY, JSON.stringify({ suaArea: suaArea, currentStep: currentStep, answers: answers }));
    }
    function clearDraft() { safeStorageRemove(STORAGE_DRAFT_KEY); }
    function loadDraft() {
      const raw = safeStorageGet(STORAGE_DRAFT_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }

    const chipsContainer = document.getElementById('areaChips');
    AREAS.forEach(area => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.area = area;
      chip.textContent = area;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => {
        document.querySelectorAll('#areaChips .chip').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
        chip.classList.add('selected');
        chip.setAttribute('aria-pressed', 'true');
        suaArea = area;
        orderedAreas = buildOrderedAreas(area);
        document.getElementById('cardSuaArea').textContent = area;
        document.getElementById('cardAreasAvaliar').textContent = (orderedAreas.length - 1);
        document.getElementById('btnStart').disabled = false;
      });
      chipsContainer.appendChild(chip);
    });

    function updateProgress() {
      const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('stepPct').textContent = Math.round(progress) + '%';
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
      const complete = answered === orderedAreas.length;
      el.textContent = (complete ? '✓ ' : '') + answered + '/' + orderedAreas.length;
      el.classList.toggle('complete', complete);
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
            <div class="area-row-title">\${isSelf ? USERCHECK_SVG : ''}\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}\${answered ? '<span class="check-ok">✓</span>' : ''}</div>
            <div class="scale-labels"><span class="lo">😞 \${labels[0]}</span><span class="hi">\${labels[4]} 😄</span></div>
            <div class="rating-group" data-key="\${key}">
              \${EMOJIS.map((emoji, i) => \`
                <button type="button" class="emoji-btn" data-value="\${i + 1}" data-nota="\${i + 1}" data-key="\${key}" aria-label="Nota \${i + 1} de 5 — \${labels[i]}" aria-pressed="false"><span class="em">\${emoji}</span><span class="num">\${i + 1}</span></button>
              \`).join('')}
            </div>
            <button type="button" class="emoji-btn na-btn" data-value="na" data-key="\${key}" aria-pressed="false" title="Sem interação com essa área"><strong>N/A</strong> <span class="na-tail">— não tenho interação com essa área</span></button>
          \`;
          wrapper.appendChild(row);
        });

        container.appendChild(wrapper);

        wrapper.querySelectorAll('.emoji-btn').forEach(btn => {
          const key = btn.dataset.key;
          const value = btn.dataset.value;
          if (answers[key] === value) { btn.classList.add('selected'); btn.setAttribute('aria-pressed', 'true'); }
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('[data-key="' + key + '"]').forEach(b => {
              if (b.classList.contains('emoji-btn')) { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); }
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-pressed', 'true');
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
            saveDraft();
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
            <div class="area-row-title">\${isSelf ? USERCHECK_SVG : ''}\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
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
            saveDraft();
          });
        });
      }

      const isLast = currentStep === QUESTIONS.length - 1;
      document.getElementById('btnPrev').disabled = (currentStep === 0);
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
      renderStep();
      saveDraft();
    }

    function nextStep() {
      if (!stepIsComplete(currentStep)) { alert('Por favor, responda para todas as áreas antes de continuar'); return; }
      if (currentStep < QUESTIONS.length - 1) {
        currentStep++;
        renderStep();
        saveDraft();
        window.scrollTo(0, 0);
      }
    }

    function previousStep() {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
        saveDraft();
        window.scrollTo(0, 0);
      }
    }

    function openConfirmModal() {
      if (!stepIsComplete(currentStep)) { alert('Por favor, responda para todas as áreas antes de enviar'); return; }
      openModal('confirmModal');
    }
    function closeConfirmModal() { closeModal('confirmModal'); }

    function confirmSubmit() {
      const btn = document.getElementById('btnConfirmSubmit');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const avaliacoes = orderedAreas.map((area, areaIdx) => {
        const respostas = {};
        const abertas = {};
        QUESTIONS.forEach((q, qIdx) => {
          const val = answers[qIdx + '_' + areaIdx];
          if (q.type === 'rating') { respostas['q' + qIdx] = val || 'na'; }
          else { abertas['q' + qIdx] = (val || '').trim(); }
        });
        return { area_avaliada: area, is_autoavaliacao: areaIdx === 0, respostas: respostas, abertas: abertas };
      });

      const data = { pesquisa_id: 'pesquisa_360', avaliacoes: avaliacoes, timestamp: new Date().toISOString() };

      google.script.run.withSuccessHandler(() => {
        safeStorageSet(STORAGE_DONE_KEY, '1');
        clearDraft();
        closeModal('confirmModal');
        document.getElementById('stageSurvey').classList.add('hidden');
        document.getElementById('stageSuccess').classList.remove('hidden');
        window.scrollTo(0, 0);
      }).withFailureHandler((error) => {
        console.error('Erro:', error);
        btn.disabled = false;
        btn.textContent = 'Confirmar envio 🔒';
        alert('Erro ao salvar: ' + error);
      }).submitForm(data);
    }

    function closeAnonModal() {
      safeStorageSet(STORAGE_SEEN_KEY, '1');
      closeModal('anonModal');
    }

    // ==== MODAIS: abertura/fechamento com Esc e foco ====
    let activeModal = null;
    function openModal(id) {
      const m = document.getElementById(id);
      m.classList.remove('hidden');
      activeModal = m;
      const focusables = m.querySelectorAll('button');
      if (focusables.length) focusables[focusables.length - 1].focus();
    }
    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
      activeModal = null;
    }
    document.addEventListener('keydown', (e) => {
      if (!activeModal) return;
      if (e.key === 'Escape') {
        // não deixa fechar o modal de anonimato sem confirmar? Lovable permite fechar; aqui só o de confirmação.
        if (activeModal.id === 'confirmModal') closeConfirmModal();
        return;
      }
      if (e.key === 'Tab') {
        const f = Array.prototype.slice.call(activeModal.querySelectorAll('button, textarea, [href], input, select'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // ==== Inicialização ====
    (function init() {
      if (safeStorageGet(STORAGE_DONE_KEY)) {
        document.getElementById('stageIntro').classList.add('hidden');
        document.getElementById('stageAlreadyDone').classList.remove('hidden');
        return;
      }
      const draft = loadDraft();
      if (draft && draft.suaArea && AREAS.indexOf(draft.suaArea) !== -1) {
        suaArea = draft.suaArea;
        orderedAreas = buildOrderedAreas(suaArea);
        if (draft.answers) Object.keys(draft.answers).forEach(k => { answers[k] = draft.answers[k]; });
        currentStep = Math.min(Math.max(draft.currentStep || 0, 0), QUESTIONS.length - 1);
        document.getElementById('stageIntro').classList.add('hidden');
        document.getElementById('stageSurvey').classList.remove('hidden');
        renderStep();
        return;
      }
      if (!safeStorageGet(STORAGE_SEEN_KEY)) {
        openModal('anonModal');
      }
    })();
  </script>
</body>
</html>
  `;
}
