# Contrato inicial da API

Estas rotas estão planejadas e ainda precisam ser implementadas. A equipe deve manter os nomes e tipos alinhados entre Python e JavaScript.

## Última leitura

`GET /api/leituras/recentes?astronauta_id=1`

Exemplo fictício:

```json
{"astronauta_id": 1, "indicador": "frequencia_cardiaca", "valor": 72, "unidade": "bpm", "registrado_em": "2026-11-14T13:00:00-03:00", "origem": "simulada"}
```

Definam o status HTTP e o corpo da resposta quando não houver leitura.

## Histórico

`GET /api/leituras?astronauta_id=1&indicador=frequencia_cardiaca`

Retornar `{"leituras": [...]}` em ordem do mais antigo ao mais recente. Sem registros, retornar `{"leituras": []}`. Cada item informa valor, unidade, horário com fuso e origem.

## Nova leitura

`POST /api/leituras`: receber os campos do exemplo, validar e salvar; responder com a leitura criada. Rejeitar dados inválidos com mensagem explicativa. Combinem os códigos HTTP e o formato de erro.

## Interface

Consultar inicialmente a cada 10 segundos. Exibir origem e horário, mesmo para dados antigos. Em falha de atualização, manter a última leitura e informar o problema; sem dados, informar a ausência. Uma resposta do servidor não comprova conexão com o relógio.
