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
   - ❗ **Cole sempre os dois arquivos juntos** ao atualizar — o `main.gs` chama funções que moram no `sheets.gs`.
   - ❗ **Não** deixe o conteúdo repetido em dois arquivos. Cada `const` no topo (ex.: `PERGUNTAS`) só pode existir **uma vez** no projeto inteiro, senão dá erro `Identifier 'X' has already been declared`.
4. (Opcional) Substitua o conteúdo de `appsscript.json` — clique em ⚙️ *Configurações do projeto* → marque *Mostrar o arquivo de manifesto `appsscript.json`*.

### 2. Conectar a planilha
1. Crie (ou abra) uma planilha no Google Sheets.
2. Copie o **ID da planilha** da URL: `https://docs.google.com/spreadsheets/d/`**`ESTE_ID`**`/edit`.
3. No `sheets.gs`, troque o valor da constante no topo do arquivo (**um único lugar**):
   ```js
   const ID_PLANILHA = '1v1SEGIhzfBYkI4xBCexZlRfRoqn_2WaHz83S9kR9x6g';
   ```

### 3. Inicializar a planilha (uma vez)
1. No editor, selecione a função **`inicializarPlanilha`** e clique em **Executar**.
2. Autorize o acesso quando o Google pedir.
   - Isso cria as abas **CONFIG** e **Respostas**. As abas de análise são criadas depois, por `gerarIndicadores()`.

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
| `submitForm(data)` | Chamada pelo formulário via `google.script.run` ao enviar | Recebe as avaliações e chama `salvarResposta` (no `sheets.gs`). |
| `getFormHTML()` | Chamada por `doGet` | Devolve **todo** o HTML/CSS/JS do formulário (é aqui que você mexe em textos, cores, perguntas, áreas). |

### `sheets.gs`

**Funções para executar manualmente** (aparecem no menu *Executar* do editor):

| Função | Quando rodar | O que faz |
|---|---|---|
| `inicializarPlanilha()` | **1x**, na configuração inicial | Cria as abas **CONFIG** e **Respostas**. |
| **`gerarIndicadores()`** ⭐ | **Sempre que quiser atualizar os resultados** | Reconstrói do zero as 4 abas de análise: **PAINEL**, **POR_PERGUNTA**, **RESUMO_PERGUNTAS** e **COMENTARIOS**. |
| `inserirDadosDeTeste()` | Opcional, para testar | Cria 52 respondentes fictícios (4 por área) para você ver os indicadores funcionando. |
| `apagarDadosDeTeste()` | Opcional, para limpar | Apaga **todas** as linhas da aba Respostas (mantém o cabeçalho). Use com cuidado. |

**Funções internas** (chamadas automaticamente, terminam com `_` e não aparecem no menu):

| Função | O que faz |
|---|---|
| `salvarResposta(dados)` | Grava uma submissão do formulário. Chamada por `submitForm` no `main.gs`. |
| `lerRespostas_()` | Lê a aba Respostas e normaliza os dados. |
| `agregarRespostas_(registros)` | **Núcleo do cálculo**: separa percepção externa × autoavaliação, por área e por pergunta. |
| `gerarPainel_`, `gerarAnalisePorPergunta_`, `gerarResumoPerguntas_`, `gerarComentarios_` | Escrevem cada aba de análise. |

> 🔁 **Rotina de operação:** deixe a pesquisa coletando respostas → quando quiser ver os números, rode **`gerarIndicadores()`** e abra as abas de análise. Pode rodar quantas vezes quiser; ela sempre reconstrói tudo a partir da aba Respostas.

---

## 🗂️ Como os dados ficam na planilha

### Aba `Respostas` — dados brutos (uma linha por área avaliada × pergunta)
| Coluna | Exemplo | Observação |
|---|---|---|
| Timestamp | `2026-08-04T13:20:00Z` | Momento do envio. |
| Avaliação ID | `a1b2c3…` (UUID) | **Aleatório por área**, não por pessoa. Ver "Anonimato" abaixo. |
| Área Avaliada | `Diretoria` | Área que está sendo avaliada. |
| Autoavaliação | `Sim` / `Não` | `Sim` quando é a própria área do respondente. |
| Pergunta | `Clareza da comunicação` | Nome da pergunta (ver constante `PERGUNTAS`). |
| Tipo | `rating` / `texto` | Nota (1–5) ou comentário aberto. |
| Resposta | `4` / `"a área é ágil"` | O valor respondido. |

> ⚠️ **Não edite esta aba à mão.** Ela é a fonte de tudo; as abas de análise são descartáveis e recriadas a cada `gerarIndicadores()`.

---

### 📊 Aba `PAINEL` — visão executiva (uma linha por área)

