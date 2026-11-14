// DADOS FICTÍCIOS LOCAIS — só para demonstração do front-end.
// A API do caso de sono ainda não existe (docs/api.md). Este arquivo faz o
// papel do servidor: devolve respostas no formato que a interface espera
// (proposta em docs/front-caso-sono.md). Quando a API existir, basta trocar
// o corpo das funções de window.RagaDados por fetch() às rotas combinadas;
// dashboard.js e equipe-medica.js não precisam mudar.
//
// Nada aqui vem de sensor, relógio ou da NASA. As avaliações e orientações
// abaixo são EXEMPLOS escritos à mão a partir do PDF norte; as regras
// oficiais serão definidas pelo back-end.
//
// Para testar os estados da tela, abra a página com ?simular=...
//   carregando   → a resposta nunca chega
//   vazio        → astronauta sem registros de sono
//   insuficiente → poucos registros para avaliar
//   erro         → a 1ª carga funciona e as atualizações seguintes falham
//   erro-inicial → falha já na primeira carga
(function () {
  var simular = new URLSearchParams(window.location.search).get("simular");
  var chamadas = 0;

  // Faixa de referência fictícia. O método real de linha de base
  // ainda será definido pela equipe (docs/raga.md, decisões em aberto).
  var referencia = {
    minimo_min: 420, // 7 h
    maximo_min: 480, // 8 h
    descricao: "Faixa fictícia criada para a demonstração. O método de cálculo da linha de base ainda será definido pela equipe."
  };

  // Dez noites; as três últimas foram alteradas de propósito (caso do PDF norte).
  // "noite" é a data em que a noite começou.
  var noites = [
    { id: 1, noite: "2026-11-04", duracao_min: 445, qualidade: 4 },
    { id: 2, noite: "2026-11-05", duracao_min: 462, qualidade: 4 },
    { id: 3, noite: "2026-11-06", duracao_min: 430, qualidade: 3 },
    { id: 4, noite: "2026-11-07", duracao_min: 470, qualidade: 4 },
    { id: 5, noite: "2026-11-08", duracao_min: 452, qualidade: 4 },
    { id: 6, noite: "2026-11-09", duracao_min: 438, qualidade: 4 },
    { id: 7, noite: "2026-11-10", duracao_min: 466, qualidade: 5 },
    { id: 8, noite: "2026-11-11", duracao_min: 322, qualidade: 2 },
    { id: 9, noite: "2026-11-12", duracao_min: 298, qualidade: 2 },
    { id: 10, noite: "2026-11-13", duracao_min: 315, qualidade: 2 }
  ].map(function (n) {
    // Check-in feito na manhã seguinte, às 7h.
    var dia = new Date(n.noite + "T07:00:00-03:00");
    dia.setDate(dia.getDate() + 1);
    n.registrado_em = dia.toISOString();
    n.origem = "simulada";
    return n;
  });

  var avaliacaoExemplo = {
    estado: "amarelo",
    explicacao: "Nas 3 últimas noites, a duração registrada ficou abaixo da faixa de referência fictícia (7 h a 8 h), e a qualidade informada caiu para 2 de 5.",
    regra: "Exemplo do PDF norte (sono curto por 3 noites → amarelo), usado provisoriamente. A regra oficial será definida pelo back-end. Não é validada clinicamente.",
    noites_usadas: [8, 9, 10],
    avaliado_em: "2026-11-14T07:30:00-03:00",
    orientacao: "Conversar com a equipe médica de voo sobre a escala de trabalho e a exposição à luz, e continuar fazendo o check-in da manhã.",
    orientacao_origem: "Exemplo de ação do PDF norte. Depende de especialistas e protocolos aprovados antes de qualquer uso real.",
    reavaliar_em: "2026-11-16T07:30:00-03:00"
  };

  var avaliacaoInsuficiente = {
    estado: "insuficiente",
    explicacao: "Há só 2 noites registradas. A regra de demonstração olha as 3 últimas noites, então ainda não é possível avaliar.",
    regra: "Exemplo do PDF norte, usado provisoriamente. A regra oficial será definida pelo back-end.",
    noites_usadas: [],
    avaliado_em: "2026-11-14T07:30:00-03:00",
    orientacao: null,
    orientacao_origem: null,
    reavaliar_em: null
  };

  // Check-ins feitos nesta aba. Ficam só na memória: somem ao recarregar.
  var checkinsLocais = [];

  function copiar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function areasExemplo(estadoSono, resumoSono) {
    var semDados = "Sem registros nesta demonstração.";
    return [
      { id: "sono", nome: "Sono", estado: estadoSono, resumo: resumoSono },
      { id: "coracao", nome: "Coração", estado: "sem_registros", resumo: semDados },
      { id: "mente", nome: "Mente e equipe", estado: "sem_registros", resumo: semDados },
      { id: "exercicio", nome: "Exercício", estado: "sem_registros", resumo: semDados },
      { id: "cognicao", nome: "Cognição", estado: "sem_registros", resumo: semDados }
    ];
  }

  // Junta as noites "do servidor" com os check-ins locais.
  // Um check-in local substitui a noite de mesma data.
  function juntarNoites(base) {
    var lista = base.filter(function (n) {
      return !checkinsLocais.some(function (c) { return c.noite === n.noite; });
    });
    lista = lista.concat(copiar(checkinsLocais));
    lista.sort(function (a, b) { return a.noite < b.noite ? -1 : 1; });
    return lista;
  }

  function montarCasoSono() {
    var base = noites;
    var avaliacao = avaliacaoExemplo;
    var estadoSono = "amarelo";
    var resumoSono = "3 noites abaixo da referência fictícia.";

    if (simular === "vazio") {
      base = [];
      avaliacao = null;
      estadoSono = "sem_registros";
      resumoSono = "Nenhum check-in de sono ainda.";
    } else if (simular === "insuficiente") {
      base = noites.slice(-2);
      avaliacao = avaliacaoInsuficiente;
      estadoSono = "insuficiente";
      resumoSono = "Poucos registros para avaliar.";
    }

    return {
      modo: "demonstracao-local",
      atualizado_em: new Date().toISOString(),
      astronauta: {
        id: 1,
        nome: "Íris Andrade",
        ficticia: true,
        missao: "Missão simulada Raga-1",
        dia_missao: 142
      },
      estado_geral: {
        estado: "insuficiente",
        explicacao: "4 das 5 áreas ainda não têm dados nesta demonstração, então o estado geral não é calculado."
      },
      areas: areasExemplo(estadoSono, resumoSono),
      sono: {
        referencia: referencia,
        noites: juntarNoites(base),
        avaliacao: avaliacao ? copiar(avaliacao) : null
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

  window.RagaDados = {
    modo: "demonstracao-local",

    // Futuro: GET da rota do caso de sono (a combinar com o back-end).
    buscarCasoSono: function () {
      chamadas += 1;
      if (simular === "carregando") {
        return new Promise(function () {}); // nunca responde
      }
      if (simular === "erro-inicial" || (simular === "erro" && chamadas > 1)) {
        return responder(falha, 300);
      }
      return responder(montarCasoSono, 400);
    },

    // Futuro: POST do check-in. Aqui só guarda na memória da aba.
    // A validação de verdade precisa ser feita no servidor.
    enviarCheckinSono: function (checkin) {
      return responder(function () {
        var registro = {
          id: "local-" + checkin.noite,
          noite: checkin.noite,
          duracao_min: checkin.duracao_min,
          qualidade: checkin.qualidade,
          registrado_em: new Date().toISOString(),
          origem: "autorrelato (só nesta aba)",
          nao_avaliado: true
        };
        checkinsLocais = checkinsLocais.filter(function (c) {
          return c.noite !== registro.noite;
        });
        checkinsLocais.push(registro);
        return { situacao: "registrado_localmente", registro: copiar(registro) };
      }, 300);
    },

    // Futuro: GET da visão médica. Só campos que a equipe médica
    // poderia ver; check-in detalhado e diário ficam de fora
    // até a política de compartilhamento ser definida.
    buscarVisaoMedica: function () {
      chamadas += 1;
      if (simular === "carregando") {
        return new Promise(function () {});
      }
      if (simular === "erro-inicial" || (simular === "erro" && chamadas > 1)) {
        return responder(falha, 300);
      }
      return responder(function () {
        return {
          modo: "demonstracao-local",
          atualizado_em: new Date().toISOString(),
          ordem: "Ordem definida pelos dados de demonstração. O critério de prioridade ainda será definido pelo back-end.",
          tripulantes: [
            {
              id: 1,
              nome: "Íris Andrade",
              ficticio: true,
              area: "Sono",
              estado: "amarelo",
              motivo: "3 noites seguidas abaixo da faixa de referência fictícia.",
              dados_compartilhados: [
                "Duração média nas 3 últimas noites: 5 h 12 min",
                "Faixa de referência fictícia: 7 h a 8 h"
              ],
              avaliado_em: "2026-11-14T07:30:00-03:00",
              reavaliar_em: "2026-11-16T07:30:00-03:00"
            },
            {
              id: 2,
              nome: "Teo Martins",
              ficticio: true,
              area: null,
              estado: "sem_registros",
              motivo: "Sem registros nesta demonstração.",
              dados_compartilhados: [],
              avaliado_em: null,
              reavaliar_em: null
            },
            {
              id: 3,
              nome: "Nádia Kerr",
              ficticio: true,
              area: null,
              estado: "sem_registros",
              motivo: "Sem registros nesta demonstração.",
              dados_compartilhados: [],
              avaliado_em: null,
              reavaliar_em: null
            }
          ],
          nao_exibido: [
            "Respostas detalhadas dos check-ins (como a qualidade do sono informada)",
            "Diário opcional"
          ]
        };
      }, 400);
    }
  };
})();
