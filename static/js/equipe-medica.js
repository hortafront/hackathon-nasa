// Prévia da visão da equipe médica.
// Exibe os dados fictícios disponíveis, incluindo check-ins e diário.
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
    $("aviso-fonte").textContent = F.textoFonte(window.RagaDados.fonte("medica"));
    $("ordem-texto").textContent = dados.ordem;
    var t = $("medico-atualizado-em");
    t.dateTime = dados.atualizado_em;
    t.textContent = F.dataHora(dados.atualizado_em);

    var lista = $("lista-tripulantes");
    lista.replaceChildren();
    dados.tripulantes.forEach(function (tri) {
      var li = document.createElement("li");
      li.className = "cartao tripulante tripulante--" + tri.estado;

      var topo = document.createElement("div");
      topo.className = "tripulante-topo";
      var nome = texto("h3", "", tri.nome_exibicao);
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(tri.estado); // rótulos fixos de formato.js
      topo.append(nome, selo);
      li.appendChild(topo);

      li.appendChild(texto("p", "leitura-detalhe",
        (tri.origem === "ficticia" ? "Personagem fictícia" : "Tripulante") +
        ", " + tri.identificacao + (tri.area ? ". Área: " + tri.area + "." : ".")));
      li.appendChild(texto("p", "", tri.motivo));
      if (tri.estado === "vermelho") {
        li.appendChild(texto("p", "nota nota--urgente",
          "Atenção imediata: não aguardar a reavaliação. Este protótipo não envia avisos de verdade."));
      }

      if (tri.dados_compartilhados.length) {
        var ul = document.createElement("ul");
        ul.className = "lista-dados";
        tri.dados_compartilhados.forEach(function (d) { ul.appendChild(texto("li", "", d)); });
        li.appendChild(ul);
      }
      var detalhes = document.createElement("details");
      detalhes.appendChild(texto("summary", "", "Ver registros e diário compartilhados"));
      if (tri.linha_base_sono) {
        detalhes.appendChild(texto("p", "", "Linha de base fictícia de sono: " +
          F.duracao(tri.linha_base_sono.duracao_media_horas) + "; qualidade média " + tri.linha_base_sono.qualidade_media +
          "; período de " + F.dataHora(tri.linha_base_sono.periodo_inicio) + " a " + F.dataHora(tri.linha_base_sono.periodo_fim) +
          "; origem: " + tri.linha_base_sono.origem + "."));
      }
      detalhes.appendChild(texto("h4", "", "Registros de sono"));
      var noites = tri.registros_sono || [];
      if (!noites.length) detalhes.appendChild(texto("p", "", "Nenhum registro de sono disponível."));
      noites.forEach(function (r) {
        detalhes.appendChild(texto("p", "", "Despertar em " + F.dataHora(r.fim_sono) +
          "; início " + F.dataHora(r.inicio_sono) + "; duração " + F.duracao(r.duracao_horas) +
          "; qualidade " + r.qualidade + "; interrupções " + r.interrupcoes +
          "; origem: " + r.origem + (r.observacao ? "; observação: " + r.observacao : "") + "."));
      });
      detalhes.appendChild(texto("h4", "", "Check-ins da noite e diário"));
      var checkins = tri.checkins_noite || [];
      if (!checkins.length) detalhes.appendChild(texto("p", "", "Nenhum check-in da noite disponível."));
      checkins.forEach(function (c) {
        detalhes.appendChild(texto("p", "", "Data " + F.dia(c.data) + "; humor " + c.humor +
          "; estresse " + c.estresse + "; convivência " + c.convivencia +
          "; registrado em " + F.dataHora(c.registrado_em) + "; origem: " + c.origem + "."));
        detalhes.appendChild(texto("p", "", "Diário: " + (c.diario || "não informado")));
      });
      li.appendChild(detalhes);
      // Datas no formato de avaliacao_sono.py: data + prazo em horas.
      if (tri.data_avaliacao) {
        li.appendChild(texto("p", "leitura-detalhe", "Avaliado com dados até " + F.dia(tri.data_avaliacao) + "."));
        var hoje = new Date();
        var hojeTexto = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
        if (tri.data_avaliacao < hojeTexto) {
          li.appendChild(texto("p", "nota", "Avaliação histórica; pode não refletir a situação atual."));
        }
      }
      if (tri.data_avaliacao && tri.reavaliar_em_horas) {
        li.appendChild(texto("p", "leitura-detalhe", "Reavaliação sugerida em " + tri.reavaliar_em_horas +
          " h (a partir de " + F.diaMaisHoras(tri.data_avaliacao, tri.reavaliar_em_horas) + "). Nada é agendado nem enviado."));
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
      if (!dados.tripulantes.length) aviso.textContent = "Nenhum tripulante na demonstração.";
    }).catch(function () {
      var agora = F.hora(new Date().toISOString());
      aviso.textContent = ultimo
        ? "A atualização falhou às " + agora + ". Os dados mostrados são de " +
          F.dataHora(ultimo.atualizado_em) + " e podem estar desatualizados."
        : "Não foi possível carregar os dados às " + agora + ". Nova tentativa em 10 segundos.";
      painel.setAttribute("data-estado", "erro");
    });
  }

  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
