# 🚀 GUIA DE DEPLOYMENT - Google Apps Script

## ⏱️ Tempo total: ~10 minutos

---

## PASSO 1: Abrir Google Apps Script (2 minutos)

### 1.1 Acesse o site
```
https://script.google.com/
```

### 1.2 Clique em "+ Novo projeto"
```
┌─────────────────────────────────┐
│  Google Apps Script             │
├─────────────────────────────────┤
│                                  │
│  [+ Novo projeto]  Meus projetos │
│                                  │
└─────────────────────────────────┘
```

### 1.3 Dê um nome ao projeto
```
Nome sugerido: "Hub RH - Pesquisa"
```

Clique em "Criar"

---

## PASSO 2: Copiar o código (3 minutos)

### 2.1 No Google Apps Script, você verá um arquivo chamado "Código.gs"

Apague TUDO que está lá e copie o seguinte:

### 2.2 Abra o arquivo `main.gs` (do repositório)
```
Copie TUDO o conteúdo (Ctrl+A, Ctrl+C)
Cole no Google Apps Script (Ctrl+V)
```

**Seu arquivo deve ficar assim:**
```javascript
/**
 * Entry point - Render a página inicial do formulário
 */
function doGet(e) {
  ...
}

/**
 * POST handler - Recebe dados do formulário
 */
function doPost(e) {
  ...
}
...
```

### 2.3 Agora adicione o arquivo `sheets.gs`

No Google Apps Script, clique em:
```
[+] → Nova arquivo → Google Apps Script
```

Nome: `sheets`

Copie TUDO do arquivo `sheets.gs` (do repositório) e cole lá.

**Resultado esperado:**
```
Google Apps Script Editor
├─ main.gs (arquivo)
└─ sheets.gs (arquivo novo)
```

---

## PASSO 3: Criar Google Sheet (2 minutos)

### 3.1 Abra Google Sheets
```
https://sheets.google.com/
```

### 3.2 Clique em "+ Novo"
```
┌──────────────┐
│ + Novo       │
└──────────────┘
```

### 3.3 Escolha "Planilha em branco"

### 3.4 Dê um nome
```
Nome: "Pesquisa RH"
```

### 3.5 Copie a ID da planilha
```
URL: https://docs.google.com/spreadsheets/d/[ID-DA-PLANILHA]/edit

Exemplo: https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I/edit
                                                   ^^^^^^^^^^^^^^^ (copie isto)
```

**Você vai usar esse ID no próximo passo!**

---

## PASSO 4: Conectar o Apps Script ao Sheets (1 minuto)

### 4.1 Volte para o Google Apps Script
```
https://script.google.com/
```

### 4.2 Na aba `sheets.gs`, encontre esta linha:

```javascript
function saveResponseToSheet(data) {
  try {
    // Pega o spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
```

**Mude para:**

```javascript
function saveResponseToSheet(data) {
  try {
    // Abre o spreadsheet pelo ID
    const ss = SpreadsheetApp.openById('[COLE-O-ID-AQUI]');
```

### 4.3 Exemplo:
```javascript
const ss = SpreadsheetApp.openById('1A2B3C4D5E6F7G8H9I');
```

**Salve (Ctrl+S)**

---

## PASSO 5: Executar Inicialização (1 minuto)

### 5.1 No topo do editor, clique em "Executar"
```
Google Apps Script Editor
[Executar]  [Depurar]
```

### 5.2 Selecione a função:
```
┌──────────────────────┐
│ Executar qual função?│
├──────────────────────┤
│ › doGet              │
│ › doPost             │
│ › getFormHTML        │
│ › saveResponseToSheet│
│ › createResponsesHeader
│ › initializeSpreadsheet  ← CLIQUE AQUI
│ › seedTestData       │
│ › calculateStats     │
└──────────────────────┘
```

Clique em `initializeSpreadsheet`

### 5.3 Clique no botão "Executar"

### 5.4 Autorize o Apps Script
```
"Google Apps Script quer acessar sua conta Google"
[Permitir]
```

Clique em "Permitir"

### 5.5 Aguarde a execução
```
Execution completed successfully.
```

---

## PASSO 6: Deploy como Web App (1 minuto)

### 6.1 No Google Apps Script, clique em "Deploy"
```
[Deploy ▼]
```

### 6.2 Clique em "+ Novo deployment"
```
┌──────────────────────────┐
│ Deployments              │
├──────────────────────────┤
│ [+ Novo deployment]      │
└──────────────────────────┘
```

### 6.3 Configure o deployment

**Tipo de deployment:** "Aplicação Web"
```
┌──────────────────────┐
│ Tipo de deployment   │
├──────────────────────┤
│ ○ Biblioteca         │
│ ● Aplicação Web  ← (JÁ ESTÁ SELECIONADO)
│ ○ Teste no head  │
└──────────────────────┘
```

**Executar como:** "Sua conta"
```
┌──────────────────────┐
│ Executar como        │
├──────────────────────┤
│ ● Sua conta  ← (JÁ ESTÁ SELECIONADO)
│ ○ Novo usuário      │
└──────────────────────┘
```

