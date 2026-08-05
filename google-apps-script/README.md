# 📊 Pesquisa de Satisfação Interdepartamental — Google Apps Script

Versão da **Pesquisa RH 360º** (originalmente feita no Lovable/React+Supabase) reconstruída em **Google Apps Script + Google Sheets**, sem necessidade de login. Serve um formulário web público, anônimo, e grava as respostas numa planilha do Google.

---

## 📁 Arquivos do projeto

| Arquivo | O que é |
|---|---|
| `appsscript.json` | Manifesto do projeto (fuso horário, escopos OAuth, runtime V8). |
| `main.gs` | **Frontend + roteamento.** Todo o HTML/CSS/JS do formulário está dentro da função `getFormHTML()`. Também contém `doGet`, `doPost` e `submitForm`. |
| `sheets.gs` | **Backend de dados.** Grava respostas na planilha e calcula estatísticas. |
| `README.md` | Este arquivo. |

> ⚠️ O `main.gs` é grande (~100 KB) porque a **logo da Capital Realty está embutida em base64** dentro do HTML. Isso é necessário: o Apps Script bloqueia imagens externas (CSP). É normal.

---

## 🚀 Como colocar no ar (deploy)

### 1. Criar o projeto no Apps Script
1. Acesse https://script.google.com/ → **Novo projeto**.
2. Crie dois arquivos de script: **`main`** e **`sheets`** (ícone **+** → *Script*).
3. Cole o conteúdo de `main.gs` no arquivo `main` e o de `sheets.gs` no arquivo `sheets`.
   - ❗ **Não** deixe o conteúdo repetido em dois arquivos. Cada `const` no topo (ex.: `QUESTION_TEXTS`) só pode existir **uma vez** no projeto inteiro, senão dá erro `Identifier 'X' has already been declared`.
4. (Opcional) Substitua o conteúdo de `appsscript.json` — clique em ⚙️ *Configurações do projeto* → marque *Mostrar o arquivo de manifesto `appsscript.json`*.

### 2. Conectar a planilha
1. Crie (ou abra) uma planilha no Google Sheets.
2. Copie o **ID da planilha** da URL: `https://docs.google.com/spreadsheets/d/`**`ESTE_ID`**`/edit`.
3. No `sheets.gs`, troque **todas** as ocorrências do ID atual pela sua:
   ```js
   SpreadsheetApp.openById('1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g')
   ```
   (aparece em `saveResponseToSheet`, `initializeSpreadsheet`, `seedTestData` e `calculateStats`).

### 3. Inicializar a planilha (uma vez)
1. No editor, selecione a função **`initializeSpreadsheet`** e clique em **Executar**.
2. Autorize o acesso quando o Google pedir.
   - Isso cria as abas **CONFIG** e **ANALISE**. A aba **Respostas** é criada sozinha no primeiro envio.

### 4. Publicar como aplicativo web
1. **Implantar** → **Nova implantação** → tipo **App da Web**.
2. Configure:
   - **Executar como:** *Eu* (a sua conta) — é o que permite gravar na planilha sem login do respondente.
   - **Quem pode acessar:** *Qualquer pessoa* (formulário público e anônimo).
3. **Implantar** → copie a **URL do app da Web** → compartilhe com os colaboradores.

### 5. Atualizar depois de mudar o código
Sempre que editar `main.gs`/`sheets.gs`: salve (**Ctrl+S**) → **Implantar** → **Gerenciar implantações** → ✏️ (editar) → **Nova versão** → **Implantar**. A URL continua a mesma.

---

## 🔧 Funções — o que cada uma faz

### `main.gs`
| Função | Quando roda | O que faz |
|---|---|---|
| `doGet(e)` | Automático, quando alguém abre a URL | Renderiza o formulário (retorna `getFormHTML()`). |
| `doPost(e)` | Automático, em requisições HTTP POST | Handler alternativo de POST (o formulário **não** usa isto — usa `google.script.run`). Deixado para integrações externas. |
| `submitForm(data)` | Chamada pelo formulário via `google.script.run` ao enviar | Recebe as avaliações e chama `saveResponseToSheet`. |
| `getFormHTML()` | Chamada por `doGet` | Devolve **todo** o HTML/CSS/JS do formulário (é aqui que você mexe em textos, cores, perguntas, áreas). |

