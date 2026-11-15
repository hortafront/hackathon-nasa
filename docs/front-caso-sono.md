# Front-end — caso de sono

O painel apresenta as cinco áreas recebidas da API e o histórico fictício de sono. O caso de três noites alteradas mostra avaliação, orientação ilustrativa e acompanhamento registrado manualmente. A avaliação não é diagnóstico; o acompanhamento não agenda atendimento nem envia notificações.

| Página | Estrutura | Lógica principal |
| --- | --- | --- |
| Painel | `templates/index.html`, `static/css/painel.css` | `static/js/dashboard.js`, `static/js/chart.js` |
| Visão médica | `templates/equipe-medica.html`, `static/css/equipe-medica.css` | `static/js/equipe-medica.js` |
| Check-ins | `templates/checkins.html`, `static/css/checkins.css` | `static/js/checkins.js` |
| Teste de reação | `templates/teste-reacao.html`, `static/css/teste-reacao.css` | `static/js/teste-reacao.js` |

O estilo e as funções de tema e formatação são compartilhados. `dados-api.js` faz as consultas e escolhe a fonte; `dados-demo.js` oferece dados fictícios locais. O gráfico é SVG, funciona offline e tem tabela equivalente. Detalhes do contrato estão em [api.md](api.md).

## Tipografia e movimento

As fontes são locais (`static/vendor/fonts/`): Atkinson Hyperlegible Next para textos, formulários e tabelas, e Big Shoulders Display, condensada, para títulos, título grande e números. Os tokens `--fonte-*`, a escala de tamanhos e as variáveis de movimento `--revelar-*` ficam no início de `static/css/style.css`.

`static/js/revelar.js`, carregado no `<head>` das quatro páginas, revela os filhos diretos de `<main>` ao rolar ("entrar em foco": sobe de 64 px, sai do desfoque e cresce de 94% para 100%, em 900 ms) e os itens das listas de áreas e de tripulantes em cascata. A seção que sai por baixo, quando a pessoa sobe, volta a ficar oculta; o que sai por cima continua visível. Só o título grande anima no carregamento; o que já está na tela ao abrir aparece direto.

- Nunca ficam ocultos: cabeçalho, rodapé, `.aviso`, `.alerta-urgente`, `.nota--urgente`, mensagens `role="status"` e elementos com `data-sem-revelar` (usado na caixa do teste de reação). Uma seção que contém um desses avisos com texto também não volta a se esconder.
- Itens recriados pela atualização de 10 s dentro de uma seção visível aparecem sem animar.
- Sem JavaScript, sem `IntersectionObserver` ou com "reduzir movimento" ligado no sistema, nada fica oculto nem se move: o estado oculto só vale com `data-revelar="pronto"` no `<html>`.
- Só opacidade, deslocamento e desfoque mudam: leitores de tela continuam lendo o conteúdo ainda não revelado. O foco do teclado numa seção oculta a revela na hora.

## Execução e demonstração

Prepare o ambiente e carregue as fixtures conforme o [README](../README.md), inicie o Flask e abra `http://127.0.0.1:5000/`. Use `?data=2026-11-10` para o caso histórico ou `?fonte=demo` para forçar dados locais. Sem data escolhida, a API avalia a data atual; dados anteriores são identificados como históricos.

Para testar sem API, sirva `templates/index.html` com o Live Server. Estes parâmetros selecionam dados locais:

| Parâmetro | Cenário |
| --- | --- |
| `?fonte=demo` | Caso fictício padrão com três noites alteradas. |
| `?simular=reavaliado` | Inclui a noite posterior e a avaliação retrospectiva verde. |
| `?simular=carregando` | Resposta pendente. |
| `?simular=vazio` | Sem registros de sono. |
| `?simular=insuficiente` | Histórico insuficiente para a regra de sono. |
| `?simular=erro` | Primeira carga bem-sucedida, seguida de falha de atualização. |
| `?simular=erro-inicial` | Falha na primeira carga. |

No modo local, check-ins e testes ficam no `sessionStorage` da aba, persistem ao recarregar e ao trocar de página na mesma aba, e não são enviados ao servidor. O front não recalcula a avaliação de sono após uma gravação local. No modo API, os registros fictícios são persistidos no banco local.

O modo local ainda mostra Metabolismo como sexta área de exemplo, pendente de confirmação; o PDF norte disponível e a API usam cinco áreas. As cores e dados locais são exemplos, não limites clínicos. A visão médica inclui as respostas dos check-ins; o texto do diário só aparece quando o astronauta escolheu compartilhar ([diário privado](diario-privado.md)). Não há autenticação ou controle de acesso. Use somente dados fictícios e não exponha o servidor publicamente.
