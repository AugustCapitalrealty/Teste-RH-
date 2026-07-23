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
 * Retorna o HTML do formulário
 */
function getFormHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesquisa RH - Capital Realty</title>
  <link rel="stylesheet" href="https://code.getmdl.io/1.3.0/material.indigo-pink.min.css">
  <script defer src="https://code.getmdl.io/1.3.0/material.min.js"><\/script>
  <style>
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      padding: 40px;
    }

    h1 {
      color: #333;
      text-align: center;
      margin-top: 0;
      font-size: 28px;
    }

    .form-group {
      margin-bottom: 30px;
    }

    label {
      display: block;
      margin-bottom: 10px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .mdl-textfield {
      width: 100%;
      margin-top: 10px;
    }

    .rating-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .emoji-btn {
      background: none;
      border: 2px solid #ddd;
      padding: 10px 15px;
      font-size: 24px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .emoji-btn:hover {
      border-color: #667eea;
      transform: scale(1.1);
    }

    .emoji-btn.selected {
      border-color: #667eea;
      background: #f0f4ff;
      transform: scale(1.15);
    }

    .mdl-button {
      width: 100%;
      margin-top: 20px;
    }

    .error {
      color: #d32f2f;
      font-size: 12px;
      margin-top: 5px;
    }

    .success-message {
      display: none;
      background: #4caf50;
      color: white;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      text-align: center;
    }

    .loading {
      display: none;
      text-align: center;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Pesquisa RH</h1>

    <div class="success-message" id="successMessage">
      ✓ Resposta enviada com sucesso!
    </div>

    <form id="pesquisaForm">
      <!-- Dados básicos -->
      <div class="form-group">
        <label>Departamento *</label>
        <select id="departamento" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
          <option value="">Selecione...</option>
          <option value="RH">RH</option>
          <option value="TI">TI</option>
          <option value="Comercial">Comercial</option>
          <option value="Operações">Operações</option>
          <option value="Administrativo">Administrativo</option>
        </select>
      </div>

      <!-- Pergunta 1 -->
      <div class="form-group">
        <label>1. Como você avalia a comunicação interna? *</label>
        <div class="rating-group">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error1"></div>
      </div>

      <!-- Pergunta 2 -->
      <div class="form-group">
        <label>2. Qualidade do serviço prestado pela sua área? *</label>
        <div class="rating-group">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error2"></div>
      </div>

      <!-- Pergunta 3 -->
      <div class="form-group">
        <label>3. Integração e parceria entre departamentos? *</label>
        <div class="rating-group">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error3"></div>
      </div>

      <!-- Comentário opcional -->
      <div class="form-group">
        <label>Comentários adicionais (opcional)</label>
        <textarea id="comentario"
                  placeholder="Compartilhe sua opinião..."
                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical; height: 100px;"></textarea>
      </div>

      <!-- Botão enviar -->
      <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
              type="submit"
              id="submitBtn">
        Enviar Resposta
      </button>

      <div class="loading" id="loadingMsg">
        ⏳ Enviando...
      </div>
    </form>
  </div>

  <script>
    // Store selected ratings
    const ratings = {};

    // Handle emoji button clicks
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();

        // Get the rating group
        const group = this.parentElement;
        const questionNum = Array.from(group.parentElement.parentElement.querySelectorAll('.form-group')).indexOf(this.closest('.form-group')) + 1;

        // Remove previous selection in this group
        group.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));

        // Select this button
        this.classList.add('selected');

        // Store rating
        ratings['pergunta_' + questionNum] = parseInt(this.dataset.value);

        // Clear error
        document.getElementById('error' + questionNum).textContent = '';
      });
    });

    // Handle form submission
    document.getElementById('pesquisaForm').addEventListener('submit', function(e) {
      e.preventDefault();

      // Validação
      const departamento = document.getElementById('departamento').value;
      if (!departamento) {
        alert('Por favor, selecione seu departamento');
        return;
      }

      if (Object.keys(ratings).length < 3) {
        alert('Por favor, responda todas as 3 perguntas');
        return;
      }

      // Prepare data
      const data = {
        pesquisa_id: 'pesquisa_001',
        departamento: departamento,
        respostas: ratings,
        comentario: document.getElementById('comentario').value || '',
        timestamp: new Date().toISOString()
      };

      // Show loading
      document.getElementById('loadingMsg').style.display = 'block';
      document.getElementById('submitBtn').disabled = true;

      // Submit
      google.script.run.withSuccessHandler(function(result) {
        if (result.success) {
          document.getElementById('successMessage').style.display = 'block';
          document.getElementById('pesquisaForm').reset();
          document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
          Object.keys(ratings).forEach(k => delete ratings[k]);

          // Hide form after 2 seconds
          setTimeout(function() {
            document.getElementById('pesquisaForm').style.display = 'none';
            document.getElementById('successMessage').textContent = '✓ Obrigado por responder!\\n\\nSua resposta foi registrada com sucesso.';
          }, 1000);
        } else {
          alert('Erro: ' + result.error);
        }

        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('submitBtn').disabled = false;
      }).withFailureHandler(function(error) {
        alert('Erro ao enviar: ' + error);
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('submitBtn').disabled = false;
      }).submitForm(data);
    });
  </script>
</body>
</html>
  `;
}
