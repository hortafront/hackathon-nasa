// Página de check-ins do dia: manhã (Sono) e noite (Mente e equipe).
// Cada parte tem formulário, histórico e fonte de dados próprios
// (a API pode ter a rota do sono e ainda não ter a da noite).
// - O front não avalia nada: as regras ilustrativas ficam no back-end.
// - Diário: PRIVADO POR PADRÃO. Só é enviado ao servidor (e aparece na
//   visão médica) se a pessoa marcar "compartilhar". Sem isso, o front
//   envia diario "" e guarda o texto só no sessionStorage desta aba.
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
      el.textContent = F.textoExibicao(dados.astronauta.nome_exibicao);
    });
  }

  // Aviso do topo: diz se cada parte veio da API ou dos dados locais.
  function mostrarFonte() {
    var manha = window.RagaDados.fonte("sono");
    var noite = window.RagaDados.fonte("noite");
    if (manha.fonte === noite.fonte) {
      $("aviso-fonte").textContent = F.textoFonte(manha);
    } else {
      var desc = function (f) { return f.fonte === "api" ? "server data" : "local fictional data"; };
      $("aviso-fonte").textContent = "Morning: " + desc(manha) + ". Evening: " + desc(noite) + ".";
    }
    $("manha-nota-fonte").textContent = manha.fonte === "api"
      ? "The check-in is saved on the local server using fictional data, and the API recalculates the assessment."
      : "In this demonstration, the check-in stays in this tab and is not sent to a server.";
    $("noite-nota-fonte").textContent = noite.fonte === "api"
      ? "Your 1–5 answers are saved on the server and shown in the medical view. The journal text is sent only if you choose to share it. There is no access control."
      : "In this demonstration, answers stay in this tab. The journal text appears in the local medical view only if you choose to share it.";
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
        F.hora(r.inicio_sono) + " to " + F.hora(r.fim_sono),
        r.qualidade + " out of 5",
        String(r.interrupcoes),
        F.textoExibicao(r.origem) + (r.nao_avaliado ? ", not yet assessed" : "")
      ]);
    });
  }

  // ---------- Noite: histórico ----------

  var ROTULOS = {
    humor: ["", "Very bad", "Bad", "Neutral", "Good", "Very good"],
    estresse: ["", "None", "A little", "Moderate", "A lot", "Extreme"],
    convivencia: ["", "Very difficult", "Difficult", "Normal", "Good", "Very good"]
  };

  // "4 (Bom)": número e palavra, para não depender de lembrar a escala.
  function valor(campo, n) {
    return n + " (" + ROTULOS[campo][n] + ")";
  }

  // ---------- Diário privado (só nesta aba) ----------
  // sessionStorage pode estar bloqueado; nesse caso o texto privado não é guardado.
  function chaveDiario(data) { return "raga-diario-privado-" + data; }

  function guardarDiarioPrivado(data, texto) {
    try {
      if (texto) sessionStorage.setItem(chaveDiario(data), texto);
      else sessionStorage.removeItem(chaveDiario(data));
      return true;
    } catch (erro) {
      return false;
    }
  }

  function temDiarioPrivado(data) {
    try {
      return !!sessionStorage.getItem(chaveDiario(data));
    } catch (erro) {
      return false;
    }
  }

  // Coluna "Journal": compartilhado (texto veio do servidor), privado
  // (texto só nesta aba) ou nenhum.
  function situacaoDiario(c) {
    if (c.diario) return "Shared: " + F.textoExibicao(c.diario);
    if (temDiarioPrivado(c.data)) return "Private (only in this tab)";
    return "—";
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
        situacaoDiario(c),
        F.textoExibicao(c.origem)
      ]);
    });
  }

  // ---------- Atualização (as duas partes, cada uma com sua falha) ----------

  function carregar() {
    var falhas = [];
    var manha = window.RagaDados.buscarHistoricoSono().then(function (dados) {
      ultimoManha = dados;
      nomeAstronauta(dados);
      mostrarManha(dados);
    }, function (erro) { falhas.push({ parte: "morning", erro: erro, temDados: !!ultimoManha }); });

    var noite = window.RagaDados.buscarCheckinsNoite().then(function (dados) {
      ultimoNoite = dados;
      nomeAstronauta(dados);
      mostrarNoite(dados);
    }, function (erro) { falhas.push({ parte: "evening", erro: erro, temDados: !!ultimoNoite }); });

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
        return "The " + f.parte + " update failed at " + agora + motivo +
          (f.temDados ? "; displayed data may be out of date." : ".");
      }).join(" ") + " Retrying in 10 seconds.";
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
    $("manha-duracao").textContent = "Calculated duration: " + (h ? F.duracao(h.horas) : "—");
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
    if (!campoData.value) erroData = "Enter the date you woke up.";
    else if (campoData.value > hojeTexto()) erroData = "The date cannot be in the future.";
    marcarErro("erro-manha-data", [campoData], erroData);
    if (erroData) erros.push(campoData);

    var horario = calcularHorario();
    var erroHorario = "";
    if (!campoInicio.value || !campoFim.value) erroHorario = "Enter your sleep and wake times.";
    else if (horario && horario.horas > 16) erroHorario = "The duration exceeds 16 hours. Check the times.";
    marcarErro("erro-manha-horario", [campoInicio, campoFim], erroHorario);
    if (erroHorario) erros.push(campoInicio.value ? campoFim : campoInicio);

    var interrupcoes = campoInterrupcoes.value;
    var erroInterrupcoes = "";
    if (!/^\d+$/.test(interrupcoes)) erroInterrupcoes = "Enter a whole number (0 if you did not wake).";
    else if (Number(interrupcoes) > 30) erroInterrupcoes = "Enter a maximum of 30.";
    marcarErro("erro-manha-interrupcoes", [campoInterrupcoes], erroInterrupcoes);
    if (erroInterrupcoes) erros.push(campoInterrupcoes);

    var erroQualidade = escolhida ? "" : "Choose an option from 1 to 5.";
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
      mensagemManha.textContent = "Check the highlighted fields.";
      return;
    }
    var botao = formManha.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinSono(checkin).then(function (resposta) {
      mensagemManha.textContent = resposta.situacao === "salvo_no_servidor"
        ? "Check-in saved on the server for " + F.dia(checkin.noite_em) + ". The updated assessment appears on the dashboard."
        : "Check-in recorded in this tab for " + F.dia(checkin.noite_em) + ". It appears on the dashboard as not yet assessed.";
      formManha.reset();
      prepararManha();
      return carregar();
    }).catch(function (erro) {
      if (erro && erro.semRota) {
        mensagemManha.textContent = erro.message + " Your data remains in the form.";
        return;
      }
      var motivo = erro && erro.status ? " Server response: " + erro.message : "";
      mensagemManha.textContent = "Could not save the check-in." + motivo +
        " Your data remains in the form; try again.";
    }).then(function () {
      botao.disabled = false;
    });
  });

  // ---------- Noite: formulário ----------

  var formNoite = $("form-noite");
  var mensagemNoite = $("noite-mensagem");
  var campoDataNoite = $("noite-data");
  var campoDiario = $("noite-diario");
  var campoCompartilhar = $("noite-compartilhar");

  function atualizarContador() {
    $("diario-contador").textContent = campoDiario.value.length + " of 1000 characters";
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
    if (!campoDataNoite.value) erroData = "Enter the date.";
    else if (campoDataNoite.value > hojeTexto()) erroData = "The date cannot be in the future.";
    marcarErro("erro-noite-data", [campoDataNoite], erroData);
    if (erroData) erros.push(campoDataNoite);

    var respostas = {};
    ["humor", "estresse", "convivencia"].forEach(function (nome) {
      var n = escolhido(nome);
      $("erro-" + nome).textContent = n ? "" : "Choose an option from 1 to 5.";
      if (!n) erros.push(formNoite.querySelector('input[name="' + nome + '"]'));
      respostas[nome] = n;
    });

    if (erros.length) {
      erros[0].focus();
      return null;
    }
    // Sem permissão, o texto do diário NÃO entra no envio: vai vazio
    // (a API exige o campo) e fica só nesta aba.
    return {
      data: campoDataNoite.value,
      humor: respostas.humor,
      estresse: respostas.estresse,
      convivencia: respostas.convivencia,
      diario: campoCompartilhar.checked ? campoDiario.value.trim() : "",
      registrado_em: new Date().toISOString()
    };
  }

  formNoite.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mensagemNoite.textContent = "";
    var checkin = validarNoite();
    if (!checkin) {
      mensagemNoite.textContent = "Check the highlighted fields.";
      return;
    }
    var textoDiario = campoDiario.value.trim();
    var compartilhado = campoCompartilhar.checked && !!textoDiario;
    var botao = formNoite.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.RagaDados.enviarCheckinNoite(checkin).then(function (resposta) {
      // Diário não compartilhado: guarda só nesta aba, depois do envio dar certo.
      var guardado = compartilhado ? guardarDiarioPrivado(checkin.data, "") :
        (textoDiario ? guardarDiarioPrivado(checkin.data, textoDiario) : true);
      var lugar = resposta.situacao === "salvo_no_servidor" ? "saved on the server" : "saved in this tab";
      var sobreDiario = !textoDiario ? ""
        : compartilhado ? " The journal entry was shared with the mission psychologist (medical view)."
        : guardado ? " The journal entry stayed private, only in this tab."
        : " The browser blocked storage, so the private journal entry was not kept.";
      mensagemNoite.textContent = "Evening check-in for " + F.dia(checkin.data) + " " + lugar + "." + sobreDiario;
      formNoite.reset();
      prepararNoite();
      return carregar();
    }).catch(function (erro) {
      if (erro && erro.semRota) {
        mensagemNoite.textContent = erro.message + " Your responses remain in the form.";
        return;
      }
      var motivo = erro && erro.status ? " Server response: " + erro.message : "";
      mensagemNoite.textContent = "Could not save the check-in." + motivo +
        " Your responses remain in the form; try again.";
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
