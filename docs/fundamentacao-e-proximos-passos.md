# Fundamentação e próximos passos

O [PDF norte](Project%20Raga%20-%20Norte%20do%20projeto.pdf) reúne hipóteses, referências e exemplos. A [descrição do desafio](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) pede software que reúna indicadores e permita ao astronauta avaliar e agir. O resumo indexado foi consultado; a página completa retornou erro durante a análise. Confirmem requisitos e recursos na versão acessível do desafio e nas instruções oficiais de submissão.

## Evidências consultadas e uso

- [NASA: cuidados médicos no espaço](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/): contextualiza o treinamento e acompanhamento médico existentes; não indica que astronautas estejam sem suporte.
- [NASA: operações médicas](https://www.nasa.gov/reference/6-0-medical-operations/): informa sobre carga de trabalho, sono e privacidade de comunicações médicas e psicológicas. Fundamenta atenção à privacidade, não implementa controle de acesso para o projeto.
- [NASA: fundamentos da saúde humana](https://www.nasa.gov/reference/fundamentals-of-human-health/) e [laboratório de fadiga](https://www.nasa.gov/human-systems-integration-division/human-performance/fatigue-countermeasures-laboratory/): contextualizam sono, fadiga e medições em pesquisa; não validam as regras do Raga.
- [NASA: alterações ósseas](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/): cita perda média mensal de 1% a 1,5% em ossos que suportam peso durante missões de quatro a seis meses. Não inferir a perda de um indivíduo a partir de um dia de exercício.
- [Agência Espacial Canadense: Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp): descreve sensores vestíveis e variáveis medidas, servindo de inspiração para dados fictícios. Não confirma nossa integração nem compatibilidade de formato.
- [Estudo de diários de Stuster](https://ntrs.nasa.gov/citations/20100026549): identificou evidência de queda de moral no terceiro quarto em sua amostra. [Relatório posterior da NASA](https://ntrs.nasa.gov/api/citations/20220007465/downloads/Evidence%20Report%20-%20Team%202022%20FINAL4PUB%20rev%201.docx.pdf) descreve evidência inconsistente e uma revisão que não considera o fenômeno típico em todos os voos ou análogos. Não usar a fase da missão como diagnóstico ou gatilho automático universal.

## Afirmações ainda a conferir

As demais porcentagens e detalhes do PDF — incluindo SANS, uso de medicamentos para dormir, adaptação, protocolos psicológicos, comparação de ferramentas, API e autonomia do Astroskin — não foram verificados individualmente nesta revisão. Chequem as fontes primárias, população, período e contexto antes de usá-los no pitch. Não afirmar que nenhuma outra ferramenta reúne capacidades semelhantes sem uma comparação abrangente. Não apresentar os exemplos de sinais e ações como regras clínicas.

## Próximos passos

1. Confirmar os requisitos oficiais e documentar quais recursos e ferramentas de IA foram efetivamente usados.
2. Fechar dados fictícios, linha de base, regras demonstrativas, acesso ao diário e visibilidade médica.
3. Alinhar API, estrutura de dados e migração com toda a equipe, conforme [equipe](equipe.md) e [API](api.md).
4. Construir e testar o caso completo de sono; depois atender as demais áreas e telas do [planejamento](raga.md).
5. Revisar fontes, limitações, funcionamento offline, demonstração e pitch.
