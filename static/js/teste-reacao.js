// Teste de reação (Cognição), inspirado no PVT. NÃO é o PVT validado.
// - 10 tentativas com espera aleatória de 2 a 5 s.
// - Resposta por clique/toque (pointerdown) ou barra de espaço/Enter.
// - Responder antes do sinal conta como antecipação.
// - O resultado é só descritivo: o front não gera cor nem conclusão.
(function () {
  var TENTATIVAS = 10;
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel-reacao");
  var aviso = document.getElementById("aviso-reacao");
  var alvo = document.getElementById("alvo");
  var botaoParar = document.getElementById("parar");
  var ultimo = null; // última resposta do histórico

  function $(id) { return document.getElementById(id); }

  // ---------- Estado do teste ----------
  var fase = "parado"; // parado | esperando | sinal | antecipou | resposta | fim
  var tempos = [];
  var antecipacoes = 0;
  var relogio = null;
  var inicioSinal = 0;

  function mudarFase(nova, texto, detalhe) {
    fase = nova;
    alvo.setAttribute("data-fase", nova);
    $("alvo-texto").textContent = texto;
    $("alvo-detalhe").textContent = detalhe || "";
  }

  function progresso(texto) {
    $("alvo-progresso").textContent = texto;
  }

  function emAndamento() {
    return fase !== "parado" && fase !== "fim";
  }

  function iniciar() {
    tempos = [];
    antecipacoes = 0;
    $("resultado").hidden = true;
    botaoParar.hidden = false;
    proxima();
  }

  function proxima() {
    if (tempos.length >= TENTATIVAS) {
      terminar();
      return;
    }
    var numero = tempos.length + 1;
    mudarFase("esperando", "Wait…", "Attempt " + numero + " of " + TENTATIVAS);
    progresso("Attempt " + numero + " of " + TENTATIVAS + ": wait for the signal.");
    var espera = 2000 + Math.random() * 3000;
    relogio = setTimeout(acender, espera);
  }

  function acender() {
    mudarFase("sinal", "Now!", "Click, tap or press space");
    // Começa a contar agora e ajusta para o momento em que o navegador
    // desenha o sinal (próximo quadro da tela).
    inicioSinal = performance.now();
    requestAnimationFrame(function () { inicioSinal = performance.now(); });
  }

  function antecipou(motivo) {
    clearTimeout(relogio);
    antecipacoes += 1;
    mudarFase("antecipou", "Too soon", "Wait for the signal");
    progresso(motivo + " The attempt will be repeated.");
    relogio = setTimeout(proxima, 1300);
  }

  function responder() {
    if (fase === "esperando") {
      antecipou("Anticipation: response before the signal.");
      return;
    }
    if (fase === "sinal") {
      var ms = Math.round(performance.now() - inicioSinal);
      // Como no PVT, menos de 100 ms é rápido demais para ser reação ao sinal.
      if (ms < 100) {
        antecipou("Anticipation: response in less than 100 ms.");
        return;
      }
      tempos.push(ms);
      mudarFase("resposta", ms + " ms", "Attempt " + tempos.length + " of " + TENTATIVAS);
      progresso("Response in " + ms + " milliseconds.");
      relogio = setTimeout(proxima, 900);
    }
  }

  function parar() {
    clearTimeout(relogio);
    botaoParar.hidden = true;
    mudarFase("parado", "Start", TENTATIVAS + " attempts");
    progresso("Test stopped. Nothing was recorded.");
  }

  // ---------- Resultado ----------

  // Preserva a data local do teste e o fuso do navegador.
  function agoraComFuso() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var offset = -d.getTimezoneOffset();
    var sinal = offset >= 0 ? "+" : "-";
    var abs = Math.abs(offset);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" +
      p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + sinal +
      p(Math.floor(abs / 60)) + ":" + p(abs % 60);
  }

  function mediana(lista) {
    var ordenada = lista.slice().sort(function (a, b) { return a - b; });
    var meio = Math.floor(ordenada.length / 2);
    return ordenada.length % 2 ? ordenada[meio] : Math.round((ordenada[meio - 1] + ordenada[meio]) / 2);
  }

  function terminar() {
    botaoParar.hidden = true;
    mudarFase("fim", "Try again", "Test complete");
    progresso("Test complete. See your result below.");

    var teste = {
      realizado_em: agoraComFuso(),
      tentativas: tempos.length,
      mediana_ms: mediana(tempos),
      mais_rapida_ms: Math.min.apply(null, tempos),
      mais_lenta_ms: Math.max.apply(null, tempos),
      acima_500ms: tempos.filter(function (t) { return t > 500; }).length,
      antecipacoes: antecipacoes,
      tempos_ms: tempos.slice()
    };

    $("res-mediana").textContent = teste.mediana_ms + " ms";
    $("res-rapida").textContent = teste.mais_rapida_ms + " ms";
    $("res-lenta").textContent = teste.mais_lenta_ms + " ms";
    $("res-lapsos").textContent = String(teste.acima_500ms);
    $("res-antecipacoes").textContent = String(teste.antecipacoes);

    var base = ultimo && ultimo.linha_base_ms;
    $("res-comparacao").textContent = base
      ? "Your median was " + teste.mediana_ms + " ms. The fictional baseline is " + base +
        " ms (difference: " + (teste.mediana_ms - base > 0 ? "+" : "") + (teste.mediana_ms - base) + " ms)."
      : "Your median was " + teste.mediana_ms + " ms. No baseline is available for comparison.";
    $("res-mensagem").textContent = "Saving…";
    $("resultado").hidden = false;

    window.RagaDados.enviarTesteReacao(teste).then(function (resposta) {
      $("res-mensagem").textContent = resposta.situacao === "salvo_no_servidor"
        ? "Test saved on the server."
        : "Test recorded in this tab's session.";
      return carregar();
    }).catch(function (erro) {
      $("res-mensagem").textContent = erro && (erro.semRota || erro.status)
        ? erro.message
        : "Could not save the test. Your result remains on screen.";
    });
  }

  // ---------- Entradas ----------

  // Clique (ou Enter/espaço com o quadro focado) começa o teste.
  alvo.addEventListener("click", function () {
    if (!emAndamento()) iniciar();
  });

  // Durante o teste, pointerdown responde mais rápido que click.
  alvo.addEventListener("pointerdown", function (evento) {
    if (!emAndamento()) return;
    evento.preventDefault();
    responder();
  });

  // Espaço ou Enter respondem de qualquer lugar da página durante o teste.
  document.addEventListener("keydown", function (evento) {
    if (!emAndamento() || (evento.key !== " " && evento.key !== "Enter")) return;
    if (evento.target === botaoParar) return; // deixa o teclado parar o teste
    evento.preventDefault();
    if (!evento.repeat) responder();
  });
  // Evita que o mesmo espaço vire um "click" no botão focado.
  document.addEventListener("keyup", function (evento) {
    if (evento.target === botaoParar) return;
    if (emAndamento() && (evento.key === " " || evento.key === "Enter")) evento.preventDefault();
  });

  botaoParar.addEventListener("click", parar);

  // ---------- Histórico ----------

  function mostrarFonte() {
    $("aviso-fonte").textContent = F.textoFonte(window.RagaDados.fonte("reacao"));
  }

  function mostrar(dados) {
    mostrarFonte();
    $("reacao-linha-base").textContent = dados.linha_base_ms
      ? "Fictional baseline: " + dados.linha_base_ms + " ms (median)."
      : "No baseline yet.";
    var vazio = dados.testes.length === 0;
    $("reacao-vazio").hidden = !vazio;
    $("reacao-tabela-bloco").hidden = vazio;

    var corpo = $("tabela-reacao");
    corpo.replaceChildren();
    dados.testes.forEach(function (t) {
      var tr = document.createElement("tr");
      [
        F.dataHora(t.realizado_em),
        t.mediana_ms + " ms",
        t.mais_rapida_ms + " ms",
        t.mais_lenta_ms + " ms",
        String(t.acima_500ms),
        String(t.antecipacoes),
        F.textoExibicao(t.origem)
      ].forEach(function (texto, i) {
        var celula = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) celula.scope = "row";
        celula.textContent = texto;
        tr.appendChild(celula);
      });
      corpo.appendChild(tr);
    });
  }

  function carregar() {
    return window.RagaDados.buscarTestesReacao().then(function (dados) {
      ultimo = dados;
      painel.setAttribute("data-tem-dados", "sim");
      painel.setAttribute("data-estado", dados.testes.length ? "ok" : "vazio");
      aviso.textContent = "";
      mostrar(dados);
    }).catch(function (erro) {
      var agora = F.hora(new Date().toISOString());
      var motivo = erro && (erro.status || erro.rede) ? " (" + erro.message + ")" : "";
      aviso.textContent = ultimo
        ? "Update failed at " + agora + motivo + ". The displayed data is from " +
          F.dataHora(ultimo.atualizado_em) + " and may be out of date."
        : "Could not load history at " + agora + motivo + ". The test remains available.";
      painel.setAttribute("data-estado", "erro");
      painel.setAttribute("data-tem-dados", ultimo ? "sim" : "nao");
    });
  }

  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
