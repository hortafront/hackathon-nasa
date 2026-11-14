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
    mudarFase("esperando", "Espere…", "Tentativa " + numero + " de " + TENTATIVAS);
    progresso("Tentativa " + numero + " de " + TENTATIVAS + ": espere o sinal.");
    var espera = 2000 + Math.random() * 3000;
    relogio = setTimeout(acender, espera);
  }

  function acender() {
    mudarFase("sinal", "Agora!", "Clique, toque ou aperte espaço");
    // Começa a contar agora e ajusta para o momento em que o navegador
    // desenha o sinal (próximo quadro da tela).
    inicioSinal = performance.now();
    requestAnimationFrame(function () { inicioSinal = performance.now(); });
  }

  function antecipou(motivo) {
    clearTimeout(relogio);
    antecipacoes += 1;
    mudarFase("antecipou", "Cedo demais", "Espere o sinal acender");
    progresso(motivo + " A tentativa será repetida.");
    relogio = setTimeout(proxima, 1300);
  }

  function responder() {
    if (fase === "esperando") {
      antecipou("Antecipação: a resposta veio antes do sinal.");
      return;
    }
    if (fase === "sinal") {
      var ms = Math.round(performance.now() - inicioSinal);
      // Como no PVT, menos de 100 ms é rápido demais para ser reação ao sinal.
      if (ms < 100) {
        antecipou("Antecipação: resposta em menos de 100 ms.");
        return;
      }
      tempos.push(ms);
      mudarFase("resposta", ms + " ms", "Tentativa " + tempos.length + " de " + TENTATIVAS);
      progresso("Resposta em " + ms + " milissegundos.");
      relogio = setTimeout(proxima, 900);
    }
  }

  function parar() {
    clearTimeout(relogio);
    botaoParar.hidden = true;
    mudarFase("parado", "Começar", TENTATIVAS + " tentativas");
    progresso("Teste interrompido. Nada foi registrado.");
  }

  // ---------- Resultado ----------

  function mediana(lista) {
    var ordenada = lista.slice().sort(function (a, b) { return a - b; });
    var meio = Math.floor(ordenada.length / 2);
    return ordenada.length % 2 ? ordenada[meio] : Math.round((ordenada[meio - 1] + ordenada[meio]) / 2);
  }

  function terminar() {
    botaoParar.hidden = true;
    mudarFase("fim", "Fazer de novo", "Teste concluído");
    progresso("Teste concluído. Veja o resultado abaixo.");

    var teste = {
      realizado_em: new Date().toISOString(),
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
      ? "Sua mediana foi " + teste.mediana_ms + " ms. A linha de base fictícia é " + base +
        " ms (diferença de " + (teste.mediana_ms - base > 0 ? "+" : "") + (teste.mediana_ms - base) + " ms)."
      : "Sua mediana foi " + teste.mediana_ms + " ms. Ainda não há linha de base para comparar.";
    $("res-mensagem").textContent = "Registrando…";
    $("resultado").hidden = false;

    window.RagaDados.enviarTesteReacao(teste).then(function (resposta) {
      $("res-mensagem").textContent = resposta.situacao === "salvo_no_servidor"
        ? "Teste salvo no servidor."
        : "Teste registrado nesta aba (some ao recarregar a página).";
      return carregar();
    }).catch(function (erro) {
      $("res-mensagem").textContent = erro && (erro.semRota || erro.status)
        ? erro.message
        : "Não foi possível registrar o teste. O resultado continua na tela.";
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
    $("aviso-fonte").textContent = F.textoFonte(window.RagaDados.fonte());
  }

  function mostrar(dados) {
    mostrarFonte();
    $("reacao-linha-base").textContent = dados.linha_base_ms
      ? "Linha de base fictícia: " + dados.linha_base_ms + " ms (mediana)."
      : "Ainda sem linha de base.";
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
        t.origem
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
        ? "A atualização falhou às " + agora + motivo + ". Os dados mostrados são de " +
          F.dataHora(ultimo.atualizado_em) + " e podem estar desatualizados."
        : "Não foi possível carregar o histórico às " + agora + motivo + ". O teste continua disponível.";
      painel.setAttribute("data-estado", "erro");
      painel.setAttribute("data-tem-dados", ultimo ? "sim" : "nao");
    });
  }

  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
