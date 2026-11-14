// Check-in da noite (Mente e equipe): humor, estresse e convivência
// de 1 a 5, mais um diário opcional.
// - Respostas: enviadas pela camada de dados (API ou dados locais).
// - Diário: PRIVADO. Fica só no sessionStorage desta aba e nunca é
//   enviado ao servidor nem mostrado na visão da equipe médica.
// - O front não avalia nada: ainda não há regra para esta área.
(function () {
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel-noite");
  var aviso = document.getElementById("aviso-noite");
  var form = document.getElementById("form-noite");
  var mensagem = document.getElementById("noite-mensagem");
  var campoData = document.getElementById("noite-data");
  var campoDiario = document.getElementById("noite-diario");
  var ultimo = null;

  function $(id) { return document.getElementById(id); }

  // ---------- Diário só nesta aba ----------
  // sessionStorage pode estar bloqueado; nesse caso o diário não é guardado.
  function chaveDiario(data) { return "raga-diario-" + data; }

  function guardarDiario(data, texto) {
    try {
      if (texto) sessionStorage.setItem(chaveDiario(data), texto);
      else sessionStorage.removeItem(chaveDiario(data));
      return true;
    } catch (erro) {
      return false;
    }
  }

  function temDiario(data) {
    try {
      return !!sessionStorage.getItem(chaveDiario(data));
    } catch (erro) {
      return false;
    }
  }

  // ---------- Tela ----------

  var ROTULOS = {
    humor: ["", "Muito ruim", "Ruim", "Neutro", "Bom", "Muito bom"],
    estresse: ["", "Nenhum", "Pouco", "Moderado", "Muito", "Demais"],
    convivencia: ["", "Muito difícil", "Difícil", "Normal", "Boa", "Muito boa"]
  };

  // "4 (Bom)": número e palavra, para não depender de lembrar a escala.
  function valor(campo, n) {
    return n + " (" + ROTULOS[campo][n] + ")";
  }

  function mostrarFonte() {
    var f = window.RagaDados.fonte();
    $("aviso-fonte").textContent = F.textoFonte(f);
    $("noite-nota-fonte").textContent = f.fonte === "api"
      ? "As respostas de 1 a 5 são gravadas no servidor (dados fictícios, ambiente local). O diário não é enviado."
      : "Nesta demonstração, as respostas ficam só nesta aba e somem ao recarregar a página.";
  }

  function mostrar(dados) {
    mostrarFonte();
    $("nome-astronauta").textContent = dados.astronauta ? dados.astronauta.nome_exibicao : "astronauta";

    var vazio = dados.checkins.length === 0;
    $("noite-vazio").hidden = !vazio;
    $("noite-tabela-bloco").hidden = vazio;

    var corpo = $("tabela-noite");
    corpo.replaceChildren();
    dados.checkins.forEach(function (c) {
      var tr = document.createElement("tr");
      [
        F.dia(c.data),
        valor("humor", c.humor),
        valor("estresse", c.estresse),
        valor("convivencia", c.convivencia),
        temDiario(c.data) ? "Escrito (só nesta aba)" : "—",
        c.origem
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
    return window.RagaDados.buscarCheckinsNoite().then(function (dados) {
      ultimo = dados;
      painel.setAttribute("data-tem-dados", "sim");
      painel.setAttribute("data-estado", dados.checkins.length ? "ok" : "vazio");
      aviso.textContent = "";
      mostrar(dados);
    }).catch(function (erro) {
      var agora = F.hora(new Date().toISOString());
      var motivo = erro && (erro.status || erro.rede) ? " (" + erro.message + ")" : "";
      aviso.textContent = ultimo
        ? "A atualização falhou às " + agora + motivo + ". Os dados mostrados são de " +
          F.dataHora(ultimo.atualizado_em) + " e podem estar desatualizados."
        : "Não foi possível carregar os dados às " + agora + motivo + ". Nova tentativa em 10 segundos.";
      painel.setAttribute("data-estado", "erro");
      painel.setAttribute("data-tem-dados", ultimo ? "sim" : "nao");
    });
  }

  // ---------- Formulário ----------

  function hojeTexto() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function prepararFormulario() {
    campoData.max = hojeTexto();
    campoData.value = hojeTexto();
    atualizarContador();
  }

  function atualizarContador() {
    $("diario-contador").textContent = campoDiario.value.length + " de 1000 caracteres";
  }
  campoDiario.addEventListener("input", atualizarContador);

  function escolhido(nome) {
    var marcado = form.querySelector('input[name="' + nome + '"]:checked');
    return marcado ? Number(marcado.value) : null;
  }

  // Validação de interface; o servidor precisa validar de novo.
  function validar() {
    var erros = [];
    var erroData = "";
    if (!campoData.value) erroData = "Informe a data.";
    else if (campoData.value > hojeTexto()) erroData = "A data não pode ser no futuro.";
    $("erro-data").textContent = erroData;
    campoData.setAttribute("aria-invalid", erroData ? "true" : "false");
    if (erroData) erros.push(campoData);

    var respostas = {};
    ["humor", "estresse", "convivencia"].forEach(function (nome) {
      var n = escolhido(nome);
      $("erro-" + nome).textContent = n ? "" : "Escolha uma opção de 1 a 5.";
      if (!n) erros.push(form.querySelector('input[name="' + nome + '"]'));
      respostas[nome] = n;
    });

    if (erros.length) {
      erros[0].focus();
      return null;
    }
    // O diário não entra no objeto enviado.
    return {
      data: campoData.value,
      humor: respostas.humor,
      estresse: respostas.estresse,
      convivencia: respostas.convivencia,
      registrado_em: new Date().toISOString()
    };
  }

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mensagem.textContent = "";
    var checkin = validar();
    if (!checkin) {
      mensagem.textContent = "Confira os campos destacados.";
      return;
    }
    var diario = campoDiario.value.trim();
    var botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinNoite(checkin).then(function (resposta) {
      var diarioGuardado = diario ? guardarDiario(checkin.data, diario) : true;
      mensagem.textContent = (resposta.situacao === "salvo_no_servidor"
        ? "Check-in da noite de " + F.dia(checkin.data) + " salvo no servidor."
        : "Check-in da noite de " + F.dia(checkin.data) + " registrado nesta aba.") +
        (diario ? (diarioGuardado ? " O diário ficou só neste navegador." : " O navegador bloqueou o armazenamento, então o diário não foi guardado.") : "");
      form.reset();
      prepararFormulario();
      return carregar();
    }).catch(function (erro) {
      if (erro && erro.semRota) {
        mensagem.textContent = erro.message + " Suas respostas continuam no formulário.";
        return;
      }
      var motivo = erro && erro.status ? " O servidor respondeu: " + erro.message : "";
      mensagem.textContent = "Não foi possível registrar o check-in." + motivo +
        " Suas respostas continuam no formulário; tente de novo.";
    }).then(function () {
      botao.disabled = false;
    });
  });

  // ---------- Início ----------
  prepararFormulario();
  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
