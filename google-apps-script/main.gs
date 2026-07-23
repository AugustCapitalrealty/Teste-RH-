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
    if (!data.pesquisa_id || !data.respostas) {
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
 * Retorna o HTML do formulário com navegação passo-a-passo
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
      max-width: 700px;
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
      margin-bottom: 30px;
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

    .subtitle {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
    }

    .stage-intro {
      text-align: center;
    }

    .stage-intro h2 {
      font-size: 28px;
      color: #333;
      margin-bottom: 20px;
    }

    .stage-intro p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
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

    .badge-green {
      background: #e8f7ee;
      color: #1e8a4c;
    }

    .badge-blue {
      background: #eef1fb;
      color: #3d4b9c;
    }

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

    .area-picker {
      text-align: left;
      margin: 24px 0;
    }

    .area-picker label {
      text-align: center;
    }

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

    .chip:hover {
      border-color: #667eea;
      color: #667eea;
    }

    .chip.selected {
      background: #667eea;
      border-color: #667eea;
      color: white;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 24px;
    }

    label {
      display: block;
      margin-bottom: 12px;
      font-weight: 500;
      color: #333;
      font-size: 15px;
    }

    select, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    textarea {
      resize: vertical;
      height: 100px;
    }

    .scale-labels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      font-size: 11px;
      color: #999;
      margin-bottom: 8px;
      margin-top: -6px;
    }

    .rating-group {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin: 12px 0 8px 0;
    }

    .emoji-btn {
      background: white;
      border: 2px solid #e0e0e0;
      padding: 12px 8px;
      font-size: 24px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
    }

    .emoji-btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
      transform: scale(1.05);
    }

    .emoji-btn.selected {
      border-color: #667eea;
      background: #667eea;
      transform: scale(1.1);
    }

    .na-btn {
      grid-column: 1 / -1;
      padding: 8px !important;
      font-size: 13px;
      border-style: dashed !important;
      aspect-ratio: auto;
    }

    .na-btn.selected {
      background: #f0f0f0 !important;
      border-color: #666 !important;
      color: #333;
    }

    .navigation {
      display: flex;
      gap: 12px;
      margin-top: 30px;
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

    .btn-prev {
      background: #f0f0f0;
      color: #333;
    }

    .btn-prev:hover {
      background: #e0e0e0;
    }

    .btn-next, .btn-submit {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      flex: 1;
    }

    .btn-next:hover:not(:disabled), .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .success-message {
      display: none;
      text-align: center;
      padding: 40px;
    }

    .success-message h2 {
      font-size: 32px;
      color: #4caf50;
      margin-bottom: 15px;
    }

    .success-message p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }

    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

    <h1>📊 Pesquisa RH 360º</h1>

    <!-- INTRO -->
    <div id="stageIntro" class="stage-intro">
      <div class="badges">
        <span class="badge badge-green">🛡️ Pesquisa Anônima</span>
        <span class="badge badge-blue">🏢 Capital Realty</span>
      </div>

      <h2 style="font-size: 22px; margin-bottom: 8px;">Pesquisa de Satisfação Interdepartamental</h2>
      <p>Avalie a área com a qual você mais interage no dia a dia. Suas respostas são totalmente anônimas.</p>

      <div class="info-box">
        <strong>⚙️ COMO FUNCIONA</strong>
        <ul>
          <li>Cada tela tem <strong>1 pergunta</strong>, respondida em escala de emoji</li>
          <li>Selecione a opção que melhor representa sua experiência 😞 😕 😐 🙂 😄 — ou <strong>N/A</strong> se você não tem interação com aquela área</li>
          <li>São <strong>8 perguntas objetivas</strong> + <strong>2 comentários opcionais</strong></li>
        </ul>
      </div>

      <div class="info-cards">
        <div class="info-card">
          <div class="label">Perguntas</div>
          <div class="value">8 objetivas</div>
        </div>
        <div class="info-card">
          <div class="label">Tempo estimado</div>
          <div class="value">~5 minutos</div>
        </div>
      </div>

      <div class="area-picker">
        <label>Qual área você deseja avaliar? *</label>
        <div class="chips" id="areaChips">
          <button type="button" class="chip" data-area="Administrativo/Secretarias">Administrativo/Secretarias</button>
          <button type="button" class="chip" data-area="Arquitetura">Arquitetura</button>
          <button type="button" class="chip" data-area="Comercial/Marketing">Comercial/Marketing</button>
          <button type="button" class="chip" data-area="Diretoria">Diretoria</button>
          <button type="button" class="chip" data-area="Engenharia">Engenharia</button>
          <button type="button" class="chip" data-area="Facilities">Facilities</button>
          <button type="button" class="chip" data-area="Financeiro/Contábil">Financeiro/Contábil</button>
          <button type="button" class="chip" data-area="Jurídico">Jurídico</button>
          <button type="button" class="chip" data-area="Propriedades">Propriedades</button>
          <button type="button" class="chip" data-area="Recursos Humanos">Recursos Humanos</button>
          <button type="button" class="chip" data-area="Tecnologia da Informação">Tecnologia da Informação</button>
        </div>
      </div>

      <div class="navigation">
        <button class="btn btn-next" id="btnStart" onclick="startSurvey()" disabled>Começar →</button>
      </div>
    </div>

    <!-- SURVEY -->
    <div id="stageSurvey" class="hidden">
      <div class="subtitle" id="sectionTitle"></div>

      <div id="questionsContainer"></div>

      <div class="form-group hidden" id="abertas1Group">
        <label>O que esta área faz muito bem?</label>
        <textarea id="aberta1" placeholder="Ex.: a área é muito ágil e me responde sempre no mesmo dia."></textarea>
      </div>

      <div class="form-group hidden" id="abertas2Group">
        <label>O que esta área poderia melhorar na interação com o seu setor?</label>
        <textarea id="aberta2" placeholder="Ex.: alinhar prazos antes de iniciar uma demanda nova."></textarea>
      </div>

      <div class="navigation">
        <button class="btn btn-prev" id="btnPrev" onclick="previousSection()">← Anterior</button>
        <button class="btn btn-next" id="btnNext" onclick="nextSection()">Próximo →</button>
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
    const sections = [
      {
        titulo: "1. Comunicação",
        perguntas: [
          { texto: "Como você avalia a clareza da comunicação dessa área?", familia: "satisfacao" },
          { texto: "Como você avalia a cordialidade dessa área?", familia: "satisfacao" },
          { texto: "Como você avalia a transparência da comunicação dessa área?", familia: "satisfacao" }
        ]
      },
      {
        titulo: "2. Agilidade (SLA)",
        perguntas: [
          { texto: "Como você avalia a velocidade de resposta dessa área?", familia: "satisfacao" },
          { texto: "Como você avalia o cumprimento dos prazos acordados por essa área?", familia: "satisfacao" }
        ]
      },
      {
        titulo: "3. Qualidade de entrega",
        perguntas: [
          { texto: "Como você avalia a assertividade e a qualidade das soluções entregues por essa área?", familia: "satisfacao" }
        ]
      },
      {
        titulo: "4. Parceria e colaboração",
        perguntas: [
          { texto: "O quanto você sente que essa área atua como uma parceria estratégica do seu setor?", familia: "concordancia" }
        ]
      },
      {
        titulo: "5. Grau de esforço",
        perguntas: [
          { texto: "Esta área simplifica a resolução dos problemas ou solicitações do meu setor?", familia: "concordancia" }
        ]
      }
    ];

    const EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];
    const LABELS_SAT = ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"];
    const LABELS_CON = ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"];

    let currentStep = 0;
    let respostas = {};
    let areaAvaliada = '';

    document.querySelectorAll('#areaChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#areaChips .chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        areaAvaliada = chip.dataset.area;
        document.getElementById('btnStart').disabled = false;
      });
    });

    function updateProgress() {
      const totalSteps = sections.length;
      const progress = ((currentStep + 1) / totalSteps) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
    }

    function renderQuestions() {
      const section = sections[currentStep];
      document.getElementById('sectionTitle').textContent = section.titulo + ' — Avaliando: ' + areaAvaliada;

      const container = document.getElementById('questionsContainer');
      container.innerHTML = '';

      section.perguntas.forEach((pergunta, idx) => {
        const labels = pergunta.familia === 'satisfacao' ? LABELS_SAT : LABELS_CON;
        const key = currentStep + '_' + idx;

        const html = \`
          <div class="form-group">
            <label>\${pergunta.texto} *</label>
            <div class="scale-labels">
              <span>\${labels[0]}</span>
              <span style="text-align: right;">\${labels[4]}</span>
            </div>
            <div class="rating-group" data-key="\${key}">
              \${EMOJIS.map((emoji, i) => \`
                <button type="button" class="emoji-btn" data-value="\${i + 1}" data-key="\${key}">\${emoji}</button>
              \`).join('')}
              <button type="button" class="emoji-btn na-btn" data-value="na" data-key="\${key}" style="grid-column: 1 / -1;">N/A</button>
            </div>
          </div>
        \`;
        container.innerHTML += html;
      });

      document.querySelectorAll('.emoji-btn').forEach(btn => {
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        if (respostas[key] == value) btn.classList.add('selected');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll(\`[data-key="\${key}"]\`).forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          respostas[key] = value;
        });
      });

      const totalSteps = sections.length;
      const isLast = currentStep === totalSteps - 1;

      document.getElementById('btnPrev').classList.toggle('hidden', currentStep === 0);
      document.getElementById('btnNext').classList.toggle('hidden', isLast);
      document.getElementById('btnSubmit').classList.toggle('hidden', !isLast);
      document.getElementById('abertas1Group').classList.toggle('hidden', !isLast);
      document.getElementById('abertas2Group').classList.toggle('hidden', !isLast);

      updateProgress();
    }

    function startSurvey() {
      document.getElementById('stageIntro').classList.add('hidden');
      document.getElementById('stageSurvey').classList.remove('hidden');
      renderQuestions();
    }

    function nextSection() {
      if (currentStep < sections.length - 1) {
        currentStep++;
        renderQuestions();
        window.scrollTo(0, 0);
      }
    }

    function previousSection() {
      if (currentStep > 0) {
        currentStep--;
        renderQuestions();
        window.scrollTo(0, 0);
      }
    }

    function submitSurvey() {
      const totalPerguntas = sections.reduce((sum, s) => sum + s.perguntas.length, 0);
      const respostasCount = Object.keys(respostas).filter(k => respostas[k]).length;

      if (respostasCount < totalPerguntas) {
        alert('Por favor, responda todas as perguntas');
        return;
      }

      const data = {
        pesquisa_id: 'pesquisa_360',
        area_avaliada: areaAvaliada,
        respostas: respostas,
        aberta_1: document.getElementById('aberta1').value || '',
        aberta_2: document.getElementById('aberta2').value || '',
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
