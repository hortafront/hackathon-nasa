// Funções de texto usadas pelo painel e pela visão médica:
// datas, durações e os rótulos de cada estado.
(function () {
  // Rótulos de tela. A cor nunca aparece sozinha: cada estado tem
  // texto e um ícone de formato diferente (ver style.css, seção 7).
  var ESTADOS = {
    verde: {
      rotulo: "Verde: nenhuma regra acionada",
      descricao: "Nenhuma regra ilustrativa foi acionada nos dados disponíveis. Isso não comprova saúde."
    },
    amarelo: {
      rotulo: "Amarelo: atenção",
      descricao: "Uma regra ilustrativa foi acionada. Veja os dados que motivaram a indicação."
    },
    vermelho: {
      rotulo: "Vermelho: atenção imediata",
      descricao: "Situação apresentada como urgente: procurar a equipe médica imediatamente, sem esperar a reavaliação."
    },
    insuficiente: {
      rotulo: "Dados insuficientes",
      descricao: "Não há dados suficientes para avaliar. Ausência de dados não é verde."
    },
    sem_registros: {
      rotulo: "Sem registros",
      descricao: "Ainda não há registros para esta área."
    }
  };

  function estado(chave) {
    return ESTADOS[chave] || ESTADOS.insuficiente;
  }

  // 322 → "5 h 22 min"
  function duracao(minutos) {
    var h = Math.floor(minutos / 60);
    var m = Math.round(minutos % 60);
    if (h === 0) return m + " min";
    if (m === 0) return h + " h";
    return h + " h " + String(m).padStart(2, "0") + " min";
  }

  // 322 → "5h22" (versão curta para o gráfico)
  function duracaoCurta(minutos) {
    var h = Math.floor(minutos / 60);
    var m = Math.round(minutos % 60);
    return h + "h" + String(m).padStart(2, "0");
  }

  // "2026-11-13" → "13/11". Lê as partes direto do texto para o fuso
  // do navegador não mudar o dia.
  function noite(dataTexto) {
    var p = dataTexto.split("-");
    return p[2] + "/" + p[1];
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
      insuficiente: '<circle cx="7" cy="7" r="5" fill="none" stroke-width="1.6" stroke-dasharray="2.4 1.8"/>',
      sem_registros: '<rect x="2" y="6" width="10" height="2"/>'
    };
    return '<svg class="selo-icone" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
      (formas[chave] || formas.insuficiente) + "</svg>";
  }

  // Selo com ícone + texto, usado em todas as telas.
  function selo(chave) {
    return '<span class="selo selo--' + chave + '">' + iconeEstado(chave) +
      "<span>" + estado(chave).rotulo + "</span></span>";
  }

  window.RagaFormato = {
    estado: estado,
    duracao: duracao,
    duracaoCurta: duracaoCurta,
    noite: noite,
    dataHora: dataHora,
    hora: hora,
    selo: selo
  };
})();
