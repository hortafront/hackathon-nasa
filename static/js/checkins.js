// Página de check-ins do dia: manhã (Sono) e noite (Mente e equipe).
// Cada parte tem formulário, histórico e fonte de dados próprios
// (a API pode ter a rota do sono e ainda não ter a da noite).
// - O front não avalia nada: a avaliação do sono vem do back-end e
//   aparece no painel; Mente e equipe ainda não tem regra.
// - Diário da noite: PRIVADO. Fica só no sessionStorage desta aba e
//   nunca é enviado ao servidor nem mostrado na visão da equipe médica.
(function () {
  var INTERVALO_MS = 10000;
  var F = window.RagaFormato;
  var painel = document.getElementById("painel-checkins");
  var aviso = document.getElementById("aviso-checkins");
  var ultimoManha = null;
  var ultimoNoite = null;

  function $(id) { return document.getElementById(id); }

  // ---------- Comum ----------

  function dataTexto(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function hojeTexto() {
    return dataTexto(new Date());
  }

  function marcarErro(idErro, campos, texto) {
    $(idErro).textContent = texto;
    campos.forEach(function (c) { c.setAttribute("aria-invalid", texto ? "true" : "false"); });
  }

  function linhaTabela(corpo, valores) {
    var tr = document.createElement("tr");
    valores.forEach(function (texto, i) {
      var celula = document.createElement(i === 0 ? "th" : "td");
      if (i === 0) celula.scope = "row";
      celula.textContent = texto;
      tr.appendChild(celula);
    });
    corpo.appendChild(tr);
  }

  function nomeAstronauta(dados) {
    if (!dados || !dados.astronauta) return;
    document.querySelectorAll(".nome-astronauta").forEach(function (el) {
      el.textContent = dados.astronauta.nome_exibicao;
    });
  }

  // Aviso do topo: diz se cada parte veio da API ou dos dados locais.
  function mostrarFonte() {
    var manha = window.RagaDados.fonte("sono");
    var noite = window.RagaDados.fonte("noite");
    if (manha.fonte === noite.fonte) {
      $("aviso-fonte").textContent = F.textoFonte(manha);
    } else {
      var desc = function (f) { return f.fonte === "api" ? "dados do servidor" : "dados fictícios locais (dados-demo.js)"; };
      $("aviso-fonte").textContent = "Manhã: " + desc(manha) + ". Noite: " + desc(noite) +
        ". A parte local ainda não tem rota na API.";
    }
    $("manha-nota-fonte").textContent = manha.fonte === "api"
      ? "O check-in é gravado no servidor (dados fictícios, ambiente local) e a avaliação é refeita pela API."
      : "Nesta demonstração, o check-in fica só nesta aba: não é enviado a um servidor e some ao fechar a aba.";
    $("noite-nota-fonte").textContent = noite.fonte === "api"
      ? "As respostas de 1 a 5 são gravadas no servidor (dados fictícios, ambiente local). O diário não é enviado."
      : "Nesta demonstração, as respostas ficam só nesta aba e somem ao fechar a aba.";
  }

  // ---------- Manhã: histórico ----------

  function mostrarManha(dados) {
    var registros = dados.sono.registros;
    $("manha-vazio").hidden = registros.length > 0;
    $("manha-tabela-bloco").hidden = registros.length === 0;
    var corpo = $("tabela-manha");
    corpo.replaceChildren();
    registros.forEach(function (r) {
      linhaTabela(corpo, [
        F.dia(r.noite_em),
        F.duracao(r.duracao_horas),
        F.hora(r.inicio_sono) + " às " + F.hora(r.fim_sono),
        r.qualidade + " de 5",
        String(r.interrupcoes),
        r.origem + (r.nao_avaliado ? ", ainda não avaliado" : "")
      ]);
    });
  }

  // ---------- Noite: histórico ----------

  var ROTULOS = {
    humor: ["", "Muito ruim", "Ruim", "Neutro", "Bom", "Muito bom"],
    estresse: ["", "Nenhum", "Pouco", "Moderado", "Muito", "Demais"],
    convivencia: ["", "Muito difícil", "Difícil", "Normal", "Boa", "Muito boa"]
  };

  // "4 (Bom)": número e palavra, para não depender de lembrar a escala.
  function valor(campo, n) {
    return n + " (" + ROTULOS[campo][n] + ")";
  }

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

  function mostrarNoite(dados) {
    var lista = dados.checkins;
    $("noite-vazio").hidden = lista.length > 0;
    $("noite-tabela-bloco").hidden = lista.length === 0;
    var corpo = $("tabela-noite");
    corpo.replaceChildren();
    lista.forEach(function (c) {
      linhaTabela(corpo, [
        F.dia(c.data),
        valor("humor", c.humor),
        valor("estresse", c.estresse),
        valor("convivencia", c.convivencia),
        temDiario(c.data) ? "Escrito (só nesta aba)" : "—",
        c.origem
      ]);
    });
  }

  // ---------- Atualização (as duas partes, cada uma com sua falha) ----------

  function carregar() {
    var falhas = [];
    var manha = window.RagaDados.buscarCasoSono().then(function (dados) {
      ultimoManha = dados;
      nomeAstronauta(dados);
      mostrarManha(dados);
    }, function (erro) { falhas.push({ parte: "manhã", erro: erro, temDados: !!ultimoManha }); });

    var noite = window.RagaDados.buscarCheckinsNoite().then(function (dados) {
      ultimoNoite = dados;
      nomeAstronauta(dados);
      mostrarNoite(dados);
    }, function (erro) { falhas.push({ parte: "noite", erro: erro, temDados: !!ultimoNoite }); });

    return Promise.all([manha, noite]).then(function () {
      var temDados = !!(ultimoManha || ultimoNoite);
      painel.setAttribute("data-tem-dados", temDados ? "sim" : "nao");
      if (temDados) mostrarFonte();
      if (!falhas.length) {
        painel.setAttribute("data-estado", "ok");
        aviso.textContent = "";
        return;
      }
      // Mantém o que já estava na tela e diz qual parte falhou.
      var agora = F.hora(new Date().toISOString());
      painel.setAttribute("data-estado", "erro");
      aviso.textContent = falhas.map(function (f) {
        var motivo = f.erro && (f.erro.status || f.erro.rede) ? " (" + f.erro.message + ")" : "";
        return "A atualização da " + f.parte + " falhou às " + agora + motivo +
          (f.temDados ? "; os dados mostrados podem estar desatualizados." : ".");
      }).join(" ") + " Nova tentativa em 10 segundos.";
    });
  }

  // ---------- Manhã: formulário ----------

  var formManha = $("form-manha");
  var mensagemManha = $("manha-mensagem");
  var campoData = $("manha-data");
  var campoInicio = $("manha-inicio");
  var campoFim = $("manha-fim");
  var campoInterrupcoes = $("manha-interrupcoes");

  // "2026-11-10" + "06:30" → "2026-11-10T06:30:00-03:00", com o fuso do navegador.
  function isoLocal(dia, horaTexto) {
    var p = dia.split("-").map(Number);
    var h = horaTexto.split(":").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], h[0], h[1]);
    var minutos = -d.getTimezoneOffset();
    var sinal = minutos >= 0 ? "+" : "-";
    var abs = Math.abs(minutos);
    return dataTexto(d) + "T" + String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":00" + sinal +
      String(Math.floor(abs / 60)).padStart(2, "0") + ":" + String(abs % 60).padStart(2, "0");
  }

  // Se a hora de dormir for igual ou maior que a de acordar,
  // a pessoa dormiu no dia anterior.
  function calcularHorario() {
    if (!campoData.value || !campoInicio.value || !campoFim.value) return null;
    var fimDia = campoData.value;
    var inicioDia = fimDia;
    if (campoInicio.value >= campoFim.value) {
      var p = fimDia.split("-").map(Number);
      inicioDia = dataTexto(new Date(p[0], p[1] - 1, p[2] - 1));
    }
    var inicio = isoLocal(inicioDia, campoInicio.value);
    var fim = isoLocal(fimDia, campoFim.value);
    var horas = (new Date(fim) - new Date(inicio)) / 3600000;
    return { inicio: inicio, fim: fim, horas: Math.round(horas * 100) / 100 };
  }

  function atualizarDuracao() {
    var h = calcularHorario();
    $("manha-duracao").textContent = "Duração calculada: " + (h ? F.duracao(h.horas) : "—");
  }

  [campoData, campoInicio, campoFim].forEach(function (c) {
    c.addEventListener("input", atualizarDuracao);
  });

  function prepararManha() {
    campoData.max = hojeTexto();
    campoData.value = hojeTexto();
    atualizarDuracao();
  }

  // Validação de interface; o servidor precisa validar de novo.
  function validarManha() {
    var erros = [];
    var escolhida = formManha.querySelector('input[name="qualidade"]:checked');

    var erroData = "";
    if (!campoData.value) erroData = "Informe a data em que você acordou.";
    else if (campoData.value > hojeTexto()) erroData = "A data não pode ser no futuro.";
    marcarErro("erro-manha-data", [campoData], erroData);
    if (erroData) erros.push(campoData);

    var horario = calcularHorario();
    var erroHorario = "";
    if (!campoInicio.value || !campoFim.value) erroHorario = "Informe a hora em que dormiu e a hora em que acordou.";
    else if (horario && horario.horas > 16) erroHorario = "A duração passou de 16 horas. Confira os horários.";
    marcarErro("erro-manha-horario", [campoInicio, campoFim], erroHorario);
    if (erroHorario) erros.push(campoInicio.value ? campoFim : campoInicio);

    var interrupcoes = campoInterrupcoes.value;
    var erroInterrupcoes = "";
    if (!/^\d+$/.test(interrupcoes)) erroInterrupcoes = "Informe um número inteiro (0 se não acordou).";
    else if (Number(interrupcoes) > 30) erroInterrupcoes = "Informe no máximo 30.";
    marcarErro("erro-manha-interrupcoes", [campoInterrupcoes], erroInterrupcoes);
    if (erroInterrupcoes) erros.push(campoInterrupcoes);

    var erroQualidade = escolhida ? "" : "Escolha uma opção de 1 a 5.";
    marcarErro("erro-manha-qualidade", [], erroQualidade);
    if (erroQualidade) erros.push(formManha.querySelector('input[name="qualidade"]'));

    if (erros.length || !horario) {
      if (erros.length) erros[0].focus();
      return null;
    }
    return {
      noite_em: isoLocal(campoData.value, "00:00"),
      inicio_sono: horario.inicio,
      fim_sono: horario.fim,
      duracao_horas: horario.horas,
      qualidade: Number(escolhida.value),
      interrupcoes: Number(interrupcoes)
    };
  }

  formManha.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mensagemManha.textContent = "";
    var checkin = validarManha();
    if (!checkin) {
      mensagemManha.textContent = "Confira os campos destacados.";
      return;
    }
    var botao = formManha.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinSono(checkin).then(function (resposta) {
      mensagemManha.textContent = resposta.situacao === "salvo_no_servidor"
        ? "Check-in salvo no servidor para o despertar de " + F.dia(checkin.noite_em) + ". A avaliação nova aparece no painel."
        : "Check-in registrado nesta aba para o despertar de " + F.dia(checkin.noite_em) + ". Ele aparece no painel como ainda não avaliado.";
      formManha.reset();
      prepararManha();
      return carregar();
    }).catch(function (erro) {
      if (erro && erro.semRota) {
        mensagemManha.textContent = erro.message + " Seus dados continuam no formulário.";
        return;
      }
      var motivo = erro && erro.status ? " O servidor respondeu: " + erro.message : "";
      mensagemManha.textContent = "Não foi possível registrar o check-in." + motivo +
        " Seus dados continuam no formulário; tente de novo.";
    }).then(function () {
      botao.disabled = false;
    });
  });

  // ---------- Noite: formulário ----------

  var formNoite = $("form-noite");
  var mensagemNoite = $("noite-mensagem");
  var campoDataNoite = $("noite-data");
  var campoDiario = $("noite-diario");

  function atualizarContador() {
    $("diario-contador").textContent = campoDiario.value.length + " de 1000 caracteres";
  }
  campoDiario.addEventListener("input", atualizarContador);

  function prepararNoite() {
    campoDataNoite.max = hojeTexto();
    campoDataNoite.value = hojeTexto();
    atualizarContador();
  }

  function escolhido(nome) {
    var marcado = formNoite.querySelector('input[name="' + nome + '"]:checked');
    return marcado ? Number(marcado.value) : null;
  }

  function validarNoite() {
    var erros = [];
    var erroData = "";
    if (!campoDataNoite.value) erroData = "Informe a data.";
    else if (campoDataNoite.value > hojeTexto()) erroData = "A data não pode ser no futuro.";
    marcarErro("erro-noite-data", [campoDataNoite], erroData);
    if (erroData) erros.push(campoDataNoite);

    var respostas = {};
    ["humor", "estresse", "convivencia"].forEach(function (nome) {
      var n = escolhido(nome);
      $("erro-" + nome).textContent = n ? "" : "Escolha uma opção de 1 a 5.";
      if (!n) erros.push(formNoite.querySelector('input[name="' + nome + '"]'));
      respostas[nome] = n;
    });

    if (erros.length) {
      erros[0].focus();
      return null;
    }
    // O diário não entra no objeto enviado.
    return {
      data: campoDataNoite.value,
      humor: respostas.humor,
      estresse: respostas.estresse,
      convivencia: respostas.convivencia,
      registrado_em: new Date().toISOString()
    };
  }

  formNoite.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mensagemNoite.textContent = "";
    var checkin = validarNoite();
    if (!checkin) {
      mensagemNoite.textContent = "Confira os campos destacados.";
      return;
    }
    var diario = campoDiario.value.trim();
    var botao = formNoite.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinNoite(checkin).then(function (resposta) {
      var guardado = diario ? guardarDiario(checkin.data, diario) : true;
      mensagemNoite.textContent = (resposta.situacao === "salvo_no_servidor"
        ? "Check-in da noite de " + F.dia(checkin.data) + " salvo no servidor."
        : "Check-in da noite de " + F.dia(checkin.data) + " registrado nesta aba.") +
        (diario ? (guardado ? " O diário ficou só neste navegador." : " O navegador bloqueou o armazenamento, então o diário não foi guardado.") : "");
      formNoite.reset();
      prepararNoite();
      return carregar();
    }).catch(function (erro) {
      if (erro && erro.semRota) {
        mensagemNoite.textContent = erro.message + " Suas respostas continuam no formulário.";
        return;
      }
      var motivo = erro && erro.status ? " O servidor respondeu: " + erro.message : "";
      mensagemNoite.textContent = "Não foi possível registrar o check-in." + motivo +
        " Suas respostas continuam no formulário; tente de novo.";
    }).then(function () {
      botao.disabled = false;
    });
  });

  // ---------- Início ----------
  prepararManha();
  prepararNoite();
  carregar();
  setInterval(carregar, INTERVALO_MS);
})();
