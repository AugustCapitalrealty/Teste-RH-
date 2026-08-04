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

    .brand-logo-img { height: 36px; width: auto; display: block; }
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
    .survey-sticky .progress-bar { margin-bottom: 12px; }
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
    .info-box-title { display: block; margin-bottom: 8px; color: var(--navy); font-size: 13px; font-weight: 700; letter-spacing: 0.03em; }
    .info-box ul { margin: 0; padding-left: 18px; line-height: 1.7; }
    .info-box li { margin-bottom: 6px; }
    .info-box li strong { color: var(--navy); }

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
    .na-btn:disabled { cursor: default; }
    .locked-note { font-size: 11.5px; color: var(--muted-fg); font-style: italic; line-height: 1.4; padding: 2px 0 2px 0; }

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
      <img class="brand-logo-img" src="data:image/png;base64,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" alt="Capital Realty">
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
          <span class="badge badge-green" title="Impossível associar respostas a pessoas. Os resultados são sempre analisados de forma agregada, nunca individual.">🛡️ Pesquisa Anônima</span>
          <span class="badge badge-blue">🏢 Capital Realty</span>
        </div>

        <h2>Pesquisa de Satisfação Interdepartamental</h2>
        <p>Avalie todas as áreas com as quais você interage. Suas respostas são totalmente anônimas.</p>

        <div class="info-box">
          <div class="info-box-title">⚙️ COMO FUNCIONA</div>
          <ul>
            <li>Você escolhe sua área e, em seguida, <strong>com quais áreas teve interação</strong> — avalia apenas essas.</li>
            <li>Cada tela tem <strong>1 pergunta</strong>, respondida para todas as áreas que você selecionou.</li>
            <li>Selecione a opção que melhor representa sua experiência 😞 😕 😐 🙂 😄.</li>
            <li><strong>Autoavaliação:</strong> você também avalia a sua própria área, para comparar com a percepção das outras.</li>
            <li>São <strong>8 perguntas objetivas</strong> + <strong>2 comentários</strong> (opcionais na sua própria área).</li>
          </ul>
        </div>

        <div class="info-cards">
          <div class="info-card"><div class="label">Sua área</div><div class="value" id="cardSuaArea">—</div></div>
          <div class="info-card"><div class="label">Áreas a avaliar</div><div class="value">Você seleciona</div></div>
          <div class="info-card"><div class="label">Autoavaliação</div><div class="value">Sua área</div></div>
        </div>

        <div class="area-picker">
          <label>Qual é a sua área? *</label>
          <div class="chips" id="areaChips"></div>
        </div>

        <div class="navigation">
          <button class="btn btn-next" id="btnStart" onclick="goToAreas()" disabled>Continuar →</button>
        </div>
      </div>

      <!-- SELEÇÃO DE ÁREAS COM INTERAÇÃO -->
      <div id="stageAreas" class="stage-intro hidden">
        <h2>Com quais áreas você teve interação?</h2>
        <p>Selecione as áreas com as quais você <strong>interagiu no dia a dia</strong> — você vai avaliar apenas essas. A sua própria área (<span id="areasSuaArea" style="font-weight:600;">—</span>) já entra automaticamente para a autoavaliação.</p>

        <div class="area-picker">
          <div class="chips" id="interactionChips"></div>
        </div>

        <p id="interactionCount" style="font-size:12px; color: var(--muted-fg); margin-top:8px;"></p>

        <div class="navigation">
          <button class="btn btn-prev" onclick="backToIntro()">← Voltar</button>
          <button class="btn btn-next" id="btnStartSurvey" onclick="startSurvey()" disabled>Começar pesquisa →</button>
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
          <div class="section-row">
            <span class="section-label" id="sectionLabel"></span>
            <span class="answered-count" id="answeredCount"></span>
          </div>
          <div class="question-text" id="questionText"></div>
        </div>

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
        <p style="margin-top: 16px; font-weight: 600; color: var(--navy);">Sua opinião ajuda a melhorar a colaboração entre as áreas. 💙</p>
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
        <li><strong>Anonimato por grupo</strong>Os resultados são sempre analisados de forma agregada por área — nunca de forma individual.</li>
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
      "Administrativo/Secretárias",
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
    const MIN_CHARS = 3;
    const STORAGE_SEEN_KEY = 'anon_intro_seen_pesquisa_360';
    const STORAGE_DONE_KEY = 'submitted_pesquisa_360';
    const STORAGE_DRAFT_KEY = 'draft_pesquisa_360_v3';
    const ANON_TIP_HTML = '<div class="anon-tip">🛡️ <strong>Dica de anonimato:</strong> não inclua nomes, e-mails ou telefones. Os textos só serão lidos pelo RH depois do ciclo encerrar, em ordem aleatória.</div>';
    const USERCHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#151E49" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>';

    let currentStep = 0;
    let suaArea = '';
    let interacted = [];        // áreas com as quais a pessoa teve interação (selecionadas)
    let orderedAreas = [];      // [suaArea, ...interacted (ordem alfabética)]
    const answers = {};

    function safeStorageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeStorageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
    function safeStorageRemove(key) { try { localStorage.removeItem(key); } catch (e) {} }

    function buildOrderedAreas() {
      const outras = interacted.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return [suaArea, ...outras];
    }

    function saveDraft() {
      safeStorageSet(STORAGE_DRAFT_KEY, JSON.stringify({ suaArea: suaArea, interacted: interacted, currentStep: currentStep, answers: answers }));
    }
    function clearDraft() { safeStorageRemove(STORAGE_DRAFT_KEY); }
    function loadDraft() {
      const raw = safeStorageGet(STORAGE_DRAFT_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }

    // ==== Etapa 1: escolher a sua área ====
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
        document.getElementById('cardSuaArea').textContent = area;
        document.getElementById('btnStart').disabled = false;
      });
      chipsContainer.appendChild(chip);
    });

    // ==== Etapa 2: escolher as áreas com interação ====
    function goToAreas() {
      if (!suaArea) return;
      interacted = [];
      document.getElementById('areasSuaArea').textContent = suaArea;
      const cont = document.getElementById('interactionChips');
      cont.innerHTML = '';
      AREAS.filter(a => a !== suaArea).forEach(area => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.area = area;
        chip.textContent = area;
        chip.setAttribute('aria-pressed', 'false');
        chip.addEventListener('click', () => {
          const i = interacted.indexOf(area);
          if (i === -1) { interacted.push(area); chip.classList.add('selected'); chip.setAttribute('aria-pressed', 'true'); }
          else { interacted.splice(i, 1); chip.classList.remove('selected'); chip.setAttribute('aria-pressed', 'false'); }
          document.getElementById('interactionCount').textContent = interacted.length + ' área(s) selecionada(s)';
          document.getElementById('btnStartSurvey').disabled = interacted.length === 0;
        });
        cont.appendChild(chip);
      });
      document.getElementById('interactionCount').textContent = '0 área(s) selecionada(s)';
      document.getElementById('btnStartSurvey').disabled = true;
      document.getElementById('stageIntro').classList.add('hidden');
      document.getElementById('stageAreas').classList.remove('hidden');
      window.scrollTo(0, 0);
    }

    function backToIntro() {
      document.getElementById('stageAreas').classList.add('hidden');
      document.getElementById('stageIntro').classList.remove('hidden');
      window.scrollTo(0, 0);
    }

    function updateProgress() {
      const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('stepPct').textContent = Math.round(progress) + '%';
    }

    function isAreaAnswered(stepIdx, areaIdx) {
      const q = QUESTIONS[stepIdx];
      const key = stepIdx + '_' + areaIdx;
      if (q.type === 'rating') return !!answers[key];
      // Comentário: obrigatório, exceto na sua própria área (índice 0), onde é opcional
      if (areaIdx === 0) return true;
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
        const labels = LABELS_SAT; // todas as perguntas usam a escala Muito insatisfeito → Muito satisfeito

        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;
          const answered = !!answers[key];
          const titleHtml = '<div class="area-row-title">' + (isSelf ? USERCHECK_SVG : '') + area
            + (isSelf ? '<span class="self-badge">Sua área</span>' : '')
            + (answered ? '<span class="check-ok">✓</span>' : '') + '</div>';

          const row = document.createElement('div');
          row.className = 'area-row' + (isSelf ? ' self' : '') + (answered ? ' answered' : '');
          row.innerHTML = titleHtml + \`
            <div class="scale-labels"><span class="lo">😞 \${labels[0]}</span><span class="hi">\${labels[4]} 😄</span></div>
            <div class="rating-group" data-key="\${key}">
              \${EMOJIS.map((emoji, i) => \`
                <button type="button" class="emoji-btn" data-value="\${i + 1}" data-nota="\${i + 1}" data-key="\${key}" aria-label="Nota \${i + 1} de 5 — \${labels[i]}" aria-pressed="false"><span class="em">\${emoji}</span><span class="num">\${i + 1}</span></button>
              \`).join('')}
            </div>\`;
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
          const optional = isSelf; // comentário da própria área é opcional

          const counterHtml = optional
            ? '<div class="char-counter" data-counter-for="' + key + '">Opcional (sua área)</div>'
            : '<div class="char-counter" data-counter-for="' + key + '">' + currentVal.trim().length + ' / ' + MIN_CHARS + ' mín.</div>';

          const row = document.createElement('div');
          row.className = 'area-row' + (isSelf ? ' self' : '');
          row.innerHTML = \`
            <div class="area-row-title">\${isSelf ? USERCHECK_SVG : ''}\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
            <textarea data-key="\${key}" data-optional="\${optional ? '1' : '0'}" placeholder="\${optional ? 'Comentário opcional' : q.placeholder}">\${currentVal}</textarea>
          \` + counterHtml;
          wrapper.appendChild(row);
        });

        container.appendChild(wrapper);

        wrapper.querySelectorAll('textarea[data-key]').forEach(ta => {
          const key = ta.dataset.key;
          if (ta.dataset.optional !== '1') updateCharCounter(key, ta.value);
          ta.addEventListener('input', () => {
            answers[key] = ta.value;
            if (ta.dataset.optional !== '1') updateCharCounter(key, ta.value);
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
      if (!suaArea || interacted.length === 0) return;
      orderedAreas = buildOrderedAreas();
      currentStep = 0;
      document.getElementById('stageIntro').classList.add('hidden');
      document.getElementById('stageAreas').classList.add('hidden');
      document.getElementById('stageSurvey').classList.remove('hidden');
      renderStep();
      saveDraft();
      window.scrollTo(0, 0);
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
      if (draft && draft.suaArea && AREAS.indexOf(draft.suaArea) !== -1 && Array.isArray(draft.interacted) && draft.interacted.length > 0) {
        suaArea = draft.suaArea;
        interacted = draft.interacted.filter(a => AREAS.indexOf(a) !== -1 && a !== suaArea);
        orderedAreas = buildOrderedAreas();
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
