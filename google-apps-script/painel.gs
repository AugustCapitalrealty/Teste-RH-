/**
 * ══════════════════════════════════════════════════════════════════════════
 * PAINEL DO RH — dashboard de resultados
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Acesso: a MESMA URL do formulário + "?page=painel"
 *   https://script.google.com/macros/s/SEU_ID/exec?page=painel
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 SEGURANÇA — LEIA ANTES DE USAR
 *
 * O formulário é publicado como "Qualquer pessoa" (sem login), então o Google
 * NÃO informa quem está acessando — não dá para liberar por e-mail. Por isso o
 * painel é protegido por SENHA, validada no servidor.
 *
 * A senha NÃO fica no código: ela é guardada nas Propriedades do Script. Assim
 * não vai parar no repositório nem em cópias do arquivo.
 *
 * PARA CONFIGURAR (uma vez):
 *   1. Abra a função configurarSenhaDoPainel() aqui embaixo
 *   2. Escreva a senha na linha indicada
 *   3. Execute a função (menu Executar)
 *   4. APAGUE a senha da linha e salve de novo
 *
 * Sem senha configurada, o painel fica inacessível — o que é o comportamento
 * seguro por padrão.
 *
 * ⚠️ Limite conhecido: quem tiver o link E a senha entra. Não há registro de
 * quem acessou. Para controle por pessoa seria necessário exigir login, o que
 * quebraria o anonimato do formulário nesta mesma URL.
 * ─────────────────────────────────────────────────────────────────────────
 */

const CHAVE_SENHA_PAINEL = 'SENHA_PAINEL';

/**
 * EXECUTE UMA VEZ para definir a senha do painel.
 * Escreva a senha abaixo, execute, e depois apague a senha da linha.
 */
