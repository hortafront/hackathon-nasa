# API e integração — situação atual e planejamento

Este documento distingue as rotas existentes das necessidades futuras. O contrato de sono abaixo é uma primeira versão para o front-end integrar e revisar com a equipe.

As explicações e orientações das regras de sono e das áreas são retornadas em inglês para a demonstração. Identificadores, nomes dos campos e valores de estado permanecem inalterados; acompanhamentos persistidos anteriormente preservam o texto que foi salvo na época.

## Estado atual

O Flask serve o painel, a visão médica, check-ins e teste de reação em `/`, `/index.html`, `/equipe-medica.html`, `/checkins.html` e `/teste-reacao.html`. A antiga rota fixa `/api/leituras/recentes` foi removida; use as rotas das áreas e de sono descritas abaixo. Tabelas `leituras` existentes não são apagadas, mas não são usadas pela aplicação atual.

## Cinco áreas e teste de reação

`GET /api/astronautas/<id>/areas?data=AAAA-MM-DD` calcula as cinco áreas para a data local não futura solicitada. Responde `data_avaliacao`, `estado_geral` e `areas`; cada área tem `id`, `estado`, `resumo`, `dados`, `orientacao`, `data_avaliacao`, `historico`, origem da regra e, quando disponíveis, `linha_base` e `ultimo_registro`. Dados têm unidade quando aplicável, origem e horário com fuso. São retornados do mais antigo ao mais recente. O diário não é incluído nesse resumo; continua disponível nos check-ins e na visão médica fictícia conforme decisão do integrante.

As regras abaixo são convenções escolhidas **somente para demonstração**, não critérios clínicos nem protocolos da NASA. Verde significa apenas que a regra não foi acionada; não prova saúde. A avaliação não produz vermelho. Quando faltam dados, a área é `dados_insuficientes`, mostrando o último registro se disponível. Para uma data anterior à de hoje, os resultados de cada área são identificados como históricos e o estado geral é `dados_insuficientes` para a situação atual.

| Área | Dados e regra ilustrativa |
| --- | --- |
| Sono | Referência e três noites consecutivas; amarelo quando todas estão abaixo da referência. |
| Coração | Frequência fictícia em repouso e referência; amarelo se os três registros consecutivos estiverem ao menos 10 bpm acima da referência. Não infere doença ou estresse. |
| Mente | Três check-ins consecutivos; amarelo se as respostas de estresse forem 4 ou 5 nas três datas. Não avalia o diário nem diagnostica. |
| Exercício | Plano fictício em minutos e três registros consecutivos; amarelo se todos forem menores que o plano. Zero é um registro válido. Não infere perda óssea. |
| Cognição | Último teste da data e referência fictícia; amarelo se a mediana for ao menos 25% maior que a referência. Um teste isolado não comprova fadiga ou capacidade de trabalho. |

