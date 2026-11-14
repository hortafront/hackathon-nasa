# API e integração — situação atual e planejamento

Este documento distingue as rotas existentes das necessidades futuras. O contrato de sono abaixo é uma primeira versão para o front-end integrar e revisar com a equipe.

## Estado atual

Além da rota de sono abaixo, `app.py` implementa `GET /api/leituras/recentes`, com resposta fixa fictícia, sem banco. A implementação usa por engano o parâmetro e campo `astrounata_id`; aceita somente o valor 1 e responde 404 nos demais casos. O contrato anterior previa `astronauta_id`, mas a implementação não o cumpre. A divergência precisa ser resolvida junto aos consumidores, com documentação e testes.

As rotas antigas `GET /api/leituras` e `POST /api/leituras` foram planejadas, mas não estão implementadas. O banco oferece funções Python de leituras numéricas, não rotas HTTP. O Flask serve o painel, a prévia médica, check-ins e teste de reação em `/`, `/index.html`, `/equipe-medica.html`, `/checkins.html` e `/teste-reacao.html`. Sono, check-in da noite e visão médica têm rotas; ainda não há API de cognição.

## Check-in da noite e visão médica fictícia

No MVP local foi autorizado compartilhar respostas completas e diário fictício com a visão médica. Não existe autenticação ou controle por papel: **qualquer pessoa com acesso ao servidor pode consultar esses dados**. Não use dados reais nem exponha o servidor publicamente.

`GET /api/astronautas/<id>/mente/checkins` retorna `astronauta` e `checkins` em ordem de data, com diário, origem e horário. `POST` nessa rota recebe `data` (`AAAA-MM-DD`, sem data futura), `humor`, `estresse`, `convivencia` (inteiros de 1 a 5), `diario` (texto, até 1000 caracteres; use `""` se vazio) e `registrado_em` (ISO 8601 com fuso). O servidor define `astronauta_id` e `origem: autorrelato_simulado`. Responde `201 {"checkin": {...}}`; entrada inválida 400, astronauta inexistente 404, data duplicada 409 e banco indisponível 503. Não há regra de classificação de mente.

`GET /api/equipe-medica/sono` retorna `atualizado_em`, `ordem` e `tripulantes`, incluindo avaliações demonstrativas de sono, linha de base, registros de sono com observações, e `checkins_noite` com respostas e diário. A ordem é amarelo, dados insuficientes, verde, exclusivamente conforme a última avaliação de sono: não é triagem clínica e os dados podem ser antigos. Sem banco responde 503; dados inconsistentes, 422. Sem autenticação, ambos os perfis de interface acessam as mesmas rotas.

## Registro de sono fictício e histórico de avaliações

`POST /api/astronautas/<id>/sono/registros` recebe JSON com `noite_em`, `inicio_sono`, `fim_sono` (ISO 8601 com fuso), `duracao_horas`, `qualidade` (inteiro 1–5) e `interrupcoes` (inteiro 0–30). `noite_em` deve representar a meia-noite da data local de despertar; datas futuras não são aceitas. A duração é recalculada pelo servidor a partir dos horários e deve ser positiva e no máximo 16 horas. O servidor define a origem `autorrelato_simulado`; não aceita observações ou outros campos. Sucesso retorna `201 {"registro": {...}}`; entradas inválidas retornam 400, astronauta inexistente 404, data de despertar já registrada 409, dados inconsistentes 422 e banco indisponível 503. A verificação de duplicidade e a inserção são serializadas. Apenas dados fictícios são permitidos neste protótipo local sem autenticação.

`GET /api/astronautas/<id>/sono/avaliacoes?data=AAAA-MM-DD` retorna `{"avaliacoes": [...]}`, em ordem de data, para as datas de despertar até a data informada e para a própria data informada. Cada elemento usa o formato da avaliação individual. São cálculos retrospectivos no momento da consulta, não um histórico de eventos persistidos, agendamentos ou atendimentos. Retorna os mesmos erros de data, astronauta, consistência e banco da avaliação individual.

## Consulta HTTP do histórico de sono

`GET /api/astronautas/1/sono/registros` retorna `astronauta` (id, identificação, nome de exibição e origem), `linha_base` (objeto ou `null`) e `registros` em ordem cronológica (ou `[]`). Os registros incluem horários com fuso, duração em horas, qualidade, interrupções e origem. O campo de texto livre `observacao` é omitido enquanto sua política de acesso não estiver definida.

O identificador zero retorna `400`, astronauta inexistente `404`, dados de sono inconsistentes `422` e banco indisponível `503`; erros usam `{"erro": "mensagem"}`. A consulta não cria um banco ausente. Como na avaliação, não há autenticação: somente dados fictícios em ambiente local. O JSON de demonstração não é importado automaticamente.

## Primeiro componente de avaliação — interface interna, não HTTP

`avaliacao_sono.avaliar_sono(linha_base_horas, registros, data_avaliacao)` recebe uma referência fictícia em horas (ou `None`), registros com `data_sono` no formato `AAAA-MM-DD` e `duracao_horas`, e uma data Python `datetime.date` explícita. A data do sono é a data local do despertar, não um horário de sensor. As durações devem ser números finitos maiores que zero e até 24; datas duplicadas, futuras ou inválidas geram `ValueError`. O chamador deve tratar erros e validar entradas externas antes de chamar a função.

