// Funções de texto usadas pelo painel e pela visão médica:
// datas, durações e os rótulos de cada estado.
(function () {
  // Rótulos de tela. Os nomes dos estados seguem avaliacao_sono.py
  // (verde, amarelo, dados_insuficientes); vermelho e sem_registros são
  // propostas do front. A cor nunca aparece sozinha: cada estado tem
  // texto e um ícone de formato diferente (ver style.css, seção 7).
  var ESTADOS = {
    verde: { rotulo: "Green: no rule triggered" },
    amarelo: { rotulo: "Yellow: attention" },
    vermelho: { rotulo: "Red: immediate attention" },
    dados_insuficientes: { rotulo: "Insufficient data" },
    sem_registros: { rotulo: "No records" }
  };

  // Texto para o campo origem_regra das avaliações.
  var ORIGENS_REGRA = {
    demonstracao_nao_clinica: "Demonstration rule: three consecutive nights below the fictional baseline trigger a yellow indication. This rule is not clinically validated and does not consider quality, context, or other causes."
  };

  function estado(chave) {
    return ESTADOS[chave] || ESTADOS.dados_insuficientes;
  }

  function origemRegra(chave) {
    return ORIGENS_REGRA[chave] || "Rule source not provided.";
  }

  // Traduz apenas valores fictícios conhecidos; textos livres não são alterados.
  function textoExibicao(texto) {
    var traducoes = {
      "simulada": "simulated",
      "ficticia": "fictional",
      "de 5": "out of 5",
      "autorrelato_simulado": "simulated self-report",
      "teste_interativo_demonstrativo": "demonstration reaction test",
      "autorrelato (só nesta aba)": "self-report (this tab only)",
      "Comandante Aurora": "Commander Aurora",
      "Especialista Vega": "Specialist Vega",
      "Engenheira Lyra": "Engineer Lyra",
      "Noite de referência fictícia.": "Fictional baseline night.",
      "Primeira noite alterada do cenário.": "First changed night in the scenario.",
      "Segunda noite alterada do cenário.": "Second changed night in the scenario.",
      "Terceira noite alterada do cenário.": "Third changed night in the scenario.",
      "Noite posterior fictícia; sem interpretação clínica.": "Fictional later night; no clinical interpretation.",
      "Registro fictício.": "Fictional record.",
      "Registro fictício: dia intenso.": "Fictional entry: a demanding day.",
      "Registro fictício: rotina movimentada.": "Fictional entry: a busy routine.",
      "Registro fictício: revisar a rotina com a equipe.": "Fictional entry: review the routine with the crew.",
      "Revisão fictícia dos registros de sono.": "Fictional review of sleep records.",
      "As três durações estão abaixo da referência individual fictícia.": "All three sleep durations are below the fictional individual baseline.",
      "São necessárias a referência individual e as três noites mais recentes consecutivas.": "The individual baseline and the three most recent consecutive nights are required.",
      "A regra demonstrativa de três noites abaixo da referência não foi acionada.": "The demonstration rule for three nights below baseline was not triggered.",
      "Revise os registros e acompanhe a evolução com a equipe responsável.": "Review the records and follow their progress with the responsible team.",
      "Revise as três noites, confira possíveis interrupções do ambiente e registre a próxima noite. Converse com a equipe responsável se houver preocupação.": "Review the three nights, check for possible environmental interruptions and record the next night. Speak with the responsible team if you are concerned."
    };
    return Object.prototype.hasOwnProperty.call(traducoes, texto) ? traducoes[texto] : texto;
  }

  // 5.5 → "5 h 30 min"
  function duracao(horas) {
    var total = Math.round(horas * 60);
    var h = Math.floor(total / 60);
    var m = total % 60;
    if (h === 0) return m + " min";
    if (m === 0) return h + " h";
    return h + " h " + String(m).padStart(2, "0") + " min";
  }

  // 5.5 → "5h30" (versão curta para o gráfico)
  function duracaoCurta(horas) {
    var total = Math.round(horas * 60);
    return Math.floor(total / 60) + "h" + String(total % 60).padStart(2, "0");
  }

  // "2026-11-10" ou "2026-11-10T00:00:00-03:00" → "10/11".
  // Lê as partes direto do texto para o fuso do navegador não mudar o dia.
  function dia(texto) {
    var p = texto.slice(0, 10).split("-");
    return p[2] + "/" + p[1];
  }

  // "2026-11-10" + 24 h → "11/11" (data prevista da reavaliação).
  function diaMaisHoras(dataTexto, horas) {
    var p = dataTexto.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]) + horas * 3600 * 1000);
    return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  // ISO com fuso → "14/11, 07:30" no horário do navegador.
  function dataHora(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }) +
      ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function hora(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  // Ícone pequeno de cada estado (decorativo: o texto já informa).
  function iconeEstado(chave) {
    var formas = {
      verde: '<circle cx="7" cy="7" r="5.5"/>',
      amarelo: '<path d="M7 1.2 13 12.5H1z"/>',
      vermelho: '<rect x="1.5" y="1.5" width="11" height="11"/>',
      dados_insuficientes: '<circle cx="7" cy="7" r="5" fill="none" stroke-width="1.6" stroke-dasharray="2.4 1.8"/>',
      sem_registros: '<rect x="2" y="6" width="10" height="2"/>'
    };
    return '<svg class="selo-icone" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
      (formas[chave] || formas.dados_insuficientes) + "</svg>";
  }

  // Selo com ícone + texto, usado em todas as telas. Só usa rótulos
  // fixos deste arquivo, por isso pode ir em innerHTML.
  function selo(chave) {
    var nome = ESTADOS[chave] ? chave : "dados_insuficientes";
    return '<span class="selo selo--' + nome + '">' + iconeEstado(nome) +
      "<span>" + estado(nome).rotulo + "</span></span>";
  }

  // Aviso de onde vêm os dados (ver dados-api.js).
  window.RagaFormato = {
    textoExibicao: textoExibicao,
    estado: estado,
    origemRegra: origemRegra,
    duracao: duracao,
    duracaoCurta: duracaoCurta,
    dia: dia,
    diaMaisHoras: diaMaisHoras,
    dataHora: dataHora,
    hora: hora,
    selo: selo
  };
})();
