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

  // fonte: null (ainda não decidida) | "api" | "demo"
  var estado = { fonte: escolhida ? "demo" : null, motivo: escolhida ? "escolhida" : null };

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
  function comReserva(api, reserva) {
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

  // A API ainda não tem as outras áreas: o front as mostra como sem
  // registros e não calcula estado geral.
  function areasDaApi(registros, avaliacao) {
    var semDados = "Ainda sem dados na API.";
    var estadoSono = avaliacao ? avaliacao.estado : (registros.length ? "dados_insuficientes" : "sem_registros");
    var resumoSono = avaliacao
      ? "Avaliado com dados até " + window.RagaFormato.dia(avaliacao.data_avaliacao) + "."
      : "Nenhum registro de sono ainda.";
    return [
      { id: "sono", nome: "Sono", estado: estadoSono, resumo: resumoSono },
      { id: "coracao", nome: "Coração", estado: "sem_registros", resumo: semDados },
      { id: "mente", nome: "Mente e equipe", estado: "sem_registros", resumo: semDados },
      { id: "exercicio", nome: "Exercício", estado: "sem_registros", resumo: semDados },
      { id: "cognicao", nome: "Cognição", estado: "sem_registros", resumo: semDados }
    ];
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
            explicacao: "4 das 5 áreas ainda não têm dados na API, então o estado geral não é calculado."
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
    });
  }

  window.RagaDados = {
    // Para a tela avisar de onde vêm os dados.
    fonte: function () {
      return { fonte: estado.fonte, motivo: estado.motivo };
    },

    buscarCasoSono: function () {
      return comReserva(casoSonoDaApi, demo.buscarCasoSono);
    },

    enviarCheckinSono: function (checkin) {
      if (estado.fonte === "demo") return demo.enviarCheckinSono(checkin);
      return checkinNaApi(checkin);
    },

    // Rota ainda não existe: recomendada em docs/integracao-front-api.md.
    buscarVisaoMedica: function () {
      return comReserva(function () { return pedir("/api/equipe-medica/sono"); }, demo.buscarVisaoMedica);
    }
  };
})();
