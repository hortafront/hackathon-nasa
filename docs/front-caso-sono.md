# Front-end — caso de sono

Primeira entrega do front-end do Raga: o caso de três noites de sono alterado ([docs/raga.md](raga.md)), da astronauta fictícia ao check-in e à prévia da visão médica. `static/js/dados-api.js` liga a interface à API Flask; quando uma rota ainda não existe, usa os dados fictícios locais de `static/js/dados-demo.js` e avisa na tela. O que falta no back-end está em [integracao-front-api.md](integracao-front-api.md). Nada disso vem de sensor, relógio ou da NASA.

## Páginas e arquivos

| Página | HTML | CSS próprio | JS |
| --- | --- | --- | --- |
| Painel da astronauta (áreas, sono, avaliação, check-in) | `templates/index.html` | `static/css/painel.css` | `static/js/dashboard.js`, `static/js/chart.js` |
| Visão da equipe médica (prévia) | `templates/equipe-medica.html` | `static/css/equipe-medica.css` | `static/js/equipe-medica.js` |
| Check-in da noite (Mente e equipe) | `templates/checkin-noite.html` | `static/css/checkin-noite.css` | `static/js/checkin-noite.js` |

Formulários, escalas de 1 a 5 e botão ficam no `style.css` (seção 7b), porque os dois check-ins usam.

**Cores das outras áreas (exemplos):** Coração em vermelho, Mente e equipe em amarelo, Exercício, Cognição e Metabolismo em verde. São valores **escritos à mão** em `dados-demo.js` a partir da tabela "Do sinal à ação" do PDF norte v3, para a demonstração mostrar as três cores. Não existe regra no back-end para essas áreas, e os números não são limites clínicos. No modo API, o Sono vem do servidor e as outras áreas aparecem com o aviso "Exemplo local, sem API para esta área". Quando há área em vermelho, o painel mostra um aviso para procurar a equipe médica imediatamente, sem esperar a reavaliação (nenhum aviso é enviado de verdade). A visão médica mostra um tripulante de cada cor. O painel segue o PDF norte v3: seis áreas (Metabolismo incluída, ainda sem dados) e fase da missão "durante".

Compartilhados: `static/css/style.css` (tokens, tema, cabeçalho, rodapé, selos de estado), `static/js/tema.js`, `static/js/formato.js` (datas, durações e rótulos dos estados), `static/js/dados-api.js` (chamadas à API e escolha da fonte) e `static/js/dados-demo.js` (dados fictícios locais).

O gráfico é SVG desenhado em `chart.js`, sem biblioteca externa: funciona offline e acompanha o tema. Os mesmos dados ficam numa tabela, para leitores de tela.

## Como abrir e testar

**Com a API:** rode o Flask e abra `http://127.0.0.1:5000/`. O banco precisa ter sido preenchido com dados fictícios; há uma função de carga em [dados.md](dados.md), mas ainda não um comando próprio. A linha abaixo do título diz de onde vêm os dados. `?data=2026-11-10` avalia essa data (mostra o alerta amarelo do cenário); sem ela, avalia o despertar mais recente. `?fonte=demo` força os dados locais.

**Sem a API:** abra `templates/index.html` com o Live Server. A página avisa que está usando os dados locais. Para ver cada estado, acrescente ao endereço (estes parâmetros sempre usam os dados locais):

| Endereço | Estado |
| --- | --- |
| `index.html` | Alerta de 10/11: 6 noites, 3 alteradas, avaliação amarela com orientação e reavaliação prevista |
| `index.html?simular=reavaliado` | Ciclo completo: inclui a noite de 11/11 e a reavaliação verde, com o acompanhamento indicação → reavaliação |
| `index.html?simular=carregando` | Carregando (a resposta nunca chega) |
| `index.html?simular=vazio` | Sem registros de sono |
| `index.html?simular=insuficiente` | 2 noites: dados insuficientes para avaliar |
| `index.html?simular=erro` | 1ª carga funciona; a atualização seguinte (10 s) falha e os dados anteriores continuam na tela, com o horário |
| `index.html?simular=erro-inicial` | Falha já na primeira carga |

Os mesmos parâmetros funcionam em `equipe-medica.html`. Com dados locais, o check-in fica só na memória da aba (some ao recarregar), aparece no gráfico com contorno tracejado e é marcado como "ainda não avaliado": o front não recalcula a avaliação. O POST de check-in ainda não existe; em modo API, o envio falha até sua implementação.

Depois que a API respondeu uma vez, uma falha seguinte não troca para os dados locais: a tela mantém os últimos dados, mostra o horário e a mensagem de erro da API.

## O que o front faz e o que não faz

- Mostra estado, explicação, dados que motivaram, regra usada, orientação e reavaliação **exatamente como vierem dos dados**. Não aplica regra clínica nem calcula cor.
- Todo estado tem texto e ícone de formato próprio, além da cor. "Dados insuficientes" e "Sem registros" nunca aparecem como verde.
- A visão médica mostra só os campos marcados como compartilháveis. Respostas detalhadas do check-in e diário ficam de fora até a equipe definir a política.
- Validação do check-in no navegador é só para ajudar quem preenche; o servidor precisa validar de novo.

