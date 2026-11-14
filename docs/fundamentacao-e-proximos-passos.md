# Fundamentação e próximos passos

Este documento reúne a proposta para a equipe e distingue o que já existe do que ainda precisa ser desenvolvido. O objetivo inicial é um protótipo web de acompanhamento de frequência cardíaca em uma missão espacial, com leituras fictícias identificadas como simuladas.

## Por que acompanhar a frequência cardíaca?

O desafio [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) propõe reunir indicadores de saúde e ajudar astronautas a avaliar sua condição e agir a partir das informações. Em missões longas, há diferentes riscos à saúde; frequência cardíaca é um recorte inicial, não uma medida da saúde geral.

O artigo da NASA [Wearable Tech for Space Station Research](https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/) apresenta pesquisas com dispositivos vestíveis na Estação Espacial. Um dos exemplos é um colete com sensores de frequência cardíaca e respiração usados durante o sono. A equipe pretende usar esse artigo para fundamentar a escolha de acompanhar um indicador com sensores vestíveis e para explicar a proposta na documentação e na apresentação.

Como complemento, [Risk of Cardiovascular Adaptations](https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/), da NASA, descreve riscos relacionados às adaptações cardiovasculares em voos espaciais. Ele ajuda a contextualizar o problema, mas não demonstra que este protótipo identifica essas condições.

Esses artigos são referências de pesquisa: não fornecem uma conexão com relógio nem leituras prontas para o sistema. Não foram usados para definir limites clínicos ou validar alertas. Ao finalizar o projeto, registrem na submissão quais fontes foram efetivamente usadas e como contribuíram.

## Proposta para o protótipo

O caminho inicial é gerar leituras simuladas, validá-las no servidor, salvá-las no SQLite e apresentá-las em um painel com unidade, origem e horário. Um histórico e um gráfico devem ajudar a observar mudanças ao longo do tempo. A integração com um relógio real depende da confirmação do modelo e do acesso aos dados; só deve ser apresentada como funcional quando for implementada e verificada.

Para aproximar o painel da proposta de avaliação e ação do desafio, a equipe pode desenvolver depois:

- **Contexto da leitura:** identificar, por exemplo, repouso ou exercício, para ajudar a interpretar o histórico. Ainda é preciso definir como essa informação será coletada e registrada.
- **Orientação simples:** junto a uma mudança destacada por uma eventual regra de demonstração, sugerir que a pessoa confira o histórico e registre o contexto. A regra precisa ter sua origem e limitações documentadas e ser identificada como não validada clinicamente.

Essas ideias são planejadas, não funcionalidades prontas. Caso o contexto ou a regra sejam implementados, a equipe deve combinar as mudanças no banco, na API e no painel e atualizar `docs/api.md` e os demais documentos relevantes. Uma leitura isolada não permite diagnosticar doenças nem concluir o estado geral de saúde. Não usem limites arbitrários como se fossem recomendações médicas.

## Ordem sugerida de trabalho

1. Combinar as respostas da API para erros e ausência de dados.
2. Fazer uma leitura simulada percorrer o fluxo completo: geração, validação, gravação e exibição no painel.
3. Acrescentar histórico, gráfico e atualização periódica; testar também ausência de dados e falha de atualização.
4. Definir como registrar o contexto e como apresentar uma orientação útil, respeitando as limitações acima.
5. Investigar o relógio disponível e seu acesso aos dados; documentar o que for possível implementar e testar.

## Pontos para confirmar com a organização

- A descrição do desafio fala em indicadores de saúde. Confirmar se um protótipo com foco inicial apenas em frequência cardíaca atende ao escopo esperado.
- A [orientação da equipe organizadora sobre recursos](https://github.com/nasa/spaceapps/discussions/2123) informa que é necessário usar pelo menos um recurso da NASA para elegibilidade à avaliação global. Confirmar se o uso do artigo acima como fundamentação atende à exigência da edição e conferir a [aba de recursos do desafio](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources).
- A mesma orientação solicita citar as fontes utilizadas e explicar o uso de ferramentas de IA na submissão. Consultem o guia de envio e registrem como as ferramentas foram usadas, inclusive as exigências aplicáveis de identificação de conteúdo gerado.

Uma [discussão sobre este desafio](https://github.com/nasa/spaceapps/discussions/2133) sugere usar dados sintéticos claramente identificados e consultar pesquisas para fundamentar regras. Trata-se de orientação de um participante que auxilia no evento; dúvidas sobre requisitos devem ser confirmadas com a organização.
