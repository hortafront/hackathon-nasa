// Painel da astronauta: caso de sono.
// Busca os dados da API ou da reserva local, mostra os estados
// carregando | vazio | insuficiente | ok | erro e atualiza a cada 10 s.
// O check-in da manhã fica na página de check-ins (checkins.js).
// O front não calcula avaliação nem aplica regra clínica: só mostra o que
// os dados trazem (formato de avaliacao_sono.py e schema.sql).
(function () {
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel");
  var aviso = document.getElementById("aviso-painel");
  var ultimo = null; // última resposta exibida (preservada em caso de falha)
  var ciclos = null;
  var cicloAberto = null;
  var sequenciaCiclo = 0;

  function $(id) { return document.getElementById(id); }

  // Data pedida no endereço (?data=AAAA-MM-DD); sem ela, o painel mostra hoje.
  var dataParam = (function () {
    var valor = new URLSearchParams(window.location.search).get("data") || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
  })();

  function hojeTexto() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // "2026-11-10" → "10/11/2026"
  function dataCompleta(texto) {
    var p = texto.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  // Data local do despertar, tirada de fim_sono como em servico_sono.py.
  function dataDe(registro) {
    return registro.fim_sono.slice(0, 10);
  }

  function definirEstado(estado) {
    painel.setAttribute("data-estado", estado);
    painel.setAttribute("data-tem-dados", ultimo ? "sim" : "nao");
  }

  // Avaliação atual = a mais recente da lista.
  function avaliacaoAtual(sono) {
    return sono.avaliacoes.length ? sono.avaliacoes[sono.avaliacoes.length - 1] : null;
  }

  // Noites a destacar no gráfico: as da indicação amarela mais recente.
  function datasDestacadas(sono) {
    var amarelas = sono.avaliacoes.filter(function (a) { return a.estado === "amarelo"; });
    if (!amarelas.length) return [];
    return amarelas[amarelas.length - 1].noites_consideradas.map(function (n) { return n.data_sono; });
  }

  function linhaBaseHoras(sono) {
    return sono.linha_base ? sono.linha_base.duracao_media_horas : null;
  }

  // ---------- Desenho da tela ----------

  function mostrarAstronauta(dados) {
    var a = dados.astronauta;
    $("nome-astronauta").textContent = F.textoExibicao(a.nome_exibicao);
    $("identificacao-astronauta").textContent = a.identificacao;
    var t = $("atualizado-em");
    t.dateTime = dados.atualizado_em;
    t.textContent = F.dataHora(dados.atualizado_em);
  }

  function mostrarAreas(dados) {
    $("estado-geral-selo").innerHTML = F.selo(dados.estado_geral.estado);
    $("estado-geral-texto").textContent = dados.estado_geral.explicacao;

    // A atualização a cada 10 s recria os cartões: guarda quais detalhes
    // estavam abertos para não fechá-los na cara de quem está lendo.
    var lista = $("lista-areas");
    var abertos = {};
    lista.querySelectorAll("li[data-area] details[open]").forEach(function (d) {
      abertos[d.closest("li").getAttribute("data-area")] = true;
    });
    lista.replaceChildren();
    dados.areas.forEach(function (area) {
      var li = document.createElement("li");
      li.className = "area area--" + area.estado;
      li.setAttribute("data-area", area.id);
      // Áreas com tela própria viram link.
      var destino = { sono: "#sono", mente: "checkins.html#noite", cognicao: "teste-reacao.html" }[area.id];
      var nome = document.createElement(destino ? "a" : "p");
      nome.className = "area-nome";
      nome.textContent = area.nome;
      if (destino) nome.href = destino;
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(area.estado); // rótulos fixos de formato.js
      var resumo = document.createElement("p");
      resumo.className = "area-resumo";
      resumo.textContent = area.resumo;
      li.append(nome, selo, resumo);
      // No modo API, áreas sem rota vêm de dados-demo.js: avisar.
      if (area.local) {
        var origem = document.createElement("p");
        origem.className = "area-origem";
        origem.textContent = "Fixed local example; not calculated from records.";
        li.appendChild(origem);
      }
      // Data histórica: o aviso fica uma vez só, na faixa de data do topo.
      if (area.estado === "dados_insuficientes" && area.ultimo_registro) {
        var u = area.ultimo_registro;
        li.appendChild(paragrafo("Latest available record: " + u.valor + " " + F.textoExibicao(u.unidade) +
          " at " + F.dataHora(u.registrado_em) + " (" + F.textoExibicao(u.origem) + "); insufficient for this assessment.", "nota"));
      }
      if ((area.dados && area.dados.length) || area.linha_base) {
        var detalhes = document.createElement("details");
        detalhes.open = !!abertos[area.id];
        var sumario = document.createElement("summary");
        sumario.textContent = "View data and baseline";
        detalhes.appendChild(sumario);
        if (area.linha_base) {
          detalhes.appendChild(paragrafo("Fictional baseline: " + area.linha_base.valor + " " + area.linha_base.unidade + " (" + F.textoExibicao(area.linha_base.origem) + ")."));
        }
        (area.dados || []).forEach(function (d) {
          var valor = d.valor !== undefined ? d.valor + " " + d.unidade :
            (d.estresse !== undefined ? "stress " + d.estresse + " out of 5" : F.duracao(d.duracao_horas));
          detalhes.appendChild(paragrafo((d.data || d.data_sono || "") + ": " + valor +
            " (" + (F.textoExibicao(d.origem) || "source not provided") + ")" +
            (d.registrado_em ? "; " + F.dataHora(d.registrado_em) : "") + "."));
        });
        li.appendChild(detalhes);
      }
      if (area.orientacao) li.appendChild(paragrafo("Illustrative next step: " + area.orientacao, "nota"));
      lista.appendChild(li);
    });

    // Vermelho = situação apresentada como urgente: não esperar reavaliação.
    var vermelhas = dados.areas.filter(function (a) { return a.estado === "vermelho"; });
    var alerta = $("alerta-urgente");
    alerta.hidden = vermelhas.length === 0;
    alerta.textContent = vermelhas.length
      ? vermelhas.map(function (a) { return a.nome; }).join(", ") +
        " in red (demonstration example): presented as urgent. " +
        "Seek medical help immediately without waiting for reassessment. This prototype does not send alerts."
      : "";
  }

  function desenharGrafico(sono) {
    window.RagaGrafico.desenharSono($("grafico-sono"), sono.registros, linhaBaseHoras(sono), datasDestacadas(sono));
  }

  function mostrarSono(sono) {
    var vazio = sono.registros.length === 0;
    $("sono-vazio").hidden = !vazio;
    $("sono-conteudo").hidden = vazio;
    if (vazio) return;

    var lb = sono.linha_base;
    if (lb) {
      $("linha-base-texto").textContent = F.duracao(lb.duracao_media_horas) + " per night";
      $("linha-base-descricao").textContent = "Fictional average from " + F.dia(lb.periodo_inicio) +
        " to " + F.dia(lb.periodo_fim) + ", average quality " + lb.qualidade_media +
        " (source: " + F.textoExibicao(lb.origem) + "). The actual baseline method is yet to be defined.";
    } else {
      $("linha-base-texto").textContent = "not available";
      $("linha-base-descricao").textContent = "Without a baseline, the demonstration rule cannot assess sleep.";
    }

    desenharGrafico(sono);
    mostrarTabela(sono);
  }

  function mostrarTabela(sono) {
    var destacadas = datasDestacadas(sono);
    var corpo = $("tabela-sono");
    corpo.replaceChildren();
    sono.registros.forEach(function (r) {
      var situacao = "—";
      if (destacadas.indexOf(dataDe(r)) !== -1) situacao = "Contributed to yellow indication";
      if (r.nao_avaliado) situacao = "Check-in from this tab, not yet assessed";
      var tr = document.createElement("tr");
      [
        F.dia(r.noite_em),
        F.duracao(r.duracao_horas),
        F.hora(r.inicio_sono) + " to " + F.hora(r.fim_sono),
        String(r.qualidade),
        String(r.interrupcoes),
        F.textoExibicao(r.origem),
        situacao
      ].forEach(function (texto, i) {
        var celula = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) celula.scope = "row";
        celula.textContent = texto;
        tr.appendChild(celula);
      });
      corpo.appendChild(tr);
    });
  }

  function mostrarAvaliacao(sono) {
    var av = avaliacaoAtual(sono);
    var pendente = $("avaliacao-pendente");
    $("avaliacao-ausente").hidden = !!av;
    $("avaliacao-conteudo").hidden = !av;

    // Check-ins locais chegaram depois da avaliação e não foram avaliados.
    var locais = sono.registros.filter(function (r) { return r.nao_avaliado; });
    pendente.hidden = locais.length === 0;
    if (locais.length) {
      pendente.textContent = "The check-in for " +
        locais.map(function (r) { return F.dia(r.noite_em); }).join(", ") +
        " has not yet been assessed. Without a server, this demonstration does not recalculate the assessment.";
    }
    if (!av) {
      // Sem avaliação, o aviso de pendência aparece fora do bloco escondido.
      $("avaliacao-ausente").after(pendente);
      return;
    }
    $("avaliacao-regra").before(pendente);

    $("avaliacao-selo").innerHTML = F.selo(av.estado);
    $("avaliacao-explicacao").textContent = F.textoExibicao(av.explicacao);
    $("avaliacao-regra").textContent = F.origemRegra(av.origem_regra);

    // Noites usadas pela regra, com os detalhes do registro de cada uma.
    var noites = av.noites_consideradas;
    $("avaliacao-dados-bloco").hidden = noites.length === 0;
    $("avaliacao-dados-titulo").textContent = av.estado === "amarelo"
      ? "Data behind the indication"
      : "Nights considered";
    var lista = $("avaliacao-dados");
    lista.replaceChildren();
    noites.forEach(function (n) {
      var registro = sono.registros.filter(function (r) { return dataDe(r) === n.data_sono; })[0];
      var texto = "Wake date " + F.dia(n.data_sono) + ": " + F.duracao(n.duracao_horas);
      if (registro) {
        texto += ", quality " + registro.qualidade + ", " + registro.interrupcoes +
          " interruptions (" + F.textoExibicao(registro.origem) + ")";
      }
      var li = document.createElement("li");
      li.textContent = texto;
      lista.appendChild(li);
    });
    if (noites.length && av.linha_base_horas !== null) {
      var item = document.createElement("li");
      item.textContent = "Fictional baseline: " + F.duracao(av.linha_base_horas);
      lista.appendChild(item);
    }

    var temOrientacao = !!av.orientacao;
    $("orientacao-bloco").hidden = !temOrientacao;
    if (temOrientacao) {
      $("orientacao-texto").textContent = F.textoExibicao(av.orientacao);
      $("reavaliar-texto").textContent = av.reavaliar_em_horas
        ? "In " + av.reavaliar_em_horas + " h: from " +
          F.diaMaisHoras(av.data_avaliacao, av.reavaliar_em_horas) + ", using the next night's record."
        : "No timeframe provided.";
    }

    var t = $("avaliado-em");
    t.dateTime = av.data_avaliacao;
    t.textContent = F.dia(av.data_avaliacao);
    var hoje = new Date();
    var dataLocal = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
    $("avaliacao-antiga").hidden = av.data_avaliacao >= dataLocal;

    mostrarAcompanhamento(sono.avaliacoes);
  }

  // Lista do ciclo: indicação → reavaliação (só se houver mais de uma).
  function mostrarAcompanhamento(avaliacoes) {
    $("acompanhamento-bloco").hidden = avaliacoes.length < 2;
    $("acompanhamento-resumo").textContent = "Retrospective assessments (" + avaliacoes.length + " dates)";
    var lista = $("lista-acompanhamento");
    lista.replaceChildren();
    avaliacoes.forEach(function (av, i) {
      var li = document.createElement("li");
      var titulo = document.createElement("p");
      titulo.className = "acompanhamento-titulo";
      var quando = document.createElement("time");
      quando.dateTime = av.data_avaliacao;
      quando.textContent = F.dia(av.data_avaliacao);
      titulo.append(quando, document.createTextNode(": calculated assessment"));
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(av.estado); // rótulos fixos de formato.js
      var texto = document.createElement("p");
      texto.className = "area-resumo";
      texto.textContent = F.textoExibicao(av.explicacao) + (av.orientacao ? " Guidance: " + F.textoExibicao(av.orientacao) : "");
      li.append(titulo, selo, texto);
      lista.appendChild(li);
    });
  }

  // ---------- Acompanhamento persistido de sono ----------

  function paragrafo(texto, classe) {
    var elemento = document.createElement("p");
    if (classe) elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
  }

  function resumoAvaliacao(av) {
    var noites = av.noites_consideradas.map(function (n) {
      return F.dia(n.data_sono) + ": " + F.duracao(n.duracao_horas) + " (" + F.textoExibicao(n.origem) + ")";
    });
    return F.textoExibicao(av.explicacao) + (av.linha_base_horas !== null ? " Fictional baseline: " + F.duracao(av.linha_base_horas) + "." : "") +
      (noites.length ? " Nights: " + noites.join(", ") + "." : "");
  }

  function mostrarCiclos() {
    cicloAberto = ciclos.filter(function (c) { return !c.encerrado_em; })[0] || null;
    var temAcao = cicloAberto && cicloAberto.eventos.some(function (e) { return e.tipo === "acao"; });
    var usadas = ciclos.map(function (c) { return c.data_indicacao; });
    ciclos.forEach(function (c) {
      c.eventos.forEach(function (e) { if (e.tipo === "reavaliacao") usadas.push(e.data_avaliacao); });
    });
    var ultimaData = usadas.sort().slice(-1)[0] || "";
    var amarelas = ultimo.sono.avaliacoes.filter(function (a) {
      return a.estado === "amarelo" && a.data_avaliacao > ultimaData;
    });
    var seletor = $("ciclo-data-indicacao");
    var selecionada = seletor.value;
    seletor.replaceChildren();
    amarelas.forEach(function (av) {
      var opcao = document.createElement("option");
      opcao.value = av.data_avaliacao;
      opcao.textContent = F.dia(av.data_avaliacao) + " (" + av.data_avaliacao + ")";
      seletor.appendChild(opcao);
    });
    if (amarelas.some(function (a) { return a.data_avaliacao === selecionada; })) seletor.value = selecionada;
    else if (amarelas.length) seletor.value = amarelas[amarelas.length - 1].data_avaliacao;
    $("form-iniciar-ciclo").hidden = !!cicloAberto || !amarelas.length;
    $("ciclo-sem-amarela").hidden = !!cicloAberto || !!amarelas.length;
    $("ciclo-acao-bloco").hidden = !cicloAberto || !!temAcao;
    $("form-reavaliar-ciclo").hidden = !cicloAberto || !temAcao;
    var campoData = $("ciclo-data-reavaliacao");
    var registros = ultimo.sono.registros;
    if (cicloAberto && !campoData.value && registros.length) {
      campoData.value = dataDe(registros[registros.length - 1]);
    }

    var lista = $("ciclo-lista");
    lista.replaceChildren();
    $("ciclo-vazio").hidden = ciclos.length > 0;
    ciclos.forEach(function (ciclo) {
      var item = document.createElement("li");
      item.appendChild(paragrafo("Indication from " + F.dia(ciclo.data_indicacao) +
        (ciclo.encerrado_em ? " — follow-up closed" : " — follow-up open"), "acompanhamento-titulo"));
      item.appendChild(paragrafo(resumoAvaliacao(ciclo.avaliacao_inicial)));
      item.appendChild(paragrafo("Guidance: " + F.textoExibicao(ciclo.avaliacao_inicial.orientacao)));
      item.appendChild(paragrafo("Suggested reassessment from " + F.dataHora(ciclo.reavaliar_a_partir_de) +
        ". This timeframe is only a suggestion."));
      item.appendChild(paragrafo("Indication recorded at " + F.dataHora(ciclo.criado_em) + ".", "nota"));
      ciclo.eventos.forEach(function (evento) {
        if (evento.tipo === "acao") {
          item.appendChild(paragrafo("Action at " + F.dataHora(evento.registrado_em) + ": " + F.textoExibicao(evento.conteudo.descricao)));
        } else {
          var av = evento.conteudo;
          item.appendChild(paragrafo("Reassessment of data from " + F.dia(evento.data_avaliacao) +
            " (recorded at " + F.dataHora(evento.registrado_em) + "): " + F.estado(av.estado).rotulo + ". " + resumoAvaliacao(av)));
          var link = document.createElement("a");
          link.href = "?data=" + encodeURIComponent(evento.data_avaliacao) + "#avaliacao";
          link.textContent = "View assessment for " + F.dia(evento.data_avaliacao);
          item.appendChild(link);
          if (av.estado === "verde") {
            item.appendChild(paragrafo("The rule was not triggered; this does not prove clinical improvement.", "nota"));
          }
        }
      });
      lista.appendChild(item);
    });
  }

  function carregarCiclos() {
    var sequencia = ++sequenciaCiclo;
    if (window.RagaDados.fonte("sono").fonte !== "api") {
      $("ciclo-controles").hidden = true;
      $("ciclo-aviso").textContent = "Persistent follow-up requires the local server; this mode uses demonstration data in the browser.";
      return Promise.resolve();
    }
    return window.RagaDados.buscarAcompanhamentosSono().then(function (dados) {
      if (sequencia !== sequenciaCiclo) return;
      ciclos = dados.acompanhamentos;
      $("ciclo-controles").hidden = false;
      $("ciclo-aviso").textContent = "Fictional follow-ups saved on the local server.";
      ["ciclo-iniciar", "ciclo-acao", "ciclo-reavaliar"].forEach(function (id) { $(id).disabled = false; });
      mostrarCiclos();
    }).catch(function () {
      if (sequencia !== sequenciaCiclo) return;
      $("ciclo-aviso").textContent = ciclos
        ? "Could not update follow-up; the previous data may be out of date."
        : "Could not load follow-up. Retrying in 10 seconds.";
      ["ciclo-iniciar", "ciclo-acao", "ciclo-reavaliar"].forEach(function (id) { $(id).disabled = true; });
    });
  }

  function executarCiclo(botao, operacao, sucesso) {
    ++sequenciaCiclo;
    botao.disabled = true;
    $("ciclo-mensagem").textContent = "Saving…";
    operacao().then(function () {
      $("ciclo-mensagem").textContent = sucesso;
      return carregarCiclos();
    }).catch(function (erro) {
      $("ciclo-mensagem").textContent = erro && (erro.status || erro.rede)
        ? erro.message : "Could not save. Try again.";
      return carregarCiclos();
    });
  }

  $("form-iniciar-ciclo").addEventListener("submit", function (evento) {
    evento.preventDefault();
    var data = $("ciclo-data-indicacao").value;
    executarCiclo($("ciclo-iniciar"), function () { return window.RagaDados.iniciarAcompanhamentoSono(data); },
      "Indication recorded for fictional follow-up.");
  });
  $("ciclo-acao").addEventListener("click", function () {
    var id = cicloAberto.id;
    executarCiclo($("ciclo-acao"), function () { return window.RagaDados.registrarAcaoSono(id); },
      "Fictional review recorded.");
  });
  $("form-reavaliar-ciclo").addEventListener("submit", function (evento) {
    evento.preventDefault();
    var id = cicloAberto.id;
    var data = $("ciclo-data-reavaliacao").value;
    executarCiclo($("ciclo-reavaliar"), function () { return window.RagaDados.reavaliarSono(id, data); },
      "Reassessment recorded using data from the selected date.");
  });

  function estadoDos(dados) {
    if (dados.sono.registros.length === 0) return "vazio";
    var av = avaliacaoAtual(dados.sono);
    if (av && av.estado === "dados_insuficientes") return "insuficiente";
    return "ok";
  }

  // Faixa de data: diz qual dia o painel mostra (uma vez só) e, quando
  // hoje ainda não tem registros, oferece o atalho para o cenário.
  function mostrarFaixaData(dados) {
    var api = window.RagaDados.fonte("sono").fonte === "api";
    var hoje = hojeTexto();
    var data = dataParam || hoje;
    var sugestao = $("faixa-data-sugestao");
    $("form-data").hidden = !api; // os dados locais têm um cenário fixo
    $("link-hoje").hidden = !dataParam;
    sugestao.hidden = true;
    if (!api) {
      $("faixa-data-texto").textContent = "Local demonstration data: a fixed scenario with a yellow sleep indication on 10/11/2026.";
      return;
    }
    $("faixa-data-texto").textContent = data < hoje
      ? "Showing " + dataCompleta(data) + ", a past date. Results are historical and do not describe the current situation."
      : "Showing today, " + dataCompleta(data) + ".";

    // Hoje sem dados: sugere a indicação amarela mais recente (ou o último registro).
    var semDados = dados.areas.every(function (a) {
      return a.estado === "dados_insuficientes" || a.estado === "sem_registros";
    });
    if (dataParam || !semDados) return;
    var amarelas = dados.sono.avaliacoes.filter(function (a) { return a.estado === "amarelo"; });
    var registros = dados.sono.registros;
    var alvo = amarelas.length ? amarelas[amarelas.length - 1].data_avaliacao
      : (registros.length ? dataDe(registros[registros.length - 1]) : null);
    if (!alvo) return;
    var link = document.createElement("a");
    link.href = "?data=" + alvo;
    link.textContent = "View the demonstration scenario of " + dataCompleta(alvo);
    sugestao.replaceChildren(document.createTextNode("There are no records for today yet. "), link);
    sugestao.hidden = false;
  }

  function mostrar(dados) {
    mostrarFaixaData(dados);
    mostrarAstronauta(dados);
    mostrarAreas(dados);
    mostrarSono(dados.sono);
    mostrarAvaliacao(dados.sono);
    var api = window.RagaDados.fonte("sono").fonte === "api";
    $("indicador-salvar").disabled = !api;
    if (!api) $("indicador-mensagem").textContent = "To save, start the local server and open the dashboard without demo mode.";
  }

  // ---------- Atualização periódica ----------

  function carregar() {
    return window.RagaDados.buscarCasoSono().then(function (dados) {
      ultimo = dados;
      // Primeiro mostra as seções, depois desenha: o gráfico precisa
      // da largura real da tela, que é 0 enquanto a seção está escondida.
      definirEstado(estadoDos(dados));
      aviso.textContent = "";
      mostrar(dados);
      carregarCiclos();
    }).catch(function (erro) {
      var agora = F.hora(new Date().toISOString());
      // Mensagem da API ({"erro": ...}) é segura para mostrar; as outras não.
      var motivo = erro && (erro.status || erro.rede) ? " (" + erro.message + ")" : "";
      if (ultimo) {
        // Mantém os últimos dados na tela e avisa de quando eles são.
        aviso.textContent = "Update failed at " + agora + motivo +
          ". The displayed data is from " + F.dataHora(ultimo.atualizado_em) +
          " and may be out of date. Retrying in 10 seconds.";
      } else {
        aviso.textContent = "Could not load data at " + agora + motivo +
          ". Retrying in 10 seconds.";
      }
      definirEstado("erro");
    });
  }

  // Redesenha o gráfico quando a largura da tela muda.
  var espera;
  window.addEventListener("resize", function () {
    clearTimeout(espera);
    espera = setTimeout(function () {
      if (ultimo && ultimo.sono.registros.length) desenharGrafico(ultimo.sono);
    }, 150);
  });

  // O check-in da manhã fica em checkins.js (página checkins.html).

  function horarioComFuso(texto) {
    var d = new Date(texto);
    if (isNaN(d.getTime())) return null;
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var fuso = -d.getTimezoneOffset();
    var abs = Math.abs(fuso);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00" + (fuso >= 0 ? "+" : "-") +
      pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
  }
  var indicadorHora = $("indicador-horario");
  var agoraLocal = new Date();
  agoraLocal.setMinutes(agoraLocal.getMinutes() - agoraLocal.getTimezoneOffset());
  indicadorHora.value = agoraLocal.toISOString().slice(0, 16);
  $("form-indicador").addEventListener("submit", function (evento) {
    evento.preventDefault();
    var botao = $("indicador-salvar");
    var valor = Number($("indicador-valor").value);
    var horario = horarioComFuso(indicadorHora.value);
    botao.disabled = true;
    $("indicador-mensagem").textContent = "Saving…";
    window.RagaDados.enviarIndicador({ area: $("indicador-area").value, valor: valor, registrado_em: horario })
      .then(function () {
        $("indicador-mensagem").textContent = "Fictional indicator saved. The dashboard uses the date selected in the URL, if any.";
        return carregar();
      }).catch(function (erro) {
        $("indicador-mensagem").textContent = erro && (erro.status || erro.rede) ? erro.message : "Could not save the indicator.";
      }).then(function () { botao.disabled = false; });
  });

  // ---------- Início ----------
  // Seletor de data: começa na data mostrada; não aceita futuro.
  $("campo-data").max = hojeTexto();
  $("campo-data").value = dataParam || hojeTexto();
  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