### `sheets.gs`
| Função | Quando roda | O que faz |
|---|---|---|
| `saveResponseToSheet(data)` | Chamada por `submitForm` | Grava as respostas na aba **Respostas** (uma linha por área × pergunta). |
| `createResponsesHeader(sheet)` | Automático, ao criar a aba Respostas | Escreve e formata o cabeçalho. |
| `initializeSpreadsheet()` | **Manual, uma vez** | Cria as abas **CONFIG** e **ANALISE**. |
| `seedTestData()` | **Manual, opcional** | Insere respostas de teste (6 respondentes avaliando todas as áreas) para você ver a planilha e as estatísticas funcionando. |
| `calculateStats()` | **Manual, quando quiser o resultado** | Recalcula a aba **ANALISE**: média por área, média por critério, e blocos de melhores/piores áreas — respeitando o anonimato **k=5**. |

> 🔁 **Rotina de operação:** deixe a pesquisa aberta coletando respostas → quando quiser ver os números, rode **`calculateStats()`** e olhe a aba **ANALISE**. Pode rodar quantas vezes quiser; ela reconstrói a aba do zero.

---

## 🗂️ Como os dados ficam na planilha

### Aba `Respostas` (uma linha por área avaliada × pergunta)
| Coluna | Exemplo | Observação |
|---|---|---|
| Timestamp | `2026-08-04T13:20:00Z` | Momento do envio. |
| Avaliação ID | `a1b2c3…` (UUID) | **Aleatório por área**, não por pessoa. Ver "Anonimato" abaixo. |
| Área Avaliada | `Diretoria` | Área que está sendo avaliada. |
| Autoavaliação | `Sim` / `Não` | `Sim` quando é a própria área do respondente. |
| Pergunta | `Clareza da comunicação` | Nome curto (ver `QUESTION_TEXTS`). |
| Tipo | `rating` / `texto` | Nota (1–5) ou comentário aberto. |
| Resposta | `4` / `"a área é ágil"` | O valor respondido. |

### Aba `ANALISE` (gerada por `calculateStats`)
- `Área Avaliada | Respostas (n) | Média Geral | + 8 colunas de média por critério`
- Áreas com **menos de 5 respostas** (`K_MIN`) aparecem mascaradas como `— (n<5)` (anonimato).
- Blocos **🏆 Melhores áreas** e **⚠️ Áreas a melhorar** (top/bottom por média).

### Aba `CONFIG`
Metadados chave/valor (`pesquisa_id`, `titulo_pesquisa`, `status`, `criado_em`).

---

## ✏️ O que você pode configurar no código

| Quero mudar… | Onde | Como |
|---|---|---|
| **As áreas/departamentos** | `main.gs` → array `AREAS` (e o mesmo array em `sheets.gs` → `seedTestData`) | Adicione/remova strings. |
| **As perguntas** | `main.gs` → array `QUESTIONS` | Cada item tem `type` (`rating`/`text`), `secao`, `texto`. Se mexer, atualize também `QUESTION_TEXTS`/`CRITERIOS` no `sheets.gs`. |
| **Mínimo de caracteres do comentário** | `main.gs` → `const MIN_CHARS = 3` | Troque o número. |
| **Limite de anonimato k** | `sheets.gs` → `const K_MIN = 5` | Abaixo de `K_MIN` respostas a área é mascarada na ANALISE. |
| **Textos, cores, logo** | `main.gs` → dentro de `getFormHTML()` | HTML/CSS inline. A paleta usa variáveis CSS (`--navy`, `--e1..e5`, etc.). |
| **ID da planilha** | `sheets.gs` | Substitua o ID em todas as funções. |

---

## 🔒 Modelo de anonimato (importante)

