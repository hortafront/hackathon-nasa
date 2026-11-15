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

As fontes são locais (`static/vendor/fonts/`): Atkinson Hyperlegible Next para textos, formulários e tabelas, e Big Shoulders Display, condensada, para títulos, título grande e números. Os tokens `--fonte-*` e a escala de tamanhos ficam no início de `static/css/style.css`.

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
