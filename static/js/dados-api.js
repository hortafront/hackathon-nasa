// Ligação do front com a API Flask do Raga.
// dashboard.js e equipe-medica.js usam só window.RagaDados; este arquivo
// decide de onde os dados vêm:
//
//   - API: rotas descritas em docs/integracao-front-api.md
//     (a de avaliação já existe; as outras são a recomendação ao back-end).
//   - Dados locais (dados-demo.js), com aviso na tela, quando:
//       * a página foi aberta com ?fonte=demo ou ?simular=...;
//       * a rota não existe ou o servidor não responde na 1ª consulta
//         (ex.: página aberta pelo Live Server, Flask sem a rota).
//
// Depois que a API respondeu uma vez, uma falha seguinte NÃO troca para os
// dados locais: a tela mostra a falha e mantém os últimos dados (AGENTS.md).
(function () {
  var ASTRONAUTA_ID = 1; // única astronauta fictícia carregada no banco
  var BASE = "/api/astronautas/" + ASTRONAUTA_ID;
  var demo = window.RagaDadosDemo;
  var params = new URLSearchParams(window.location.search);
  var escolhida = params.get("fonte") === "demo" || params.has("simular");
  // ?data=AAAA-MM-DD escolhe a data avaliada (ex.: 2026-11-10 mostra o
  // alerta do cenário). Sem ela, avalia o despertar mais recente.
  var dataEscolhida = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") || "") ? params.get("data") : null;

  // Fonte decidida POR TIPO DE DADO (sono, noite, reação, médica), porque
  // uma página pode usar rotas que já existem e outras que ainda não.
  // fonte: null (ainda não decidida) | "api" | "demo"
  var estados = {};
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
        var ausente = new Error("Rota indisponível: " + url);
        ausente.rotaAusente = true;
        ausente.status = resposta.status;
        throw ausente;
      }
      return resposta.json().then(function (corpo) {
        if (!resposta.ok) {
          var erro = new Error(corpo.erro || "Erro " + resposta.status + ".");
          erro.status = resposta.status; // mensagem segura, vinda da API
          throw erro;
        }
        return corpo;
      });
    }, function () {
      var rede = new Error("Sem conexão com o servidor.");
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

  // A API só tem o sono. As outras 5 áreas vêm de dados-demo.js,
  // marcadas como locais (local: true) para a tela avisar.
  function areasDaApi(registros, avaliacao) {
    var estadoSono = avaliacao ? avaliacao.estado : (registros.length ? "dados_insuficientes" : "sem_registros");
    var resumoSono = avaliacao
      ? "Avaliado com dados até " + window.RagaFormato.dia(avaliacao.data_avaliacao) + "."
      : "Nenhum registro de sono ainda.";
    return [{ id: "sono", nome: "Sono", estado: estadoSono, resumo: resumoSono }]
      .concat(demo.areasLocais());
  }

  // GET /sono/registros (recomendada) + GET /sono/avaliacao (já existe),
  // avaliando ?data= ou a data do despertar mais recente.
  function casoSonoDaApi() {
    return pedir(BASE + "/sono/registros").then(function (historico) {
      var registros = historico.registros;
      var ultimo = registros[registros.length - 1];
      var data = dataEscolhida || (ultimo ? ultimo.fim_sono.slice(0, 10) : null);
      var avaliacao = registros.length && data
        ? pedir(BASE + "/sono/avaliacao?data=" + data)
        : Promise.resolve(null);
      return avaliacao.then(function (av) {
        return {
          modo: "api",
          atualizado_em: new Date().toISOString(),
          astronauta: historico.astronauta,
          estado_geral: {
            estado: "dados_insuficientes",
            explicacao: "Só a área Sono vem da API; as outras são exemplos locais. Por isso o estado geral não é calculado."
          },
          areas: areasDaApi(registros, av),
          sono: {
            linha_base: historico.linha_base,
            registros: registros,
            // A API devolve só a avaliação atual; o histórico de avaliações
            // (indicação → reavaliação) é recomendação ao back-end.
            avaliacoes: av ? [av] : []
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
        var pendente = new Error("O servidor ainda não grava check-in: essa parte depende do back-end (POST em /sono/registros).");
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

    enviarCheckinSono: function (checkin) {
      if (estadoDe("sono").fonte === "demo") return demo.enviarCheckinSono(checkin);
      return checkinNaApi(checkin);
    },

    // Check-in da noite (Mente e equipe). Rotas recomendadas em
    // docs/integracao-front-api.md; o diário NUNCA é enviado.
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
          var pendente = new Error("O servidor ainda não grava o check-in da noite: essa parte depende do back-end.");
          pendente.semRota = true;
          throw pendente;
        }
        throw erro;
      });
    },

    // Teste de reação (Cognição). Rotas recomendadas em
    // docs/integracao-front-api.md, seção 7.
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
          var pendente = new Error("O servidor ainda não grava o teste de reação: essa parte depende do back-end.");
          pendente.semRota = true;
          throw pendente;
        }
        throw erro;
      });
    },

    // Rota ainda não existe: recomendada em docs/integracao-front-api.md.
    buscarVisaoMedica: function () {
      return comReserva("medica", function () { return pedir("/api/equipe-medica/sono"); }, demo.buscarVisaoMedica);
    }
  };
})();
