// Gráfico do histórico de sono, desenhado em SVG puro.
// Sem biblioteca externa: funciona offline e as cores vêm do style.css,
// então o gráfico acompanha o tema claro/escuro sozinho.
// Para leitores de tela, o SVG tem um resumo (aria-label) e a página
// mostra os mesmos dados numa tabela (dashboard.js).
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var ALTURA = 260;
  var MARGEM = { topo: 24, direita: 12, base: 32, esquerda: 40 };
  var MAX_HORAS = 10;

  function el(nome, attrs, texto) {
    var n = document.createElementNS(NS, nome);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // Data local do despertar, tirada de fim_sono como em servico_sono.py.
  function dataDe(registro) {
    return registro.fim_sono.slice(0, 10);
  }

  // registros: [{ noite_em, duracao_horas, nao_avaliado? }] (de schema.sql)
  // linhaBaseHoras: duracao_media_horas da linha de base, ou null
  // destacadas: datas ("AAAA-MM-DD") que motivaram a indicação
  function desenharSono(alvo, registros, linhaBaseHoras, destacadas) {
    var F = window.RagaFormato;
    var largura = Math.max(alvo.clientWidth, 280);
    var areaL = largura - MARGEM.esquerda - MARGEM.direita;
    var areaA = ALTURA - MARGEM.topo - MARGEM.base;
    var y = function (horas) { return MARGEM.topo + areaA - (horas / MAX_HORAS) * areaA; };

    var svg = el("svg", {
      class: "grafico-sono",
      width: largura,
      height: ALTURA,
      viewBox: "0 0 " + largura + " " + ALTURA,
      role: "img",
      "aria-label": resumo(registros, linhaBaseHoras, destacadas)
    });

    // Hachura das noites que motivaram a indicação: diferença de
    // padrão, não só de cor.
    var defs = el("defs");
    var padrao = el("pattern", { id: "hachura-sono", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    padrao.appendChild(el("rect", { class: "hachura-fundo", width: 6, height: 6 }));
    padrao.appendChild(el("line", { class: "hachura-linha", x1: 0, y1: 0, x2: 0, y2: 6 }));
    defs.appendChild(padrao);
    svg.appendChild(defs);

    // Linhas de grade a cada 2 h.
    for (var h = 0; h <= MAX_HORAS; h += 2) {
      var gy = y(h);
      svg.appendChild(el("line", { class: "grade", x1: MARGEM.esquerda, x2: largura - MARGEM.direita, y1: gy, y2: gy }));
      svg.appendChild(el("text", { class: "eixo", x: MARGEM.esquerda - 8, y: gy + 4, "text-anchor": "end" }, h + " h"));
    }

    // Barras. Em telas estreitas, o rótulo do eixo aparece em noites alternadas.
    var passo = areaL / Math.max(registros.length, 1);
    var larguraBarra = Math.min(passo * 0.6, 36);
    var pularRotulo = passo < 34;

    registros.forEach(function (r, i) {
      var cx = MARGEM.esquerda + passo * i + passo / 2;
      var topo = y(r.duracao_horas);
      var destacada = destacadas.indexOf(dataDe(r)) !== -1;
      var classe = "barra";
      if (destacada) classe += " barra--destaque";
      if (r.nao_avaliado) classe += " barra--local";

      svg.appendChild(el("rect", {
        class: classe,
        x: cx - larguraBarra / 2,
        y: topo,
        width: larguraBarra,
        height: y(0) - topo,
        rx: 2
      }));

      // Valor escrito acima das barras destacadas e locais. Em telas
      // estreitas os textos se sobrepõem; os valores ficam na tabela.
      if (passo >= 40 && (destacada || r.nao_avaliado)) {
        svg.appendChild(el("text", { class: "valor-barra", x: cx, y: topo - 6, "text-anchor": "middle" }, F.duracaoCurta(r.duracao_horas)));
      }

      // Conta a partir da última noite, que sempre ganha rótulo.
      if (!pularRotulo || (registros.length - 1 - i) % 2 === 0) {
        svg.appendChild(el("text", { class: "eixo", x: cx, y: ALTURA - MARGEM.base + 18, "text-anchor": "middle" }, F.dia(r.noite_em)));
      }
    });

    // Linha de base por cima das barras, para continuar visível.
    if (linhaBaseHoras !== null && linhaBaseHoras !== undefined) {
      var by = y(linhaBaseHoras);
      svg.appendChild(el("line", { class: "linha-base", x1: MARGEM.esquerda, x2: largura - MARGEM.direita, y1: by, y2: by }));
      svg.appendChild(el("text", { class: "linha-base-rotulo", x: largura - MARGEM.direita - 4, y: by - 8, "text-anchor": "end" },
        "Fictional baseline: " + F.duracaoCurta(linhaBaseHoras)));
    }

    alvo.replaceChildren(svg);
  }

  // Frase que resume o gráfico para leitores de tela.
  function resumo(registros, linhaBaseHoras, destacadas) {
    var F = window.RagaFormato;
    if (!registros.length) return "Sleep chart with no records.";
    var texto = "Sleep duration for " + registros.length + " nights, from " +
      F.dia(registros[0].noite_em) + " to " + F.dia(registros[registros.length - 1].noite_em) + ".";
    if (linhaBaseHoras !== null && linhaBaseHoras !== undefined) {
      texto += " Fictional baseline: " + F.duracao(linhaBaseHoras) + ".";
    }
    var marcadas = registros.filter(function (r) { return destacadas.indexOf(dataDe(r)) !== -1; });
    if (marcadas.length) {
      texto += " Nights contributing to the indication: " + marcadas.map(function (r) {
        return F.dia(r.noite_em) + " with " + F.duracao(r.duracao_horas);
      }).join("; ") + ".";
    }
    return texto + " The same data is in the table below the chart.";
  }

  window.RagaGrafico = { desenharSono: desenharSono };
})();
