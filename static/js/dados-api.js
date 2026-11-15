// Ligação do front com a API Flask do Raga.
// dashboard.js e equipe-medica.js usam só window.RagaDados; este arquivo
// decide de onde os dados vêm:
//
//   - API: rotas descritas em docs/api.md.
//   - Dados locais (dados-demo.js), com aviso na tela, quando:
//       * a página foi aberta com ?fonte=demo ou ?simular=...;
//       * a rota não existe ou o servidor não responde na 1ª consulta
//         (ex.: página aberta pelo Live Server, Flask sem a rota).
//
// Depois que a API respondeu uma vez, uma falha seguinte NÃO troca para os
// dados locais: a tela mostra a falha e mantém os últimos dados (AGENTS.md).
(function () {
  var ASTRONAUTA_ID = 1; // astronauta fictícia usada pelo painel
  var BASE = "/api/astronautas/" + ASTRONAUTA_ID;
  var demo = window.RagaDadosDemo;
  var params = new URLSearchParams(window.location.search);
  var escolhida = params.get("fonte") === "demo" || params.has("simular");
  // ?data=AAAA-MM-DD escolhe a data avaliada (ex.: 2026-11-10 mostra o
  // alerta do cenário). Sem ela, avalia a data local de hoje.
  var dataEscolhida = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") || "") ? params.get("data") : null;

  // Fonte decidida POR TIPO DE DADO (sono, noite, reação, médica), porque
  // uma página pode usar rotas que já existem e outras que ainda não.
  // fonte: null (ainda não decidida) | "api" | "demo"
  var estados = {};
  var errosApi = {
    "Informe data válida, não futura, em AAAA-MM-DD.": "Enter a valid, non-future date in YYYY-MM-DD format.",
    "Informe data válida em AAAA-MM-DD.": "Enter a valid date in YYYY-MM-DD format.",
    "Identificador inválido.": "Invalid identifier.",
    "Banco indisponível.": "Database unavailable.",
    "Astronauta não encontrado.": "Astronaut not found.",
    "Dados inconsistentes; avaliação indisponível.": "Inconsistent data; assessment unavailable.",
    "Indicador inválido. Informe área, valor e horário com fuso.": "Invalid indicator. Enter area, value and a timestamp with time zone.",
    "Já existe indicador desta área nessa data.": "An indicator for this area and date already exists.",
    "Indicadores existentes inconsistentes.": "Existing indicators are inconsistent.",
    "Teste inválido. Confira horário e as dez tentativas.": "Invalid test. Check the timestamp and all ten attempts.",
    "Dados de testes inconsistentes.": "Inconsistent test data.",
    "Já existe um teste com este horário.": "A test with this timestamp already exists.",
    "Dados de sono inconsistentes; acompanhamento indisponível.": "Inconsistent sleep data; follow-up unavailable.",
    "Informe a data da avaliação.": "Enter the assessment date.",
    "Informe a ação demonstrativa.": "Enter the demonstration action.",
    "Informe a data da reavaliação.": "Enter the reassessment date.",
    "Check-in inválido. Confira data, escalas, diário e horário.": "Invalid check-in. Check the date, scales, journal and timestamp.",
    "Já existe check-in para esta data.": "A check-in for this date already exists.",
    "Dados de sono inconsistentes; consulta indisponível.": "Inconsistent sleep data; query unavailable.",
    "Dados de sono inválidos. Confira horários, data, qualidade e interrupções.": "Invalid sleep data. Check times, date, quality and interruptions.",
    "Já existe registro para esta data de despertar.": "A record for this wake date already exists.",
    "Dados de sono inconsistentes; gravação indisponível.": "Inconsistent sleep data; saving unavailable.",
    "Dados de sono inconsistentes; avaliação indisponível.": "Inconsistent sleep data; assessment unavailable.",
    "Não há registro de despertar para a data escolhida.": "There is no wake record for the selected date.",
    "Acompanhamento não encontrado.": "Follow-up not found.",
    "Este acompanhamento já foi encerrado.": "This follow-up is already closed.",
    "Já existe acompanhamento de sono em aberto.": "An open sleep follow-up already exists.",
    "A indicação deve ser posterior ao último acompanhamento registrado.": "The indication must be after the last recorded follow-up.",
    "A data precisa ter avaliação amarela de sono.": "The date must have a yellow sleep assessment.",
    "Já existe acompanhamento para esta indicação ou um acompanhamento aberto.": "A follow-up for this indication or an open follow-up already exists.",
    "Ação demonstrativa inválida.": "Invalid demonstration action.",
    "A ação já foi registrada.": "The action has already been recorded.",
    "Registre a ação antes da reavaliação.": "Record the action before reassessment.",
    "A reavaliação exige uma data posterior à última avaliação registrada.": "Reassessment requires a date after the last recorded assessment.",
    "O novo despertar deve ser posterior ao último avaliado.": "The new wake record must be after the last assessed one."
  };
  function estadoDe(chave) {
    if (!estados[chave]) {
      estados[chave] = { fonte: escolhida ? "demo" : null, motivo: escolhida ? "escolhida" : null };
    }
    return estados[chave];
  }

  // fetch com tratamento dos erros no formato {"erro": "..."} da API.
  function pedir(url, opcoes) {
    var config = Object.assign({ headers: { Accept: "application/json" } }, opcoes || {});
    return fetch(url, config).then(function (resposta) {
      var tipo = resposta.headers.get("Content-Type") || "";
      if (tipo.indexOf("application/json") === -1) {
        // Sem JSON = a rota não existe neste servidor (404 em HTML).
        var ausente = new Error("Route unavailable: " + url);
        ausente.rotaAusente = true;
        ausente.status = resposta.status;
        throw ausente;
      }
      return resposta.json().then(function (corpo) {
        if (!resposta.ok) {
          var erro = new Error(errosApi[corpo.erro] || "Server error " + resposta.status + ".");
          erro.status = resposta.status; // mensagem segura, vinda da API
          throw erro;
        }
        return corpo;
      });
    }, function () {
      var rede = new Error("No connection to the server.");
      rede.rede = true;
      throw rede;
    });
  }

  // Tenta a API; na 1ª consulta, se a rota não existir, usa os dados locais.
  function comReserva(chave, api, reserva) {
    var estado = estadoDe(chave);
    if (estado.fonte === "demo") return reserva();
    return api().then(function (dados) {
      estado.fonte = "api";
      return dados;
    }, function (erro) {
      if (estado.fonte === null && (erro.rotaAusente || erro.rede)) {
        estado.fonte = "demo";
        estado.motivo = "api_indisponivel";
        return reserva();
      }
      estado.fonte = estado.fonte || "api";
      throw erro;
    });
  }

  // ---------- Caso de sono ----------

  // Consulta o sono e as áreas na data escolhida ou na data local de hoje.
  function casoSonoDaApi() {
    return pedir(BASE + "/sono/registros").then(function (historico) {
      var registros = historico.registros;
      var hoje = new Date();
      var hojeTexto = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
      var data = dataEscolhida || hojeTexto;
      var avaliacao = registros.length && data
        ? pedir(BASE + "/sono/avaliacoes?data=" + data)
        : Promise.resolve({ avaliacoes: [] });
      return Promise.all([avaliacao, pedir(BASE + "/areas?data=" + data)]).then(function (resultados) {
        var avaliacoes = resultados[0].avaliacoes;
        var painel = resultados[1];
        return {
          modo: "api",
          atualizado_em: new Date().toISOString(),
          astronauta: historico.astronauta,
          estado_geral: painel.estado_geral,
          areas: painel.areas,
          sono: {
            linha_base: historico.linha_base,
            registros: registros,
            avaliacoes: avaliacoes
          }
        };
      });
    });
  }

  function checkinNaApi(checkin) {
    return pedir(BASE + "/sono/registros", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(checkin)
    }).then(function (corpo) {
      return { situacao: "salvo_no_servidor", registro: corpo.registro };
    }, function (erro) {
      // Sem JSON (ex.: 405 em HTML) = o servidor ainda não tem o POST.
      if (erro.rotaAusente) {
        var pendente = new Error("The server cannot save this sleep check-in: the required route is unavailable.");
        pendente.semRota = true;
        throw pendente;
      }
      throw erro;
    });
  }

  window.RagaDados = {
    // Para a tela avisar de onde vêm os dados de cada tipo:
    // "sono", "noite", "reacao" ou "medica".
    fonte: function (chave) {
      var e = estadoDe(chave || "sono");
      return { fonte: e.fonte, motivo: e.motivo };
    },

    buscarCasoSono: function () {
      return comReserva("sono", casoSonoDaApi, demo.buscarCasoSono);
    },

    buscarHistoricoSono: function () {
      return comReserva("sono", function () {
        return pedir(BASE + "/sono/registros").then(function (historico) {
          return { astronauta: historico.astronauta, sono: { registros: historico.registros } };
        });
      }, demo.buscarCasoSono);
    },

    enviarCheckinSono: function (checkin) {
      if (estadoDe("sono").fonte === "demo") return demo.enviarCheckinSono(checkin);
      return checkinNaApi(checkin);
    },

    enviarIndicador: function (indicador) {
      return pedir(BASE + "/indicadores", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(indicador)
      });
    },

    buscarAcompanhamentosSono: function () {
      return pedir(BASE + "/sono/acompanhamentos");
    },

    iniciarAcompanhamentoSono: function (data) {
      return pedir(BASE + "/sono/acompanhamentos", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ data_avaliacao: data })
      });
    },

    registrarAcaoSono: function (id) {
      return pedir(BASE + "/sono/acompanhamentos/" + id + "/acoes", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "revisar_registros" })
      });
    },

    reavaliarSono: function (id, data) {
      return pedir(BASE + "/sono/acompanhamentos/" + id + "/reavaliacoes", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ data_avaliacao: data })
      });
    },

    // Check-in da noite, incluindo o diário fictício compartilhado.
    buscarCheckinsNoite: function () {
      return comReserva("noite", function () { return pedir(BASE + "/mente/checkins"); }, demo.buscarCheckinsNoite);
    },

    enviarCheckinNoite: function (checkin) {
      if (estadoDe("noite").fonte === "demo") return demo.enviarCheckinNoite(checkin);
      return pedir(BASE + "/mente/checkins", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(checkin)
      }).then(function (corpo) {
        return { situacao: "salvo_no_servidor", checkin: corpo.checkin };
      }, function (erro) {
        if (erro.rotaAusente) {
          var pendente = new Error("The server cannot save this evening check-in: the required route is unavailable.");
          pendente.semRota = true;
          throw pendente;
        }
        throw erro;
      });
    },

    // Teste de reação (Cognição).
    buscarTestesReacao: function () {
      return comReserva("reacao", function () { return pedir(BASE + "/cognicao/testes"); }, demo.buscarTestesReacao);
    },

    enviarTesteReacao: function (teste) {
      if (estadoDe("reacao").fonte === "demo") return demo.enviarTesteReacao(teste);
      return pedir(BASE + "/cognicao/testes", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(teste)
      }).then(function (corpo) {
        return { situacao: "salvo_no_servidor", teste: corpo.teste };
      }, function (erro) {
        if (erro.rotaAusente) {
          var pendente = new Error("The server cannot save this reaction test: the required route is unavailable.");
          pendente.semRota = true;
          throw pendente;
        }
        throw erro;
      });
    },

    // A visão médica lê apenas o banco local fictício.
    buscarVisaoMedica: function () {
      var consulta = dataEscolhida ? "?data=" + encodeURIComponent(dataEscolhida) : "";
      return comReserva("medica", function () { return pedir("/api/equipe-medica/sono" + consulta); }, demo.buscarVisaoMedica);
    }
  };
})();
