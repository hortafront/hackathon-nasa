// Funções de texto usadas pelo painel e pela visão médica:
// datas, durações e os rótulos de cada estado.
(function () {
  // Rótulos de tela. Os nomes dos estados seguem avaliacao_sono.py
  // (verde, amarelo, dados_insuficientes); vermelho e sem_registros são
  // propostas do front. A cor nunca aparece sozinha: cada estado tem
  // texto e um ícone de formato diferente (ver style.css, seção 7).
  var ESTADOS = {
    verde: { rotulo: "Verde: nenhuma regra acionada" },
    amarelo: { rotulo: "Amarelo: atenção" },
    vermelho: { rotulo: "Vermelho: atenção imediata" },
    dados_insuficientes: { rotulo: "Dados insuficientes" },
    sem_registros: { rotulo: "Sem registros" }
  };

  // Texto para o campo origem_regra das avaliações.
  var ORIGENS_REGRA = {
    demonstracao_nao_clinica: "Regra de demonstração do back-end: três noites consecutivas abaixo da linha de base fictícia geram amarelo. Escolhida só para ilustrar o caso do PDF norte; não é validada clinicamente e não considera qualidade, contexto ou outras causas."
  };

  function estado(chave) {
    return ESTADOS[chave] || ESTADOS.dados_insuficientes;
  }

  function origemRegra(chave) {
    return ORIGENS_REGRA[chave] || "Origem da regra não informada.";
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
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
      ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function hora(iso) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

  window.RagaFormato = {
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
