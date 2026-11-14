// Painel da astronauta: caso de sono.
// Busca os dados (por enquanto em dados-demo.js), mostra os estados
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

  function $(id) { return document.getElementById(id); }

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
    $("nome-astronauta").textContent = a.nome_exibicao;
    $("identificacao-astronauta").textContent = a.identificacao;
    var t = $("atualizado-em");
    t.dateTime = dados.atualizado_em;
    t.textContent = F.dataHora(dados.atualizado_em);
  }

  function mostrarAreas(dados) {
    $("estado-geral-selo").innerHTML = F.selo(dados.estado_geral.estado);
    $("estado-geral-texto").textContent = dados.estado_geral.explicacao;

    var lista = $("lista-areas");
    lista.replaceChildren();
    dados.areas.forEach(function (area) {
      var li = document.createElement("li");
      li.className = "area area--" + area.estado;
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
        origem.textContent = "Exemplo local, sem API para esta área.";
        li.appendChild(origem);
      }
      lista.appendChild(li);
    });

    // Vermelho = situação apresentada como urgente: não esperar reavaliação.
    var vermelhas = dados.areas.filter(function (a) { return a.estado === "vermelho"; });
    var alerta = $("alerta-urgente");
    alerta.hidden = vermelhas.length === 0;
    alerta.textContent = vermelhas.length
      ? vermelhas.map(function (a) { return a.nome; }).join(", ") +
        " em vermelho (exemplo de demonstração): situação apresentada como urgente. " +
        "Procure a equipe médica imediatamente, sem esperar a reavaliação. Este protótipo não envia avisos."
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
      $("linha-base-texto").textContent = F.duracao(lb.duracao_media_horas) + " por noite";
      $("linha-base-descricao").textContent = "Média fictícia de " + F.dia(lb.periodo_inicio) +
        " a " + F.dia(lb.periodo_fim) + ", qualidade média " + lb.qualidade_media +
        " (origem: " + lb.origem + "). O método real de linha de base ainda será definido pela equipe.";
    } else {
      $("linha-base-texto").textContent = "não disponível";
      $("linha-base-descricao").textContent = "Sem linha de base, a regra de demonstração não avalia o sono.";
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
      if (destacadas.indexOf(dataDe(r)) !== -1) situacao = "Motivou a indicação amarela";
      if (r.nao_avaliado) situacao = "Check-in desta aba, ainda não avaliado";
      var tr = document.createElement("tr");
      [
        F.dia(r.noite_em),
        F.duracao(r.duracao_horas),
        F.hora(r.inicio_sono) + " às " + F.hora(r.fim_sono),
        String(r.qualidade),
        String(r.interrupcoes),
        r.origem,
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
      pendente.textContent = "O check-in de " +
        locais.map(function (r) { return F.dia(r.noite_em); }).join(", ") +
        " ainda não foi avaliado. Sem servidor, esta demonstração não recalcula a avaliação.";
    }
    if (!av) {
      // Sem avaliação, o aviso de pendência aparece fora do bloco escondido.
      $("avaliacao-ausente").after(pendente);
      return;
    }
    $("avaliacao-regra").before(pendente);

    $("avaliacao-selo").innerHTML = F.selo(av.estado);
    $("avaliacao-explicacao").textContent = av.explicacao;
    $("avaliacao-regra").textContent = F.origemRegra(av.origem_regra);

    // Noites usadas pela regra, com os detalhes do registro de cada uma.
    var noites = av.noites_consideradas;
    $("avaliacao-dados-bloco").hidden = noites.length === 0;
    $("avaliacao-dados-titulo").textContent = av.estado === "amarelo"
      ? "Dados que motivaram a indicação"
      : "Noites consideradas";
    var lista = $("avaliacao-dados");
    lista.replaceChildren();
    noites.forEach(function (n) {
      var registro = sono.registros.filter(function (r) { return dataDe(r) === n.data_sono; })[0];
      var texto = "Despertar em " + F.dia(n.data_sono) + ": " + F.duracao(n.duracao_horas);
      if (registro) {
        texto += ", qualidade " + registro.qualidade + ", " + registro.interrupcoes +
          " interrupções (" + registro.origem + ")";
      }
      var li = document.createElement("li");
      li.textContent = texto;
      lista.appendChild(li);
    });
    if (noites.length && av.linha_base_horas !== null) {
      var item = document.createElement("li");
      item.textContent = "Linha de base fictícia: " + F.duracao(av.linha_base_horas);
      lista.appendChild(item);
    }

    var temOrientacao = !!av.orientacao;
    $("orientacao-bloco").hidden = !temOrientacao;
    if (temOrientacao) {
      $("orientacao-texto").textContent = av.orientacao;
      $("reavaliar-texto").textContent = av.reavaliar_em_horas
        ? "Em " + av.reavaliar_em_horas + " h: a partir de " +
          F.diaMaisHoras(av.data_avaliacao, av.reavaliar_em_horas) + ", com o registro da próxima noite."
        : "Sem prazo informado.";
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
    var lista = $("lista-acompanhamento");
    lista.replaceChildren();
    avaliacoes.forEach(function (av, i) {
      var li = document.createElement("li");
      var titulo = document.createElement("p");
      titulo.className = "acompanhamento-titulo";
      var quando = document.createElement("time");
      quando.dateTime = av.data_avaliacao;
      quando.textContent = F.dia(av.data_avaliacao);
      titulo.append(quando, document.createTextNode(": avaliação calculada"));
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(av.estado); // rótulos fixos de formato.js
      var texto = document.createElement("p");
      texto.className = "area-resumo";
      texto.textContent = av.explicacao + (av.orientacao ? " Orientação: " + av.orientacao : "");
      li.append(titulo, selo, texto);
      lista.appendChild(li);
    });
  }

  function estadoDos(dados) {
    if (dados.sono.registros.length === 0) return "vazio";
    var av = avaliacaoAtual(dados.sono);
    if (av && av.estado === "dados_insuficientes") return "insuficiente";
    return "ok";
  }

  // Avisa de onde vêm os dados.
  function mostrarFonte() {
    $("aviso-fonte").textContent = F.textoFonte(window.RagaDados.fonte("sono"));
  }

  function mostrar(dados) {
    mostrarFonte();
    mostrarAstronauta(dados);
    mostrarAreas(dados);
    mostrarSono(dados.sono);
    mostrarAvaliacao(dados.sono);
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
    }).catch(function (erro) {
      var agora = F.hora(new Date().toISOString());
      // Mensagem da API ({"erro": ...}) é segura para mostrar; as outras não.
      var motivo = erro && (erro.status || erro.rede) ? " (" + erro.message + ")" : "";
      if (ultimo) {
        // Mantém os últimos dados na tela e avisa de quando eles são.
        aviso.textContent = "A atualização falhou às " + agora + motivo +
          ". Os dados mostrados são de " + F.dataHora(ultimo.atualizado_em) +
          " e podem estar desatualizados. Nova tentativa em 10 segundos.";
      } else {
        aviso.textContent = "Não foi possível carregar os dados às " + agora + motivo +
          ". Nova tentativa em 10 segundos.";
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

  // ---------- Início ----------
  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
