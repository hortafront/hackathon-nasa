# Project Raga — norte e planejamento

Referência principal: [Project Raga: o norte do projeto](Project%20Raga%20-%20Norte%20do%20projeto.pdf), versão 2 de 14/11/2026. A equipe adotou esse documento como direção do projeto. Este arquivo traduz suas decisões para o trabalho compartilhado e identifica propostas e questões abertas; se houver dúvida, consultem o PDF e conversem com a equipe. O recorte anterior apenas de frequência cardíaca não é mais o objetivo completo.

## Problema e objetivo

Em missões longas, radiação, isolamento, confinamento, distância, gravidade alterada e ambiente fechado podem afetar saúde e desempenho. A equipe procura ajudar o astronauta e os profissionais de saúde a acompanhar dados físicos e mentais reunidos, perceber alterações e orientar o próximo passo mesmo quando não há contato imediato com a Terra. Astronautas na ISS já recebem acompanhamento médico; não representem o Raga como substituto desse cuidado.

## Ciclo de cuidado planejado

1. **Medir:** reunir dados simulados de sensores e registros do astronauta.
2. **Comparar:** considerar a linha de base individual e a evolução, não apenas um número isolado.
3. **Classificar:** apresentar verde, amarelo ou vermelho em cada área e no geral, com explicação.
4. **Recomendar:** mostrar orientação demonstrativa, motivo, fonte e limites, bem como acompanhamento necessário.
5. **Reavaliar:** verificar a evolução após 24–48 horas nas situações de acompanhamento e registrar eventual encaminhamento. Uma situação apresentada como urgente exige atenção imediata, não espera por esse prazo.

Sem dados suficientes ou com dados antigos, informar essa condição: não converter ausência em verde. Verde significa apenas que nenhuma regra ilustrativa foi acionada nos dados disponíveis, não saúde comprovada. Não usar cores como único meio de comunicar o estado. O cálculo do estado geral, os limiares, as condições de reavaliação e os métodos de linha de base ainda precisam ser definidos e validados pela equipe.

## Entradas e cinco áreas

| Área | Entradas planejadas | Atenção |
| --- | --- | --- |
| Sono | Duração e qualidade autorrelatadas; EEG de ouvido simulado. | Dados parciais não diagnosticam insônia; o EEG real não está integrado. |
| Coração | Dados fictícios inspirados em sensores, inclusive frequência cardíaca. | Uma leitura isolada não identifica estresse, doença ou saúde geral. |
| Mente e equipe | Check-in noturno de humor, estresse e convivência; diário opcional. | Não inferir diagnóstico psicológico; definir privacidade e compartilhamento. |
| Exercício | Tipo e duração do treino; atividade simulada. | Comparar com plano fictício individual; duração isolada não mede perda óssea. |
| Cognição | Teste rápido de reação inspirado no PVT. | Uma demonstração simples não equivale a teste clínico ou bateria Cognition validada. |

O PDF também cita ECG, respiração, oxigenação, pressão estimada, temperatura da pele e atividade inspirados no Astroskin/Bio-Monitor. O hackathon usa dados simulados, sem integração real. A forma exata e a disponibilidade de API do equipamento não foram verificadas. A ideia de monitoramento 24 horas é um objetivo, não evidência de medição real contínua neste protótipo.

## Telas planejadas

1. **Painel do astronauta:** estado geral e das cinco áreas, origem, horário e avisos.
2. **Detalhe da área:** tendência, linha de base quando disponível, dados usados e explicação.
3. **Check-ins:** perguntas de manhã e à noite, diário opcional e teste de reação.
4. **Alertas e recomendações:** o que mudou, ação ilustrativa, prioridade e prazo de acompanhamento.
5. **Visão da equipe médica:** tripulantes ordenados por necessidade de atenção, com motivo e informações autorizadas.

Há necessidade de carregamento, ausência, dados insuficientes, dados antigos e erro. Em falha de atualização, manter a última informação com horário e sinalizar o problema. A ideia de armazenamento e uso a bordo é parte do planejamento; confirmar que todos os recursos da demonstração estão disponíveis offline.

## Dados sensíveis e limites

Usem exclusivamente dados fictícios e identifiquem sua origem. A equipe deve definir quem pode acessar cada campo; não presumam acesso da visão médica ao texto do diário. As conversas psicológicas privadas não são dados disponíveis automaticamente. Controle de acesso, confidencialidade e notificações reais não estão implementados. Não façam afirmações de segurança, diagnóstico, efetividade clínica ou integração que não tenham sido verificadas.

As cores, limiares e ações do PDF são exemplos para protótipo. Ajuste de treino, terapia de luz, interpretação de ECG/oxigenação e encaminhamento dependem de especialistas e protocolos aprovados antes de qualquer uso real. Não chamar o Raga de sistema médico validado.

## Demonstração pretendida

Criar JSON fictício por tripulante com histórico de alguns dias. Mostrar ao menos um caso completo de três noites de sono alterado: dados → comparação com referência fictícia → classificação e explicação → orientação ilustrativa → acompanhamento/reavaliação. A visão médica lista tripulantes fictícios por prioridade; as outras áreas aparecem com seus dados disponíveis ou indicação clara de insuficiência. Diferenciar o que funciona no protótipo do que é simulado ou futuro.

## Decisões em aberto

- Campos e escalas dos check-ins, teste, sono, treinamento e perfis fictícios; formato do JSON.
- Período e cálculo da linha de base, qualidade dos dados, contextualização e tratamento de ausência.
- Regras por área e geral, explicação de cada cor e critérios ilustrativos de prioridade.
- Fontes e redação de recomendações; o que significa melhora e quais eventos encerram ou encaminham um alerta.
- Dados visíveis a cada usuário, consentimento e implementação de acesso; política do diário opcional.
- Contrato da API, migração não destrutiva do banco, limites do offline e implementação de reavaliação.
- Critérios oficiais de envio e recursos efetivamente usados; confirmar o conteúdo integral do desafio.

Ver [divisão do trabalho](equipe.md), [contrato de integração](api.md) e [fontes e limitações](fundamentacao-e-proximos-passos.md). Se novas ideias afastarem o projeto do ciclo, das cinco áreas/telas, dos dados fictícios ou do escopo do hackathon, sinalizem à equipe antes de mudar o norte.
