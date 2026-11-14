# API e integração — situação atual e planejamento

Este documento distingue o que existe do que é necessário ao Raga. As interfaces novas ainda precisam ser acordadas entre os dois integrantes de back-end e o front-end; não são rotas implementadas.

## Estado atual

`app.py` implementa apenas `GET /api/leituras/recentes`, com resposta fixa fictícia, sem banco. A implementação usa por engano o parâmetro e campo `astrounata_id`; aceita somente o valor 1 e responde 404 nos demais casos. O contrato anterior previa `astronauta_id`, mas a implementação não o cumpre. A divergência precisa ser resolvida junto aos consumidores, com documentação e testes.

As rotas antigas `GET /api/leituras` e `POST /api/leituras` foram planejadas, mas não estão implementadas. O banco oferece funções Python de leituras numéricas, não rotas HTTP. Não há rota para o painel, check-in ou visão médica.

## Necessidades do contrato Raga — a definir

| Consumidor | Dados/operações necessárias |
| --- | --- |
| Painel do astronauta | Identidade fictícia, resumo geral e das cinco áreas, data da avaliação, situação dos dados e alertas. |
| Detalhe da área | Histórico cronológico, linha de base quando houver, contexto, origem e explicação da classificação. |
| Check-ins e cognição | Envio validado de respostas, diário opcional e resultado do teste; confirmação e erros. |
| Alertas e recomendações | Sinal observado, dados que o motivaram, orientação ilustrativa, prioridade, prazo e estado. |
| Visão médica | Tripulantes fictícios ordenados por atenção, motivo e dados autorizados. |
| Reavaliação | Estado anterior, novos dados, resultado e registro de encaminhamento simulado quando aplicável. |

Antes de implementar, definir nomes de rotas e campos, tipos, códigos HTTP, erros, política de acesso e atualização. Não incluir o diário por padrão na visão médica; sua política de compartilhamento precisa ser definida.

## Semântica obrigatória

- Leituras com unidade quando aplicável, origem e data/hora ISO 8601 com fuso; histórico do mais antigo ao mais recente, lista vazia se ausente.
- Distinguir carregamento, ausência, dados insuficientes ou antigos e falha. Ausência não é verde. Em falha, preservar os últimos valores e horários, sinalizando o problema.
- Verde indica apenas que regras ilustrativas não encontraram gatilho nos dados disponíveis; não é diagnóstico. Explicar os dados e regras por trás de cada cor.
- Dados são simulados. Respostas não comprovam comunicação com sensor ou equipe médica. Prioridade imediata não deve aguardar 24–48 horas.
- Consulta periódica inicialmente planejada: 10 segundos; confirmar adequação para cada tipo de dado e funcionamento offline.

Atualizem este arquivo com servidor, consumidores e testes ao estabelecer ou modificar contrato. Validem entradas no servidor, usem SQL parametrizado e não exponham dados sensíveis em erros.