**Acessar como:** "Qualquer um"
```
┌──────────────────────┐
│ Acessar como         │
├──────────────────────┤
│ ○ Eu                │
│ ● Qualquer um  ← (MUDE PARA ISTO)
│ ○ Qualquer pessoa   │
│    com o link       │
└──────────────────────┘
```

### 6.4 Clique em "Deploy"

---

## PASSO 7: Copiar a URL (1 minuto)

### 7.1 Após o deployment, você verá:
```
┌─────────────────────────────────────────┐
│ Deployment criado com sucesso!          │
├─────────────────────────────────────────┤
│                                         │
│ ID: AKfycbyX7z8H9I0J1K2L3M4N5O6P7Q8R   │
│                                         │
│ URL:                                    │
│ https://script.google.com/macros/d/... │
│                                    ...Z │
│                                         │
│ [Copiar para área de transferência]    │
│                                         │
└─────────────────────────────────────────┘
```

### 7.2 Clique em "Copiar para área de transferência"

**OU copie manualmente a URL**

---

## PASSO 8: Testar o Formulário (2 minutos)

### 8.1 Cole a URL em uma aba do navegador

### 8.2 Você verá o formulário:
```
┌──────────────────────────────────┐
│          📊 Pesquisa RH          │
├──────────────────────────────────┤
│                                  │
│ Departamento *                   │
│ [Selecione...]                   │
│                                  │
│ 1. Como você avalia a            │
│    comunicação interna? *         │
│ [😞] [😕] [😐] [🙂] [😄]         │
│                                  │
│ 2. Qualidade do serviço          │
│    prestado pela sua área? *     │
│ [😞] [😕] [😐] [🙂] [😄]         │
│                                  │
│ 3. Integração e parceria         │
│    entre departamentos? *        │
│ [😞] [😕] [😐] [🙂] [😄]         │
│                                  │
│ Comentários adicionais           │
│ [________________]               │
│                                  │
│ [Enviar Resposta]                │
│                                  │
└──────────────────────────────────┘
```

### 8.3 Preencha e teste:

1. Selecione um departamento
2. Clique em emojis (1, 2, 3)
3. Digite um comentário (opcional)
4. Clique "Enviar Resposta"

### 8.4 Você verá:
```
✓ Resposta enviada com sucesso!

Obrigado por responder!
Sua resposta foi registrada com sucesso.
```

---

## PASSO 9: Verificar os dados no Sheets (1 minuto)

### 9.1 Volte para Google Sheets
```
https://sheets.google.com/
```

### 9.2 Abra a planilha "Pesquisa RH"

### 9.3 Você verá as abas:
```
├─ Respostas (seus dados salvos!)
├─ ANALISE (estatísticas)
└─ CONFIG (configurações)
```

### 9.4 Clique em "Respostas"

**Você verá:**
```
┌──────────────┬──────────────┬────────┬────────┬────────┬─────────┬─────┐
│ Timestamp    │ Departamento │ Perg 1 │ Perg 2 │ Perg 3 │ Coment. │ ID  │
├──────────────┼──────────────┼────────┼────────┼────────┼─────────┼─────┤
│ 2024-01-15   │ RH           │ 5      │ 4      │ 4      │ Ótimo!  │ ... │
│ T10:30:00Z   │              │        │        │        │         │     │
└──────────────┴──────────────┴────────┴────────┴────────┴─────────┴─────┘
```

✅ **Pronto! Funcionando!**

---

## 🎉 SUCESSO!

Seu formulário de pesquisa está ao vivo!

### ✅ Checklist de Completion:
- [x] Google Apps Script criado
- [x] Código (main.gs + sheets.gs) adicionado
- [x] Google Sheets criado e conectado
- [x] Deployment feito
- [x] Formulário testado
- [x] Dados salvando em Sheets

---

## 📊 Próximas ações:

### Adicionar dados de teste (opcional):
1. No Google Apps Script, execute `seedTestData()`
2. Verá 10 respostas aparecerem no Sheets

### Calcular estatísticas (opcional):
1. No Google Apps Script, execute `calculateStats()`
2. Veja dados agregados na aba "ANALISE"

### Compartilhar formulário:
1. Copie a URL
2. Envie para os usuários
3. Eles acessam e preenchem
4. Respostas aparecem em tempo real no Sheets

---

## ⚠️ Se der erro:

### "Erro ao executar doGet"
- Verifique se o ID do Sheets está correto (passo 4.3)
- Tente fazer deploy novamente

### "Resposta não está sendo salva"
- Abra Google Apps Script → Execução → Logs
- Procure mensagens de erro
- Verifique permissões do Sheets

### "Formulário não carrega"
- Copie a URL novamente
- Tente em modo anônimo (Ctrl+Shift+N)
- Limpe cache do navegador

---

## 📞 Próximas melhorias:

Após validar que tudo funciona, podemos adicionar:
- Dashboard em tempo real
- Gráficos de análise
- Análise por período
- Export para Excel
- Notificações por email

---

**✅ Você consegue fazer isso em ~10 minutos!**

Se ficar preso em algum passo, me avisa qual! 🆘

