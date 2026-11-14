# Front-end — caso de sono

Primeira entrega do front-end do Raga: o caso de três noites de sono alterado ([docs/raga.md](raga.md)), da astronauta fictícia ao check-in e à prévia da visão médica. A interface usa dados fictícios locais em `static/js/dados-demo.js` e ainda não está conectada à rota de avaliação descrita em [docs/api.md](api.md). Nada disso vem de sensor, relógio ou da NASA.

## Páginas e arquivos

| Página | HTML | CSS próprio | JS |
| --- | --- | --- | --- |
| Painel da astronauta (áreas, sono, avaliação, check-in) | `templates/index.html` | `static/css/painel.css` | `static/js/dashboard.js`, `static/js/chart.js` |
| Visão da equipe médica (prévia) | `templates/equipe-medica.html` | `static/css/equipe-medica.css` | `static/js/equipe-medica.js` |

Compartilhados: `static/css/style.css` (tokens, tema, cabeçalho, rodapé, selos de estado), `static/js/tema.js`, `static/js/formato.js` (datas, durações e rótulos dos estados) e `static/js/dados-demo.js` (dados fictícios).

O gráfico é SVG desenhado em `chart.js`, sem biblioteca externa: funciona offline e acompanha o tema. Os mesmos dados ficam numa tabela, para leitores de tela.

## Como abrir e testar

Abra `templates/index.html` com o Live Server. Para ver cada estado, acrescente ao endereço:

| Endereço | Estado |
| --- | --- |
| `index.html` | Dados disponíveis (10 noites, 3 alteradas, avaliação amarela) |
| `index.html?simular=carregando` | Carregando (a resposta nunca chega) |
| `index.html?simular=vazio` | Sem registros de sono |
| `index.html?simular=insuficiente` | 2 noites: dados insuficientes para avaliar |
| `index.html?simular=erro` | 1ª carga funciona; a atualização seguinte (10 s) falha e os dados anteriores continuam na tela, com o horário |
| `index.html?simular=erro-inicial` | Falha já na primeira carga |

Os mesmos parâmetros funcionam em `equipe-medica.html`. O check-in feito na tela fica só na memória da aba (some ao recarregar), aparece no gráfico com contorno tracejado e é marcado como "ainda não avaliado": o front não recalcula a avaliação.

## O que o front faz e o que não faz

- Mostra estado, explicação, dados que motivaram, regra usada, orientação e reavaliação **exatamente como vierem dos dados**. Não aplica regra clínica nem calcula cor.
- Todo estado tem texto e ícone de formato próprio, além da cor. "Dados insuficientes" e "Sem registros" nunca aparecem como verde.
- A visão médica mostra só os campos marcados como compartilháveis. Respostas detalhadas do check-in e diário ficam de fora até a equipe definir a política.
- Validação do check-in no navegador é só para ajudar quem preenche; o servidor precisa validar de novo.

## Proposta de dados para a API (a combinar com o back-end)

Os nomes abaixo são os que `dados-demo.js` usa hoje. São uma **proposta**: se o back-end preferir outros, basta ajustar `dados-demo.js`/a troca por `fetch()`; `dashboard.js` e `equipe-medica.js` leem só estes campos.

**Caso de sono da astronauta** (hoje `RagaDados.buscarCasoSono()`; rota sugerida `GET /api/astronautas/<id>/sono`):

```json
{
  "atualizado_em": "2026-11-14T18:16:00-03:00",
  "astronauta": { "id": 1, "nome": "Íris Andrade", "ficticia": true, "missao": "Missão simulada Raga-1", "dia_missao": 142 },
  "estado_geral": { "estado": "insuficiente", "explicacao": "..." },
  "areas": [ { "id": "sono", "nome": "Sono", "estado": "amarelo", "resumo": "..." } ],
  "sono": {
    "referencia": { "minimo_min": 420, "maximo_min": 480, "descricao": "..." },
    "noites": [ { "id": 8, "noite": "2026-11-11", "duracao_min": 322, "qualidade": 2, "registrado_em": "...", "origem": "simulada" } ],
    "avaliacao": {
      "estado": "amarelo", "explicacao": "...", "regra": "...", "noites_usadas": [8, 9, 10],
      "avaliado_em": "...", "orientacao": "...", "orientacao_origem": "...", "reavaliar_em": "..."
    }
  }
}
```

- `estado`: `verde` | `amarelo` | `vermelho` | `insuficiente` | `sem_registros`.
- `noites` em ordem cronológica; lista vazia quando não há registros. `avaliacao` é `null` quando não houve avaliação.
- `noite` é a data em que a noite começou; horários em ISO 8601 com fuso.

**Check-in da manhã** (hoje `RagaDados.enviarCheckinSono()`; rota sugerida `POST /api/astronautas/<id>/sono/checkins`): envia `{ "noite": "2026-11-13", "duracao_min": 400, "qualidade": 3 }`. Precisamos combinar a resposta de sucesso e o formato de erro de validação.

**Visão médica** (hoje `RagaDados.buscarVisaoMedica()`): `atualizado_em`, `ordem` (texto explicando o critério), `tripulantes` (`nome`, `ficticio`, `area`, `estado`, `motivo`, `dados_compartilhados`, `avaliado_em`, `reavaliar_em`) e `nao_exibido` (lista do que fica oculto).

## Depende do back-end

- Rotas, códigos HTTP e formato de erro das três operações acima.
- Regras oficiais de classificação, linha de base, orientação e prazo de reavaliação (hoje são exemplos do PDF norte escritos à mão).
- Gravação real do check-in, com validação no servidor, e recálculo da avaliação.
- Política de acesso da visão médica e controle por perfil.
- Rotas Flask para servir as páginas. Com os caminhos relativos `../static/`, cada página precisa de rota de um só nível: `/` para o painel e `/equipe-medica.html` para a visão médica (o link entre as páginas usa esse nome).