Para a demonstração, a regra exige dados das três datas consecutivas terminando na data avaliada e referência disponível. Se faltar qualquer uma, retorna `dados_insuficientes`; se as três durações forem inferiores à referência, `amarelo`; caso contrário, `verde`, significando somente que esta regra não foi acionada. O resultado explica a decisão e apresenta as noites consideradas. A regra foi escolhida apenas para ilustrar o caso do PDF: não é validada clinicamente, não considera qualidade, contexto ou outras causas e não classifica situações vermelhas. O horário da data avaliada e a janela devem ser combinados com o back-end 1 e o front-end.

Em amarelo a resposta inclui orientação genérica e `reavaliar_em_horas: 24`, proposta dentro da janela de 24–48 horas. Isso é apenas um prazo sugerido: não cria, agenda nem persiste alerta ou reavaliação e não comunica a equipe médica. Não usar para interpretar urgências.

## Integração interna com o banco

`servico_sono.avaliar_sono_do_astronauta(conexao, astronauta_id, data_avaliacao)` consulta a linha de base e o histórico do banco e retorna a avaliação com o identificador. A data local do despertar é extraída de `fim_sono` com seu próprio fuso. A função considera somente a janela das três datas terminando em `data_avaliacao`, inclusive quando há registros posteriores no banco. Registros duplicados na mesma data de despertar causam `ValueError`; não escolhe um arbitrariamente. A conexão pertence ao chamador. Astronauta sem linha de base ou dados suficientes recebe `dados_insuficientes`.

O JSON em `data/astronautas-ficticios.json` não é carregado automaticamente. Os testes o inserem em banco temporário e avaliam a data fictícia de 10/11/2026; uma data posterior sem registros resulta em dados insuficientes. Esta função não é uma rota HTTP e não distingue identificador inexistente de dados ausentes; as decisões de API, controle de acesso e política de datas permanecem abertas.

## Consulta HTTP da avaliação de sono

`GET /api/astronautas/1/sono/avaliacao?data=2026-11-10`: a data é obrigatória, no formato `AAAA-MM-DD`, e representa a data local de despertar usada como fim da janela de três dias. A rota consulta o banco local configurado; execute `python database.py` para criar as tabelas. Os dados JSON fictícios **não são importados automaticamente**.

Exemplo de resposta `200`, com banco preenchido pelo cenário fictício:

```json
{
  "astronauta_id": 1,
  "area": "sono",
  "data_avaliacao": "2026-11-10",
  "linha_base_horas": 7.5,
  "origem_linha_base": "simulada",
  "estado": "amarelo",
  "origem_regra": "demonstracao_nao_clinica",
  "noites_consideradas": [
    {"data_sono": "2026-11-08", "duracao_horas": 6.0, "origem": "simulada", "registrado_em": "2026-11-08T05:50:00-03:00"},
    {"data_sono": "2026-11-09", "duracao_horas": 5.5, "origem": "simulada", "registrado_em": "2026-11-09T05:50:00-03:00"},
    {"data_sono": "2026-11-10", "duracao_horas": 4.5, "origem": "simulada", "registrado_em": "2026-11-10T05:30:00-03:00"}
  ],
  "explicacao": "As três durações estão abaixo da referência individual fictícia.",
  "orientacao": "Revise os registros e acompanhe a evolução com a equipe responsável.",
  "reavaliar_em_horas": 24
}
```

Sem referência ou três noites consecutivas, responde `200` com `estado: dados_insuficientes`, lista vazia e orientação nula. Data ausente ou inválida retorna `400`; astronauta inexistente `404`; registros inconsistentes ou duplicados `422`; banco indisponível `503`. Erros usam `{"erro": "mensagem"}`. Não há autenticação ou autorização: somente dados fictícios em ambiente local. Não é apropriado para dados reais nem exposição pública.

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

As demais rotas e regras dessa tabela ainda precisam ser combinadas. Para o MVP fictício, foi definido o compartilhamento integral de check-ins e diário com a visão médica; controle de acesso real continua não implementado.

## Semântica obrigatória

- Leituras com unidade quando aplicável, origem e data/hora ISO 8601 com fuso; histórico do mais antigo ao mais recente, lista vazia se ausente.
- Distinguir carregamento, ausência, dados insuficientes ou antigos e falha. Ausência não é verde. Em falha, preservar os últimos valores e horários, sinalizando o problema.
- Verde indica apenas que regras ilustrativas não encontraram gatilho nos dados disponíveis; não é diagnóstico. Explicar os dados e regras por trás de cada cor.
- Dados são simulados. Respostas não comprovam comunicação com sensor ou equipe médica. Prioridade imediata não deve aguardar 24–48 horas.
- Consulta periódica inicialmente planejada: 10 segundos; confirmar adequação para cada tipo de dado e funcionamento offline.

Atualizem este arquivo com servidor, consumidores e testes ao estabelecer ou modificar contrato. Validem entradas no servidor, usem SQL parametrizado e não exponham dados sensíveis em erros.