O indicador principal: como a área é vista pelas outras, como ela se vê, e o descompasso entre as duas coisas.

| Coluna | O que é |
|---|---|
| Área | Área avaliada. |
| Avaliações recebidas (n) | Quantas pessoas **de outras áreas** a avaliaram. |
| **Nota da Área** | Média que a área recebeu **das outras áreas** (0–5). |
| Autoavaliações (n) | Quantas pessoas **da própria área** se autoavaliaram. |
| **Nota da Autoavaliação** | Média que a área deu **a si mesma**. |
| **Diferença (Auto − Externa)** | Positiva = a área se vê melhor do que é vista. Negativa = o contrário. |
| Leitura | Interpretação em texto da diferença. |
| Status | `OK` ou o motivo de estar oculto por anonimato. |

A coluna **Diferença** vem colorida: 🔴 vermelho quando a área se superestima (ponto de atenção), 🟢 verde quando é mais bem vista do que imagina, cinza quando está alinhada. O limite é `LIMITE_DESALINHAMENTO` (padrão `0.3`).

---

### 🔍 Aba `POR_PERGUNTA` — análise individual de cada questão

Uma linha por **(área × pergunta)** — permite ver exatamente em qual critério cada área vai bem ou mal.

`Área | Seção | Pergunta | Respostas (n) | Nota (externa) | Nota (autoavaliação) | Diferença | Status`

Use os filtros do Sheets para isolar uma área ou um critério específico.

---

### 🏅 Aba `RESUMO_PERGUNTAS` — ranking dos temas na empresa

Média da **empresa inteira** em cada uma das 8 perguntas, ordenada da melhor para a pior. Responde "em qual dimensão somos bons/ruins como companhia?".

`Pergunta | Seção | Respostas (n) | Nota média (empresa) | Posição`

---

### 💬 Aba `COMENTARIOS` — respostas qualitativas

Todos os textos abertos, separados das notas.

`Área Avaliada | Origem | Pergunta | Comentário`

- **Origem** distingue `Autoavaliação` de `Outra área`.
- As linhas são **embaralhadas** e o ID da avaliação **não** é exportado — assim ninguém consegue juntar os comentários de uma mesma pessoa.
- Comentários de áreas abaixo do mínimo de anonimato ficam de fora (o Log informa quais).

---

### Aba `CONFIG`
Metadados chave/valor (`pesquisa_id`, `titulo_pesquisa`, `status`, `criado_em`).

---

## ✏️ O que você pode configurar no código

| Quero mudar… | Onde | Como |
|---|---|---|
| **As áreas/departamentos** | `main.gs` → array `AREAS` (e o mesmo array em `sheets.gs` → `inserirDadosDeTeste`) | Adicione/remova strings. |
| **As perguntas** | `main.gs` → array `QUESTIONS` | Cada item tem `type` (`rating`/`text`), `secao`, `texto`. **Se mexer, atualize também `PERGUNTAS` no `sheets.gs`** — os nomes precisam bater. |
| **Mínimo de caracteres do comentário** | `main.gs` → `const MIN_CHARS = 3` | Troque o número. |
| **Mínimo de avaliações externas** | `sheets.gs` → `const MINIMO_EXTERNO = 5` | Abaixo disso a nota da área fica oculta. |
| **Mínimo de autoavaliações** | `sheets.gs` → `const MINIMO_AUTOAVALIACAO = 3` | Abaixo disso a autoavaliação fica oculta. |
| **Sensibilidade da coluna Diferença** | `sheets.gs` → `const LIMITE_DESALINHAMENTO = 0.3` | Diferenças menores que isso são lidas como "percepção alinhada". |
| **Textos, cores, logo** | `main.gs` → dentro de `getFormHTML()` | HTML/CSS inline. A paleta usa variáveis CSS (`--navy`, `--e1..e5`, etc.). |
| **ID da planilha** | `sheets.gs` → `const ID_PLANILHA` | Um só lugar. |

---

## 🔒 Modelo de anonimato (importante)

- **Nenhuma identidade é coletada** — não há login, nome ou e-mail.
- A área que a pessoa escolhe no início serve **só** para montar a lista de avaliação; **não é gravada** junto às respostas.
- Cada **área avaliada** recebe um **ID aleatório próprio** (não um ID único por pessoa). Assim não dá para juntar todas as respostas de um mesmo respondente cruzando um ID comum.
- Nas abas de análise, áreas com poucas respostas ficam **ocultas**: `MINIMO_EXTERNO` (5) para a nota recebida e `MINIMO_AUTOAVALIACAO` (3) para a autoavaliação. A coluna **Status** sempre explica o motivo.
- Os **comentários são embaralhados** e sem ID, para não permitir reconstruir o conjunto de respostas de uma pessoa.
- **Bloqueio de duplicidade:** é apenas local (marca no `localStorage` do navegador). Evita reenvio acidental, mas **não** impede alguém decidido de responder de novo em outro navegador/aba anônima — isso exigiria login (fora do escopo desta versão).