function configurarSenhaDoPainel() {
  const NOVA_SENHA = '';   // ←── escreva a senha aqui, execute, e apague depois

  if (!NOVA_SENHA) {
    Logger.log('Escreva a senha na variável NOVA_SENHA e execute de novo.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty(CHAVE_SENHA_PAINEL, NOVA_SENHA);
  Logger.log('✅ Senha do painel definida. Agora APAGUE a senha da linha e salve o arquivo.');
}

/** EXECUTE para conferir se a senha já foi configurada (não mostra a senha). */
function verificarSenhaDoPainel() {
  const definida = !!PropertiesService.getScriptProperties().getProperty(CHAVE_SENHA_PAINEL);
  Logger.log(definida
    ? '🟢 Senha configurada. O painel está acessível em ?page=painel'
    : '⚪ Senha NÃO configurada. Rode configurarSenhaDoPainel() — sem isso o painel fica bloqueado.');
}

/** Confere a senha enviada pelo painel. Toda função de dados passa por aqui. */
function senhaConfere_(senha) {
  const correta = PropertiesService.getScriptProperties().getProperty(CHAVE_SENHA_PAINEL);
  if (!correta) return false;
  return String(senha || '') === String(correta);
}


// ═══════════════════════ ROTEAMENTO ═══════════════════════

/** Chamada pelo doGet do main.gs quando a URL tem ?page=painel */
function servirPainel_() {
  return HtmlService.createHtmlOutput(getPainelHTML())
    .setTitle('Painel do RH — Pesquisa de Satisfação')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// ═══════════════════════ DADOS (protegidos por senha) ═══════════════════════

/**
 * Chamada pelo painel via google.script.run.
 * A senha é conferida AQUI, no servidor — a página é pública, então validar
 * apenas no navegador não protegeria nada.
 */
function obterDadosPainel(senha) {
  if (!senhaConfere_(senha)) {
    return { negado: true };
  }

  const registros = lerRespostas_();
  if (!registros || registros.length === 0) {
    return { vazio: true, minimoExterno: MINIMO_EXTERNO, minimoAuto: MINIMO_AUTOAVALIACAO };
  }

  const resultado = agregarRespostas_(registros);

  // ── Áreas ──
  const areas = Object.keys(resultado.areas).sort(compararTexto_).map(function (nome) {
    const a = resultado.areas[nome];
    const temExterno = a.externo.avaliadores >= MINIMO_EXTERNO && a.externo.media !== null;
    const temAuto = a.auto.avaliadores >= MINIMO_AUTOAVALIACAO && a.auto.media !== null;
    const dif = (temExterno && temAuto) ? arredondar_(a.auto.media - a.externo.media) : null;
    return {
      nome: nome,
      nExterno: a.externo.avaliadores,
      nAuto: a.auto.avaliadores,
      notaExterna: temExterno ? arredondar_(a.externo.media) : null,
      notaAuto: temAuto ? arredondar_(a.auto.media) : null,
      diferenca: dif,
      leitura: lerDiferenca_(temExterno, temAuto, dif === null ? '' : dif)
    };
  });

  // ── Critérios consolidados da empresa ──
  const criterios = [];
  PERGUNTAS.filter(function (p) { return p.tipo === 'rating'; }).forEach(function (p) {
    const d = resultado.perguntas[p.nome];
    if (!d || d.externo.media === null) return;
    criterios.push({ nome: p.nome, secao: p.secao, media: arredondar_(d.externo.media), n: d.externo.qtd });
  });
  criterios.sort(function (x, y) { return y.media - x.media; });

  // ── Detalhe: área × critério ──
  const detalhe = {};
  Object.keys(resultado.areas).forEach(function (nomeArea) {
    const a = resultado.areas[nomeArea];
    const liberadoExterno = a.externo.avaliadores >= MINIMO_EXTERNO;
    const liberadoAuto = a.auto.avaliadores >= MINIMO_AUTOAVALIACAO;

    detalhe[nomeArea] = PERGUNTAS.filter(function (p) { return p.tipo === 'rating'; }).map(function (p) {
      const d = a.perguntas[p.nome];
      const ext = (d && d.externo) || { media: null, qtd: 0 };
      const aut = (d && d.auto) || { media: null };
      const temE = liberadoExterno && ext.media !== null;
      const temA = liberadoAuto && aut.media !== null;
      return {
        pergunta: p.nome,
        secao: p.secao,
        externa: temE ? arredondar_(ext.media) : null,
        auto: temA ? arredondar_(aut.media) : null,
        diferenca: (temE && temA) ? arredondar_(aut.media - ext.media) : null
      };
    });
  });

  // ── Comentários (embaralhados, sem ID) ──
  const comentarios = [];
  registros.forEach(function (r) {
    if (r.tipo !== 'texto') return;
    const texto = String(r.resposta || '').trim();
    if (!texto) return;
    const a = resultado.areas[r.area];
    const liberado = a && (r.ehAuto
      ? a.auto.avaliadores >= MINIMO_AUTOAVALIACAO
      : a.externo.avaliadores >= MINIMO_EXTERNO);
    if (!liberado) return;
    comentarios.push({
      area: r.area,
      origem: r.ehAuto ? 'Autoavaliação' : 'Outra área',
      pergunta: r.pergunta,
      texto: texto
    });
  });
  embaralhar_(comentarios);

  // ── Totais ──
  let totalAvaliacoes = 0, somaGeral = 0, qtdGeral = 0;
  Object.keys(resultado.areas).forEach(function (nome) {
    const a = resultado.areas[nome];
    totalAvaliacoes += a.externo.avaliadores + a.auto.avaliadores;
    somaGeral += a.externo.soma; qtdGeral += a.externo.qtd;
  });

  return {
    vazio: false,
    atualizadoEm: Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm"),
    totalAvaliacoes: totalAvaliacoes,
    notaGeral: qtdGeral > 0 ? arredondar_(somaGeral / qtdGeral) : null,
    areas: areas,
    criterios: criterios,
    detalhe: detalhe,
    comentarios: comentarios,
    minimoExterno: MINIMO_EXTERNO,
    minimoAuto: MINIMO_AUTOAVALIACAO,
    perguntasDesconhecidas: resultado.perguntasDesconhecidas
  };
}

/** Botão "Atualizar abas da planilha" — também protegido */
function regerarAbasDaPlanilha(senha) {
  if (!senhaConfere_(senha)) return { negado: true };
  gerarIndicadores();
  return { ok: true };
}


// ═══════════════════════ HTML DO PAINEL ═══════════════════════

function getPainelHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Painel do RH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy:#151E49; --bg:#F6F7F9; --card:#FFFFFF;
      --border:#DADFE7; --muted:#EAEDF1; --muted-fg:#657386;
      --hairline:rgba(21,30,73,0.08);
      --e1:#E63351; --e2:#F47125; --e3:#F9B310; --e4:#73B82E; --e5:#24A85B;
      --suave:cubic-bezier(0.22,1,0.36,1);
      --sombra-1:0 1px 2px rgba(21,30,73,.04), 0 4px 16px rgba(21,30,73,.05);
      --sombra-2:0 2px 6px rgba(21,30,73,.05), 0 16px 40px rgba(21,30,73,.10);
      --sombra-alta:0 8px 24px rgba(21,30,73,.10), 0 32px 64px rgba(21,30,73,.16);
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'Montserrat',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
      background:var(--bg); color:var(--navy); min-height:100vh;
      -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
      font-variant-numeric:tabular-nums;
    }

    /* ── Tela de senha ── */
    .entrada { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
    .caixa-entrada {
      background:var(--card); border:1px solid var(--hairline); border-radius:22px;
      box-shadow:var(--sombra-alta); padding:38px; max-width:400px; width:100%; text-align:center;
    }
    .caixa-entrada .cadeado { font-size:44px; margin-bottom:14px; }
    .caixa-entrada h1 { font-size:20px; font-weight:600; letter-spacing:-.02em; margin-bottom:8px; }
    .caixa-entrada p { font-size:13.5px; color:var(--muted-fg); line-height:1.6; margin-bottom:22px; }
    .erro { color:var(--e1); font-size:12.5px; margin-top:12px; min-height:18px; }

    /* ── Topo ── */
    .topo {
      background:rgba(255,255,255,.86);
      -webkit-backdrop-filter:saturate(180%) blur(20px); backdrop-filter:saturate(180%) blur(20px);
      border-bottom:1px solid var(--hairline);
      padding:14px 24px; position:sticky; top:0; z-index:20;
    }
    .topo-inner { max-width:1160px; margin:0 auto; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .topo h1 { font-size:16px; font-weight:600; letter-spacing:-.02em; }
    .sub { font-size:11.5px; color:var(--muted-fg); }
    .divisor { width:1px; height:26px; background:var(--border); }
    .topo-dir { margin-left:auto; display:flex; align-items:center; gap:10px; }

    .pagina { max-width:1160px; margin:0 auto; padding:24px 20px 60px; }

    .bloco {
      background:var(--card); border:1px solid var(--hairline); border-radius:20px;
      box-shadow:var(--sombra-1); padding:24px; margin-bottom:20px;
    }
    .bloco-titulo { font-size:17px; font-weight:600; letter-spacing:-.018em; margin-bottom:4px; }
    .bloco-sub { font-size:12.5px; color:var(--muted-fg); margin-bottom:20px; line-height:1.55; }

    /* ── KPIs ── */
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:14px; margin-bottom:20px; }
    .kpi { background:var(--card); border:1px solid var(--hairline); border-radius:18px; padding:20px; box-shadow:var(--sombra-1); }
    .kpi .rotulo { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted-fg); margin-bottom:8px; }
    .kpi .valor { font-size:30px; font-weight:700; letter-spacing:-.03em; line-height:1.1; }
    .kpi .nota { font-size:11.5px; color:var(--muted-fg); margin-top:6px; }

    /* ── Barras ── */
    .linha-barra { display:grid; grid-template-columns:minmax(150px,220px) 1fr auto; gap:14px; align-items:center; padding:9px 0; }
    .linha-barra + .linha-barra { border-top:1px solid var(--hairline); }
    .rotulo-area { font-size:13.5px; font-weight:600; display:flex; flex-direction:column; gap:2px; }
    .rotulo-area .secao { font-weight:500; color:var(--muted-fg); font-size:11px; }
    .trilho { background:var(--muted); border-radius:999px; height:9px; overflow:hidden; }
    .preenche { height:100%; border-radius:999px; width:0; transition:width .9s var(--suave); }
    .valor-barra { font-size:13.5px; font-weight:700; min-width:46px; text-align:right; }
    .sem-dado { font-size:11.5px; color:var(--muted-fg); font-style:italic; }

    /* ── Comparação ── */
    .comp { padding:15px 0; }
    .comp + .comp { border-top:1px solid var(--hairline); }
    .comp-topo { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; gap:12px; flex-wrap:wrap; }
    .comp-nome { font-size:14px; font-weight:600; }
    .par { display:grid; grid-template-columns:104px 1fr auto; gap:12px; align-items:center; margin-bottom:7px; }
    .par .leg { font-size:11px; color:var(--muted-fg); font-weight:600; }
    .selo { font-size:11px; font-weight:700; padding:5px 11px; border-radius:999px; }
    .selo-alerta { background:rgba(230,51,81,.10); color:var(--e1); }
    .selo-ok { background:rgba(33,196,93,.12); color:#1e8a4c; }
    .selo-neutro { background:var(--muted); color:var(--muted-fg); }

    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { text-align:left; font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
         color:var(--muted-fg); padding:0 10px 10px; border-bottom:1px solid var(--hairline); }
    td { padding:11px 10px; border-bottom:1px solid var(--hairline); }
    tr:last-child td { border-bottom:none; }
    .num { text-align:right; font-weight:600; }

    select, input {
      font-family:inherit; font-size:13.5px; padding:11px 14px;
      border:1px solid var(--border); border-radius:12px; background:#fff; color:var(--navy);
      transition:border-color .2s ease, box-shadow .25s var(--suave);
    }
    select:focus, input:focus { outline:none; border-color:var(--navy); box-shadow:0 0 0 3px rgba(21,30,73,.08); }

    .btn {
      font-family:inherit; font-size:13.5px; font-weight:600; letter-spacing:-.01em;
      padding:11px 20px; border:none; border-radius:12px; cursor:pointer;
      background:var(--navy); color:#fff;
      transition:transform .25s var(--suave), background .2s ease, box-shadow .25s var(--suave);
    }
    .btn:hover:not(:disabled) { background:#0e1533; box-shadow:var(--sombra-2); }
    .btn:active:not(:disabled) { transform:scale(.98); transition-duration:.09s; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-claro { background:#fff; color:var(--navy); border:1px solid var(--border); box-shadow:var(--sombra-1); }
    .btn-claro:hover:not(:disabled) { background:var(--muted); box-shadow:var(--sombra-2); }
    .btn-largo { width:100%; }

    .comentario { border:1px solid var(--hairline); border-radius:16px; padding:15px 17px; margin-bottom:11px; }
    .comentario-topo { display:flex; align-items:center; gap:8px; margin-bottom:7px; flex-wrap:wrap; }
    .tag { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 9px; border-radius:999px; }
    .tag-area { background:rgba(21,30,73,.08); color:var(--navy); }
    .tag-auto { background:rgba(249,179,16,.18); color:#8a6100; }
    .tag-ext { background:rgba(33,196,93,.12); color:#1e8a4c; }
    .comentario .pergunta { font-size:11.5px; color:var(--muted-fg); margin-bottom:5px; }
    .comentario .texto { font-size:13.5px; line-height:1.6; }

    .aviso { background:rgba(249,179,16,.10); border:1px solid rgba(249,179,16,.3); border-radius:14px;
             padding:14px 16px; font-size:12.5px; line-height:1.6; margin-bottom:20px; }
    .vazio { text-align:center; padding:70px 20px; color:var(--muted-fg); }
    .vazio .emoji { font-size:52px; margin-bottom:14px; }
    .carregando { text-align:center; padding:80px 20px; color:var(--muted-fg); font-size:14px; }
    .oculto { display:none; }

    @media (max-width:640px) {
      .linha-barra { grid-template-columns:1fr auto; }
      .linha-barra .trilho { grid-column:1 / -1; }
      .par { grid-template-columns:86px 1fr auto; }
    }
  </style>
</head>
<body>

  <!-- ── SENHA ── -->
  <div id="telaEntrada" class="entrada">
    <div class="caixa-entrada">
      <div class="cadeado">🔒</div>
      <h1>Painel do RH</h1>
      <p>Esta área mostra os resultados da pesquisa. Informe a senha para continuar.</p>
      <input type="password" id="campoSenha" placeholder="Senha" style="width:100%;text-align:center" autocomplete="current-password">
      <div class="erro" id="erroSenha"></div>
      <button class="btn btn-largo" id="btnEntrar" style="margin-top:6px" onclick="entrar()">Entrar</button>
    </div>
  </div>

  <!-- ── PAINEL ── -->
  <div id="telaPainel" class="oculto">
    <div class="topo">
      <div class="topo-inner">
        <div>
          <h1>Painel do RH</h1>
          <div class="sub">Pesquisa de Satisfação Interdepartamental</div>
        </div>
        <div class="divisor"></div>
        <div class="sub" id="atualizadoEm"></div>
        <div class="topo-dir">
          <button class="btn btn-claro" id="btnPlanilha" onclick="atualizarPlanilha()">Atualizar abas da planilha</button>
          <button class="btn" onclick="carregar()">Recarregar</button>
        </div>
      </div>
    </div>
    <div class="pagina">
      <div id="carregando" class="carregando">Carregando os dados da planilha…</div>
      <div id="conteudo" class="oculto"></div>
    </div>
  </div>

  <script>
    const CORES = ['#E63351','#F47125','#F9B310','#73B82E','#24A85B'];
    let senhaAtual = '';
    let dados = null;

    function corDaNota(n) {
      if (n === null || n === undefined) return '#DADFE7';
      if (n < 2.2) return CORES[0];
      if (n < 2.9) return CORES[1];
      if (n < 3.6) return CORES[2];
      if (n < 4.3) return CORES[3];
      return CORES[4];
    }
    function esc(t) {
      return String(t == null ? '' : t)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function num(v) { return v === null || v === undefined ? '—' : v.toFixed(2).replace('.', ','); }
    function largura(n) { return n === null ? 0 : Math.max(0, Math.min(100, (n / 5) * 100)); }

    // ── Entrada ──
    document.getElementById('campoSenha').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') entrar();
    });

    function entrar() {
      const senha = document.getElementById('campoSenha').value;
      if (!senha) { document.getElementById('erroSenha').textContent = 'Digite a senha.'; return; }
      const btn = document.getElementById('btnEntrar');
      btn.disabled = true; btn.textContent = 'Verificando…';
      document.getElementById('erroSenha').textContent = '';

      google.script.run
        .withSuccessHandler(function (d) {
          btn.disabled = false; btn.textContent = 'Entrar';
          if (d && d.negado) {
            document.getElementById('erroSenha').textContent = 'Senha incorreta.';
            document.getElementById('campoSenha').select();
            return;
          }
          senhaAtual = senha;
          dados = d;
          document.getElementById('telaEntrada').classList.add('oculto');
          document.getElementById('telaPainel').classList.remove('oculto');
          desenhar();
        })
        .withFailureHandler(function (e) {
          btn.disabled = false; btn.textContent = 'Entrar';
          document.getElementById('erroSenha').textContent = 'Erro: ' + (e && e.message ? e.message : e);
        })
        .obterDadosPainel(senha);
    }

    function carregar() {
      document.getElementById('carregando').classList.remove('oculto');
      document.getElementById('conteudo').classList.add('oculto');
      google.script.run
        .withSuccessHandler(function (d) {
          if (d && d.negado) { location.reload(); return; }
          dados = d; desenhar();
        })
        .withFailureHandler(function (e) {
          document.getElementById('carregando').innerHTML =
            '<div style="color:#E63351">Erro ao carregar: ' + esc(e && e.message ? e.message : e) + '</div>';
        })
        .obterDadosPainel(senhaAtual);
    }

    // ── Desenho ──
    function desenhar() {
      document.getElementById('carregando').classList.add('oculto');
      const alvo = document.getElementById('conteudo');
      alvo.classList.remove('oculto');

      if (dados.vazio) {
        document.getElementById('atualizadoEm').textContent = 'sem respostas ainda';
        alvo.innerHTML = '<div class="bloco"><div class="vazio"><div class="emoji">📭</div>' +
          '<div style="font-size:16px;font-weight:600;color:#151E49;margin-bottom:6px">Ainda não há respostas</div>' +
          '<div>Os indicadores aparecem aqui assim que a primeira pessoa responder.</div></div></div>';
        return;
      }

      document.getElementById('atualizadoEm').textContent = 'atualizado em ' + dados.atualizadoEm;
      alvo.innerHTML = blocoAviso() + blocoKPIs() + blocoRanking() + blocoComparacao() +
                       blocoCriterios() + blocoDetalhe() + blocoComentarios();
      ligarInteracoes();

      requestAnimationFrame(function () {
        document.querySelectorAll('[data-largura]').forEach(function (el) {
          el.style.width = el.dataset.largura + '%';
        });
      });
    }

    function blocoAviso() {
      if (!dados.perguntasDesconhecidas || dados.perguntasDesconhecidas.length === 0) return '';
      return '<div class="aviso">⚠️ <strong>Respostas de perguntas que não estão mais no formulário</strong> foram ignoradas nos cálculos: ' +
        esc(dados.perguntasDesconhecidas.join(', ')) + '.</div>';
    }

    function blocoKPIs() {
      const liberadas = dados.areas.filter(function (a) { return a.notaExterna !== null; }).length;
      let maior = null;
      dados.areas.forEach(function (a) {
        if (a.diferenca === null) return;
        if (!maior || Math.abs(a.diferenca) > Math.abs(maior.diferenca)) maior = a;
      });
      return '<div class="kpis">' +
        kpi('Avaliações recebidas', dados.totalAvaliacoes, 'somando todas as áreas') +
        kpi('Nota média da empresa', num(dados.notaGeral), 'percepção entre áreas (0 a 5)') +
        kpi('Áreas com dados', liberadas + '<span style="font-size:18px;color:#657386">/' + dados.areas.length + '</span>',
            'as demais aguardam mais respostas') +
        kpi('Maior desalinhamento',
            maior ? (maior.diferenca > 0 ? '+' : '') + num(maior.diferenca) : '—',
            maior ? esc(maior.nome) : 'ainda sem comparação possível') +
        '</div>';
    }
    function kpi(rotulo, valor, nota) {
      return '<div class="kpi"><div class="rotulo">' + rotulo + '</div><div class="valor">' + valor +
             '</div><div class="nota">' + nota + '</div></div>';
    }

    function blocoRanking() {
      const lista = dados.areas.slice().sort(function (a, b) {
        if (a.notaExterna === null) return 1;
        if (b.notaExterna === null) return -1;
        return b.notaExterna - a.notaExterna;
      });
      const linhas = lista.map(function (a) {
        if (a.notaExterna === null) {
          return '<div class="linha-barra"><div class="rotulo-area">' + esc(a.nome) + '</div>' +
                 '<div class="sem-dado">aguardando ' + dados.minimoExterno + ' avaliações (tem ' + a.nExterno + ')</div>' +
                 '<div class="valor-barra" style="color:#657386">—</div></div>';
        }
        const cor = corDaNota(a.notaExterna);
        return '<div class="linha-barra"><div class="rotulo-area">' + esc(a.nome) +
          '<span class="secao">' + a.nExterno + ' avaliações</span></div>' +
          '<div class="trilho"><div class="preenche" style="background:' + cor + '" data-largura="' + largura(a.notaExterna) + '"></div></div>' +
          '<div class="valor-barra" style="color:' + cor + '">' + num(a.notaExterna) + '</div></div>';
      }).join('');

      return '<div class="bloco"><div class="bloco-titulo">Nota de cada área</div>' +
        '<div class="bloco-sub">Como cada área é avaliada pelas <strong>outras</strong> áreas, de 0 a 5. ' +
        'Áreas com menos de ' + dados.minimoExterno + ' avaliações ficam ocultas para preservar o anonimato.</div>' +
        linhas + '</div>';
    }

    function blocoComparacao() {
      const lista = dados.areas.filter(function (a) { return a.diferenca !== null; })
        .sort(function (a, b) { return Math.abs(b.diferenca) - Math.abs(a.diferenca); });

      if (lista.length === 0) {
        return '<div class="bloco"><div class="bloco-titulo">Autoavaliação × percepção das outras áreas</div>' +
          '<div class="bloco-sub">Nenhuma área tem, ao mesmo tempo, ' + dados.minimoExterno + ' avaliações externas e ' +
          dados.minimoAuto + ' autoavaliações. A comparação aparece quando houver respostas suficientes.</div></div>';
      }

      const blocos = lista.map(function (a) {
        const classe = a.diferenca >= 0.3 ? 'selo-alerta' : (a.diferenca <= -0.3 ? 'selo-ok' : 'selo-neutro');
        return '<div class="comp"><div class="comp-topo"><div class="comp-nome">' + esc(a.nome) + '</div>' +
          '<div class="selo ' + classe + '">' + (a.diferenca > 0 ? '+' : '') + num(a.diferenca) + ' · ' + esc(a.leitura) + '</div></div>' +
          barraComp('Como se vê', a.notaAuto, '#151E49') +
          barraComp('Como a veem', a.notaExterna, corDaNota(a.notaExterna)) + '</div>';
      }).join('');

      return '<div class="bloco"><div class="bloco-titulo">Autoavaliação × percepção das outras áreas</div>' +
        '<div class="bloco-sub">Diferença positiva significa que a área se avalia melhor do que é avaliada pelas outras. ' +
        'Ordenado pelo maior descompasso.</div>' + blocos + '</div>';
    }
    function barraComp(legenda, nota, cor) {
      return '<div class="par"><div class="leg">' + legenda + '</div>' +
        '<div class="trilho"><div class="preenche" style="background:' + cor + '" data-largura="' + largura(nota) + '"></div></div>' +
        '<div class="valor-barra">' + num(nota) + '</div></div>';
    }

    function blocoCriterios() {
      if (!dados.criterios.length) return '';
      const linhas = dados.criterios.map(function (c) {
        const cor = corDaNota(c.media);
        return '<div class="linha-barra"><div class="rotulo-area">' + esc(c.nome) +
          '<span class="secao">' + esc(c.secao) + '</span></div>' +
          '<div class="trilho"><div class="preenche" style="background:' + cor + '" data-largura="' + largura(c.media) + '"></div></div>' +
          '<div class="valor-barra" style="color:' + cor + '">' + num(c.media) + '</div></div>';
      }).join('');
      return '<div class="bloco"><div class="bloco-titulo">Pontos fortes e fracos da empresa</div>' +
        '<div class="bloco-sub">Média de <strong>todas as áreas juntas</strong> em cada critério, do melhor para o pior.</div>' +
        linhas + '</div>';
    }

    function blocoDetalhe() {
      const opcoes = dados.areas.map(function (a) {
        return '<option value="' + esc(a.nome) + '">' + esc(a.nome) + '</option>';
      }).join('');
      return '<div class="bloco"><div class="bloco-titulo">Detalhe por área</div>' +
        '<div class="bloco-sub">Escolha uma área para ver a nota dela em cada critério.</div>' +
        '<select id="seletorArea" style="margin-bottom:18px;min-width:260px">' + opcoes + '</select>' +
        '<div id="detalheArea"></div></div>';
    }
    function desenharDetalhe(area) {
      const linhas = (dados.detalhe[area] || []).map(function (d) {
        const cor = corDaNota(d.externa);
        let dif = '—';
        if (d.diferenca !== null) {
          const c = d.diferenca >= 0.3 ? '#E63351' : (d.diferenca <= -0.3 ? '#24A85B' : '#657386');
          dif = '<span style="color:' + c + '">' + (d.diferenca > 0 ? '+' : '') + num(d.diferenca) + '</span>';
        }
        return '<tr><td><strong>' + esc(d.pergunta) + '</strong>' +
          '<div style="font-size:11px;color:#657386">' + esc(d.secao) + '</div></td>' +
          '<td class="num" style="color:' + cor + '">' + num(d.externa) + '</td>' +
          '<td class="num">' + num(d.auto) + '</td><td class="num">' + dif + '</td></tr>';
      }).join('');
      document.getElementById('detalheArea').innerHTML =
        '<table><thead><tr><th>Critério</th><th style="text-align:right">Outras áreas</th>' +
        '<th style="text-align:right">Autoavaliação</th><th style="text-align:right">Diferença</th></tr></thead>' +
        '<tbody>' + linhas + '</tbody></table>';
    }

    function blocoComentarios() {
      const areas = [];
      dados.comentarios.forEach(function (c) { if (areas.indexOf(c.area) === -1) areas.push(c.area); });
      areas.sort();
      const opcoes = '<option value="">Todas as áreas</option>' +
        areas.map(function (a) { return '<option value="' + esc(a) + '">' + esc(a) + '</option>'; }).join('');

      return '<div class="bloco"><div class="bloco-titulo">O que escreveram</div>' +
        '<div class="bloco-sub">' + dados.comentarios.length + ' comentários, em <strong>ordem aleatória</strong> e sem identificação — ' +
        'não é possível saber quais vieram da mesma pessoa.</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">' +
        '<select id="filtroArea">' + opcoes + '</select>' +
        '<input type="search" id="buscaComentario" placeholder="Buscar no texto…" style="flex:1;min-width:200px">' +
        '</div><div id="listaComentarios"></div></div>';
    }
    function desenharComentarios() {
      const area = document.getElementById('filtroArea').value;
      const busca = document.getElementById('buscaComentario').value.toLowerCase().trim();
      const filtrados = dados.comentarios.filter(function (c) {
        if (area && c.area !== area) return false;
        if (busca && c.texto.toLowerCase().indexOf(busca) === -1) return false;
        return true;
      });

      const alvo = document.getElementById('listaComentarios');
      if (!filtrados.length) {
        alvo.innerHTML = '<div class="vazio" style="padding:40px">Nenhum comentário encontrado com esse filtro.</div>';
        return;
      }
      alvo.innerHTML = filtrados.slice(0, 300).map(function (c) {
        return '<div class="comentario"><div class="comentario-topo">' +
          '<span class="tag tag-area">' + esc(c.area) + '</span>' +
          '<span class="tag ' + (c.origem === 'Autoavaliação' ? 'tag-auto' : 'tag-ext') + '">' + esc(c.origem) + '</span></div>' +
          '<div class="pergunta">' + esc(c.pergunta) + '</div>' +
          '<div class="texto">' + esc(c.texto) + '</div></div>';
      }).join('') +
      (filtrados.length > 300 ? '<div class="sem-dado" style="text-align:center;padding:14px">Mostrando 300 de ' + filtrados.length + '.</div>' : '');
    }

    function ligarInteracoes() {
      const sel = document.getElementById('seletorArea');
      sel.addEventListener('change', function () { desenharDetalhe(sel.value); });
      desenharDetalhe(sel.value);
      document.getElementById('filtroArea').addEventListener('change', desenharComentarios);
      document.getElementById('buscaComentario').addEventListener('input', desenharComentarios);
      desenharComentarios();
    }

    function atualizarPlanilha() {
      const b = document.getElementById('btnPlanilha');
      const original = b.textContent;
      b.disabled = true; b.textContent = 'Atualizando…';
      google.script.run
        .withSuccessHandler(function (r) {
          if (r && r.negado) { location.reload(); return; }
          b.textContent = '✓ Abas atualizadas';
          setTimeout(function () { b.textContent = original; b.disabled = false; }, 2500);
        })
        .withFailureHandler(function (e) {
          b.textContent = 'Erro'; alert('Erro: ' + e);
          setTimeout(function () { b.textContent = original; b.disabled = false; }, 2000);
        })
        .regerarAbasDaPlanilha(senhaAtual);
    }

    document.getElementById('campoSenha').focus();
  </script>
</body>
</html>
  `;
}
