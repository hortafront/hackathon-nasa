// DADOS FICTÍCIOS LOCAIS — reserva e modo de demonstração do front-end.
// dados-api.js usa este arquivo quando a API não está disponível, quando a
// página é aberta com ?fonte=demo ou com ?simular=... (testes de estado).
// As respostas têm o mesmo formato das rotas descritas em
// docs/integracao-front-api.md, e a tela avisa que os dados são locais.
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
  var chamadas = 0;

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
    explicacao: "As três durações estão abaixo da referência individual fictícia.",
    orientacao: "Revise os registros e acompanhe a evolução com a equipe responsável.",
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
    explicacao: "A regra demonstrativa de três noites abaixo da referência não foi acionada.",
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
    explicacao: "São necessárias a referência individual e as três noites mais recentes consecutivas.",
    orientacao: null,
    reavaliar_em_horas: null
  };

  // Check-ins feitos nesta aba. Ficam só na memória: somem ao recarregar.
  var checkinsLocais = [];

  // Check-ins da noite (Mente e equipe) fictícios. Escalas de 1 a 5:
  // humor e convivência (5 = melhor), estresse (5 = mais estresse).
  // O diário nunca entra aqui: ele fica só no navegador (checkin-noite.js).
  var checkinsNoite = [
    { id: 1, data: "2026-11-08", humor: 4, estresse: 2, convivencia: 4, registrado_em: "2026-11-08T21:30:00-03:00", origem: "simulada" },
    { id: 2, data: "2026-11-09", humor: 3, estresse: 3, convivencia: 4, registrado_em: "2026-11-09T21:40:00-03:00", origem: "simulada" },
    { id: 3, data: "2026-11-10", humor: 3, estresse: 4, convivencia: 3, registrado_em: "2026-11-10T22:05:00-03:00", origem: "simulada" }
  ];

  function copiar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Data local do despertar, tirada de fim_sono como em servico_sono.py.
  function dataDe(registro) {
    return registro.fim_sono.slice(0, 10);
  }

  // Áreas e estado geral ainda não existem no back-end: proposta do front.
  function areas(estadoSono, resumoSono) {
    var semDados = "Sem registros nesta demonstração.";
    return [
      { id: "sono", nome: "Sono", estado: estadoSono, resumo: resumoSono },
      { id: "coracao", nome: "Coração", estado: "sem_registros", resumo: semDados },
      { id: "mente", nome: "Mente e equipe", estado: "sem_registros", resumo: semDados },
      { id: "exercicio", nome: "Exercício", estado: "sem_registros", resumo: semDados },
      { id: "cognicao", nome: "Cognição", estado: "sem_registros", resumo: semDados },
      // 6ª área do PDF norte v3 (tag de glicose); ainda sem dados.
      { id: "metabolismo", nome: "Metabolismo", estado: "sem_registros", resumo: semDados }
    ];
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
    var resumoSono = "3 noites abaixo da linha de base fictícia.";

    if (simular === "reavaliado") {
      base = registros;
      avaliacoes = [alerta, reavaliacao];
      estadoSono = "verde";
      resumoSono = "Reavaliado em 11/11: regra não acionada.";
    } else if (simular === "vazio") {
      base = [];
      avaliacoes = [];
      estadoSono = "sem_registros";
      resumoSono = "Nenhum registro de sono ainda.";
    } else if (simular === "insuficiente") {
      base = registros.slice(0, 2);
      avaliacoes = [insuficiente];
      estadoSono = "dados_insuficientes";
      resumoSono = "Poucos registros para avaliar.";
    }

    return {
      modo: "demonstracao-local",
      atualizado_em: new Date().toISOString(),
      astronauta: copiar(astronauta),
      estado_geral: {
        estado: "dados_insuficientes",
        explicacao: "5 das 6 áreas ainda não têm dados nesta demonstração, então o estado geral não é calculado."
      },
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
    throw new Error("Falha simulada de atualização.");
  }

  function deveFalhar() {
    return simular === "erro-inicial" || (simular === "erro" && chamadas > 1);
  }

  window.RagaDadosDemo = {
    modo: "demonstracao-local",

    // Futuro: GET do caso de sono (rota a combinar com o back-end).
    buscarCasoSono: function () {
      chamadas += 1;
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar()) return responder(falha, 300);
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
        return { situacao: "registrado_localmente", registro: copiar(registro) };
      }, 300);
    },

    // Check-ins da noite: lista cronológica (vazia com ?simular=vazio).
    buscarCheckinsNoite: function () {
      chamadas += 1;
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar()) return responder(falha, 300);
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
        return { situacao: "registrado_localmente", checkin: copiar(registro) };
      }, 300);
    },

    // Futuro: GET da visão médica. Só campos que a equipe médica
    // poderia ver; check-in detalhado e diário ficam de fora
    // até a política de compartilhamento ser definida.
    buscarVisaoMedica: function () {
      chamadas += 1;
      if (simular === "carregando") return new Promise(function () {});
      if (deveFalhar()) return responder(falha, 300);
      return responder(function () {
        var aurora = simular === "reavaliado"
          ? {
              estado: "verde",
              motivo: reavaliacao.explicacao + " Houve indicação amarela em 10/11.",
              dados_compartilhados: [
                "Durações consideradas em 11/11: 5 h 30 min, 4 h 30 min e 7 h 30 min",
                "Linha de base fictícia: 7 h 30 min"
              ],
              data_avaliacao: reavaliacao.data_avaliacao,
              reavaliar_em_horas: null
            }
          : {
              estado: "amarelo",
              motivo: alerta.explicacao,
              dados_compartilhados: [
                "Durações das 3 noites: 6 h, 5 h 30 min e 4 h 30 min",
                "Linha de base fictícia: 7 h 30 min"
              ],
              data_avaliacao: alerta.data_avaliacao,
              reavaliar_em_horas: alerta.reavaliar_em_horas
            };

        return {
          modo: "demonstracao-local",
          atualizado_em: new Date().toISOString(),
          ordem: "Ordem definida pelos dados de demonstração. O critério de prioridade ainda será definido pelo back-end.",
          tripulantes: [
            Object.assign({ id: 1, identificacao: "RAGA-AST-001", nome_exibicao: "Comandante Aurora", origem: "ficticia", area: "Sono" }, aurora),
            { id: 2, identificacao: "RAGA-AST-002", nome_exibicao: "Especialista Vega", origem: "ficticia", area: null, estado: "sem_registros", motivo: "Sem registros nesta demonstração.", dados_compartilhados: [], data_avaliacao: null, reavaliar_em_horas: null },
            { id: 3, identificacao: "RAGA-AST-003", nome_exibicao: "Engenheira Lyra", origem: "ficticia", area: null, estado: "sem_registros", motivo: "Sem registros nesta demonstração.", dados_compartilhados: [], data_avaliacao: null, reavaliar_em_horas: null }
          ],
          nao_exibido: [
            "Respostas detalhadas dos check-ins (qualidade informada, interrupções, horários)",
            "Observações e diário opcional"
          ]
        };
      }, 400);
    }
  };
})();