> ⚖️ **Sobre os mínimos:** são o que sustenta a promessa feita ao respondente na tela ("os resultados são analisados de forma agregada, nunca individual"). Se você baixar `MINIMO_AUTOAVALIACAO` para 1 ou 2 numa área pequena, a "média" passa a revelar a opinião de uma ou duas pessoas identificáveis. Prefira comunicar que faltam respostas a enfraquecer o corte.

Para **testar do zero**, use uma **aba anônima** (Ctrl+Shift+N) ou limpe o `localStorage` do site.

---

## 🧭 Preparando para o futuro Painel (Dashboard RH)

As abas de análise já foram desenhadas pensando no painel — elas são **tabelas limpas** (uma linha de cabeçalho + dados, sem blocos intercalados) e as notas são gravadas como **números de verdade**, não texto. Isso significa que qualquer ferramenta de BI consegue consumir direto, sem tratamento.

### Qual aba usar para cada visualização

| Visualização do painel | Aba fonte |
|---|---|
| Ranking de áreas / cartões com a nota | `PAINEL` |
| Gráfico "autoavaliação × percepção externa" (barras lado a lado ou dispersão) | `PAINEL` |
| Radar de uma área nos 8 critérios | `POR_PERGUNTA` (filtrando a área) |
| Heatmap área × critério | `POR_PERGUNTA` |
| Ranking dos temas na empresa | `RESUMO_PERGUNTAS` |
| Lista/nuvem de comentários | `COMENTARIOS` |

### Dois caminhos possíveis

1. **Looker Studio (mais rápido, sem código)** — conecte o Looker Studio à planilha, aponte cada gráfico para a aba correspondente e compartilhe o relatório **apenas com o RH**. Como as abas já estão normalizadas, é praticamente arrastar e soltar.

2. **Painel dentro do próprio Apps Script (mais controle)** — criar uma segunda página roteada por parâmetro (ex.: `?page=painel`) no `doGet`, renderizando HTML que consome funções server-side. As funções de leitura ficariam assim:
   - `obterPainel()` → devolve a aba `PAINEL` em JSON
   - `obterAnalisePorPergunta(area)` → detalhamento de uma área
   - `obterResumoPerguntas()` → ranking dos temas
   - `obterComentarios(area)` → comentários já embaralhados

   O trabalho pesado já está feito: `agregarRespostas_()` devolve tudo estruturado em memória, então essas funções são basicamente formatar o retorno em JSON.

### Cuidados ao construir o painel

- **Acesso:** o painel do RH deve ficar numa implantação **separada** com *"Quem pode acessar: Somente eu"* ou restrito à organização — **nunca** "Qualquer pessoa", que é a configuração do formulário.
- **Mantenha os cortes de anonimato** também no painel. Não leia a aba `Respostas` crua para montar médias: use as abas de análise, que já aplicam os mínimos.
- **Ciclos de pesquisa:** hoje há um único ciclo. Para comparar períodos, o caminho é usar a aba `CONFIG` (`status`, `periodo_inicio`, `periodo_fim`) e arquivar as respostas de cada ciclo antes de abrir o próximo.

---

## 🆘 Problemas comuns

| Erro | Causa / solução |
|---|---|
| `Identifier 'X' has already been declared` | Código duplicado em dois arquivos `.gs`. Deixe cada função/const só em um arquivo. |
| `salvarResposta is not defined` ao enviar o formulário | Você atualizou só um dos arquivos. **Cole os dois** (`main.gs` e `sheets.gs`) — o `main.gs` chama funções do `sheets.gs`. |
| Tela em branco após enviar / logo cortada | Você colou uma versão antiga/incompleta. Cole o `main.gs` **completo** de novo. |
| `Cannot read properties of null` ao rodar funções | ID da planilha errado no `sheets.gs`, ou a aba não existe. Confira `ID_PLANILHA` e rode `inicializarPlanilha()`. |
| "Você já respondeu" aparecendo no teste | É o bloqueio local. Use aba anônima ou limpe o `localStorage`. |
| Abas de análise vazias | Rode **`gerarIndicadores()`**. Se continuar vazio, confira se a aba `Respostas` tem dados. |
| Colunas de nota em branco com "Oculto por anonimato" | Normal: a área ainda não atingiu o mínimo de respostas. A coluna **Status** diz exatamente o que falta. |

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