## Proposta de dados para a API (a combinar com o back-end)

Os nomes seguem o que o back-end já tem: astronauta, linha de base e registros vêm de `schema.sql`/[docs/dados.md](dados.md); cada avaliação é a saída de `avaliar_sono()` em `avaliacao_sono.py` ([docs/api.md](api.md)). Os valores de `dados-demo.js` são uma cópia de `data/astronautas-ficticios.json`. O que ainda é **proposta do front** está marcado abaixo. Quando a rota existir, basta trocar `dados-demo.js` por `fetch()`; `dashboard.js` e `equipe-medica.js` leem só estes campos.

**Caso de sono da astronauta** (hoje `RagaDados.buscarCasoSono()`; rota sugerida `GET /api/astronautas/<id>/sono`):

```json
{
  "atualizado_em": "2026-11-14T18:16:00-03:00",
  "astronauta": { "id": 1, "identificacao": "RAGA-AST-001", "nome_exibicao": "Comandante Aurora", "origem": "ficticia" },
  "estado_geral": { "estado": "dados_insuficientes", "explicacao": "..." },
  "areas": [ { "id": "sono", "nome": "Sono", "estado": "amarelo", "resumo": "..." } ],
  "sono": {
    "linha_base": { "duracao_media_horas": 7.5, "qualidade_media": 4.0, "periodo_inicio": "...", "periodo_fim": "...", "origem": "simulada" },
    "registros": [ { "id": 4, "noite_em": "2026-11-08T00:00:00-03:00", "inicio_sono": "...", "fim_sono": "...", "duracao_horas": 6.0, "qualidade": 2, "interrupcoes": 4, "origem": "simulada", "observacao": "..." } ],
    "avaliacoes": [ { "area": "sono", "data_avaliacao": "2026-11-10", "linha_base_horas": 7.5, "origem_regra": "demonstracao_nao_clinica", "estado": "amarelo", "noites_consideradas": [ { "data_sono": "2026-11-08", "duracao_horas": 6.0 } ], "explicacao": "...", "orientacao": "...", "reavaliar_em_horas": 24 } ]
  }
}
```

- `astronauta`, `linha_base` e `registros`: campos de `schema.sql`. `registros` em ordem cronológica, `[]` quando não há; `linha_base` é `null` quando não existe.
- `avaliacoes`: lista de saídas de `avaliar_sono()`, da mais antiga para a mais recente; a última é a atual; `[]` sem avaliação. **Proposta do front:** guardar o histórico de avaliações para mostrar o ciclo indicação → reavaliação.
- `estado_geral` e `areas`: **proposta do front**, ainda sem equivalente no back-end.
- Estados: `verde`, `amarelo`, `dados_insuficientes` (de `avaliar_sono()`); `vermelho` e `sem_registros` são propostas.
- A data do registro é a do despertar: como em `servico_sono.py`, o front usa a data de `fim_sono` (no fuso registrado) para ligar o registro ao `data_sono` da avaliação.
- `qualidade` aparece como número; a escala ainda está em aberto em [docs/dados.md](dados.md). O check-in usa 1 a 5.

**Check-in da manhã** (hoje `RagaDados.enviarCheckinSono()`; rota sugerida `POST /api/astronautas/<id>/sono/registros`): envia os campos de `salvar_registro_sono()` — `noite_em`, `inicio_sono`, `fim_sono`, `duracao_horas` (calculada pelos horários), `qualidade` e `interrupcoes`. `origem` e `astronauta_id` devem ser definidos pelo servidor. Precisamos combinar a resposta de sucesso e o formato de erro de validação.

**Visão médica** (hoje `RagaDados.buscarVisaoMedica()`): `atualizado_em`, `ordem` (texto explicando o critério), `tripulantes` (`identificacao`, `nome_exibicao`, `origem`, `area`, `estado`, `motivo`, `dados_compartilhados`, `data_avaliacao`, `reavaliar_em_horas`) e `nao_exibido` (lista do que fica oculto). Formato todo em proposta.

## Depende do back-end

- Rotas, códigos HTTP e formato de erro das três operações acima.
- Histórico de avaliações: a API calcula uma avaliação por data, mas não a persiste. As consultas de astronauta, linha de base e histórico de registros já existem em `GET /api/astronautas/<id>/sono/registros`.
- Carga dos dados fictícios no banco e POST de check-in com validação no servidor.
- Gravação real do check-in com `salvar_registro_sono()`, validação no servidor e nova avaliação.
- Execução e registro da reavaliação (hoje `reavaliar_em_horas` é só um prazo sugerido).
- Política de acesso da visão médica e controle por perfil.
- Rotas Flask para servir as páginas. Com os caminhos relativos `../static/`, cada página precisa de rota de um só nível: `/` para o painel e `/equipe-medica.html` para a visão médica (o link entre as páginas usa esse nome).
