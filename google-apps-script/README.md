# 📊 Hub de Pesquisas RH - Google Apps Script

Transformação do projeto cr7xk92 (React/Supabase) para Google Apps Script + Google Sheets.

## 🎯 Escopo (Abordagem Mínima)

- ✅ Formulário de pesquisa (3 perguntas + departamento)
- ✅ Google Sheets como database
- ✅ Sem autenticação (público)
- ✅ Escala emoji (1-5)
- ✅ Comentários opcionais

## 🚀 Como Começar

### Pré-requisitos
- Conta Google (Gmail)
- Node.js + npm (para clasp - opcional)

### Opção 1: Deployment via Google Cloud Console (Recomendado para iniciantes)

1. **Criar projeto Google Cloud**
   - Acesse: https://console.cloud.google.com/
   - Clique em "Selecionar um projeto" → "Novo projeto"
   - Nome: `hub-rh-pesquisa`
   - Crie

2. **Ativar Apps Script API**
   - Busque por "Apps Script API"
   - Clique em "Ativar"

3. **Criar Apps Script**
   - Acesse: https://script.google.com/
   - Clique em "Novo projeto"
   - Copie o código dos arquivos `.gs` para o editor
   - Estrutura:
     - main.gs (formulário + handlers)
     - sheets.gs (lógica Sheets)

4. **Criar Google Sheet**
   - Acesse: https://sheets.google.com/
   - Novo spreadsheet
   - Dê o nome: "Pesquisa RH"
   - Execute a função `initializeSpreadsheet()` no Apps Script

5. **Deploy como Web App**
   - No editor Apps Script:
   - Botão "Deploy" → "Novo deployment"
   - Tipo: "Aplicação Web"
   - Executar como: Sua conta
   - Acessar como: "Qualquer um"
   - Deploy
   - Copie a URL gerada

6. **Pronto!**
   - Compartilhe a URL com os usuários
   - Eles preenchem o formulário
   - Respostas aparecem em tempo real no Sheets

### Opção 2: Deployment via clasp (Para devs com Node.js)

```bash
# Instalar clasp globalmente
npm install -g @google/clasp

# Login com Google
clasp login

# Clonar este projeto
cd google-apps-script
clasp clone <SCRIPT_ID>

# Ou criar novo
clasp create

# Deploy
clasp deploy

# Abrir no navegador
clasp open
```

## 📁 Estrutura de Arquivos

```
google-apps-script/
├── appsscript.json      # Manifesto do projeto
├── main.gs              # Formulário HTML + handlers doGet/doPost
├── sheets.gs            # Lógica de salvar/analisar Sheets
└── README.md            # Documentação
```

## 🎨 Como o Formulário Funciona

1. **Usuário acessa a URL**
   - Vê formulário com 3 perguntas
   - Escala emoji (😞 😕 😐 🙂 😄)
   - Seleciona departamento
   - Campo opcional de comentário

2. **Clica "Enviar Resposta"**
   - Validação local (todas perguntas respondidas?)
   - POST para `doPost(e)` no Apps Script
   - Dados salvos em Sheets (aba "Respostas")

3. **Feedback ao usuário**
   - "✓ Obrigado por responder!"
   - Formulário reseta
   - Pronto para próxima resposta

## 📊 Google Sheets - Schema

### Aba: Respostas
```
Timestamp | Departamento | Pergunta 1 | Pergunta 2 | Pergunta 3 | Comentário | ID
2024-01-15T10:30:00Z | RH | 4 | 5 | 4 | Tudo ótimo | uuid...
2024-01-15T10:35:00Z | TI | 3 | 4 | 3 | Melhorar comunicação | uuid...
```

### Aba: ANALISE
```
Departamento | Total Respostas | Média Comunicação | Média Qualidade | Média Parceria | Média Geral
RH | 5 | 4.2 | 4.5 | 4.1 | 4.3
TI | 3 | 3.8 | 3.9 | 4.0 | 3.9
```

### Aba: CONFIG
```
Chave | Valor
pesquisa_id | pesquisa_001
titulo_pesquisa | Pesquisa RH 360º
status | ativa
```

## 🔧 Funções Disponíveis

### main.gs
```javascript
doGet(e)           // Renderiza formulário (GET request)
doPost(e)          // Recebe dados do formulário (POST request)
getFormHTML()      // Retorna HTML do formulário
```

### sheets.gs
```javascript
saveResponseToSheet(data)     // Salva resposta em Sheets
createResponsesHeader(sheet)  // Cria header da aba Respostas
initializeSpreadsheet()       // Cria abas CONFIG e ANALISE
seedTestData()                // Adiciona 10 respostas de teste
calculateStats()              // Calcula estatísticas por departamento
```

## 🧪 Testar Localmente

1. **Abrir Script Editor**
   - Apps Script → "Execução" → "Selecione função"
   - Escolha `initializeSpreadsheet()`
   - Execute

2. **Adicionar dados de teste**
   - Execute `seedTestData()`
   - Veja as respostas aparecerem na aba "Respostas"

3. **Calcular estatísticas**
   - Execute `calculateStats()`
   - Dados agregados aparecem na aba "ANALISE"

4. **Preview do formulário**
   - Apps Script → "Deploy" → Copie URL
   - Ou clique em "Executar" para testar

## 📈 Próximas Melhorias

- [ ] Adicionar login (sem login por enquanto)
- [ ] Dashboard em tempo real
- [ ] Gráficos de análise (ChartJS)
- [ ] Export para Excel
- [ ] Notificações por email
- [ ] Análise por período (data inicial/final)

## ⚠️ Limitações (Abordagem Mínima)

- ❌ Sem autenticação (público)
- ❌ Sem dashboard visual
- ❌ Sem real-time (precisa refresh manual)
- ❌ Sem controle de acesso
- ⚠️ Suporta até ~10k respostas

## 🆘 Troubleshooting

### "Erro ao executar doGet"
- Verifique se Google Sheet está criado e compartilhado
- Verifique se as abas existem

### "Resposta não está sendo salva"
- Abra o Script Editor → Execução → Logs
- Procure por mensagens de erro
- Verifique permissões do Sheets

### "Formulário não carrega"
- Verifique a URL de deployment
- Tente limpar cache (Ctrl+Shift+Delete)
- Faça um novo deployment

## 📞 Suporte

- Google Apps Script: https://developers.google.com/apps-script
- Sheets API: https://developers.google.com/sheets/api
- Stack Overflow: #google-apps-script tag

---

**Versão:** 1.0  
**Data:** 2026-07-23  
**Status:** ✅ Pronto para uso
