# API e integração — situação atual e planejamento

Este documento distingue o que existe do que é necessário ao Raga. As interfaces novas ainda precisam ser acordadas entre os dois integrantes de back-end e o front-end; não são rotas implementadas.

## Estado atual

`app.py` implementa apenas `GET /api/leituras/recentes`, com resposta fixa fictícia, sem banco. A implementação usa por engano o parâmetro e campo `astrounata_id`; aceita somente o valor 1 e responde 404 nos demais casos. O contrato anterior previa `astronauta_id`, mas a implementação não o cumpre. A divergência precisa ser resolvida junto aos consumidores, com documentação e testes.

As rotas antigas `GET /api/leituras` e `POST /api/leituras` foram planejadas, mas não estão implementadas. O banco oferece funções Python de leituras numéricas, não rotas HTTP. Não há rota para o painel, check-in ou visão médica.

## Primeiro componente de avaliação — interface interna, não HTTP

`avaliacao_sono.avaliar_sono(linha_base_horas, registros, data_avaliacao)` recebe uma referência fictícia em horas (ou `None`), registros com `data_sono` no formato `AAAA-MM-DD` e `duracao_horas`, e uma data Python `datetime.date` explícita. A data do sono é a data local do despertar, não um horário de sensor. As durações devem ser números finitos maiores que zero e até 24; datas duplicadas, futuras ou inválidas geram `ValueError`. O chamador deve tratar erros e validar entradas externas antes de chamar a função.

Para a demonstração, a regra exige dados das três datas consecutivas terminando na data avaliada e referência disponível. Se faltar qualquer uma, retorna `dados_insuficientes`; se as três durações forem inferiores à referência, `amarelo`; caso contrário, `verde`, significando somente que esta regra não foi acionada. O resultado explica a decisão e apresenta as noites consideradas. A regra foi escolhida apenas para ilustrar o caso do PDF: não é validada clinicamente, não considera qualidade, contexto ou outras causas e não classifica situações vermelhas. O horário da data avaliada e a janela devem ser combinados com o back-end 1 e o front-end.

Em amarelo a resposta inclui orientação genérica e `reavaliar_em_horas: 24`, proposta dentro da janela de 24–48 horas. Isso é apenas um prazo sugerido: não cria, agenda nem persiste alerta ou reavaliação e não comunica a equipe médica. Não usar para interpretar urgências. A ligação com o armazenamento, regras completas e uma rota HTTP dependem dos contratos da equipe.

## Necessidades do contrato Raga — a definir

| Consumidor | Dados/operações necessárias |
| --- | --- |
| Painel do astronauta | Identidade fictícia, resumo geral e das cinco áreas, data da avaliação, situação dos dados e alertas. |
| Detalhe da área | Histórico cronológico, linha de base quando houver, contexto, origem e explicação da classificação. |
| Check-ins e cognição | Envio validado de respostas, diário opcional e resultado do teste; confirmação e erros. |
| Alertas e recomendações | Sinal observado, dados que o motivaram, orientação ilustrativa, prioridade, prazo e estado. |
| Visão médica | Tripulantes fictícios ordenados por atenção, motivo e dados autorizados. |
| Reavaliação | Estado anterior, novos dados, resultado e registro de encaminhamento simulado quando aplicável. |

Para o caso de sono, o front-end já usa dados fictícios locais num formato proposto em [front-caso-sono.md](front-caso-sono.md); ele serve de ponto de partida para a conversa, não é contrato fechado.

Antes de implementar, definir nomes de rotas e campos, tipos, códigos HTTP, erros, política de acesso e atualização. Não incluir o diário por padrão na visão médica; sua política de compartilhamento precisa ser definida.

## Semântica obrigatória

- Leituras com unidade quando aplicável, origem e data/hora ISO 8601 com fuso; histórico do mais antigo ao mais recente, lista vazia se ausente.
- Distinguir carregamento, ausência, dados insuficientes ou antigos e falha. Ausência não é verde. Em falha, preservar os últimos valores e horários, sinalizando o problema.
- Verde indica apenas que regras ilustrativas não encontraram gatilho nos dados disponíveis; não é diagnóstico. Explicar os dados e regras por trás de cada cor.
- Dados são simulados. Respostas não comprovam comunicação com sensor ou equipe médica. Prioridade imediata não deve aguardar 24–48 horas.
- Consulta periódica inicialmente planejada: 10 segundos; confirmar adequação para cada tipo de dado e funcionamento offline.

Atualizem este arquivo com servidor, consumidores e testes ao estabelecer ou modificar contrato. Validem entradas no servidor, usem SQL parametrizado e não exponham dados sensíveis em erros.
