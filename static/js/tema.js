// Tema claro/escuro do painel (Front 1).
// - Na primeira visita, segue o tema do sistema (Windows, celular).
// - Depois de um clique no botão, a escolha fica salva no navegador.
// - O tema escuro é ligado com data-tema="escuro" na tag <html>;
//   o style.css troca as cores a partir desse atributo.
// - A cada troca, dispara o evento "tema-alterado" para o gráfico
//   (chart.js) se redesenhar com as cores novas.
(function () {
  var CHAVE = "tema"; // nome usado no localStorage
  var raiz = document.documentElement; // a tag <html>

  // O localStorage pode estar bloqueado (aba anônima, por exemplo);
  // o try/catch evita que isso quebre a página.
  function lerSalvo() {
    try {
      return localStorage.getItem(CHAVE);
    } catch (erro) {
      return null;
    }
  }

  function salvar(tema) {
    try {
      localStorage.setItem(CHAVE, tema);
    } catch (erro) {
      // Sem armazenamento: o tema vale só até fechar a página.
    }
  }

  function temaAtual() {
    return raiz.getAttribute("data-tema") === "escuro" ? "escuro" : "claro";
  }

  // Liga/desliga o atributo e atualiza o estado do botão.
  function aplicar(tema) {
    if (tema === "escuro") {
      raiz.setAttribute("data-tema", "escuro");
    } else {
      raiz.removeAttribute("data-tema");
    }
    var botao = document.getElementById("botao-tema");
    if (botao) {
      botao.setAttribute("aria-pressed", String(tema === "escuro"));
    }
  }

  // 1) Roda já no <head>, antes de a página aparecer.
  var sistemaEscuro = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  aplicar(lerSalvo() || (sistemaEscuro ? "escuro" : "claro"));

  // 2) Quando o HTML terminar de carregar, liga o botão.
  document.addEventListener("DOMContentLoaded", function () {
    var botao = document.getElementById("botao-tema");
    if (!botao) {
      return;
    }
    aplicar(temaAtual()); // sincroniza aria-pressed com o tema inicial

    botao.addEventListener("click", function () {
      var novo = temaAtual() === "escuro" ? "claro" : "escuro";
      aplicar(novo);
      salvar(novo);
      // Aviso para quem precisar reagir (ex.: o gráfico).
      document.dispatchEvent(new CustomEvent("tema-alterado", {
        detail: { tema: novo }
      }));
    });
  });
})();
