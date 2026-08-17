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
  // Participação: todo envio traz exatamente UM bloco de autoavaliação (a própria
  // área do respondente é sempre a primeira do formulário). Então o nº de blocos
  // de autoavaliação = nº de pessoas que enviaram a pesquisa.
  let totalAvaliacoes = 0, respondentes = 0, somaGeral = 0, qtdGeral = 0;
  Object.keys(resultado.areas).forEach(function (nome) {
    const a = resultado.areas[nome];
    totalAvaliacoes += a.externo.avaliadores + a.auto.avaliadores;
    respondentes += a.auto.avaliadores;
    somaGeral += a.externo.soma; qtdGeral += a.externo.qtd;
  });

  const notaGeral = qtdGeral > 0 ? arredondar_(somaGeral / qtdGeral) : null;
  const participacao = {
    respondentes: respondentes,
    total: TOTAL_COLABORADORES,
    percentual: TOTAL_COLABORADORES > 0
      ? Math.round((respondentes / TOTAL_COLABORADORES) * 100) : null,
    faltam: Math.max(0, TOTAL_COLABORADORES - respondentes),
    porArea: areas.map(function (a) { return { nome: a.nome, respondentes: a.nAuto }; })
                  .sort(function (x, y) { return y.respondentes - x.respondentes; })
  };

  return {
    vazio: false,
    atualizadoEm: Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm"),
    totalAvaliacoes: totalAvaliacoes,
    participacao: participacao,
    notaGeral: notaGeral,
    areas: areas,
    criterios: criterios,
    detalhe: detalhe,
    comentarios: comentarios,
    destaques: montarDestaques_(areas, criterios, notaGeral, participacao),
    automacao: estadoDaAutomacao_(),
    minimoExterno: MINIMO_EXTERNO,
    minimoAuto: MINIMO_AUTOAVALIACAO,
    perguntasDesconhecidas: resultado.perguntasDesconhecidas
  };
}

/**
 * Leituras automáticas dos dados — o que o RH veria se lesse o painel inteiro.
 * São observações factuais (contagens e comparações), não interpretações.
 */
function montarDestaques_(areas, criterios, notaGeral, participacao) {
  const destaques = [];
  const comNota = areas.filter(function (a) { return a.notaExterna !== null; });

  // Participação vem primeiro: sem gente respondendo, nenhum outro número vale.
  if (participacao && participacao.total > 0) {
    const p = participacao;
    destaques.push({
      tipo: p.percentual >= 80 ? 'bom' : p.percentual >= 50 ? 'atencao' : 'alerta',
      texto: p.faltam === 0
        ? '<strong>' + p.respondentes + ' de ' + p.total + ' colaboradores</strong> responderam — a meta foi atingida.'
        : '<strong>' + p.respondentes + ' de ' + p.total + ' colaboradores</strong> responderam (' +
          p.percentual + '%). Faltam <strong>' + p.faltam + '</strong>.'
    });
  }

  const fracas = comNota.filter(function (a) { return a.notaExterna < 3; })
                        .sort(function (x, y) { return x.notaExterna - y.notaExterna; });
  if (fracas.length > 0) {
    destaques.push({
      tipo: 'alerta',
      texto: fracas.length === 1
        ? '<strong>' + fracas[0].nome + '</strong> está abaixo de 3,00 (' + formatarNum_(fracas[0].notaExterna) + ').'
        : '<strong>' + fracas.length + ' áreas</strong> estão abaixo de 3,00: ' +
          fracas.slice(0, 3).map(function (a) { return a.nome + ' (' + formatarNum_(a.notaExterna) + ')'; }).join(', ') +
          (fracas.length > 3 ? ' e mais ' + (fracas.length - 3) + '.' : '.')
    });
  }

  const superestimadas = areas.filter(function (a) { return a.diferenca !== null && a.diferenca >= 0.5; })
                             .sort(function (x, y) { return y.diferenca - x.diferenca; });
  if (superestimadas.length > 0) {
    const a = superestimadas[0];
    destaques.push({
      tipo: 'atencao',
      texto: '<strong>' + a.nome + '</strong> se avalia ' + formatarNum_(a.diferenca) +
             (a.diferenca >= 2 ? ' pontos' : ' ponto') + ' acima do que as outras áreas a avaliam' +
             (superestimadas.length === 2 ? ' — e mais 1 área tem o mesmo padrão.'
              : superestimadas.length > 2 ? ' — e mais ' + (superestimadas.length - 1) + ' áreas têm o mesmo padrão.' : '.')
    });
  }

  if (criterios.length > 1) {
    const melhor = criterios[0], pior = criterios[criterios.length - 1];
    destaques.push({
      tipo: 'info',
      texto: 'Como empresa, o ponto mais forte é <strong>' + melhor.nome + '</strong> (' + formatarNum_(melhor.media) +
             ') e o mais fraco é <strong>' + pior.nome + '</strong> (' + formatarNum_(pior.media) + ').'
    });
  }

  const semDados = areas.length - comNota.length;
  if (semDados > 0) {
    destaques.push({
      tipo: 'info',
      texto: semDados === 1
        ? '<strong>1 área</strong> ainda não atingiu ' + MINIMO_EXTERNO +
          ' avaliações e fica oculta para preservar o anonimato.'
        : '<strong>' + semDados + ' áreas</strong> ainda não atingiram ' + MINIMO_EXTERNO +
          ' avaliações e ficam ocultas para preservar o anonimato.'
    });
  }

  return destaques;
}

function formatarNum_(v) {
  return (v === null || v === undefined) ? '—' : v.toFixed(2).replace('.', ',');
}

/** Diz se a atualização automática das abas está ligada (mostrado no painel) */
function estadoDaAutomacao_() {
  try {
    const ligada = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getHandlerFunction() === 'gerarIndicadores';
    });
    return { ligada: ligada };
  } catch (erro) {
    return { ligada: null };
  }
}

/** Botão "Atualizar abas da planilha" — também protegido */
function regerarAbasDaPlanilha(senha) {
  if (!senhaConfere_(senha)) return { negado: true };
  gerarIndicadores();
  return { ok: true };
}

/**
 * Exporta os comentários filtrados para um arquivo CSV no Drive e devolve o link.
 * Downloads diretos são bloqueados dentro do Apps Script, então gravamos o
 * arquivo e entregamos a URL — o RH clica e baixa/abre normalmente.
 */
