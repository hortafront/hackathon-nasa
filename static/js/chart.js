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

  // noites: [{ id, noite, duracao_min, nao_avaliado? }]
  // referencia: { minimo_min, maximo_min }
  // destacadas: ids das noites que motivaram a avaliação
  function desenharSono(alvo, noites, referencia, destacadas) {
    var F = window.RagaFormato;
    var largura = Math.max(alvo.clientWidth, 280);
    var areaL = largura - MARGEM.esquerda - MARGEM.direita;
    var areaA = ALTURA - MARGEM.topo - MARGEM.base;
    var y = function (min) { return MARGEM.topo + areaA - (min / 60 / MAX_HORAS) * areaA; };

    var svg = el("svg", {
      class: "grafico-sono",
      width: largura,
      height: ALTURA,
      viewBox: "0 0 " + largura + " " + ALTURA,
      role: "img",
      "aria-label": resumo(noites, referencia, destacadas)
    });

    // Hachura das noites que motivaram a avaliação: diferença de
    // padrão, não só de cor.
    var defs = el("defs");
    var padrao = el("pattern", { id: "hachura-sono", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    padrao.appendChild(el("rect", { class: "hachura-fundo", width: 6, height: 6 }));
    padrao.appendChild(el("line", { class: "hachura-linha", x1: 0, y1: 0, x2: 0, y2: 6 }));
    defs.appendChild(padrao);
    svg.appendChild(defs);

    // Linhas de grade a cada 2 h.
    for (var h = 0; h <= MAX_HORAS; h += 2) {
      var gy = y(h * 60);
      svg.appendChild(el("line", { class: "grade", x1: MARGEM.esquerda, x2: largura - MARGEM.direita, y1: gy, y2: gy }));
      svg.appendChild(el("text", { class: "eixo", x: MARGEM.esquerda - 8, y: gy + 4, "text-anchor": "end" }, h + " h"));
    }

    // Faixa de referência fictícia.
    var topoFaixa = y(referencia.maximo_min);
    svg.appendChild(el("rect", {
      class: "faixa-referencia",
      x: MARGEM.esquerda,
      y: topoFaixa,
      width: areaL,
      height: y(referencia.minimo_min) - topoFaixa
    }));
    svg.appendChild(el("text", { class: "faixa-rotulo", x: largura - MARGEM.direita - 4, y: topoFaixa - 6, "text-anchor": "end" }, "Referência fictícia"));

    // Barras. Em telas estreitas, o rótulo do eixo aparece em noites alternadas.
    var passo = areaL / Math.max(noites.length, 1);
    var larguraBarra = Math.min(passo * 0.6, 36);
    var pularRotulo = passo < 34;

    noites.forEach(function (n, i) {
      var cx = MARGEM.esquerda + passo * i + passo / 2;
      var topo = y(n.duracao_min);
      var classe = "barra";
      if (destacadas.indexOf(n.id) !== -1) classe += " barra--destaque";
      if (n.nao_avaliado) classe += " barra--local";

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
      if (passo >= 40 && (destacadas.indexOf(n.id) !== -1 || n.nao_avaliado)) {
        svg.appendChild(el("text", { class: "valor-barra", x: cx, y: topo - 6, "text-anchor": "middle" }, F.duracaoCurta(n.duracao_min)));
      }

      // Conta a partir da última noite, que sempre ganha rótulo.
      if (!pularRotulo || (noites.length - 1 - i) % 2 === 0) {
        svg.appendChild(el("text", { class: "eixo", x: cx, y: ALTURA - MARGEM.base + 18, "text-anchor": "middle" }, F.noite(n.noite)));
      }
    });

    alvo.replaceChildren(svg);
  }

  // Frase que resume o gráfico para leitores de tela.
  function resumo(noites, referencia, destacadas) {
    var F = window.RagaFormato;
    if (!noites.length) return "Gráfico de sono sem registros.";
    var abaixo = noites.filter(function (n) { return destacadas.indexOf(n.id) !== -1; });
    var texto = "Duração do sono em " + noites.length + " noites, de " +
      F.noite(noites[0].noite) + " a " + F.noite(noites[noites.length - 1].noite) +
      ". Faixa de referência fictícia: " + F.duracao(referencia.minimo_min) +
      " a " + F.duracao(referencia.maximo_min) + ".";
    if (abaixo.length) {
      texto += " Noites que motivaram a avaliação: " + abaixo.map(function (n) {
        return F.noite(n.noite) + " com " + F.duracao(n.duracao_min);
      }).join("; ") + ".";
    }
    return texto + " Os mesmos dados estão na tabela abaixo do gráfico.";
  }

  window.RagaGrafico = { desenharSono: desenharSono };
})();