Na data atual, o estado geral fica amarelo se houver pelo menos uma indicação amarela, informando que outras áreas podem estar incompletas; fica verde apenas quando todas têm dados suficientes e nenhuma regra foi acionada; nos demais casos fica `dados_insuficientes`. As orientações sugerem revisar os registros e conversar com a equipe; não prescrevem tratamentos. Como contexto para a orientação sobre sono, a [NASA descreve fatores ambientais que podem afetá-lo](https://www.nasa.gov/reference/fundamentals-of-human-health/); essa fonte não valida os limiares ou a ação automática do Raga.

`POST /api/astronautas/<id>/indicadores` recebe `{"area":"coracao"|"exercicio", "valor": número, "registrado_em": "ISO 8601 com fuso"}` e retorna `201 {"registro": {...}}`. O servidor define unidade `bpm` ou `min` e origem `simulada`. Para validação do formato, aceita frequência maior que 0 e até 300 e duração entre 0 e 1440 minutos; esses limites não são limiares clínicos. Há apenas um registro por área e data local, com erro `409` em duplicatas. O horário pode ficar no máximo cinco minutos no futuro.

`GET /api/astronautas/<id>/cognicao/testes` retorna identidade, `linha_base_ms`, testes em ordem cronológica e `atualizado_em`. `POST` aceita os campos enviados pelo teste da interface e `tempos_ms` com dez inteiros entre 100 e 3.600.000 ms; o servidor recalcula mediana, mínimo, máximo e contagem acima de 500 ms e registra `origem: teste_interativo_demonstrativo`. Uma execução real da interação não é um sensor ou exame clínico. Horário com fuso, até cinco minutos no futuro, é obrigatório. `201` confirma a gravação, `400` entrada inválida, `404` astronauta inexistente, `409` horário duplicado, `422` dados inconsistentes e `503` banco indisponível.

## Check-in da noite e visão médica fictícia

No MVP local foi autorizado compartilhar respostas completas e diário fictício com a visão médica. Não existe autenticação ou controle por papel: **qualquer pessoa com acesso ao servidor pode consultar esses dados**. Não use dados reais nem exponha o servidor publicamente.

`GET /api/astronautas/<id>/mente/checkins` retorna `astronauta` e `checkins` em ordem de data, com origem e horário. `POST` nessa rota recebe `data` (`AAAA-MM-DD`, sem data futura), `humor`, `estresse`, `convivencia` (inteiros de 1 a 5), `diario` (texto, até 1000 caracteres; use `""` se vazio), `diario_compartilhado` (booleano opcional, padrão `false`) e `registrado_em` (ISO 8601 com fuso). Sem compartilhamento explícito, o servidor descarta o texto recebido e devolve `diario: null`; a visão médica segue a mesma regra. O servidor define `astronauta_id` e `origem: autorrelato_simulado`. Responde `201 {"checkin": {...}}`; entrada inválida 400, astronauta inexistente 404, data duplicada 409 e banco indisponível 503. A regra ilustrativa de mente considera somente respostas de estresse, conforme descrito acima.

Execute `python database.py` após atualizar o projeto. Em bancos anteriores, a migração acrescenta a coluna sem apagar textos existentes e marca os registros como não compartilhados: como o consentimento anterior é desconhecido, esses textos permanecem no banco, mas não são retornados pela API. Uma decisão da equipe é necessária antes de modificá-los. Clientes antigos que não enviam o campo deixam de compartilhar o texto.

`GET /api/equipe-medica/sono` retorna `atualizado_em`, `ordem` e `tripulantes` com resumo das cinco áreas, registros de sono com observações, check-ins com diário e testes de reação. Aceita `?data=AAAA-MM-DD`; sem data usa hoje. A ordem prioriza indicações amarelas da data solicitada, depois dados insuficientes e verde: não é triagem clínica. Se a data for passada, os sinais são históricos e a situação atual fica insuficiente. O histórico detalhado inclui registros também posteriores à data avaliada. Sem banco responde 503; dados inconsistentes, 422. Sem autenticação, ambos os perfis de interface acessam as mesmas rotas.

## Registro de sono fictício e histórico de avaliações

`POST /api/astronautas/<id>/sono/registros` recebe JSON com `noite_em`, `inicio_sono`, `fim_sono` (ISO 8601 com fuso), `duracao_horas`, `qualidade` (inteiro 1–5) e `interrupcoes` (inteiro 0–30). `noite_em` deve representar a meia-noite da data local de despertar; datas futuras não são aceitas. A duração é recalculada pelo servidor a partir dos horários e deve ser positiva e no máximo 16 horas. O servidor define a origem `autorrelato_simulado`; não aceita observações ou outros campos. Sucesso retorna `201 {"registro": {...}}`; entradas inválidas retornam 400, astronauta inexistente 404, data de despertar já registrada 409, dados inconsistentes 422 e banco indisponível 503. A verificação de duplicidade e a inserção são serializadas. Apenas dados fictícios são permitidos neste protótipo local sem autenticação.

`GET /api/astronautas/<id>/sono/avaliacoes?data=AAAA-MM-DD` retorna `{"avaliacoes": [...]}`, em ordem de data, para as datas de despertar até a data informada e para a própria data informada. Cada elemento usa o formato da avaliação individual. São cálculos retrospectivos no momento da consulta, não um histórico de eventos persistidos, agendamentos ou atendimentos. Retorna os mesmos erros de data, astronauta, consistência e banco da avaliação individual.

## Acompanhamento persistido de sono fictício

Depois de atualizar o projeto, execute `python database.py` para criar as tabelas ausentes sem apagar os dados. O acompanhamento usa somente dados fictícios e não tem autenticação, notificações nem agendamento.

- `GET /api/astronautas/<id>/sono/acompanhamentos` retorna `{"acompanhamentos": [...]}` em ordem de criação, com `[]` se não houver. Cada item contém a avaliação inicial com as noites e a referência usadas, a data da indicação, `criado_em`, `reavaliar_a_partir_de`, `encerrado_em` (`null` enquanto aberto) e `eventos` em ordem de registro.
- `POST` na mesma rota recebe `{"data_avaliacao": "AAAA-MM-DD"}` e retorna `201 {"acompanhamento": {...}}`. A data deve ter despertar registrado e avaliação amarela. Só é permitido um acompanhamento aberto por astronauta, e uma nova indicação deve ser posterior à última data de avaliação registrada em acompanhamentos anteriores.
- `POST /api/astronautas/<id>/sono/acompanhamentos/<acompanhamento_id>/acoes` recebe `{"acao": "revisar_registros"}` e registra uma única revisão fictícia. Isso é uma confirmação do demonstrador; não prova que houve atendimento.
- `POST /api/astronautas/<id>/sono/acompanhamentos/<acompanhamento_id>/reavaliacoes` recebe `{"data_avaliacao": "AAAA-MM-DD"}` e registra a avaliação calculada com um despertar posterior ao da última avaliação registrada. Exige a ação anterior. Amarelo ou dados insuficientes mantêm o acompanhamento aberto; verde encerra somente essa regra ilustrativa e não comprova melhora clínica. É possível reavaliar mais de uma vez com novas datas enquanto estiver aberto.

`reavaliar_a_partir_de` é o horário do despertar que motivou a indicação mais 24 horas, com fuso. É um prazo sugerido, não uma trava: reavaliações antecipadas com novos dados são permitidas; situações urgentes exigem atenção imediata. As datas avaliadas podem ser históricas; `criado_em` e `registrado_em` indicam quando os eventos foram efetivamente registrados, em UTC. As avaliações persistidas são fotografias dos dados e da regra no momento do registro, distintas das avaliações retrospectivas calculadas a cada consulta.

Entradas inválidas retornam `400`, astronauta ou acompanhamento inexistente `404`, conflito de estado ou ausência de nova noite `409`, dados inconsistentes `422` e banco indisponível `503`, sempre com `{"erro": "mensagem"}`.

## Consulta HTTP do histórico de sono

`GET /api/astronautas/1/sono/registros` retorna `astronauta` (id, identificação, nome de exibição e origem), `linha_base` (objeto ou `null`) e `registros` em ordem cronológica (ou `[]`). Os registros incluem horários com fuso, duração em horas, qualidade, interrupções e origem. O campo de texto livre `observacao` é omitido enquanto sua política de acesso não estiver definida.

O identificador zero retorna `400`, astronauta inexistente `404`, dados de sono inconsistentes `422` e banco indisponível `503`; erros usam `{"erro": "mensagem"}`. A consulta não cria um banco ausente. Como na avaliação, não há autenticação: somente dados fictícios em ambiente local. O JSON de demonstração não é importado automaticamente.

## Primeiro componente de avaliação — interface interna, não HTTP

`avaliacao_sono.avaliar_sono(linha_base_horas, registros, data_avaliacao)` recebe uma referência fictícia em horas (ou `None`), registros com `data_sono` no formato `AAAA-MM-DD` e `duracao_horas`, e uma data Python `datetime.date` explícita. A data do sono é a data local do despertar, não um horário de sensor. As durações devem ser números finitos maiores que zero e até 24; datas duplicadas, futuras ou inválidas geram `ValueError`. O chamador deve tratar erros e validar entradas externas antes de chamar a função.

Para a demonstração, a regra exige dados das três datas consecutivas terminando na data avaliada e referência disponível. Se faltar qualquer uma, retorna `dados_insuficientes`; se as três durações forem inferiores à referência, `amarelo`; caso contrário, `verde`, significando somente que esta regra não foi acionada. O resultado explica a decisão e apresenta as noites consideradas. A regra foi escolhida apenas para ilustrar o caso do PDF: não é validada clinicamente, não considera qualidade, contexto ou outras causas e não classifica situações vermelhas. O horário da data avaliada e a janela devem ser combinados com o back-end 1 e o front-end.

Em amarelo a resposta inclui orientação genérica e `reavaliar_em_horas: 24`, proposta dentro da janela de 24–48 horas. A avaliação sozinha não cria um acompanhamento; o registro explícito usa as rotas descritas acima. O prazo não agenda nem envia avisos. Não usar para interpretar urgências.

## Integração interna com o banco

`servico_sono.avaliar_sono_do_astronauta(conexao, astronauta_id, data_avaliacao)` consulta a linha de base e o histórico do banco e retorna a avaliação com o identificador. A data local do despertar é extraída de `fim_sono` com seu próprio fuso. A função considera somente a janela das três datas terminando em `data_avaliacao`, inclusive quando há registros posteriores no banco. Registros duplicados na mesma data de despertar causam `ValueError`; não escolhe um arbitrariamente. A conexão pertence ao chamador. Astronauta sem linha de base ou dados suficientes recebe `dados_insuficientes`.

O JSON em `data/astronautas-ficticios.json` não é carregado automaticamente. Os testes o inserem em banco temporário e avaliam a data fictícia de 10/11/2026; uma data posterior sem registros resulta em dados insuficientes. Esta função não é uma rota HTTP e não distingue identificador inexistente de dados ausentes.

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
  "explicacao": "All three sleep durations are below the fictional individual baseline.",
  "orientacao": "Review the three nights, check for possible environmental interruptions and record the next night. Speak with the responsible team if you are concerned.",
  "reavaliar_em_horas": 24
}
```

Sem referência ou três noites consecutivas, responde `200` com `estado: dados_insuficientes`, lista vazia e orientação nula. Data ausente ou inválida retorna `400`; astronauta inexistente `404`; registros inconsistentes ou duplicados `422`; banco indisponível `503`. Erros usam `{"erro": "mensagem"}`. Não há autenticação ou autorização: somente dados fictícios em ambiente local. Não é apropriado para dados reais nem exposição pública.

## Semântica obrigatória

- Leituras com unidade quando aplicável, origem e data/hora ISO 8601 com fuso; histórico do mais antigo ao mais recente, lista vazia se ausente.
- Distinguir carregamento, ausência, dados insuficientes ou antigos e falha. Ausência não é verde. Em falha, preservar os últimos valores e horários, sinalizando o problema.
- Verde indica apenas que regras ilustrativas não encontraram gatilho nos dados disponíveis; não é diagnóstico. Explicar os dados e regras por trás de cada cor.
- Dados são simulados. Respostas não comprovam comunicação com sensor ou equipe médica. Prioridade imediata não deve aguardar 24–48 horas.
- Consulta periódica inicialmente planejada: 10 segundos; confirmar adequação para cada tipo de dado e funcionamento offline.

Atualizem este arquivo com servidor, consumidores e testes ao estabelecer ou modificar contrato. Validem entradas no servidor, usem SQL parametrizado e não exponham dados sensíveis em erros.
