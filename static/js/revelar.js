// Revelação ao rolar ("entrar em foco"), usada nas quatro páginas.
// - Carregado no <head>, sem defer (como o tema.js): marca o <html> com
//   data-revelar="pronto" antes de a página aparecer, para o título
//   grande animar já no primeiro quadro. O resto espera o DOM.
// - Só liga se o navegador tem IntersectionObserver e a pessoa não pediu
//   menos movimento no sistema. Sem isso (ou sem JS), tudo fica visível.
// - Alvos: filhos diretos de <main> e os itens das listas de áreas e de
//   tripulantes (em cascata). O CSS está na seção 9 do style.css.
// - Ao descer, a seção que entra na tela aparece. Ao subir, a seção que
//   sai por baixo volta a ficar oculta. Sair por cima não esconde nada.
// - Nunca some: cabeçalho, rodapé, .aviso, .alerta-urgente,
//   .nota--urgente e mensagens role="status" (ver contemProtegido).
(function () {
  var raiz = document.documentElement;
  var menosMovimento = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  if (!("IntersectionObserver" in window) || (menosMovimento && menosMovimento.matches)) {
    return; // nada é marcado: a página fica como sempre foi
  }
  raiz.setAttribute("data-revelar", "pronto");

  // Elementos que nunca são alvo da revelação.
  var PROTEGIDOS = ".aviso, .alerta-urgente, .nota--urgente, [role='status'], [data-sem-revelar]";
  var LISTAS = ".lista-areas, .lista-tripulantes";
  var ATRASO_MAXIMO = 8; // a partir do 9º item, todos com o mesmo atraso

  var alvos = [];
  var rolou = false; // até a primeira rolagem, nada anima (só o título)

  // Uma seção com alerta ou mensagem ativa fica sempre visível:
  // esses avisos não podem estar transparentes ou desfocados.
  function contemProtegido(el) {
    var achados = el.querySelectorAll(PROTEGIDOS);
    for (var i = 0; i < achados.length; i++) {
      var p = achados[i];
      var ocupaEspaco = p.getClientRects().length > 0; // hidden/display:none não conta
      if (ocupaEspaco && p.textContent.trim() !== "") return true;
    }
    return false;
  }

  function mostrar(el, semAnimar) {
    if (el.classList.contains("revelar--visivel")) return;
    if (semAnimar) {
      el.classList.add("revelar--instantaneo");
      // Tira a classe depois de o navegador aplicar o estado visível,
      // para a próxima revelação (após sair por baixo) animar.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.remove("revelar--instantaneo");
        });
      });
    }
    el.classList.add("revelar--visivel");
  }

  function esconder(el) {
    if (contemProtegido(el)) {
      mostrar(el, true); // aviso ativo: aparece já, sem animar
      return;
    }
    if (el.contains(document.activeElement)) return;
    el.classList.remove("revelar--visivel");
  }

  // Chamado quando o JS da página muda o conteúdo (dados chegando,
  // atualização de 10 s, aviso que deixa de ser hidden): uma seção
  // oculta que ganhou alerta ou mensagem ativa aparece na hora.
  var verificacaoPendente = false;
  function verificarProtegidos() {
    if (verificacaoPendente) return;
    verificacaoPendente = true;
    requestAnimationFrame(function () {
      verificacaoPendente = false;
      alvos.forEach(function (el) {
        if (!el.classList.contains("revelar--visivel") && contemProtegido(el)) mostrar(el, true);
      });
    });
  }

  // Numera os itens da lista para o atraso em cascata (--i no CSS).
  // Itens recriados na atualização de 10 s dentro de uma seção já
  // visível nascem no estado final: aparecem direto, sem animar.
  function marcarItens(lista) {
    var itens = lista.children;
    for (var i = 0; i < itens.length; i++) {
      itens[i].classList.add("revelar-item");
      itens[i].style.setProperty("--i", String(Math.min(i, ATRASO_MAXIMO)));
    }
  }

  function aoCruzar(entradas) {
    entradas.forEach(function (entrada) {
      var el = entrada.target;
      if (entrada.isIntersecting) {
        mostrar(el, !rolou);
      } else if (entrada.boundingClientRect.top > 0) {
        // Saiu por baixo (a pessoa subiu a página). Seções com
        // display:none também caem aqui (top 0 não conta: fica como está).
        esconder(el);
      }
    });
  }

  function iniciar() {
    var principal = document.querySelector("main");
    if (!principal) return;

    Array.prototype.forEach.call(principal.children, function (el) {
      if (el.matches(PROTEGIDOS)) return;
      el.classList.add("revelar");
      alvos.push(el);
    });

    var listas = principal.querySelectorAll(LISTAS);
    listas.forEach(marcarItens);

    // Um só observador para todo o <main>: renumera as listas recriadas
    // e procura avisos novos em seções ocultas.
    new MutationObserver(function () {
      listas.forEach(marcarItens);
      verificarProtegidos();
    }).observe(principal, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "data-tem-dados", "data-estado"]
    });

    // Antes do primeiro quadro: o que já está na tela (ou acima dela)
    // fica visível na hora, para não piscar. Seções ainda sem dados
    // (display:none) esperam o observador avisar que ocupam espaço.
    var alturaTela = window.innerHeight;
    alvos.forEach(function (el) {
      var ocupaEspaco = el.getClientRects().length > 0;
      if (!ocupaEspaco) return;
      if (el.getBoundingClientRect().top < alturaTela || contemProtegido(el)) {
        mostrar(el, true);
      }
    });

    // Margem inferior negativa: a seção só aparece quando já entrou
    // cerca de 12% na tela, para o movimento acontecer à vista.
    var observador = new IntersectionObserver(aoCruzar, {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0
    });
    alvos.forEach(function (el) { observador.observe(el); });

    window.addEventListener("scroll", function () { rolou = true; }, { passive: true, once: true });

    // Teclado: se o foco cair numa seção oculta, ela aparece na hora.
    document.addEventListener("focusin", function (evento) {
      alvos.forEach(function (el) {
        if (el.contains(evento.target)) mostrar(el, false);
      });
    });

    // Se a pessoa ligar "reduzir movimento" com a página aberta,
    // tudo aparece e a revelação é desligada.
    if (menosMovimento) {
      var desligar = function (evento) {
        if (!evento.matches) return;
        observador.disconnect();
        alvos.forEach(function (el) { mostrar(el, true); });
        raiz.removeAttribute("data-revelar");
      };
      if (menosMovimento.addEventListener) menosMovimento.addEventListener("change", desligar);
      else if (menosMovimento.addListener) menosMovimento.addListener(desligar);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
