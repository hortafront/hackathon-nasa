# Integração entre front-end e API

O contrato HTTP atual está em [api.md](api.md). O Flask serve as quatro páginas e oferece consultas e gravações de sono, check-ins da noite, indicadores e testes de reação, além das avaliações das cinco áreas, do acompanhamento de sono e da visão médica.

O navegador consulta a API por meio de `static/js/dados-api.js`. A tela de check-ins busca somente o histórico de sono; o painel também consulta avaliações e áreas. A atualização ocorre a cada 10 segundos. Depois de uma resposta da API, uma falha mantém os últimos dados exibidos e informa o erro. Quando a primeira consulta falha por rede ou rota ausente, o navegador usa os dados fictícios locais e informa a origem; para voltar a tentar a API, recarregue a página.

Os parâmetros `?fonte=demo` e `?simular=...` selecionam o modo local descrito em [front-caso-sono.md](front-caso-sono.md). Ele funciona sem a API, mas as gravações ficam na sessão da aba e não são sincronizadas com o servidor.

## Limites e decisões pendentes

- O PDF norte presente no repositório é a versão 2 e descreve cinco áreas. O modo local ainda inclui Metabolismo como sexta área de exemplo, pendente de confirmação da equipe; a API usa cinco.
- Os dados e regras são fictícios e ilustrativos. O ciclo persistido de sono registra ações manualmente; não agenda, envia avisos ou comprova atendimento.
- A visão médica inclui as respostas dos check-ins; o diário passou a ser privado por padrão e só é compartilhado com permissão do astronauta (ver [diário privado](diario-privado.md), com o que falta no back-end). Não há autenticação nem controle por papel; use apenas dados fictícios em ambiente local.
- As observações livres dos registros de sono são omitidas da rota individual, mas aparecem na visão médica. A política de compartilhamento dessas observações ainda precisa ser acordada.
- Antes de ampliar a API, combinem formatos, acesso por papel, dados ausentes e tratamento de erros. Atualizem [api.md](api.md), consumidores e testes juntos.

Para executar a demonstração e carregar as fixtures, siga o [README](../README.md). As responsabilidades propostas estão em [equipe.md](equipe.md).
