// Teclas compartilhadas dos formulários (painel e check-ins).
// - Seletor numérico: botões .tecla-passo com data-direcao="1" ou "-1"
//   e aria-controls apontando para o <input type="number">.
//   O input pode ter data-passo (padrão 1) e data-inicio (valor do
//   primeiro toque com o campo vazio; sem ele, parte de 0).
//   Respeita min e max do input e dispara "input", para a página reagir.
// - Clique muda uma vez; segurar repete (após 400 ms, a cada 90 ms).
// - RagaTeclas.pulsar(el): pequeno "pulso" visual (classe .pulso, style.css).
(function () {
  function pulsar(el) {
    el.classList.remove("pulso");
    void el.offsetWidth; // reinicia a animação
    el.classList.add("pulso");
  }

  function passo(campo, direcao) {
    var tamanho = Number(campo.getAttribute("data-passo")) || 1;
    var minimo = campo.min === "" ? -Infinity : Number(campo.min);
    var maximo = campo.max === "" ? Infinity : Number(campo.max);
    var novo;
    if (campo.value === "") {
      var inicio = campo.getAttribute("data-inicio");
      novo = inicio !== null ? Number(inicio) : 0 + direcao * tamanho;
    } else {
      novo = Number(campo.value) + direcao * tamanho;
    }
    novo = Math.min(maximo, Math.max(minimo, novo));
    campo.value = String(Math.round(novo * 10) / 10);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    pulsar(campo.closest(".visor") || campo);
  }

  document.querySelectorAll(".tecla-passo").forEach(function (tecla) {
    var campo = document.getElementById(tecla.getAttribute("aria-controls"));
    var direcao = Number(tecla.getAttribute("data-direcao"));
    if (!campo) return;
    var espera = null;
    var repeticao = null;
    function parar() {
      clearTimeout(espera);
      clearInterval(repeticao);
    }
    tecla.addEventListener("pointerdown", function (evento) {
      if (evento.button !== 0) return;
      passo(campo, direcao);
      espera = setTimeout(function () {
        repeticao = setInterval(function () { passo(campo, direcao); }, 90);
      }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (tipo) {
      tecla.addEventListener(tipo, parar);
    });
    // Teclado (Enter/Espaço) gera click com detail 0; o mouse já
    // foi tratado no pointerdown.
    tecla.addEventListener("click", function (evento) {
      if (evento.detail === 0) passo(campo, direcao);
    });
  });

  window.RagaTeclas = { pulsar: pulsar };
})();
