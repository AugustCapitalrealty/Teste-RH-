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
        message: "Resposta salva com sucesso!",
        id: result.id
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
    const result = saveResponseToSheet(data);
    return {
      success: true,
      message: "Resposta salva com sucesso!",
      id: result.id
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
 * igual à estrutura do projeto original (Lovable).
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

    .info-box ul {
      margin: 0;
      padding-left: 18px;
      line-height: 1.7;
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

    .info-card {
      background: #f7f8fa;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .info-card .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .info-card .value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .area-picker { text-align: left; margin: 24px 0; }
    .area-picker label { text-align: center; }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

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
    }

    .question-text {
      font-size: 19px;
      font-weight: 700;
      color: #222;
      line-height: 1.4;
    }

    /* ==== AREA CARDS ==== */
    .area-card {
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 12px;
      background: #fff;
    }

    .area-card.self {
      border-color: #667eea;
      border-width: 2px;
      background: #f8f9ff;
    }

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

    .scale-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
      margin-bottom: 6px;
    }

    .rating-group {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 6px;
    }

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

    .emoji-btn.selected {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }

    .na-btn {
      width: 100%;
      padding: 6px !important;
      font-size: 11px;
      font-weight: 500;
      border-style: dashed !important;
      color: #999;
    }

    .na-btn.selected {
      background: #f0f0f0 !important;
      border-color: #666 !important;
      color: #333;
    }

    /* ==== NAVIGATION ==== */
    .navigation {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: space-between;
    }

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

    .btn-next, .btn-submit {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      flex: 1;
    }

    .btn-next:hover:not(:disabled), .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .success-message {
      display: none;
      text-align: center;
      padding: 40px;
    }

    .success-message h2 { font-size: 32px; color: #4caf50; margin-bottom: 15px; }
    .success-message p { font-size: 16px; color: #666; line-height: 1.6; }

    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

    <!-- INTRO -->
    <div id="stageIntro" class="stage-intro">
      <h1>📊 Pesquisa RH 360º</h1>
      <div class="badges">
        <span class="badge badge-green">🛡️ Pesquisa Anônima</span>
        <span class="badge badge-blue">🏢 Capital Realty</span>
      </div>

      <h2>Pesquisa de Satisfação Interdepartamental</h2>
      <p>Avalie todas as áreas com as quais você interage. Suas respostas são totalmente anônimas.</p>

      <div class="info-box">
        <strong>⚙️ COMO FUNCIONA</strong>
        <ul>
          <li>Cada tela tem <strong>1 pergunta</strong>, respondida para <strong>todas as áreas</strong></li>
          <li>Selecione a opção que melhor representa sua experiência 😞 😕 😐 🙂 😄 — ou <strong>N/A</strong> se você não tem interação com aquela área</li>
          <li><strong>Autoavaliação:</strong> você também avalia a sua própria área</li>
          <li>São <strong>8 perguntas objetivas</strong> + <strong>2 comentários</strong></li>
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

      <div id="questionsContainer"></div>

      <div class="navigation">
        <button class="btn btn-prev" id="btnPrev" onclick="previousStep()">← Anterior</button>
        <button class="btn btn-next" id="btnNext" onclick="nextStep()">Próximo →</button>
        <button class="btn btn-submit hidden" id="btnSubmit" onclick="submitSurvey()">Enviar</button>
      </div>
    </div>

    <!-- SUCCESS -->
    <div id="stageSuccess" class="success-message">
      <h2>🎉 Obrigado!</h2>
      <p>Sua resposta foi registrada com sucesso.</p>
      <p style="margin-top: 20px; font-size: 14px; color: #999;">Sua contribuição é valiosa para melhorar nossos processos.</p>
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

    // 8 perguntas objetivas + 2 comentários, na mesma ordem do projeto original
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

    let currentStep = 0;
    let suaArea = '';
    let orderedAreas = []; // sua área primeiro, depois as demais
    const answers = {}; // "questionIdx_areaIdx" -> "1".."5" | "na" | texto

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
        orderedAreas = [area, ...AREAS.filter(a => a !== area)];
        document.getElementById('cardSuaArea').textContent = area;
        document.getElementById('cardAreasAvaliar').textContent = (AREAS.length - 1);
        document.getElementById('btnStart').disabled = false;
      });
      chipsContainer.appendChild(chip);
    });

    function updateProgress() {
      const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
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
        document.getElementById('sectionLabel').textContent = q.secao + ' · ' + textIdx + ' de ' + totalText;
      }

      document.getElementById('questionText').textContent = q.texto;

      const container = document.getElementById('questionsContainer');
      container.innerHTML = '';

      const answeredCountEl = document.getElementById('answeredCount');

      if (q.type === 'rating') {
        const labels = q.familia === 'satisfacao' ? LABELS_SAT : LABELS_CON;
        answeredCountEl.classList.remove('hidden');
        answeredCountEl.textContent = '0/' + orderedAreas.length;

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

        updateAnsweredCount();
      } else {
        answeredCountEl.classList.add('hidden');

        orderedAreas.forEach((area, areaIdx) => {
          const isSelf = areaIdx === 0;
          const key = currentStep + '_' + areaIdx;

          const card = document.createElement('div');
          card.className = 'area-card' + (isSelf ? ' self' : '');
          card.innerHTML = \`
            <div class="area-card-title">\${area}\${isSelf ? '<span class="self-badge">Sua área</span>' : ''}</div>
            <textarea data-key="\${key}" placeholder="\${q.placeholder}">\${answers[key] || ''}</textarea>
          \`;
          container.appendChild(card);
        });

        document.querySelectorAll('textarea[data-key]').forEach(ta => {
          ta.addEventListener('input', () => {
            answers[ta.dataset.key] = ta.value;
          });
        });
      }

      const isLast = currentStep === QUESTIONS.length - 1;
      document.getElementById('btnPrev').classList.toggle('hidden', currentStep === 0);
      document.getElementById('btnNext').classList.toggle('hidden', isLast);
      document.getElementById('btnSubmit').classList.toggle('hidden', !isLast);

      updateNextButtonState();
      updateProgress();
    }

    function updateAnsweredCount() {
      const q = QUESTIONS[currentStep];
      if (q.type !== 'rating') return;
      const answered = orderedAreas.filter((_, i) => answers[currentStep + '_' + i]).length;
      document.getElementById('answeredCount').textContent = answered + '/' + orderedAreas.length;
    }

    function stepIsComplete(stepIdx) {
      const q = QUESTIONS[stepIdx];
      if (q.type !== 'rating') return true; // comentários são opcionais
      return orderedAreas.every((_, i) => !!answers[stepIdx + '_' + i]);
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

    function submitSurvey() {
      if (!stepIsComplete(currentStep)) {
        alert('Por favor, responda para todas as áreas antes de enviar');
        return;
      }

      // Monta avaliações por área: cada área recebe suas notas e seus comentários
      const avaliacoes = orderedAreas.map((area, areaIdx) => {
        const respostas = {};
        const abertas = {};
        QUESTIONS.forEach((q, qIdx) => {
          const val = answers[qIdx + '_' + areaIdx];
          if (q.type === 'rating') {
            respostas['q' + qIdx] = val || 'na';
          } else {
            abertas['q' + qIdx] = val || '';
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
        sua_area: suaArea,
        avaliacoes: avaliacoes,
        timestamp: new Date().toISOString()
      };

      document.getElementById('stageSurvey').classList.add('hidden');
      document.getElementById('stageSuccess').classList.remove('hidden');

      google.script.run.withSuccessHandler(() => {
        console.log('Resposta salva');
      }).withFailureHandler((error) => {
        console.error('Erro:', error);
        alert('Erro ao salvar: ' + error);
      }).submitForm(data);
    }
  </script>
</body>
</html>
  `;
}
