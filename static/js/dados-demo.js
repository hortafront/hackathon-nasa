// DADOS FICTÍCIOS LOCAIS — reserva e modo de demonstração do front-end.
// dados-api.js usa este arquivo quando a API não está disponível, quando a
// página é aberta com ?fonte=demo ou com ?simular=... (testes de estado).
// As respostas têm o mesmo formato das rotas descritas em
// docs/api.md, e a tela avisa que os dados são locais.
//
// Os nomes dos campos seguem o back-end:
// - astronauta, linha de base e registros: schema.sql / docs/dados.md;
// - avaliações: saída de avaliar_sono() em avaliacao_sono.py.
// Os valores são uma cópia de data/astronautas-ficticios.json, e as
// avaliações foram escritas à mão como avaliar_sono() responderia.
// O front NÃO calcula a regra.
//
// Para testar os estados da tela, abra a página com ?simular=...
//   reavaliado   → inclui a noite de 11/11 e a reavaliação (ciclo completo)
//   carregando   → a resposta nunca chega
//   vazio        → astronauta sem registros de sono
//   insuficiente → poucos registros para avaliar
//   erro         → a 1ª carga funciona e as atualizações seguintes falham
//   erro-inicial → falha já na primeira carga
(function () {
  var simular = new URLSearchParams(window.location.search).get("simular");
  var chamadas = {}; // por tipo de dado: cada parte carrega uma vez antes de falhar

  var astronauta = {
    id: 1,
    identificacao: "RAGA-AST-001",
    nome_exibicao: "Comandante Aurora",
    origem: "ficticia"
  };

  var linhaBase = {
    astronauta_id: 1,
    duracao_media_horas: 7.5,
    qualidade_media: 4.0,
    periodo_inicio: "2026-11-01T07:00:00-03:00",
    periodo_fim: "2026-11-04T07:00:00-03:00",
    origem: "simulada"
  };

  // Cópia de data/astronautas-ficticios.json. noite_em é a data do despertar.
  var registros = [
    { id: 1, noite_em: "2026-11-05T00:00:00-03:00", inicio_sono: "2026-11-04T23:00:00-03:00", fim_sono: "2026-11-05T06:30:00-03:00", duracao_horas: 7.5, qualidade: 4, interrupcoes: 1, origem: "simulada", observacao: "Noite de referência fictícia." },
    { id: 2, noite_em: "2026-11-06T00:00:00-03:00", inicio_sono: "2026-11-05T23:10:00-03:00", fim_sono: "2026-11-06T06:40:00-03:00", duracao_horas: 7.5, qualidade: 4, interrupcoes: 1, origem: "simulada", observacao: "Noite de referência fictícia." },
    { id: 3, noite_em: "2026-11-07T00:00:00-03:00", inicio_sono: "2026-11-06T23:20:00-03:00", fim_sono: "2026-11-07T06:40:00-03:00", duracao_horas: 7.33, qualidade: 3, interrupcoes: 2, origem: "simulada", observacao: "Noite de referência fictícia." },
    { id: 4, noite_em: "2026-11-08T00:00:00-03:00", inicio_sono: "2026-11-07T23:50:00-03:00", fim_sono: "2026-11-08T05:50:00-03:00", duracao_horas: 6.0, qualidade: 2, interrupcoes: 4, origem: "simulada", observacao: "Primeira noite alterada do cenário." },
    { id: 5, noite_em: "2026-11-09T00:00:00-03:00", inicio_sono: "2026-11-09T00:20:00-03:00", fim_sono: "2026-11-09T05:50:00-03:00", duracao_horas: 5.5, qualidade: 2, interrupcoes: 5, origem: "simulada", observacao: "Segunda noite alterada do cenário." },
    { id: 6, noite_em: "2026-11-10T00:00:00-03:00", inicio_sono: "2026-11-10T01:00:00-03:00", fim_sono: "2026-11-10T05:30:00-03:00", duracao_horas: 4.5, qualidade: 1, interrupcoes: 6, origem: "simulada", observacao: "Terceira noite alterada do cenário." },
    { id: 7, noite_em: "2026-11-11T00:00:00-03:00", inicio_sono: "2026-11-10T23:00:00-03:00", fim_sono: "2026-11-11T06:30:00-03:00", duracao_horas: 7.5, qualidade: 3, interrupcoes: 2, origem: "simulada", observacao: "Noite posterior fictícia; sem interpretação clínica." }
  ];

  // Respostas de GET /api/astronautas/1/sono/avaliacao?data=... (rota do Alan,
  // servico_sono.py) para cada cena, escritas à mão.
  var alerta = {
    astronauta_id: 1,
    area: "sono",
    data_avaliacao: "2026-11-10",
    linha_base_horas: 7.5,
    origem_linha_base: "simulada",
    origem_regra: "demonstracao_nao_clinica",
    estado: "amarelo",
    noites_consideradas: [
      { data_sono: "2026-11-08", duracao_horas: 6.0, origem: "simulada", registrado_em: "2026-11-08T05:50:00-03:00" },
      { data_sono: "2026-11-09", duracao_horas: 5.5, origem: "simulada", registrado_em: "2026-11-09T05:50:00-03:00" },
      { data_sono: "2026-11-10", duracao_horas: 4.5, origem: "simulada", registrado_em: "2026-11-10T05:30:00-03:00" }
    ],
    explicacao: "All three sleep durations are below the fictional individual baseline.",
    orientacao: "Review the records and follow their progress with the responsible team.",
    reavaliar_em_horas: 24
  };

  var reavaliacao = {
    astronauta_id: 1,
    area: "sono",
    data_avaliacao: "2026-11-11",
    linha_base_horas: 7.5,
    origem_linha_base: "simulada",
    origem_regra: "demonstracao_nao_clinica",
    estado: "verde",
    noites_consideradas: [
      { data_sono: "2026-11-09", duracao_horas: 5.5, origem: "simulada", registrado_em: "2026-11-09T05:50:00-03:00" },
      { data_sono: "2026-11-10", duracao_horas: 4.5, origem: "simulada", registrado_em: "2026-11-10T05:30:00-03:00" },
      { data_sono: "2026-11-11", duracao_horas: 7.5, origem: "simulada", registrado_em: "2026-11-11T06:30:00-03:00" }
    ],
    explicacao: "The demonstration rule for three nights below baseline was not triggered.",
    orientacao: null,
    reavaliar_em_horas: null
  };

  var insuficiente = {
    astronauta_id: 1,
    area: "sono",
    data_avaliacao: "2026-11-06",
    linha_base_horas: 7.5,
    origem_linha_base: "simulada",
    origem_regra: "demonstracao_nao_clinica",
    estado: "dados_insuficientes",
    noites_consideradas: [],
    explicacao: "The individual baseline and the three most recent consecutive nights are required.",
    orientacao: null,
    reavaliar_em_horas: null
  };

  // O que for registrado nesta aba fica no sessionStorage: some ao fechar
  // a aba, mas continua ao trocar de página (check-ins → painel).
  // Se o navegador bloquear, os dados ficam só na memória da página.
  function lerSessao(chave, padrao) {
    try {
      var texto = sessionStorage.getItem(chave);
      return texto ? JSON.parse(texto) : padrao;
    } catch (erro) {
      return padrao;
    }
  }

  function salvarSessao(chave, valor) {
    try {
      sessionStorage.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
      // Sem armazenamento: vale só até sair da página.
    }
  }

  // Check-ins de sono feitos nesta aba.
  var checkinsLocais = lerSessao("raga-demo-sono", []);

  // Check-ins da noite (Mente e equipe) fictícios. Escalas de 1 a 5:
  // humor e convivência (5 = melhor), estresse (5 = mais estresse).
  // O diário fictício acompanha o check-in na demonstração local.
  var checkinsNoite = lerSessao("raga-demo-noite", null) || [
    { id: 1, data: "2026-11-08", humor: 4, estresse: 2, convivencia: 4, registrado_em: "2026-11-08T21:30:00-03:00", origem: "simulada" },
    { id: 2, data: "2026-11-09", humor: 3, estresse: 3, convivencia: 4, registrado_em: "2026-11-09T21:40:00-03:00", origem: "simulada" },
    { id: 3, data: "2026-11-10", humor: 3, estresse: 4, convivencia: 3, registrado_em: "2026-11-10T22:05:00-03:00", origem: "simulada" }
  ];

  // Testes de reação fictícios (Cognição), inspirados no PVT.
  // Tempos em milissegundos; linha de base fictícia de 285 ms.
  var linhaBaseReacaoMs = 285;
  var testesReacao = lerSessao("raga-demo-reacao", null) || [
    { id: 1, realizado_em: "2026-11-08T08:10:00-03:00", tentativas: 10, mediana_ms: 281, mais_rapida_ms: 242, mais_lenta_ms: 356, acima_500ms: 0, antecipacoes: 0, origem: "simulada" },
    { id: 2, realizado_em: "2026-11-09T08:05:00-03:00", tentativas: 10, mediana_ms: 290, mais_rapida_ms: 251, mais_lenta_ms: 388, acima_500ms: 0, antecipacoes: 1, origem: "simulada" },
    { id: 3, realizado_em: "2026-11-10T08:12:00-03:00", tentativas: 10, mediana_ms: 286, mais_rapida_ms: 248, mais_lenta_ms: 371, acima_500ms: 0, antecipacoes: 0, origem: "simulada" }
  ];

  function copiar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Data local do despertar, tirada de fim_sono como em servico_sono.py.
  function dataDe(registro) {
    return registro.fim_sono.slice(0, 10);
  }

  // Cores escritas à mão apenas no modo local; não são limites clínicos.
  // A versão 2 do PDF norte contém cinco áreas; Metabolismo aguarda confirmação.
  var outrasAreas = [
    { id: "coracao", nome: "Heart", estado: "vermelho",
      resumo: "Simulated resting oxygen of 90%, below the fictional baseline (97%)." },
    { id: "mente", nome: "Mind and crew", estado: "amarelo",
      resumo: "Falling mood and rising stress in the last 3 evening check-ins." },
    { id: "exercicio", nome: "Exercise", estado: "verde",
      resumo: "2 h 10 min of exercise yesterday, within the fictional plan of 2 h per day." },
    { id: "cognicao", nome: "Cognition", estado: "verde",
      resumo: "Simulated reaction time of 285 ms, equal to the fictional baseline." },
    // 6ª área do PDF norte v3 (tag de glicose).
    { id: "metabolismo", nome: "Metabolism", estado: "verde",
      resumo: "Simulated glucose has been stable for 3 days, as in the fictional baseline." }
  ];

  // Áreas e estado geral fictícios independentes dos resultados da API.
  function areas(estadoSono, resumoSono) {
    var sono = { id: "sono", nome: "Sleep", estado: estadoSono, resumo: resumoSono };
    if (simular === "vazio") {
      return [sono].concat(outrasAreas.map(function (a) {
        return { id: a.id, nome: a.nome, estado: "sem_registros", resumo: "No records in this demonstration." };
      }));
    }
    return [sono].concat(copiar(outrasAreas).map(function (a) { a.local = true; return a; }));
  }

  function estadoGeral() {
    if (simular === "vazio") {
      return { estado: "dados_insuficientes", explicacao: "There are no records in this demonstration, so overall status is not calculated." };
    }
    return {
      estado: "vermelho",
      explicacao: "Demonstration example: overall status repeats the most severe area (Heart). The overall rule is still to be defined by the team."
    };
  }

  // Um check-in local substitui o registro da mesma data.
  function juntarRegistros(base) {
    var lista = base.filter(function (r) {
      return !checkinsLocais.some(function (c) { return dataDe(c) === dataDe(r); });
    });
    lista = lista.concat(copiar(checkinsLocais));
    lista.sort(function (a, b) { return dataDe(a) < dataDe(b) ? -1 : 1; });
    return lista;
  }

  function montarCasoSono() {
    // Cena padrão: o alerta de 10/11, antes da noite de 11/11.
    var base = registros.slice(0, 6);
    var avaliacoes = [alerta];
    var estadoSono = "amarelo";
    var resumoSono = "3 nights below the fictional baseline.";

    if (simular === "reavaliado") {
      base = registros;
      avaliacoes = [alerta, reavaliacao];
      estadoSono = "verde";
      resumoSono = "Reassessed on 11/11: rule not triggered.";
    } else if (simular === "vazio") {
      base = [];
      avaliacoes = [];
      estadoSono = "sem_registros";
      resumoSono = "No sleep records yet.";
    } else if (simular === "insuficiente") {
      base = registros.slice(0, 2);
      avaliacoes = [insuficiente];
      estadoSono = "dados_insuficientes";
      resumoSono = "Not enough records for assessment.";
    }

    return {
      modo: "demonstracao-local",
      atualizado_em: new Date().toISOString(),
      astronauta: copiar(astronauta),
      estado_geral: estadoGeral(),
      areas: areas(estadoSono, resumoSono),
      sono: {
        linha_base: copiar(linhaBase),
        registros: juntarRegistros(base),
        // Da mais antiga para a mais recente; a última é a atual.
        avaliacoes: copiar(avaliacoes)
      }
    };
  }

  // Espera curta para o estado "carregando" aparecer, como numa rede real.
  function responder(fn, atraso) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          resolve(fn());
        } catch (erro) {
          reject(erro);
        }
      }, atraso);
    });
  }

  function falha() {
    throw new Error("Simulated update failure.");
  }

  // Conta a chamada deste tipo e diz se a simulação manda falhar.
  function deveFalhar(chave) {
    chamadas[chave] = (chamadas[chave] || 0) + 1;
    return simular === "erro-inicial" || (simular === "erro" && chamadas[chave] > 1);
  }

  window.RagaDadosDemo = {
    modo: "demonstracao-local",

    // Futuro: GET do caso de sono (rota a combinar com o back-end).
    buscarCasoSono: function () {
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar("sono")) return responder(falha, 300);
      return responder(montarCasoSono, 400);
    },

    // Futuro: POST do check-in, gravado com salvar_registro_sono().
    // Aqui só guarda na memória da aba. O servidor precisa validar de novo.
    enviarCheckinSono: function (checkin) {
      return responder(function () {
        var registro = {
          id: "local-" + checkin.fim_sono.slice(0, 10),
          astronauta_id: astronauta.id,
          noite_em: checkin.noite_em,
          inicio_sono: checkin.inicio_sono,
          fim_sono: checkin.fim_sono,
          duracao_horas: checkin.duracao_horas,
          qualidade: checkin.qualidade,
          interrupcoes: checkin.interrupcoes,
          origem: "autorrelato (só nesta aba)",
          observacao: null,
          nao_avaliado: true
        };
        checkinsLocais = checkinsLocais.filter(function (c) {
          return dataDe(c) !== dataDe(registro);
        });
        checkinsLocais.push(registro);
        salvarSessao("raga-demo-sono", checkinsLocais);
        return { situacao: "registrado_localmente", registro: copiar(registro) };
      }, 300);
    },

    // Testes de reação (Cognição): lista cronológica e linha de base fictícia.
    buscarTestesReacao: function () {
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar("reacao")) return responder(falha, 300);
      return responder(function () {
        return {
          modo: "demonstracao-local",
          atualizado_em: new Date().toISOString(),
          astronauta: copiar(astronauta),
          linha_base_ms: simular === "vazio" ? null : linhaBaseReacaoMs,
          testes: simular === "vazio" ? [] : copiar(testesReacao)
        };
      }, 400);
    },

    enviarTesteReacao: function (teste) {
      return responder(function () {
        var registro = Object.assign({ id: "local-" + Date.now(), origem: "autorrelato (só nesta aba)" }, teste);
        testesReacao.push(registro);
        salvarSessao("raga-demo-reacao", testesReacao);
        return { situacao: "registrado_localmente", teste: copiar(registro) };
      }, 300);
    },

    // Check-ins da noite: lista cronológica (vazia com ?simular=vazio).
    buscarCheckinsNoite: function () {
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar("noite")) return responder(falha, 300);
      return responder(function () {
        return {
          modo: "demonstracao-local",
          atualizado_em: new Date().toISOString(),
          astronauta: copiar(astronauta),
          checkins: simular === "vazio" ? [] : copiar(checkinsNoite)
        };
      }, 400);
    },

    // Um check-in por data: o novo substitui o da mesma data, só nesta aba.
    enviarCheckinNoite: function (checkin) {
      return responder(function () {
        var registro = Object.assign({ id: "local-" + checkin.data, origem: "autorrelato (só nesta aba)" }, checkin);
        checkinsNoite = checkinsNoite.filter(function (c) { return c.data !== checkin.data; });
        checkinsNoite.push(registro);
        checkinsNoite.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
        salvarSessao("raga-demo-noite", checkinsNoite);
        return { situacao: "registrado_localmente", checkin: copiar(registro) };
      }, 300);
    },

    // Visão médica fictícia, incluindo os check-ins salvos nesta aba.
    buscarVisaoMedica: function () {
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar("medica")) return responder(falha, 300);
      return responder(function () {
        checkinsNoite = lerSessao("raga-demo-noite", checkinsNoite);
        return {
          modo: "demonstracao-local",
          atualizado_em: new Date().toISOString(),
          ordem: "Demonstration order: red, yellow, green. The priority rule is still to be defined by the back end.",
          tripulantes: [
            { id: 1, identificacao: "RAGA-AST-001", nome_exibicao: "Comandante Aurora", origem: "ficticia", area: "Heart",
              estado: "vermelho",
              motivo: "Simulated oxygen below the fictional baseline (an example of an immediate indication). Sleep and Mind and crew are also yellow.",
              dados_compartilhados: [
                "Simulated resting oxygen: 90% (fictional baseline: 97%)",
                "Sleep: 3 nights below the fictional baseline of 7 h 30 min"
              ],
              data_avaliacao: alerta.data_avaliacao, reavaliar_em_horas: null,
              linha_base_sono: copiar(linhaBase), registros_sono: juntarRegistros(registros),
              checkins_noite: copiar(checkinsNoite) },
            { id: 2, identificacao: "RAGA-AST-002", nome_exibicao: "Especialista Vega", origem: "ficticia", area: "Exercise",
              estado: "amarelo",
              motivo: "Exercise below the fictional plan of 2 h per day for the last 3 days.",
              dados_compartilhados: ["Average exercise: 1 h 20 min per day (fictional plan: 2 h)"],
              data_avaliacao: "2026-11-10", reavaliar_em_horas: 24 },
            { id: 3, identificacao: "RAGA-AST-003", nome_exibicao: "Engenheira Lyra", origem: "ficticia", area: null,
              estado: "verde",
              motivo: "No illustrative rule was triggered by the available data. This does not prove health.",
              dados_compartilhados: [],
              data_avaliacao: "2026-11-10", reavaliar_em_horas: null }
          ],
          nao_exibido: []
        };
      }, 400);
    }
  };
})();
