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
    const result = saveResponseToSheet(data);

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
 * réplica o mais fiel possível do fluxo de resposta do projeto original (Lovable),
 * adaptado para funcionar sem login (Google Apps Script + Sheets).
 */
function getFormHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesquisa RH 360º - Capital Realty</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 760px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      padding: 40px;
      position: relative;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s;
    }

    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 10px;
      font-size: 24px;
    }

    .stage-intro { text-align: center; }

    .stage-intro h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 8px;
    }

    .stage-intro p {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .info-box {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 15px 15px 15px 30px;
      margin: 20px 0;
      border-radius: 6px;
      font-size: 13px;
      color: #555;
      text-align: left;
    }

    .info-box strong {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-size: 13px;
      letter-spacing: 0.03em;
    }

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

    .badges {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      cursor: help;
    }

    .badge-green { background: #e8f7ee; color: #1e8a4c; }
    .badge-blue { background: #eef1fb; color: #3d4b9c; }

    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin: 20px 0;
      text-align: left;
    }

    .info-card { background: #f7f8fa; border-radius: 10px; padding: 12px 14px; }

    .info-card .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .info-card .value { font-size: 14px; font-weight: 600; color: #333; }

    .area-picker { text-align: left; margin: 24px 0; }
    .area-picker label { text-align: center; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

    .chip {
      padding: 8px 16px;
      border: 1.5px solid #ddd;
      border-radius: 999px;
      background: white;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      color: #444;
    }

    .chip:hover { border-color: #667eea; color: #667eea; }

    .chip.selected {
      background: #667eea;
      border-color: #667eea;
      color: white;
      font-weight: 600;
    }

    label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: #333;
      font-size: 15px;
    }

    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      height: 80px;
      transition: border-color 0.2s;
    }

    textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .char-counter {
      font-size: 11px;
      color: #999;
      text-align: right;
      margin-top: 4px;
    }

    .char-counter.ok { color: #1e8a4c; }

    /* ==== SURVEY STEP HEADER ==== */
    .step-header { margin-bottom: 18px; }

    .step-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .step-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #999;
      text-transform: uppercase;
    }

    .section-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #667eea;
      text-transform: uppercase;
    }

    .answered-count {
      font-size: 11px;
      color: #999;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 999px;
      transition: all 0.2s;
    }

    .answered-count.complete { background: #e8f7ee; color: #1e8a4c; font-weight: 700; }

    .question-text { font-size: 19px; font-weight: 700; color: #222; line-height: 1.4; }

    /* ==== AREA CARDS ==== */
    .area-card {
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 12px;
      background: #fff;
    }

    .area-card.self { border-color: #667eea; border-width: 2px; background: #f8f9ff; }

    .area-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .self-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .scale-labels { display: flex; justify-content: space-between; font-size: 10px; color: #999; margin-bottom: 6px; }

    .rating-group { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 6px; }

    .emoji-btn {
      background: white;
      border: 2px solid #e0e0e0;
      padding: 8px 4px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      color: #555;
    }

    .emoji-btn span.em { font-size: 18px; }

    .emoji-btn:hover { border-color: #667eea; background: #f8f9ff; }

    .emoji-btn.selected { border-color: #667eea; background: #667eea; color: white; }

    .na-btn {
      width: 100%;
      padding: 6px !important;
      font-size: 11px;
      font-weight: 500;
      border-style: dashed !important;
      color: #999;
    }

    .na-btn.selected { background: #f0f0f0 !important; border-color: #666 !important; color: #333; }

    /* ==== NAVIGATION ==== */
    .navigation { display: flex; gap: 12px; margin-top: 24px; justify-content: space-between; }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-prev { background: #f0f0f0; color: #333; }
    .btn-prev:hover { background: #e0e0e0; }

    .btn-next, .btn-submit, .btn-confirm {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      flex: 1;
    }

    .btn-next:hover:not(:disabled), .btn-submit:hover:not(:disabled), .btn-confirm:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .footer-disclaimer {
      margin-top: 18px;
      font-size: 11.5px;
      color: #999;
      text-align: center;
      line-height: 1.5;
    }

    .success-message { display: none; text-align: center; padding: 40px; }
    .success-message h2 { font-size: 28px; color: #4caf50; margin-bottom: 15px; }
    .success-message p { font-size: 15px; color: #666; line-height: 1.6; }

    .already-done { display: none; text-align: center; padding: 40px; }
    .already-done h2 { font-size: 24px; color: #333; margin-bottom: 12px; }
    .already-done p { font-size: 15px; color: #666; line-height: 1.6; }

    /* ==== MODALS ==== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 50;
    }

    .modal-box {
      background: white;
      border-radius: 14px;
      max-width: 440px;
      width: 100%;
      padding: 28px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    }

    .modal-box h3 { font-size: 19px; color: #222; margin-bottom: 6px; }
    .modal-subtitle { font-size: 13px; color: #777; margin-bottom: 18px; line-height: 1.5; }

    .modal-list { list-style: none; margin-bottom: 20px; }

    .modal-list li {
      font-size: 13px;
      color: #444;
      line-height: 1.5;
      margin-bottom: 12px;
      padding-left: 22px;
      position: relative;
    }

    .modal-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #1e8a4c;
      font-weight: 700;
    }

    .modal-list li strong { color: #222; display: block; }

    .modal-body-text { font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 20px; }

    .modal-actions { display: flex; gap: 10px; }

    .hidden { display: none; }
  </style>
</head>
<body>
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

    function safeStorageGet(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeStorageSet(key, value) {
      try { localStorage.setItem(key, value); } catch (e) {}
    }

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

      if (q.type === 'rating') {
        const labels = q.familia === 'satisfacao' ? LABELS_SAT : LABELS_CON;

        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;

          const card = document.createElement('div');
          card.className = 'area-card' + (isSelf ? ' self' : '');
          card.innerHTML = \`
            <div class="area-card-title">\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
            <div class="scale-labels"><span>\${labels[0]}</span><span>\${labels[4]}</span></div>
            <div class="rating-group" data-key="\${key}">
              \${EMOJIS.map((emoji, i) => \`
                <button type="button" class="emoji-btn" data-value="\${i + 1}" data-key="\${key}"><span class="em">\${emoji}</span><span>\${i + 1}</span></button>
              \`).join('')}
            </div>
            <button type="button" class="emoji-btn na-btn" data-value="na" data-key="\${key}">N/A — não tenho interação com essa área</button>
          \`;
          container.appendChild(card);
        });

        document.querySelectorAll('.emoji-btn').forEach(btn => {
          const key = btn.dataset.key;
          const value = btn.dataset.value;
          if (answers[key] === value) btn.classList.add('selected');
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll(\`[data-key="\${key}"]\`).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            answers[key] = value;
            updateAnsweredCount();
            updateNextButtonState();
          });
        });
      } else {
        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;
          const currentVal = answers[key] || '';

          const card = document.createElement('div');
          card.className = 'area-card' + (isSelf ? ' self' : '');
          card.innerHTML = \`
            <div class="area-card-title">\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
            <textarea data-key="\${key}" placeholder="\${q.placeholder}">\${currentVal}</textarea>
            <div class="char-counter" data-counter-for="\${key}">\${currentVal.trim().length} / \${MIN_CHARS} mín.</div>
          \`;
          container.appendChild(card);
        });

        document.querySelectorAll('textarea[data-key]').forEach(ta => {
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

    function closeConfirmModal() {
      document.getElementById('confirmModal').classList.add('hidden');
    }

    function confirmSubmit() {
      const btn = document.getElementById('btnConfirmSubmit');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      // Monta avaliações por área: cada área recebe suas notas e seus comentários
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
        return {
          area_avaliada: area,
          is_autoavaliacao: areaIdx === 0,
          respostas: respostas,
          abertas: abertas
        };
      });

      const data = {
        pesquisa_id: 'pesquisa_360',
        avaliacoes: avaliacoes,
        timestamp: new Date().toISOString()
      };

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
