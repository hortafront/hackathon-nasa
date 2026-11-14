// Prévia da visão da equipe médica.
// Mostra só os campos que a resposta marca como compartilháveis.
// Check-in detalhado e diário não aparecem (política a definir).
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
    $("aviso-fonte").textContent = F.textoFonte(window.RagaDados.fonte());
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

      if (tri.dados_compartilhados.length) {
        var ul = document.createElement("ul");
        ul.className = "lista-dados";
        tri.dados_compartilhados.forEach(function (d) { ul.appendChild(texto("li", "", d)); });
        li.appendChild(ul);
      }
      // Datas no formato de avaliacao_sono.py: data + prazo em horas.
      if (tri.data_avaliacao) {
        li.appendChild(texto("p", "leitura-detalhe", "Avaliado com dados até " + F.dia(tri.data_avaliacao) + "."));
      }
      if (tri.data_avaliacao && tri.reavaliar_em_horas) {
        li.appendChild(texto("p", "leitura-detalhe", "Reavaliação sugerida em " + tri.reavaliar_em_horas +
          " h (a partir de " + F.diaMaisHoras(tri.data_avaliacao, tri.reavaliar_em_horas) + "). Nada é agendado nem enviado."));
      }

      lista.appendChild(li);
    });

    var naoExibido = $("lista-nao-exibido");
    naoExibido.replaceChildren();
    dados.nao_exibido.forEach(function (item) { naoExibido.appendChild(texto("li", "", item)); });
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