function exportarComentarios(senha, area) {
  if (!senhaConfere_(senha)) return { negado: true };

  const dados = obterDadosPainel(senha);
  if (dados.vazio) return { erro: 'Não há comentários para exportar.' };

  const lista = dados.comentarios.filter(function (c) { return !area || c.area === area; });
  if (lista.length === 0) return { erro: 'Nenhum comentário com esse filtro.' };

  function celula(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  const linhas = [['Área Avaliada', 'Origem', 'Pergunta', 'Comentário'].map(celula).join(';')];
  lista.forEach(function (c) {
    linhas.push([c.area, c.origem, c.pergunta, c.texto].map(celula).join(';'));
  });

  // BOM para o Excel abrir os acentos corretamente
  const conteudo = '﻿' + linhas.join('\r\n');
  const nome = 'Comentarios' + (area ? '-' + area.replace(/[^\wÀ-ÿ]+/g, '_') : '') + '-' +
               Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd_HHmm') + '.csv';

  const arquivo = DriveApp.createFile(nome, conteudo, MimeType.CSV);
  return { ok: true, url: arquivo.getUrl(), nome: nome, total: lista.length };
}


// ═══════════════════════ HTML DO PAINEL ═══════════════════════


function getPainelHTML() {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
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
      /* Cores das barras (vivas) */
      --e1:#E63351; --e2:#F47125; --e3:#F9B310; --e4:#73B82E; --e5:#24A85B;
      /* Versões escuras para TEXTO — as vivas não têm contraste suficiente sobre branco */
      --t1:#C42342; --t2:#B44A0C; --t3:#8A6100; --t4:#4A7A18; --t5:#1B7A44;
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
    a { color:#065CA9; }
    :focus-visible { outline:none; box-shadow:0 0 0 2px #fff, 0 0 0 4px #065CA9; border-radius:8px; }

    /* ── Tela de senha ── */
    .entrada { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
    .caixa-entrada {
      background:var(--card); border:1px solid var(--hairline); border-radius:22px;
      box-shadow:var(--sombra-alta); padding:38px; max-width:400px; width:100%; text-align:center;
    }
    .caixa-entrada .cadeado { font-size:44px; margin-bottom:14px; }
    .caixa-entrada h1 { font-size:20px; font-weight:600; letter-spacing:-.02em; margin-bottom:8px; }
    .caixa-entrada p { font-size:13.5px; color:var(--muted-fg); line-height:1.6; margin-bottom:22px; }
    .erro { color:var(--t1); font-size:12.5px; margin-top:12px; min-height:18px; }

    /* ── Topo ── */
    .topo {
      background:rgba(255,255,255,.88);
      -webkit-backdrop-filter:saturate(180%) blur(20px); backdrop-filter:saturate(180%) blur(20px);
      border-bottom:1px solid var(--hairline);
      padding:12px 24px; position:sticky; top:0; z-index:30;
    }
    .topo-inner { max-width:1180px; margin:0 auto; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .topo h1 { font-size:17px; font-weight:700; letter-spacing:-.022em; }
    .sub { font-size:11.5px; color:var(--muted-fg); }
    .divisor { width:1px; height:26px; background:var(--border); }
    .topo-dir { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

    /* ── Índice ── */
    .indice {
      background:rgba(255,255,255,.94);
      -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
      border-bottom:1px solid var(--hairline);
      position:sticky; top:57px; z-index:25; padding:0 24px;
    }
    .indice-inner { max-width:1180px; margin:0 auto; display:flex; gap:2px; overflow-x:auto; }
    .indice a {
      font-size:12.5px; font-weight:600; color:var(--muted-fg); text-decoration:none;
      padding:12px 14px; white-space:nowrap; border-bottom:2px solid transparent;
      transition:color .2s ease, border-color .2s ease;
    }
    .indice a:hover { color:var(--navy); }
    .indice a.ativo { color:var(--navy); border-bottom-color:var(--navy); }

    .pagina { max-width:1180px; margin:0 auto; padding:24px 20px 80px; }

    .bloco {
      background:var(--card); border:1px solid var(--hairline); border-radius:20px;
      box-shadow:var(--sombra-1); padding:26px; margin-bottom:20px;
      scroll-margin-top:110px;
    }
    /* Hierarquia: página > seção > card */
    .bloco > h2 { font-size:19px; font-weight:700; letter-spacing:-.022em; margin-bottom:5px; display:flex; align-items:center; gap:9px; }
    .bloco-sub { font-size:12.5px; color:var(--muted-fg); margin-bottom:20px; line-height:1.55; max-width:75ch; }

    /* ── Destaques automáticos ── */
    .destaques { display:flex; flex-direction:column; gap:9px; margin-bottom:20px; }
    .destaque { display:flex; gap:11px; align-items:flex-start; padding:14px 17px; border-radius:15px; font-size:13.5px; line-height:1.55; }
    .destaque .ic { font-size:16px; line-height:1.3; flex-shrink:0; }
    .d-alerta  { background:rgba(230,51,81,.07);  border:1px solid rgba(230,51,81,.20); }
    .d-atencao { background:rgba(249,179,16,.09); border:1px solid rgba(249,179,16,.28); }
    .d-info    { background:rgba(21,30,73,.035);  border:1px solid var(--hairline); }
    .d-bom     { background:rgba(22,140,74,.07);  border:1px solid rgba(22,140,74,.22); }

    /* ── KPIs ── */
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:20px; }
    .kpi { background:var(--card); border:1px solid var(--hairline); border-radius:18px; padding:20px; box-shadow:var(--sombra-1); }
    .kpi-topo { display:flex; align-items:center; gap:7px; margin-bottom:9px; }
    /* Barra do cartão de participação: 0–100%, não 0–5 — por isso sem as marcas. */
    .kpi .trilho-fino { height:7px; margin:9px 0 7px; }
    .kpi .trilho-fino::before { display:none; }
    /* Barra de contagem de pessoas: não é escala 0–5, então sem as marcas. */
    .trilho-liso::before { display:none; }
    .kpi .ic { font-size:14px; }
    .kpi .rotulo { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted-fg); }
    .kpi .valor { font-size:31px; font-weight:700; letter-spacing:-.03em; line-height:1.1; }
    .kpi .nota { font-size:11.5px; color:var(--muted-fg); margin-top:6px; line-height:1.45; }
    .ajuda {
      display:inline-flex; align-items:center; justify-content:center;
      width:15px; height:15px; border-radius:50%; background:var(--muted); color:var(--muted-fg);
      font-size:9.5px; font-weight:700; cursor:help; flex-shrink:0;
    }

    /* ── Legenda de cores ── */
    .legenda { display:flex; gap:16px; flex-wrap:wrap; align-items:center; margin-bottom:18px;
               padding:11px 15px; background:var(--bg); border-radius:13px; font-size:11.5px; color:var(--muted-fg); }
    .legenda-item { display:flex; align-items:center; gap:6px; }
    .bolinha { width:11px; height:11px; border-radius:3px; }

    /* ── Barras com escala 0–5 visível ── */
    .grafico { position:relative; }
    .linha-barra { display:grid; grid-template-columns:minmax(150px,230px) 1fr auto; gap:14px; align-items:center; padding:10px 0; }
    .linha-barra + .linha-barra { border-top:1px solid var(--hairline); }
    .rotulo-area { font-size:13.5px; font-weight:600; display:flex; flex-direction:column; gap:2px; }
    .rotulo-area .secao { font-weight:500; color:var(--muted-fg); font-size:11px; }
    .trilho { background:var(--muted); border-radius:999px; height:10px; position:relative; overflow:hidden; }
    /* marcas de 1 a 4 — deixam a escala 0–5 evidente */
    .trilho::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:repeating-linear-gradient(to right, transparent, transparent calc(20% - 1px), rgba(21,30,73,.14) calc(20% - 1px), rgba(21,30,73,.14) 20%);
    }
    .preenche { height:100%; border-radius:999px; width:0; transition:width .9s var(--suave); position:relative; }
    .valor-barra { font-size:13.5px; font-weight:700; min-width:46px; text-align:right; }
    .escala-eixo { display:grid; grid-template-columns:minmax(150px,230px) 1fr auto; gap:14px; margin-top:6px; }
    .escala-marcas { display:flex; justify-content:space-between; font-size:10px; color:var(--muted-fg); font-weight:600; }
    .sem-dado { font-size:11.5px; color:var(--muted-fg); font-style:italic; }

    /* ── Comparação ── */
    .comp { padding:15px 0; }
    .comp + .comp { border-top:1px solid var(--hairline); }
    .comp-topo { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; gap:12px; flex-wrap:wrap; }
    .comp-nome { font-size:14px; font-weight:600; }
    .par { display:grid; grid-template-columns:132px 1fr auto; gap:12px; align-items:center; margin-bottom:7px; }
    .par .leg { font-size:11.5px; color:var(--muted-fg); font-weight:600; display:flex; align-items:center; gap:5px; }
    .selo { font-size:11px; font-weight:700; padding:5px 11px; border-radius:999px; }
    .selo-alerta { background:rgba(230,51,81,.10); color:var(--t1); }
    .selo-ok { background:rgba(33,196,93,.14); color:var(--t5); }
    .selo-neutro { background:var(--muted); color:var(--muted-fg); }

    table { width:100%; border-collapse:collapse; font-size:13px; }
    caption { text-align:left; font-size:12.5px; color:var(--muted-fg); padding-bottom:12px; }
    th { text-align:left; font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
         color:var(--muted-fg); padding:0 10px 10px; border-bottom:1px solid var(--hairline); }
    td { padding:11px 10px; border-bottom:1px solid var(--hairline); }
    tr:last-child td { border-bottom:none; }
    .num { text-align:right; font-weight:600; }

    label.rotulo-campo { display:block; font-size:11px; font-weight:700; letter-spacing:.04em;
                         text-transform:uppercase; color:var(--muted-fg); margin-bottom:6px; }
    select, input {
      font-family:inherit; font-size:13.5px; padding:11px 14px;
      border:1px solid var(--border); border-radius:12px; background:#fff; color:var(--navy);
      transition:border-color .2s ease, box-shadow .25s var(--suave);
    }
    select:focus, input:focus { outline:none; border-color:var(--navy); box-shadow:0 0 0 3px rgba(21,30,73,.08); }
    .campos { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; align-items:flex-end; }

    .btn {
      font-family:inherit; font-size:13.5px; font-weight:600; letter-spacing:-.01em;
      padding:11px 18px; border:none; border-radius:12px; cursor:pointer;
      background:var(--navy); color:#fff;
      transition:transform .25s var(--suave), background .2s ease, box-shadow .25s var(--suave);
    }
    .btn:hover:not(:disabled) { background:#0e1533; box-shadow:var(--sombra-2); }
    .btn:active:not(:disabled) { transform:scale(.98); transition-duration:.09s; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-claro { background:#fff; color:var(--navy); border:1px solid var(--border); box-shadow:var(--sombra-1); }
    .btn-claro:hover:not(:disabled) { background:var(--muted); box-shadow:var(--sombra-2); }
    .btn-largo { width:100%; }
    .btn-pequeno { font-size:12.5px; padding:9px 15px; }

    /* ── Gráfico de aranha ── */
    .radar-caixa { display:flex; flex-direction:column; align-items:center; gap:6px; margin:6px 0 22px; }
    .radar { width:100%; max-width:520px; height:auto; display:block; overflow:visible; }
    .opcoes-radar { display:flex; flex-wrap:wrap; gap:10px 22px; margin:14px 0 4px; }
    .marcador {
      display:inline-flex; align-items:center; gap:8px; font-size:13px; color:#3C4763;
      cursor:pointer; user-select:none;
    }
    .marcador input { width:15px; height:15px; accent-color:var(--navy); cursor:pointer; margin:0; }

    /* ── Termos mais citados ── */
    .termos { display:flex; flex-wrap:wrap; gap:8px; }
    .termo {
      font-family:inherit; border:1px solid var(--border); background:#fff; color:var(--navy);
      border-radius:999px; padding:7px 14px; cursor:pointer; transition:all .2s var(--suave);
    }
    .termo:hover { border-color:var(--navy); background:var(--muted); }
    .termo .qtd { color:var(--muted-fg); font-weight:600; font-size:11px; margin-left:5px; }

    /* ── Comentários ── */
    .comentario { border:1px solid var(--hairline); border-radius:16px; padding:15px 17px; margin-bottom:11px; }
    .comentario-topo { display:flex; align-items:center; gap:8px; margin-bottom:7px; flex-wrap:wrap; }
    .tag { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 9px; border-radius:999px; }
    .tag-area { background:rgba(21,30,73,.08); color:var(--navy); }
    .tag-auto { background:rgba(249,179,16,.18); color:var(--t3); }
    .tag-ext { background:rgba(33,196,93,.13); color:var(--t5); }
    .comentario .pergunta { font-size:11.5px; color:var(--muted-fg); margin-bottom:5px; }
    .comentario .texto { font-size:13.5px; line-height:1.6; }
    .comentario mark { background:rgba(249,179,16,.35); color:inherit; padding:1px 2px; border-radius:3px; }

    .aviso { background:rgba(249,179,16,.10); border:1px solid rgba(249,179,16,.3); border-radius:14px;
             padding:14px 16px; font-size:12.5px; line-height:1.6; margin-bottom:20px; }
    .vazio { text-align:center; padding:60px 20px; color:var(--muted-fg); }
    .vazio .emoji { font-size:52px; margin-bottom:14px; }
    .carregando { text-align:center; padding:80px 20px; color:var(--muted-fg); font-size:14px; }
    .oculto { display:none; }
    .visualmente-oculto { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

    /* ── Responsivo ── */
    @media (max-width:900px) {
      .linha-barra, .escala-eixo { grid-template-columns:1fr auto; }
      .linha-barra .trilho { grid-column:1 / -1; grid-row:2; }
      .escala-eixo .escala-marcas { grid-column:1 / -1; }
      .par { grid-template-columns:110px 1fr auto; }
      .bloco { padding:20px; border-radius:18px; }
      .kpi .valor { font-size:27px; }
    }
    @media (max-width:600px) {
      /* No celular o topo rola junto (senão come 1/3 da tela); quem fica fixo é o índice. */
      .topo { padding:10px 14px; position:static; }
      .topo h1 { font-size:16px; }
      .divisor { display:none; }
      .topo-dir {
        width:100%; margin-left:0; flex-wrap:nowrap;
        overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px;
      }
      .topo-dir .btn { flex:0 0 auto; white-space:nowrap; padding:8px 12px; font-size:12.5px; }
      .indice { top:0; padding:0 14px; }
      .pagina { padding:16px 14px 60px; }
      .bloco { padding:17px; }
      .bloco > h2 { font-size:17px; }
      .par { grid-template-columns:1fr; gap:4px; }
      .par .leg { margin-top:6px; }
      .campos > * { width:100%; }
      table { font-size:12px; }
      td, th { padding:9px 6px; }
    }

    /* ── Impressão / PDF ── */
    @media print {
      body { background:#fff; }
      .topo, .indice, .campos, .opcoes-radar, .btn, .termos, .nao-imprime { display:none !important; }
      .bloco { break-inside:avoid; page-break-inside:avoid; box-shadow:none; border:1px solid #ccc; margin-bottom:14px; }
      .preenche { transition:none !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .comentario { break-inside:avoid; }
      .pagina { padding:0; max-width:none; }
    }
  </style>
</head>
<body>

  <!-- ══ SENHA ══ -->
  <main id="telaEntrada" class="entrada">
    <div class="caixa-entrada">
      <div class="cadeado" aria-hidden="true">🔒</div>
      <h1>Painel do RH</h1>
      <p>Esta área mostra os resultados da pesquisa. Informe a senha para continuar.</p>
      <label class="visualmente-oculto" for="campoSenha">Senha do painel</label>
      <input type="password" id="campoSenha" placeholder="Senha" style="width:100%;text-align:center" autocomplete="current-password">
      <div class="erro" id="erroSenha" role="alert"></div>
      <button class="btn btn-largo" id="btnEntrar" style="margin-top:6px" onclick="entrar()">Entrar</button>
    </div>
  </main>

  <!-- ══ PAINEL ══ -->
  <div id="telaPainel" class="oculto">
    <header class="topo">
      <div class="topo-inner">
        <div>
          <h1>Painel do RH</h1>
          <div class="sub">Pesquisa de Satisfação Interdepartamental</div>
        </div>
        <div class="divisor" aria-hidden="true"></div>
        <div class="sub" id="atualizadoEm"></div>
        <div class="topo-dir">
          <button class="btn btn-claro btn-pequeno" onclick="window.print()"
                  title="Abre a janela de impressão do navegador — escolha 'Salvar como PDF' para gerar um arquivo.">🖨️ Imprimir / PDF</button>
          <button class="btn btn-claro btn-pequeno" id="btnPlanilha" onclick="atualizarPlanilha()"
                  title="Regrava as abas PAINEL, POR_PERGUNTA, RESUMO_PERGUNTAS e COMENTARIOS na planilha do Google. Use quando for exportar ou abrir no Looker Studio.">Regravar abas da planilha</button>
          <button class="btn btn-pequeno" onclick="carregar()"
                  title="Busca as respostas mais recentes da planilha e redesenha o painel.">↻ Buscar dados novos</button>
        </div>
      </div>
    </header>

    <nav class="indice" id="indice" aria-label="Seções do painel">
      <div class="indice-inner">
        <a href="#s-visao">Visão geral</a>
        <a href="#s-participacao">Participação</a>
        <a href="#s-areas">Notas por área</a>
        <a href="#s-auto">Autoavaliação</a>
        <a href="#s-criterios">Pontos fortes e fracos</a>
        <a href="#s-detalhe">Detalhe por área</a>
        <a href="#s-comentarios">Comentários</a>
      </div>
    </nav>

    <main class="pagina">
      <div id="carregando" class="carregando">Carregando os dados da planilha…</div>
      <div id="conteudo" class="oculto"></div>
    </main>
  </div>

  <script>
    const CORES = ['#E63351','#F47125','#F9B310','#73B82E','#24A85B'];
    const CORES_TEXTO = ['#C42342','#B44A0C','#8A6100','#4A7A18','#1B7A44'];
    const FAIXAS = [
      { ate: 2.2, rotulo: 'Crítico (abaixo de 2,2)' },
      { ate: 2.9, rotulo: 'Ruim (2,2 a 2,9)' },
      { ate: 3.6, rotulo: 'Regular (2,9 a 3,6)' },
      { ate: 4.3, rotulo: 'Bom (3,6 a 4,3)' },
      { ate: 99,  rotulo: 'Ótimo (acima de 4,3)' }
    ];
    // Palavras sem valor analítico — removidas da contagem de termos
    const VAZIAS = ('a o e de da do das dos que para com em no na nos nas um uma uns umas por se ao aos as os ' +
      'não sim mais menos muito muita pouco pouca ser está estao estão sao são tem têm ter foi era como mas ' +
      'quando onde qual quais isso isto esse essa este esta aquele aquela nosso nossa seu sua meu minha ' +
      'area areas área áreas setor setores equipe time pessoal galera sempre nunca ainda já também apenas ' +
      'pode podem poderia deve devem precisa precisam fazer faz feito bem melhor pior nada tudo todos todas ' +
      'sobre entre até desde após antes durante porque pois então assim outro outra outros outras cada ' +
      'lhe nos vos eles elas ele ela eu tu você vocês nós').split(/\\s+/);

    let senhaAtual = '';
    let dados = null;
    let comentariosVisiveis = 50;
    const POR_PAGINA = 50;

    function faixaDe(n) {
      if (n === null || n === undefined) return -1;
      for (let i = 0; i < FAIXAS.length; i++) if (n < FAIXAS[i].ate) return i;
      return FAIXAS.length - 1;
    }
    function corDaNota(n) { const i = faixaDe(n); return i < 0 ? '#DADFE7' : CORES[i]; }
    function corDoTexto(n) { const i = faixaDe(n); return i < 0 ? '#657386' : CORES_TEXTO[i]; }
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
          senhaAtual = senha; dados = d;
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
          dados = d; comentariosVisiveis = POR_PAGINA; desenhar();
        })
        .withFailureHandler(function (e) {
          document.getElementById('carregando').innerHTML =
            '<div style="color:#C42342">Erro ao carregar: ' + esc(e && e.message ? e.message : e) + '</div>';
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
        alvo.innerHTML = '<section class="bloco"><div class="vazio"><div class="emoji">📭</div>' +
          '<div style="font-size:16px;font-weight:600;color:#151E49;margin-bottom:6px">Ainda não há respostas</div>' +
          '<div>Os indicadores aparecem aqui assim que a primeira pessoa responder.</div></div></section>';
        return;
      }

      let atualiz = 'atualizado em ' + dados.atualizadoEm;
      if (dados.automacao && dados.automacao.ligada) atualiz += ' · abas atualizam sozinhas todo dia';
      document.getElementById('atualizadoEm').textContent = atualiz;

      alvo.innerHTML = blocoAviso() + blocoVisaoGeral() + blocoParticipacao() + blocoRanking() + blocoComparacao() +
                       blocoCriterios() + blocoDetalhe() + blocoComentarios();
      ligarInteracoes();

      requestAnimationFrame(function () {
        document.querySelectorAll('[data-largura]').forEach(function (el) {
          el.style.width = el.dataset.largura + '%';
        });
      });
    }

    function blocoAviso() {
      if (!dados.perguntasDesconhecidas || !dados.perguntasDesconhecidas.length) return '';
      return '<div class="aviso">⚠️ <strong>Respostas de perguntas que não estão mais no formulário</strong> foram ignoradas nos cálculos: ' +
        esc(dados.perguntasDesconhecidas.join(', ')) + '.</div>';
    }

    // ── Visão geral: destaques + KPIs ──
    function blocoVisaoGeral() {
      const destaques = (dados.destaques || []).map(function (d) {
        const ic = d.tipo === 'alerta' ? '🔴' : d.tipo === 'atencao' ? '🟡' : d.tipo === 'bom' ? '🟢' : 'ℹ️';
        return '<div class="destaque d-' + d.tipo + '"><span class="ic" aria-hidden="true">' + ic + '</span><div>' + d.texto + '</div></div>';
      }).join('');

      const liberadas = dados.areas.filter(function (a) { return a.notaExterna !== null; }).length;
      const total = dados.areas.length;
      const faltam = total - liberadas;
      let maior = null;
      dados.areas.forEach(function (a) {
        if (a.diferenca === null) return;
        if (!maior || Math.abs(a.diferenca) > Math.abs(maior.diferenca)) maior = a;
      });

      const p = dados.participacao;
      const kpis = '<div class="kpis">' +
        kpiParticipacao(p) +
        kpi('👥', 'Avaliações recebidas', dados.totalAvaliacoes, 'somando todas as áreas',
            'Cada avaliação é uma pessoa avaliando uma área. Quem avalia 5 áreas gera 5 avaliações — ' +
            'por isso este número é bem maior que o de pessoas.') +
        kpi('📊', 'Nota média da empresa', num(dados.notaGeral), 'percepção entre áreas, de 0 a 5',
            'Média de todas as notas que as áreas deram umas às outras. Não inclui autoavaliações.') +
        kpi('🔓', 'Áreas com dados', liberadas + '<span style="font-size:19px;color:#657386">/' + total + '</span>',
            faltam === 0 ? 'todas atingiram o mínimo de respostas'
                         : faltam + ' ainda ' + (faltam === 1 ? 'aguarda' : 'aguardam') + ' mais respostas',
            'Uma área só tem seus números exibidos depois de receber ' + dados.minimoExterno +
            ' avaliações. Abaixo disso, a média revelaria opiniões individuais.') +
        kpi('⚖️', 'Maior desalinhamento',
            maior ? (maior.diferenca > 0 ? '+' : '') + num(maior.diferenca) : '—',
            maior ? esc(maior.nome) : 'ainda sem comparação possível',
            'Maior distância entre como uma área se avalia e como as outras a avaliam. ' +
            'Positivo = a área se vê melhor do que a veem.') +
        '</div>';

      return '<section class="bloco" id="s-visao"><h2>Visão geral</h2>' +
        '<div class="bloco-sub">Leitura automática dos dados — o que salta aos olhos sem precisar percorrer o painel inteiro.</div>' +
        (destaques ? '<div class="destaques">' + destaques + '</div>' : '') + kpis + '</section>';
    }
    function kpiParticipacao(p) {
      if (!p || !p.total) return '';
      const cor = p.percentual >= 80 ? '#168C4A' : p.percentual >= 50 ? '#F9B310' : '#E63351';
      const largura = Math.min(100, p.percentual);
      const ajuda = 'Quantas pessoas enviaram a pesquisa, de ' + p.total + ' colaboradores. ' +
        'Contado pelos blocos de autoavaliação: cada envio tem exatamente um.';
      return '<div class="kpi"><div class="kpi-topo"><span class="ic" aria-hidden="true">🙋</span>' +
        '<span class="rotulo">Participação</span>' +
        '<span class="ajuda" title="' + esc(ajuda) + '" role="img" aria-label="' + esc(ajuda) + '">?</span></div>' +
        '<div class="valor">' + p.respondentes +
        '<span style="font-size:19px;color:#657386">/' + p.total + '</span></div>' +
        '<div class="trilho trilho-fino" role="img" aria-label="' + p.percentual + '% de participação">' +
        '<div class="preenche" style="background:' + cor + '" data-largura="' + largura + '"></div></div>' +
        '<div class="nota">' + p.percentual + '% — ' +
        (p.faltam === 0 ? 'meta atingida' : 'faltam ' + p.faltam) + '</div></div>';
    }

    function kpi(icone, rotulo, valor, nota, ajuda) {
      return '<div class="kpi"><div class="kpi-topo"><span class="ic" aria-hidden="true">' + icone + '</span>' +
        '<span class="rotulo">' + rotulo + '</span>' +
        '<span class="ajuda" title="' + esc(ajuda) + '" role="img" aria-label="' + esc(ajuda) + '">?</span></div>' +
        '<div class="valor">' + valor + '</div><div class="nota">' + nota + '</div></div>';
    }

    // ── Participação por área ──
    function blocoParticipacao() {
      const p = dados.participacao;
      if (!p || !p.total) return '';

      const maxArea = p.porArea.reduce(function (m, a) { return Math.max(m, a.respondentes); }, 0);
      const linhas = p.porArea.map(function (a) {
        const larg = maxArea > 0 ? (a.respondentes / maxArea) * 100 : 0;
        return '<div class="linha-barra"><div class="rotulo-area">' + esc(a.nome) + '</div>' +
          '<div class="trilho trilho-liso" role="img" aria-label="' + a.respondentes + ' pessoas">' +
          '<div class="preenche" style="background:#2C7BE5" data-largura="' + larg + '"></div></div>' +
          '<div class="numero" style="color:#151E49">' + a.respondentes + '</div></div>';
      }).join('');

      const escalaNota = 'Barra proporcional à área que mais respondeu (' + maxArea + ') — ' +
        'serve para comparar áreas entre si, não é percentual concluído.';

      return '<section class="bloco" id="s-participacao"><h2>Participação</h2>' +
        '<div class="bloco-sub">Quantas pessoas de cada área já enviaram a pesquisa. ' +
        'Total esperado: <strong>' + p.total + ' colaboradores</strong> — ajuste em ' +
        '<code>TOTAL_COLABORADORES</code> no <code>sheets.gs</code> se o quadro mudar.</div>' +
        '<div class="bloco-sub" style="margin-bottom:12px">' + escalaNota + '</div>' +
        '<div class="grafico">' + linhas + '</div>' +
        '<div class="aviso" style="margin-top:16px">' +
        '<strong>Como este número é contado:</strong> cada envio da pesquisa contém exatamente uma ' +
        'autoavaliação (a própria área do respondente), então contamos essas autoavaliações. ' +
        'Não há identificação de quem respondeu — só quantos, e de qual área. ' +
        'É contagem de <em>envios</em>: como a trava de reenvio é por navegador, quem responder ' +
        'duas vezes conta duas vezes. Se o total passar de ' + p.total + ', é isso.' +
        '</div></section>';
    }

    // ── Legenda + eixo ──
    function legenda() {
      return '<div class="legenda"><strong style="color:#151E49">Escala:</strong>' +
        FAIXAS.map(function (f, i) {
          return '<span class="legenda-item"><span class="bolinha" style="background:' + CORES[i] + '"></span>' + f.rotulo + '</span>';
        }).join('') + '</div>';
    }
    function eixo() {
      return '<div class="escala-eixo"><div></div><div class="escala-marcas">' +
        '<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><div style="min-width:46px"></div></div>';
    }
    function barra(nota, cor, rotuloAcessivel) {
      return '<div class="trilho" role="img" aria-label="' + esc(rotuloAcessivel) + '">' +
        '<div class="preenche" style="background:' + cor + '" data-largura="' + largura(nota) + '"></div></div>';
    }

    // ── Ranking de áreas ──
    function blocoRanking() {
      return '<section class="bloco" id="s-areas"><h2>Nota de cada área</h2>' +
        '<div class="bloco-sub">Como cada área é avaliada pelas <strong>outras</strong> áreas, numa escala fixa de 0 a 5. ' +
        'Áreas com menos de ' + dados.minimoExterno + ' avaliações ficam ocultas para preservar o anonimato.</div>' +
        legenda() +
        '<div class="campos"><div><label class="rotulo-campo" for="ordemAreas">Ordenar por</label>' +
        '<select id="ordemAreas"><option value="nota">Maior nota</option><option value="nota-asc">Menor nota</option>' +
        '<option value="respostas">Mais avaliações</option><option value="alfabetica">Ordem alfabética</option></select></div></div>' +
        '<div class="grafico" id="graficoAreas"></div>' + eixo() + '</section>';
    }
    function desenharRanking() {
      const ordem = document.getElementById('ordemAreas').value;
      const lista = dados.areas.slice().sort(function (a, b) {
        if (ordem === 'alfabetica') return a.nome.localeCompare(b.nome, 'pt-BR');
        if (ordem === 'respostas') return b.nExterno - a.nExterno;
        if (a.notaExterna === null) return 1;
        if (b.notaExterna === null) return -1;
        return ordem === 'nota-asc' ? a.notaExterna - b.notaExterna : b.notaExterna - a.notaExterna;
      });

      document.getElementById('graficoAreas').innerHTML = lista.map(function (a) {
        if (a.notaExterna === null) {
          return '<div class="linha-barra"><div class="rotulo-area">' + esc(a.nome) + '</div>' +
                 '<div class="sem-dado">aguardando ' + dados.minimoExterno + ' avaliações (tem ' + a.nExterno + ')</div>' +
                 '<div class="valor-barra" style="color:#657386">—</div></div>';
        }
        return '<div class="linha-barra"><div class="rotulo-area">' + esc(a.nome) +
          '<span class="secao">' + a.nExterno + ' avaliações</span></div>' +
          barra(a.notaExterna, corDaNota(a.notaExterna), a.nome + ': nota ' + num(a.notaExterna) + ' de 5') +
          '<div class="valor-barra" style="color:' + corDoTexto(a.notaExterna) + '">' + num(a.notaExterna) + '</div></div>';
      }).join('');
      requestAnimationFrame(function () {
        document.querySelectorAll('#graficoAreas [data-largura]').forEach(function (el) { el.style.width = el.dataset.largura + '%'; });
      });
    }

    // ── Autoavaliação × externo ──
    function blocoComparacao() {
      const lista = dados.areas.filter(function (a) { return a.diferenca !== null; })
        .sort(function (a, b) { return Math.abs(b.diferenca) - Math.abs(a.diferenca); });

      if (!lista.length) {
        return '<section class="bloco" id="s-auto"><h2>Autoavaliação × percepção das outras áreas</h2>' +
          '<div class="bloco-sub">Nenhuma área tem, ao mesmo tempo, ' + dados.minimoExterno + ' avaliações externas e ' +
          dados.minimoAuto + ' autoavaliações. A comparação aparece quando houver respostas suficientes.</div></section>';
      }

      const blocos = lista.map(function (a) {
        const classe = a.diferenca >= 0.3 ? 'selo-alerta' : (a.diferenca <= -0.3 ? 'selo-ok' : 'selo-neutro');
        return '<div class="comp"><div class="comp-topo"><div class="comp-nome">' + esc(a.nome) + '</div>' +
          '<div class="selo ' + classe + '">' + (a.diferenca > 0 ? '+' : '') + num(a.diferenca) + ' · ' + esc(a.leitura) + '</div></div>' +
          '<div class="par"><div class="leg"><span aria-hidden="true">🪞</span> Como se vê</div>' +
            barra(a.notaAuto, '#151E49', a.nome + ', autoavaliação: ' + num(a.notaAuto)) +
            '<div class="valor-barra">' + num(a.notaAuto) + '</div></div>' +
          '<div class="par"><div class="leg"><span aria-hidden="true">👁️</span> Como a veem</div>' +
            barra(a.notaExterna, corDaNota(a.notaExterna), a.nome + ', percepção externa: ' + num(a.notaExterna)) +
            '<div class="valor-barra" style="color:' + corDoTexto(a.notaExterna) + '">' + num(a.notaExterna) + '</div></div>' +
          '</div>';
      }).join('');

      return '<section class="bloco" id="s-auto"><h2>Autoavaliação × percepção das outras áreas</h2>' +
        '<div class="bloco-sub">🪞 é como a área se avalia; 👁️ é como as outras a avaliam. ' +
        'Diferença positiva significa que a área se vê melhor do que é vista. Ordenado pelo maior descompasso.</div>' +
        blocos + '</section>';
    }

    // ── Critérios ──
    function blocoCriterios() {
      if (!dados.criterios.length) return '';
      const linhas = dados.criterios.map(function (c) {
        return '<div class="linha-barra"><div class="rotulo-area">' + esc(c.nome) +
          '<span class="secao">' + esc(c.secao) + '</span></div>' +
          barra(c.media, corDaNota(c.media), c.nome + ': ' + num(c.media) + ' de 5') +
          '<div class="valor-barra" style="color:' + corDoTexto(c.media) + '">' + num(c.media) + '</div></div>';
      }).join('');
      return '<section class="bloco" id="s-criterios"><h2>Pontos fortes e fracos da empresa</h2>' +
        '<div class="bloco-sub">Média de <strong>todas as áreas juntas</strong> em cada critério, do melhor para o pior.</div>' +
        '<div class="grafico">' + linhas + '</div>' + eixo() + '</section>';
    }

    // ── Detalhe / comparação entre áreas ──
    // ── Gráfico de aranha (radar) ──
    // SVG montado à mão: o Apps Script bloqueia bibliotecas externas (CSP).
    const ROTULO_CURTO = {
      'Clareza da comunicação': 'Clareza',
      'Cordialidade': 'Cordialidade',
      'Velocidade de resposta': 'Velocidade',
      'Cumprimento de prazos (SLA)': 'Prazos',
      'Qualidade das soluções entregues': 'Qualidade',
      'Parceria estratégica': 'Parceria',
      'Grau de esforço / simplicidade': 'Esforço'
    };
    const CORES_SERIE = ['#2C7BE5', '#9B51E0', '#E8833A'];

    function curto(nome) {
      return ROTULO_CURTO[nome] || String(nome).split(/[\s/]+/)[0];
    }

    /**
     * series: [{ nome, cor, valores:[n|null], tracejado:bool }]
     * eixos:  [nome do critério] — sempre na ordem do formulário
     * Escala fixa 0–5, igual às barras do resto do painel.
     */
    function radar(eixos, series) {
      const n = eixos.length;
      if (n < 3) return '';
      const cx = 260, cy = 215, R = 140, MAX = 5;

      function ponto(i, valor) {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (Math.max(0, Math.min(MAX, valor)) / MAX) * R;
        return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
      }
      function anelPontos(valor) {
        const p = [];
        for (let i = 0; i < n; i++) { const q = ponto(i, valor); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
        return p.join(' ');
      }

      // teia: anéis de 1 a 5
      let teia = '';
      for (let v = 1; v <= MAX; v++) {
        teia += '<polygon points="' + anelPontos(v) + '" fill="none" stroke="rgba(21,30,73,' +
                (v === MAX ? '.28' : '.12') + ')" stroke-width="1"/>';
      }
      // raios + rótulos
      let raios = '', rotulos = '';
      for (let i = 0; i < n; i++) {
        const fim = ponto(i, MAX);
        raios += '<line x1="' + cx + '" y1="' + cy + '" x2="' + fim[0].toFixed(1) + '" y2="' + fim[1].toFixed(1) +
                 '" stroke="rgba(21,30,73,.14)" stroke-width="1"/>';
        const rot = ponto(i, MAX + 0.62);
        const dx = rot[0] - cx;
        const anchor = Math.abs(dx) < 12 ? 'middle' : (dx > 0 ? 'start' : 'end');
        rotulos += '<text x="' + rot[0].toFixed(1) + '" y="' + (rot[1] + 4).toFixed(1) + '" text-anchor="' + anchor +
                   '" font-size="12.5" font-weight="600" fill="#151E49">' + esc(curto(eixos[i])) + '</text>';
      }
      // números da escala — desenhados por cima das séries, com halo branco
      let marcas = '';
      for (let v = 1; v < MAX; v++) {   // o 5 é a própria borda externa
        const q = ponto(0, v);
        marcas += '<text x="' + (cx + 6) + '" y="' + (q[1] + 3.5).toFixed(1) +
                  '" font-size="9.5" fill="#8A94A6" paint-order="stroke" stroke="#fff" stroke-width="3" ' +
                  'stroke-linejoin="round">' + v + '</text>';
      }

      // séries
      let formas = '', legenda = '', descricao = [];
      const desenhaveis = series.filter(function (s) {
        let q = 0;
        for (let i = 0; i < n; i++) if (s.valores[i] !== null && s.valores[i] !== undefined) q++;
        return q >= 3;
      }).length;
      // Com 3+ camadas as manchas se somam e viram borrão: aí vale só o contorno.
      const opacidade = desenhaveis > 2 ? '.05' : '.14';

      series.forEach(function (s) {
        const validos = [];
        for (let i = 0; i < n; i++) if (s.valores[i] !== null && s.valores[i] !== undefined) validos.push(i);
        if (validos.length < 3) return;   // polígono não fecha — melhor não desenhar

        const pts = validos.map(function (i) {
          const q = ponto(i, s.valores[i]);
          return q[0].toFixed(1) + ',' + q[1].toFixed(1);
        }).join(' ');

        formas += '<polygon points="' + pts + '" fill="' + s.cor + '" fill-opacity="' + (s.tracejado ? '.04' : opacidade) +
                  '" stroke="' + s.cor + '" stroke-width="2.2" stroke-linejoin="round"' +
                  (s.tracejado ? ' stroke-dasharray="5 4"' : '') + '/>';
        validos.forEach(function (i) {
          const q = ponto(i, s.valores[i]);
          formas += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.2" fill="' + s.cor +
                    '"><title>' + esc(s.nome + ' — ' + curto(eixos[i]) + ': ' + num(s.valores[i])) + '</title></circle>';
        });

        legenda += '<span class="legenda-item"><span class="bolinha" style="background:' + s.cor +
                   (s.tracejado ? ';opacity:.55' : '') + '"></span>' + esc(s.nome) + '</span>';
        descricao.push(s.nome + ': ' + validos.map(function (i) {
          return curto(eixos[i]) + ' ' + num(s.valores[i]);
        }).join(', '));
      });

      if (!formas) return '<div class="aviso">Sem dados suficientes para desenhar o gráfico.</div>';

      return '<div class="radar-caixa">' +
        '<svg viewBox="0 38 520 350" class="radar" role="img" aria-label="' +
        esc('Gráfico de aranha, escala 0 a 5. ' + descricao.join('. ')) + '">' +
        teia + raios + formas + marcas + rotulos + '</svg>' +
        '<div class="legenda" style="margin-top:4px">' + legenda + '</div></div>';
    }

    function blocoDetalhe() {
      const opcoes = dados.areas.map(function (a) { return '<option value="' + esc(a.nome) + '">' + esc(a.nome) + '</option>'; }).join('');
      return '<section class="bloco" id="s-detalhe"><h2>Detalhe por área</h2>' +
        '<div class="bloco-sub">Escolha uma área para ver a nota em cada critério. Adicione uma segunda ou terceira para comparar lado a lado.</div>' +
        '<div class="campos">' +
        '<div><label class="rotulo-campo" for="areaA">Área</label><select id="areaA">' + opcoes + '</select></div>' +
        '<div><label class="rotulo-campo" for="areaB">Comparar com</label><select id="areaB"><option value="">— nenhuma —</option>' + opcoes + '</select></div>' +
        '<div><label class="rotulo-campo" for="areaC">E com</label><select id="areaC"><option value="">— nenhuma —</option>' + opcoes + '</select></div>' +
        '</div>' +
        '<div class="opcoes-radar">' +
        '<label class="marcador"><input type="checkbox" id="radarEmpresa" checked> Comparar com a média da empresa</label>' +
        '<label class="marcador"><input type="checkbox" id="radarAuto"> Mostrar a autoavaliação da 1ª área</label>' +
        '</div>' +
        '<div id="radarArea"></div>' +
        '<div id="detalheArea" style="overflow-x:auto"></div></section>';
    }
    function desenharDetalhe() {
      const escolhidas = ['areaA','areaB','areaC']
        .map(function (id) { return document.getElementById(id).value; })
        .filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });
      if (!escolhidas.length) { document.getElementById('detalheArea').innerHTML = ''; return; }

      const criterios = (dados.detalhe[escolhidas[0]] || []).map(function (d) { return { nome: d.pergunta, secao: d.secao }; });

      const cabecalho = '<tr><th>Critério</th>' + escolhidas.map(function (a) {
        return '<th style="text-align:right">' + esc(a) + '</th>';
      }).join('') + (escolhidas.length === 1 ? '<th style="text-align:right">Autoavaliação</th><th style="text-align:right">Diferença</th>' : '') + '</tr>';

      const corpo = criterios.map(function (c) {
        let linha = '<td><strong>' + esc(c.nome) + '</strong><div style="font-size:11px;color:#657386">' + esc(c.secao) + '</div></td>';
        escolhidas.forEach(function (area) {
          const d = (dados.detalhe[area] || []).filter(function (x) { return x.pergunta === c.nome; })[0];
          const v = d ? d.externa : null;
          linha += '<td class="num" style="color:' + corDoTexto(v) + '">' + num(v) + '</td>';
        });
        if (escolhidas.length === 1) {
          const d = (dados.detalhe[escolhidas[0]] || []).filter(function (x) { return x.pergunta === c.nome; })[0];
          let dif = '—';
          if (d && d.diferenca !== null) {
            const cor = d.diferenca >= 0.3 ? '#C42342' : (d.diferenca <= -0.3 ? '#1B7A44' : '#657386');
            dif = '<span style="color:' + cor + '">' + (d.diferenca > 0 ? '+' : '') + num(d.diferenca) + '</span>';
          }
          linha += '<td class="num">' + num(d ? d.auto : null) + '</td><td class="num">' + dif + '</td>';
        }
        return '<tr>' + linha + '</tr>';
      }).join('');

      document.getElementById('detalheArea').innerHTML =
        '<table><caption>Notas dadas pelas outras áreas, por critério (escala 0 a 5).</caption>' +
        '<thead>' + cabecalho + '</thead><tbody>' + corpo + '</tbody></table>';

      desenharRadar(escolhidas, criterios);
    }

    function desenharRadar(escolhidas, criterios) {
      const eixos = criterios.map(function (c) { return c.nome; });
      const series = [];

      function valores(area, campo) {
        return eixos.map(function (nome) {
          const d = (dados.detalhe[area] || []).filter(function (x) { return x.pergunta === nome; })[0];
          return d ? d[campo] : null;
        });
      }

      escolhidas.forEach(function (area, i) {
        series.push({ nome: area, cor: CORES_SERIE[i % CORES_SERIE.length], valores: valores(area, 'externa') });
      });

      if (document.getElementById('radarAuto').checked && escolhidas.length) {
        series.push({
          nome: escolhidas[0] + ' (autoavaliação)',
          cor: CORES_SERIE[0], tracejado: true,
          valores: valores(escolhidas[0], 'auto')
        });
      }

      if (document.getElementById('radarEmpresa').checked) {
        const porNome = {};
        dados.criterios.forEach(function (c) { porNome[c.nome] = c.media; });
        series.push({
          nome: 'Média da empresa', cor: '#657386', tracejado: true,
          valores: eixos.map(function (nome) {
            return porNome[nome] === undefined ? null : porNome[nome];
          })
        });
      }

      document.getElementById('radarArea').innerHTML = radar(eixos, series);
    }

    // ── Comentários ──
    function blocoComentarios() {
      const areas = [];
      dados.comentarios.forEach(function (c) { if (areas.indexOf(c.area) === -1) areas.push(c.area); });
      areas.sort();
      const perguntas = [];
      dados.comentarios.forEach(function (c) { if (perguntas.indexOf(c.pergunta) === -1) perguntas.push(c.pergunta); });

      return '<section class="bloco" id="s-comentarios"><h2>O que escreveram</h2>' +
        '<div class="bloco-sub">' + dados.comentarios.length + ' comentários, em <strong>ordem aleatória</strong> e sem identificação — ' +
        'não é possível saber quais vieram da mesma pessoa.</div>' +
        '<div id="blocoTermos" style="margin-bottom:20px"></div>' +
        '<div class="campos">' +
        '<div><label class="rotulo-campo" for="filtroArea">Área</label><select id="filtroArea"><option value="">Todas</option>' +
          areas.map(function (a) { return '<option value="' + esc(a) + '">' + esc(a) + '</option>'; }).join('') + '</select></div>' +
        '<div><label class="rotulo-campo" for="filtroPergunta">Pergunta</label><select id="filtroPergunta"><option value="">Todas</option>' +
          perguntas.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('') + '</select></div>' +
        '<div style="flex:1;min-width:200px"><label class="rotulo-campo" for="buscaComentario">Buscar no texto</label>' +
          '<input type="search" id="buscaComentario" placeholder="palavra ou trecho…" style="width:100%"></div>' +
        '<button class="btn btn-claro" id="btnExportar" onclick="exportar()" title="Gera um arquivo CSV no seu Google Drive com os comentários da área selecionada.">⬇️ Exportar CSV</button>' +
        '</div><div id="avisoExport" class="nao-imprime"></div>' +
        '<div id="listaComentarios"></div>' +
        '<div id="paginacao" style="text-align:center;margin-top:16px" class="nao-imprime"></div></section>';
    }

    function comentariosFiltrados() {
      const area = document.getElementById('filtroArea').value;
      const pergunta = document.getElementById('filtroPergunta').value;
      const busca = document.getElementById('buscaComentario').value.toLowerCase().trim();
      return dados.comentarios.filter(function (c) {
        if (area && c.area !== area) return false;
        if (pergunta && c.pergunta !== pergunta) return false;
        if (busca && c.texto.toLowerCase().indexOf(busca) === -1) return false;
        return true;
      });
    }

    // Nomes das áreas viram ruído na contagem: aparecem em quase todo comentário
    // e a área já está no crachá de cada card e no filtro acima.
    let vaziasArea = null;
    function palavrasDeArea() {
      if (vaziasArea) return vaziasArea;
      vaziasArea = {};
      (dados && dados.areas ? dados.areas : []).forEach(function (a) {
        a.nome.toLowerCase().replace(/[^\\wÀ-ÿ\\s]/g, ' ').split(/\\s+/).forEach(function (p) {
          if (p.length >= 4) vaziasArea[p] = true;
        });
      });
      return vaziasArea;
    }

    function desenharTermos() {
      const lista = comentariosFiltrados();
      const daArea = palavrasDeArea();
      const contagem = {};
      lista.forEach(function (c) {
        const palavras = c.texto.toLowerCase().replace(/[^\\wÀ-ÿ\\s]/g, ' ').split(/\\s+/);
        const jaContadas = {};
        palavras.forEach(function (p) {
          if (p.length < 4) return;
          if (VAZIAS.indexOf(p) !== -1) return;
          if (daArea[p]) return;
          if (jaContadas[p]) return;      // conta uma vez por comentário
          jaContadas[p] = true;
          contagem[p] = (contagem[p] || 0) + 1;
        });
      });
      const top = Object.keys(contagem).map(function (p) { return { p: p, n: contagem[p] }; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, 18);

      document.getElementById('blocoTermos').innerHTML = top.length < 3 ? '' :
        '<div class="bloco-sub" style="margin-bottom:9px"><strong>Termos mais citados</strong> — clique para filtrar. ' +
        'Contagem simples de palavras, uma vez por comentário.</div><div class="termos">' +
        top.map(function (t) {
          return '<button class="termo" onclick="filtrarPorTermo(\\'' + esc(t.p) + '\\')">' +
                 esc(t.p) + '<span class="qtd">' + t.n + '</span></button>';
        }).join('') + '</div>';
    }
    function filtrarPorTermo(termo) {
      document.getElementById('buscaComentario').value = termo;
      comentariosVisiveis = POR_PAGINA;
      desenharComentarios();
      document.getElementById('s-comentarios').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function realcar(texto, busca) {
      if (!busca) return esc(texto);
      const partes = String(texto).split(new RegExp('(' + busca.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi'));
      return partes.map(function (p, i) { return i % 2 ? '<mark>' + esc(p) + '</mark>' : esc(p); }).join('');
    }

    function desenharComentarios() {
      const filtrados = comentariosFiltrados();
      const busca = document.getElementById('buscaComentario').value.trim();
      const alvo = document.getElementById('listaComentarios');
      const pag = document.getElementById('paginacao');

      if (!filtrados.length) {
        alvo.innerHTML = '<div class="vazio" style="padding:40px">Nenhum comentário encontrado com esses filtros.</div>';
        pag.innerHTML = ''; desenharTermos(); return;
      }

      const mostrando = Math.min(comentariosVisiveis, filtrados.length);
      alvo.innerHTML = filtrados.slice(0, mostrando).map(function (c) {
        return '<article class="comentario"><div class="comentario-topo">' +
          '<span class="tag tag-area">' + esc(c.area) + '</span>' +
          '<span class="tag ' + (c.origem === 'Autoavaliação' ? 'tag-auto' : 'tag-ext') + '">' + esc(c.origem) + '</span></div>' +
          '<div class="pergunta">' + esc(c.pergunta) + '</div>' +
          '<div class="texto">' + realcar(c.texto, busca) + '</div></article>';
      }).join('');

      pag.innerHTML = mostrando < filtrados.length
        ? '<div class="sem-dado" style="margin-bottom:10px">Mostrando ' + mostrando + ' de ' + filtrados.length + '</div>' +
          '<button class="btn btn-claro" onclick="verMais()">Carregar mais ' +
          Math.min(POR_PAGINA, filtrados.length - mostrando) + '</button>'
        : '<div class="sem-dado">' + filtrados.length + ' comentário(s) — fim da lista.</div>';

      desenharTermos();
    }
    function verMais() { comentariosVisiveis += POR_PAGINA; desenharComentarios(); }

    function exportar() {
      const b = document.getElementById('btnExportar');
      const area = document.getElementById('filtroArea').value;
      const original = b.textContent;
      b.disabled = true; b.textContent = 'Gerando…';
      document.getElementById('avisoExport').innerHTML = '';

      google.script.run
        .withSuccessHandler(function (r) {
          b.disabled = false; b.textContent = original;
          if (r && r.negado) { location.reload(); return; }
          if (r && r.erro) { document.getElementById('avisoExport').innerHTML = '<div class="aviso">' + esc(r.erro) + '</div>'; return; }
          document.getElementById('avisoExport').innerHTML =
            '<div class="aviso">✅ <strong>' + r.total + ' comentários exportados.</strong> ' +
            'O arquivo <em>' + esc(r.nome) + '</em> foi salvo no seu Google Drive — ' +
            '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">abrir agora</a>.</div>';
        })
        .withFailureHandler(function (e) {
          b.disabled = false; b.textContent = original;
          document.getElementById('avisoExport').innerHTML = '<div class="aviso">Erro ao exportar: ' + esc(e && e.message ? e.message : e) + '</div>';
        })
        .exportarComentarios(senhaAtual, area);
    }

    // ── Ligações ──
    function ligarInteracoes() {
      document.getElementById('ordemAreas').addEventListener('change', desenharRanking);
      desenharRanking();

      ['areaA','areaB','areaC','radarEmpresa','radarAuto'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', desenharDetalhe);
      });
      desenharDetalhe();

      ['filtroArea','filtroPergunta'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', function () { comentariosVisiveis = POR_PAGINA; desenharComentarios(); });
      });
      document.getElementById('buscaComentario').addEventListener('input', function () { comentariosVisiveis = POR_PAGINA; desenharComentarios(); });
      comentariosVisiveis = POR_PAGINA;
      desenharComentarios();

      ativarIndice();
    }

    // Marca no índice a seção visível
    function ativarIndice() {
      const secoes = ['s-visao','s-areas','s-auto','s-criterios','s-detalhe','s-comentarios']
        .map(function (id) { return document.getElementById(id); }).filter(Boolean);
      const links = Array.prototype.slice.call(document.querySelectorAll('.indice a'));
      if (!('IntersectionObserver' in window)) return;
      const obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) { l.classList.toggle('ativo', l.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-120px 0px -70% 0px' });
      secoes.forEach(function (s) { obs.observe(s); });
    }

    function atualizarPlanilha() {
      const b = document.getElementById('btnPlanilha');
      const original = b.textContent;
      b.disabled = true; b.textContent = 'Atualizando…';
      google.script.run
        .withSuccessHandler(function (r) {
          if (r && r.negado) { location.reload(); return; }
          b.textContent = '✓ Abas regravadas';
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
