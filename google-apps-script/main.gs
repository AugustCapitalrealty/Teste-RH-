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
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      padding: 40px;
    }

    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
      font-size: 28px;
    }

    .form-group {
      margin-bottom: 28px;
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

    .rating-group {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .emoji-btn {
      background: white;
      border: 2px solid #e0e0e0;
      padding: 10px 12px;
      font-size: 28px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
      min-width: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .emoji-btn:hover {
      border-color: #667eea;
      background: #f8f9ff;
      transform: scale(1.05);
    }

    .emoji-btn.selected {
      border-color: #667eea;
      background: #667eea;
      color: white;
      transform: scale(1.1);
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      margin-top: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .success-message {
      display: none;
      background: #4caf50;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      font-weight: 500;
    }

    .loading {
      display: none;
      text-align: center;
      color: #667eea;
      margin-top: 15px;
      font-weight: 500;
    }

    .error {
      color: #d32f2f;
      font-size: 13px;
      margin-top: 5px;
      display: none;
    }

    .error.show {
      display: block;
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
      <div class="form-group">
        <label>Departamento *</label>
        <select id="departamento" required>
          <option value="">Selecione...</option>
          <option value="RH">RH</option>
          <option value="TI">TI</option>
          <option value="Comercial">Comercial</option>
          <option value="Operações">Operações</option>
          <option value="Administrativo">Administrativo</option>
        </select>
      </div>

      <div class="form-group">
        <label>1. Como você avalia a comunicação interna? *</label>
        <div class="rating-group" data-question="1">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error1"></div>
      </div>

      <div class="form-group">
        <label>2. Qualidade do serviço prestado pela sua área? *</label>
        <div class="rating-group" data-question="2">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error2"></div>
      </div>

      <div class="form-group">
        <label>3. Integração e parceria entre departamentos? *</label>
        <div class="rating-group" data-question="3">
          <button type="button" class="emoji-btn" data-value="1">😞</button>
          <button type="button" class="emoji-btn" data-value="2">😕</button>
          <button type="button" class="emoji-btn" data-value="3">😐</button>
          <button type="button" class="emoji-btn" data-value="4">🙂</button>
          <button type="button" class="emoji-btn" data-value="5">😄</button>
        </div>
        <div class="error" id="error3"></div>
      </div>

      <div class="form-group">
        <label>Comentários adicionais (opcional)</label>
        <textarea id="comentario" placeholder="Compartilhe sua opinião..."></textarea>
      </div>

      <button class="submit-btn" type="submit" id="submitBtn">Enviar Resposta</button>
      <div class="loading" id="loadingMsg">⏳ Enviando...</div>
    </form>
  </div>

  <script>
    const ratings = {};

    document.querySelectorAll('.rating-group').forEach(group => {
      const questionNum = group.dataset.question;
      group.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          group.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
          this.classList.add('selected');
          ratings['pergunta_' + questionNum] = parseInt(this.dataset.value);
          document.getElementById('error' + questionNum).classList.remove('show');
        });
      });
    });

    document.getElementById('pesquisaForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const departamento = document.getElementById('departamento').value;
      if (!departamento) {
        alert('Por favor, selecione seu departamento');
        return;
      }

      if (Object.keys(ratings).length < 3) {
        alert('Por favor, responda todas as 3 perguntas');
        return;
      }

      const data = {
        pesquisa_id: 'pesquisa_001',
        departamento: departamento,
        respostas: ratings,
        comentario: document.getElementById('comentario').value || '',
        timestamp: new Date().toISOString()
      };

      document.getElementById('loadingMsg').style.display = 'block';
      document.getElementById('submitBtn').disabled = true;

      google.script.run.withSuccessHandler(function(result) {
        if (result.success) {
          document.getElementById('successMessage').style.display = 'block';
          document.getElementById('pesquisaForm').style.display = 'none';
          setTimeout(() => {
            document.getElementById('successMessage').innerHTML = '✓ Obrigado por responder!<br><br>Sua resposta foi registrada com sucesso.';
          }, 500);
        } else {
          alert('Erro: ' + result.error);
          document.getElementById('loadingMsg').style.display = 'none';
          document.getElementById('submitBtn').disabled = false;
        }
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