- **Nenhuma identidade é coletada** — não há login, nome ou e-mail.
- A área que a pessoa escolhe no início serve **só** para montar a lista de avaliação; **não é gravada** junto às respostas.
- Cada **área avaliada** recebe um **ID aleatório próprio** (não um ID único por pessoa). Assim não dá para juntar todas as respostas de um mesmo respondente cruzando um ID comum.
- `calculateStats()` só mostra números de áreas com **≥ 5 respostas** (`K_MIN`), reforçando o anonimato por grupo.
- **Bloqueio de duplicidade:** é apenas local (marca no `localStorage` do navegador). Evita reenvio acidental, mas **não** impede alguém decidido de responder de novo em outro navegador/aba anônima — isso exigiria login (fora do escopo desta versão).

Para **testar do zero**, use uma **aba anônima** (Ctrl+Shift+N) ou limpe o `localStorage` do site.

---

## 🧭 Preparando para o futuro Painel (Dashboard RH)

Esta versão já grava tudo o que um painel precisa. Ideias para quando for construir o painel:

1. **Fonte de dados:** a aba **Respostas** é a fonte bruta; a aba **ANALISE** já é um resumo pronto. Um painel pode ler qualquer uma das duas.
2. **Onde construir o painel (opções):**
   - **Google Sheets + Looker Studio** (mais rápido): conecte o Looker Studio à planilha e monte gráficos sobre `ANALISE`/`Respostas`. Zero código.
   - **Nova página no próprio Apps Script:** criar uma segunda função `doGet` roteada por parâmetro (ex.: `?page=painel`) que renderiza um HTML de dashboard lendo os dados via novas funções server-side (ex.: `getResumoPorArea()`, `getComentarios()`), sempre aplicando o corte **k=5**.
3. **Funções server-side sugeridas para o painel** (a criar em `sheets.gs`):
   - `getMediasPorArea()` — devolve a ANALISE em JSON (com k=5).
   - `getTopBottom()` — melhores/piores áreas.
   - `getComentarios(area)` — comentários de uma área, **embaralhados** e liberados só quando `CONFIG.status = 'encerrada'` (espelhando o comportamento do projeto original).
4. **Controle de acesso do painel:** como não há login, o painel do RH deve ficar numa implantação **separada** com *"Quem pode acessar: Somente eu / minha organização"* — **nunca** "Qualquer pessoa". Ou simplesmente usar o Looker Studio compartilhado só com o RH.
5. **Ciclos de pesquisa (evolução):** hoje há um único ciclo. Para múltiplos ciclos, dá para usar a aba **CONFIG** (`status`, `periodo_inicio`, `periodo_fim`) e o formulário passar a ler esses campos para abrir/fechar a janela de respostas.

---

## 🆘 Problemas comuns

| Erro | Causa / solução |
|---|---|
| `Identifier 'X' has already been declared` | Código duplicado em dois arquivos `.gs`. Deixe cada função/const só em um arquivo. |
| Tela em branco após enviar / logo cortada | Você colou uma versão antiga/incompleta. Cole o `main.gs` **completo** de novo. |
| `Cannot read properties of null` ao rodar funções | ID da planilha errado no `sheets.gs`, ou a aba não existe. Confira o ID e rode `initializeSpreadsheet()`. |
| "Você já respondeu" aparecendo no teste | É o bloqueio local. Use aba anônima ou limpe o `localStorage`. |
| Estatísticas não aparecem | Rode `calculateStats()` e confira a aba **ANALISE**. Áreas com < 5 respostas aparecem como `— (n<5)`. |

---

## 🧩 Fluxo do respondente (resumo)

1. **Intro** — modal de anonimato (1ª visita) → escolhe **sua área**.
2. **Seleção de interação** — escolhe **com quais áreas teve interação** (avalia só essas + a autoavaliação da própria área).
3. **8 perguntas objetivas** — escala de emoji 1–5 (Muito insatisfeito → Muito satisfeito), uma pergunta por tela respondida para todas as áreas selecionadas.
4. **2 comentários** — obrigatórios nas outras áreas, **opcionais na própria área**.
5. **Confirmação** → **Envio** → tela de **Obrigado**.

Navegação para trás disponível em todas as etapas (o botão **← Anterior** na 1ª pergunta volta para a seleção de áreas).

---

**Status:** ✅ Pronto para produção
**Escopo:** formulário de resposta anônimo (a interface do RH/painel é a próxima etapa).
