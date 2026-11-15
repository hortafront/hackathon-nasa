// Prévia da visão da equipe médica.
// Exibe os dados fictícios disponíveis. As respostas de 1 a 5 aparecem
// sempre; o texto do diário só quando o astronauta escolheu compartilhar.
(function () {
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel-medico");
  var aviso = document.getElementById("aviso-medico");
  var ultimo = null;

  function $(id) { return document.getElementById(id); }

  function texto(tag, classe, conteudo) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    n.textContent = conteudo;
    return n;
  }

  function mostrar(dados) {
    $("ordem-texto").textContent = dados.ordem;
    var t = $("medico-atualizado-em");
    t.dateTime = dados.atualizado_em;
    t.textContent = F.dataHora(dados.atualizado_em);

    var lista = $("lista-tripulantes");
    var abertos = new Set(Array.from(lista.querySelectorAll("details[open]"), function (detalhes) {
      return detalhes.dataset.astronauta;
    }));
    lista.replaceChildren();
    dados.tripulantes.forEach(function (tri) {
      var li = document.createElement("li");
      li.className = "cartao tripulante tripulante--" + tri.estado;

      var topo = document.createElement("div");
      topo.className = "tripulante-topo";
      var nome = texto("h3", "", F.textoExibicao(tri.nome_exibicao));
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(tri.estado); // rótulos fixos de formato.js
      topo.append(nome, selo);
      li.appendChild(topo);

      li.appendChild(texto("p", "leitura-detalhe",
        (tri.origem === "ficticia" ? "Fictional character" : "Crew member") +
        ", " + tri.identificacao + (tri.area ? ". Area: " + tri.area + "." : ".")));
      li.appendChild(texto("p", "", tri.motivo));
      if (tri.estado === "vermelho") {
        li.appendChild(texto("p", "nota nota--urgente",
          "Immediate attention: do not wait for reassessment. This prototype does not send actual alerts."));
      }

      if (tri.dados_compartilhados.length) {
        var ul = document.createElement("ul");
        ul.className = "lista-dados";
        tri.dados_compartilhados.forEach(function (d) { ul.appendChild(texto("li", "", d)); });
        li.appendChild(ul);
      }
      var detalhes = document.createElement("details");
      detalhes.dataset.astronauta = String(tri.id);
      detalhes.open = abertos.has(String(tri.id));
      detalhes.appendChild(texto("summary", "", "View shared records"));
      detalhes.appendChild(texto("p", "nota", "The full list may include records after the assessment date above."));
      (tri.areas || []).forEach(function (area) {
        detalhes.appendChild(texto("h4", "", area.nome));
        detalhes.appendChild(texto("p", "", area.resumo));
        if (area.linha_base) {
          detalhes.appendChild(texto("p", "", "Fictional baseline: " + area.linha_base.valor + " " + area.linha_base.unidade + " (" + F.textoExibicao(area.linha_base.origem) + ")."));
        }
        if (area.ultimo_registro) {
          var u = area.ultimo_registro;
          detalhes.appendChild(texto("p", "", "Latest record: " + u.valor + " " + F.textoExibicao(u.unidade) +
            " at " + F.dataHora(u.registrado_em) + " (" + F.textoExibicao(u.origem) + ")."));
        }
      });
      if (tri.linha_base_sono) {
        detalhes.appendChild(texto("p", "", "Fictional sleep baseline: " +
          F.duracao(tri.linha_base_sono.duracao_media_horas) + "; average quality " + tri.linha_base_sono.qualidade_media +
          "; period from " + F.dataHora(tri.linha_base_sono.periodo_inicio) + " to " + F.dataHora(tri.linha_base_sono.periodo_fim) +
          "; source: " + F.textoExibicao(tri.linha_base_sono.origem) + "."));
      }
      detalhes.appendChild(texto("h4", "", "Sleep records"));
      var noites = tri.registros_sono || [];
      if (!noites.length) detalhes.appendChild(texto("p", "", "No sleep records available."));
      noites.forEach(function (r) {
        detalhes.appendChild(texto("p", "", "Awake at " + F.dataHora(r.fim_sono) +
          "; asleep at " + F.dataHora(r.inicio_sono) + "; duration " + F.duracao(r.duracao_horas) +
          "; quality " + r.qualidade + "; interruptions " + r.interrupcoes +
          "; source: " + F.textoExibicao(r.origem) + (r.observacao ? "; note: " + F.textoExibicao(r.observacao) : "") + "."));
      });
      detalhes.appendChild(texto("h4", "", "Evening check-ins and journal"));
      var checkins = tri.checkins_noite || [];
      if (!checkins.length) detalhes.appendChild(texto("p", "", "No evening check-ins available."));
      checkins.forEach(function (c) {
        detalhes.appendChild(texto("p", "", "Date " + F.dia(c.data) + "; mood " + c.humor +
          "; stress " + c.estresse + "; crew interactions " + c.convivencia +
          "; recorded at " + F.dataHora(c.registrado_em) + "; source: " + F.textoExibicao(c.origem) + "."));
        // Diário privado por padrão: só aparece se o astronauta compartilhou.
        detalhes.appendChild(texto("p", "", c.diario
          ? "Journal shared by the astronaut: " + F.textoExibicao(c.diario)
          : "Journal: not shared or not provided."));
      });
      detalhes.appendChild(texto("h4", "", "Reaction tests"));
      var testes = tri.testes_reacao || [];
      if (!testes.length) detalhes.appendChild(texto("p", "", "No reaction tests available."));
      testes.forEach(function (t) {
        detalhes.appendChild(texto("p", "", "Test at " + F.dataHora(t.realizado_em) +
          "; median " + t.mediana_ms + " ms; attempts " + t.tempos_ms.join(", ") +
          " ms; anticipations " + t.antecipacoes + "; source: " + F.textoExibicao(t.origem) + "."));
      });
      li.appendChild(detalhes);
      // Datas no formato de avaliacao_sono.py: data + prazo em horas.
      if (tri.data_avaliacao) {
        li.appendChild(texto("p", "leitura-detalhe", "Assessed using data through " + F.dia(tri.data_avaliacao) + "."));
        var hoje = new Date();
        var hojeTexto = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
        if (tri.data_avaliacao < hojeTexto) {
          li.appendChild(texto("p", "nota", "Historical assessment; it may not reflect the current situation."));
        }
      }
      if (tri.data_avaliacao && tri.reavaliar_em_horas) {
        li.appendChild(texto("p", "leitura-detalhe", "Suggested reassessment in " + tri.reavaliar_em_horas +
          " h (from " + F.diaMaisHoras(tri.data_avaliacao, tri.reavaliar_em_horas) + "). Nothing is scheduled or sent."));
      }

      lista.appendChild(li);
    });

  }

  function carregar() {
    window.RagaDados.buscarVisaoMedica().then(function (dados) {
      ultimo = dados;
      mostrar(dados);
      aviso.textContent = "";
      painel.setAttribute("data-estado", dados.tripulantes.length ? "ok" : "vazio");
      painel.setAttribute("data-tem-dados", "sim");
      if (!dados.tripulantes.length) aviso.textContent = "No crew members in the demonstration.";
    }).catch(function () {
      var agora = F.hora(new Date().toISOString());
      aviso.textContent = ultimo
        ? "Update failed at " + agora + ". Displayed data is from " +
          F.dataHora(ultimo.atualizado_em) + " and may be out of date."
        : "Could not load data at " + agora + ". Retrying in 10 seconds.";
      painel.setAttribute("data-estado", "erro");
    });
  }

  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
