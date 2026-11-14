# Dados fictícios e camada de armazenamento

Este documento descreve a interface Python entre o armazenamento e a futura API. Não define contrato HTTP.

## Estrutura do primeiro caso

- `astronautas`: identificação fictícia, nome de exibição e origem.
- `linhas_base_sono`: médias fictícias de duração e qualidade, com período de referência e origem.
- `registros_sono`: uma linha por noite, com horários ISO 8601 com fuso, duração, qualidade, interrupções, origem e observação.

O arquivo `data/astronautas-ficticios.json` é uma fixture. Ele não é carregado automaticamente no banco e não representa dados reais.

## Carga explicita e unicidade

Use `database.carregar_dados_ficticios(conexao)` somente quando quiser carregar a fixture. A funcao e idempotente, usa uma transacao e desfaz toda a carga se houver falha. Ela retorna contagens em `inseridos` e `ignorados`.

`registros_sono` possui indice unico por `(astronauta_id, noite_em)`, comparando o texto completo do horario. Ele nao garante uma unica data local de despertar se os textos de `noite_em` forem diferentes: a avaliacao ainda rejeita registros com o mesmo dia de `fim_sono`. Uma duplicata identica e ignorada pela carga; conflito com dados diferentes interrompe a transacao. Bases antigas com duplicatas precisam ser corrigidas conscientemente antes da criacao do indice.

Check-ins continuam pendentes de alinhamento com Alan: campos, limites, autoria de `astronauta_id` e `origem`, duplicidade e erros.

## Funções para o back-end 2

- `salvar_astronauta(conexao, astronauta)` retorna o registro salvo.
- `salvar_linha_base_sono(conexao, linha_base)` salva uma linha de base por astronauta.
- `salvar_registro_sono(conexao, registro)` retorna o registro salvo com `id`.
- `buscar_linha_base_sono(conexao, astronauta_id)` retorna um dicionário ou `None`.
- `buscar_historico_sono(conexao, astronauta_id)` retorna uma lista cronológica ou `[]`.

As funções usam SQL parametrizado, validam tipos básicos e exigem horários ISO 8601 com fuso. A API deve validar parâmetros HTTP, autenticação/autorização, códigos HTTP e formato final das respostas.

Exemplo de registro de entrada:

```python
{
    "astronauta_id": 1,
    "noite_em": "2026-11-08T00:00:00-03:00",
    "inicio_sono": "2026-11-07T23:50:00-03:00",
    "fim_sono": "2026-11-08T05:50:00-03:00",
    "duracao_horas": 6.0,
    "qualidade": 2,
    "interrupcoes": 4,
    "origem": "simulada",
    "observacao": "Primeira noite alterada do cenário."
}
```

Decisões ainda abertas: escala e significado de `qualidade`, cálculo da linha de base, limites de `duracao_horas`, campos de check-in, política de observações e formato HTTP do histórico.
