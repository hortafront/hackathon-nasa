// Painel da astronauta: caso de sono.
// Busca os dados (por enquanto em dados-demo.js), mostra os estados
// carregando | vazio | insuficiente | ok | erro, atualiza a cada 10 s e
// envia o check-in da manhã.
// O front não calcula avaliação nem aplica regra clínica: só mostra o que
// os dados trazem. As regras oficiais são do back-end.
(function () {
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel");
  var aviso = document.getElementById("aviso-painel");
  var ultimo = null; // última resposta exibida (preservada em caso de falha)

  function $(id) { return document.getElementById(id); }

  function definirEstado(estado) {
    painel.setAttribute("data-estado", estado);
    painel.setAttribute("data-tem-dados", ultimo ? "sim" : "nao");
  }

  // ---------- Desenho da tela ----------

  function mostrarAstronauta(dados) {
    var a = dados.astronauta;
    $("nome-astronauta").textContent = a.nome;
    $("missao").textContent = a.missao;
    $("dia-missao").textContent = a.dia_missao;
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
      var nome = document.createElement(area.id === "sono" ? "a" : "p");
      nome.className = "area-nome";
      nome.textContent = area.nome;
      if (area.id === "sono") nome.href = "#sono";
      var selo = document.createElement("p");
      selo.innerHTML = F.selo(area.estado); // rótulos fixos de formato.js
      var resumo = document.createElement("p");
      resumo.className = "area-resumo";
      resumo.textContent = area.resumo;
      li.append(nome, selo, resumo);
      lista.appendChild(li);
    });
  }

  function idsUsados(sono) {
    return sono.avaliacao ? sono.avaliacao.noites_usadas : [];
  }

  function mostrarSono(sono) {
    var vazio = sono.noites.length === 0;
    $("sono-vazio").hidden = !vazio;
    $("sono-conteudo").hidden = vazio;
    if (vazio) return;

    var ref = sono.referencia;
    $("referencia-texto").textContent = F.duracao(ref.minimo_min) + " a " + F.duracao(ref.maximo_min) + " por noite";
    $("referencia-descricao").textContent = ref.descricao;

    window.RagaGrafico.desenharSono($("grafico-sono"), sono.noites, ref, idsUsados(sono));
    mostrarTabela(sono);
  }

  function mostrarTabela(sono) {
    var usados = idsUsados(sono);
    var corpo = $("tabela-sono");
    corpo.replaceChildren();
    sono.noites.forEach(function (n) {
      var situacao = "—";
      if (usados.indexOf(n.id) !== -1) situacao = "Motivou a avaliação";
      if (n.nao_avaliado) situacao = "Check-in desta aba, ainda não avaliado";
      var tr = document.createElement("tr");
      [F.noite(n.noite), F.duracao(n.duracao_min), n.qualidade + " de 5", n.origem, situacao]
        .forEach(function (texto, i) {
          var celula = document.createElement(i === 0 ? "th" : "td");
          if (i === 0) celula.scope = "row";
          celula.textContent = texto;
          tr.appendChild(celula);
        });
      corpo.appendChild(tr);
    });
  }

  function mostrarAvaliacao(sono) {
    var av = sono.avaliacao;
    $("avaliacao-ausente").hidden = !!av;
    $("avaliacao-conteudo").hidden = !av;

    // Check-ins locais chegaram depois da avaliação e não foram avaliados.
    var locais = sono.noites.filter(function (n) { return n.nao_avaliado; });
    var pendente = $("avaliacao-pendente");
    pendente.hidden = locais.length === 0;
    if (locais.length) {
      pendente.textContent = "O check-in da noite de " +
        locais.map(function (n) { return F.noite(n.noite); }).join(", ") +
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
    $("avaliacao-regra").textContent = "Regra usada: " + av.regra;

    var usadas = sono.noites.filter(function (n) { return av.noites_usadas.indexOf(n.id) !== -1; });
    $("avaliacao-dados-bloco").hidden = usadas.length === 0;
    var lista = $("avaliacao-dados");
    lista.replaceChildren();
    usadas.forEach(function (n) {
      var li = document.createElement("li");
      li.textContent = "Noite de " + F.noite(n.noite) + ": " + F.duracao(n.duracao_min) +
        ", qualidade " + n.qualidade + " de 5 (" + n.origem + ")";
      lista.appendChild(li);
    });

    var temOrientacao = !!av.orientacao;
    $("orientacao-bloco").hidden = !temOrientacao;
    if (temOrientacao) {
      $("orientacao-texto").textContent = av.orientacao;
      $("orientacao-origem").textContent = av.orientacao_origem;
      var r = $("reavaliar-em");
      r.dateTime = av.reavaliar_em;
      r.textContent = F.dataHora(av.reavaliar_em);
    }

    var t = $("avaliado-em");
    t.dateTime = av.avaliado_em;
    t.textContent = F.dataHora(av.avaliado_em);
  }

  function estadoDos(dados) {
    if (dados.sono.noites.length === 0) return "vazio";
    if (dados.sono.avaliacao && dados.sono.avaliacao.estado === "insuficiente") return "insuficiente";
    return "ok";
  }

  function mostrar(dados) {
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
    }).catch(function () {
      var agora = F.hora(new Date().toISOString());
      if (ultimo) {
        // Mantém os últimos dados na tela e avisa de quando eles são.
        aviso.textContent = "A atualização falhou às " + agora +
          ". Os dados mostrados são de " + F.dataHora(ultimo.atualizado_em) +
          " e podem estar desatualizados. Nova tentativa em 10 segundos.";
      } else {
        aviso.textContent = "Não foi possível carregar os dados às " + agora +
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
      if (ultimo && ultimo.sono.noites.length) {
        window.RagaGrafico.desenharSono($("grafico-sono"), ultimo.sono.noites, ultimo.sono.referencia, idsUsados(ultimo.sono));
      }
    }, 150);
  });

  // ---------- Check-in da manhã ----------

  var form = $("form-checkin");
  var mensagem = $("checkin-mensagem");

  function hojeTexto() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function ontemTexto() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  var campoNoite = $("checkin-noite");
  campoNoite.max = hojeTexto();
  campoNoite.value = ontemTexto();

  function marcarErro(idErro, campo, texto) {
    $(idErro).textContent = texto;
    if (campo) campo.setAttribute("aria-invalid", texto ? "true" : "false");
  }

  function inteiro(valor) {
    return /^\d+$/.test(valor) ? Number(valor) : NaN;
  }

  // Validação de interface, para ajudar quem preenche.
  // O servidor ainda precisará validar de novo.
  function validar() {
    var erros = [];
    var noite = campoNoite.value;
    var horasCampo = $("checkin-horas");
    var minutosCampo = $("checkin-minutos");
    var horas = inteiro(horasCampo.value || "0");
    var minutos = inteiro(minutosCampo.value || "0");
    var escolhida = form.querySelector('input[name="qualidade"]:checked');

    var erroNoite = "";
    if (!noite) erroNoite = "Informe a data da noite.";
    else if (noite > hojeTexto()) erroNoite = "A data não pode ser no futuro.";
    marcarErro("erro-noite", campoNoite, erroNoite);
    if (erroNoite) erros.push(campoNoite);

    var erroDuracao = "";
    if (isNaN(horas) || isNaN(minutos)) erroDuracao = "Use apenas números inteiros.";
    else if (minutos > 59) erroDuracao = "Os minutos vão de 0 a 59.";
    else if (horas * 60 + minutos === 0) erroDuracao = "Informe quanto tempo você dormiu.";
    else if (horas * 60 + minutos > 16 * 60) erroDuracao = "Informe no máximo 16 horas.";
    marcarErro("erro-duracao", horasCampo, erroDuracao);
    minutosCampo.setAttribute("aria-invalid", erroDuracao ? "true" : "false");
    if (erroDuracao) erros.push(horasCampo);

    var erroQualidade = escolhida ? "" : "Escolha uma opção de 1 a 5.";
    marcarErro("erro-qualidade", null, erroQualidade);
    if (erroQualidade) erros.push(form.querySelector('input[name="qualidade"]'));

    if (erros.length) {
      erros[0].focus();
      return null;
    }
    return { noite: noite, duracao_min: horas * 60 + minutos, qualidade: Number(escolhida.value) };
  }

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mensagem.textContent = "";
    var checkin = validar();
    if (!checkin) {
      mensagem.textContent = "Confira os campos destacados.";
      return;
    }
    var botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinSono(checkin).then(function () {
      mensagem.textContent = "Check-in registrado para a noite de " + F.noite(checkin.noite) +
        ". Ele aparece no histórico como check-in desta aba, ainda não avaliado.";
      form.reset();
      campoNoite.value = ontemTexto();
      return carregar();
    }).catch(function () {
      mensagem.textContent = "Não foi possível registrar o check-in. Seus dados continuam no formulário; tente de novo.";
    }).then(function () {
      botao.disabled = false;
    });
  });

  // ---------- Início ----------
  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
