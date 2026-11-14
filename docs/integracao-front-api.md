# Integração front-end ↔ API — o que falta no back-end

Para: back-end (Alan e Rodrigo). Do: front-end (Andrew).

## Próximos passos recomendados (14/11, noite — prazo 15/11 às 23h59)

Já feito no back-end: páginas `/`, `/index.html` e `/equipe-medica.html`; `GET .../sono/registros` (sem `observacao`, até definir a política); `GET .../sono/avaliacao`. Já feito no front: painel com 6 áreas (PDF norte v3), check-in da manhã, **página nova do check-in da noite**, visão médica, e cores de exemplo nas áreas sem API (marcadas como "exemplo local").

A ordem abaixo prioriza o que faz a **demonstração pelo Flask** funcionar com dados do servidor. A sugestão de quem faz segue os commits recentes; combinem entre vocês.

| Prioridade | Tarefa | Quem (sugestão) | Esforço | Por que agora |
| --- | --- | --- | --- | --- |
| **1** | Rotas `/checkins.html` e `/teste-reacao.html` (seções 6 e 7) | API (Alan) | 6 linhas | Hoje os links "Check-ins" e "Teste de reação" do menu dão **404 no Flask**. O formulário da manhã saiu do painel e está em `checkins.html` |
| **2** | Comando para rodar `database.carregar_dados_ficticios(conexao)`, que já existe (ex.: `python carregar_dados_ficticios.py` ou uma opção em `database.py`) | Dados (Rodrigo) | poucas linhas | Sem um comando, quem for apresentar não consegue preencher o banco, e o painel no Flask mostra "Astronauta não encontrado" |
| **3** | `POST .../sono/registros` com `409` para data repetida (seção 4) | API (Alan) | rota + testes | Fecha o caso de sono de ponta a ponta: check-in → avaliação nova. Hoje a tela avisa que o servidor ainda não grava |
| **4** | Tabela `checkins_noite` + `GET`/`POST .../mente/checkins` (seção 6) | Dados + API | tabela, 2 funções, 2 rotas | Leva a saúde mental para o servidor. **Sem campo de diário** |
| 5 | Se der tempo: rota `/teste-reacao.html` + `GET`/`POST .../cognicao/testes` (seção 7); histórico de avaliações, API da visão médica, regras de outras áreas (seção 5) | — | maior | Hoje usam dados locais com aviso; não bloqueiam a demonstração. A rota da página (3 linhas) vale fazer junto com a prioridade 1, para o link não dar 404 |

Fora do código, também antes da entrega:

- **Atualizar `docs/raga.md` e colocar o PDF norte v3 no repositório.** O repositório ainda descreve 5 áreas; o v3 tem 6 (Metabolismo) e as 4 fases da missão. O AGENTS.md manda seguir o norte.
- **Fixar a versão do Flask** em `requirements.txt`. O front foi testado com Flask 3.1.3 e os 18 testes passaram.
- **Rota antiga `/api/leituras/recentes`** (com `astrounata_id`): o front não usa mais. Corrigir ou remover, e registrar em `api.md`.
- **Confirmar com a organização** o uso de recurso da NASA e como declarar o uso de IA na submissão ([fundamentação](fundamentacao-e-proximos-passos.md)).
- **Regras de outras áreas**, se forem feitas: o PDF dá exemplos ("oxigênio baixo → vermelho", "exercício abaixo de 2 h → amarelo"). Documentem origem e limites, como no sono; vermelho não espera reavaliação.

**Como conferir cada passo:** rode `python app.py`, abra `http://127.0.0.1:5000/` e olhe a linha abaixo do título. "Dados do servidor do Raga" quer dizer que a rota respondeu; "A API não respondeu" quer dizer que alguma rota ainda falta. Detalhes no fim deste documento.

## Histórico desta integração

As páginas Flask e o `GET .../sono/registros` foram implementados a partir das seções abaixo; os exemplos registram a proposta original e o contrato vigente está em [api.md](api.md).

O front já está ligado à API. `static/js/dados-api.js` chama as rotas abaixo; se uma rota ainda não existir, a página usa os dados fictícios locais (`dados-demo.js`) **e avisa na tela** que eles não vieram do servidor. Por isso nada quebra enquanto as rotas não chegam, e cada rota nova passa a ser usada sozinha, sem mudar o front.

Todo o fluxo abaixo foi testado de ponta a ponta com o `app.py` atual (rota de avaliação do Alan) mais as rotas sugeridas, num servidor temporário fora do repositório: banco temporário com `data/astronautas-ficticios.json`, painel servido pelo Flask, avaliação de 10/11 em amarelo, check-in gravado e avaliação refeita. Os 18 testes existentes continuam passando. **O `app.py` do repositório não foi alterado.**

## Lista original (referência)

| # | Tarefa | Por quê | Sem isso |
| --- | --- | --- | --- |
| 1 | Rotas que servem as páginas (`/` e `/equipe-medica.html`) — implementadas | O painel e a API usam a mesma origem | — |
| 2 | Script que carrega o JSON fictício no banco | Hoje o banco começa vazio; o JSON só é usado nos testes | API responde, mas sem astronauta: 404 |
| 3 | `GET /api/astronautas/<id>/sono/registros` — implementado | Astronauta, linha de base e histórico para o gráfico e a tabela | — |
| 4 | `POST /api/astronautas/<id>/sono/registros` | Gravar o check-in da manhã | Check-in fica só na aba |
| 4b | Rota `/checkins.html` e `GET`/`POST /api/astronautas/<id>/mente/checkins` (seção 6) | Página nova do check-in da noite (saúde mental) | Página usa dados locais, com aviso |
| 5 | (Depois) histórico de avaliações e visão médica | Mostrar o ciclo indicação → reavaliação e a lista da equipe médica com dados reais | Essas partes seguem com dados locais, com aviso |

A rota de avaliação (`GET /api/astronautas/<id>/sono/avaliacao?data=AAAA-MM-DD`) já existe e o front usa exatamente o formato documentado em [api.md](api.md).

## 1. Servir as páginas

Os HTML usam caminhos relativos (`../static/...`), que funcionam no Live Server e no Flask **desde que cada página tenha rota de um só nível**. O link entre as páginas usa o nome `equipe-medica.html`.

```python
from flask import render_template

@app.get('/')
def pagina_painel():
    return render_template('index.html')

@app.get('/equipe-medica.html')
def pagina_equipe_medica():
    return render_template('equipe-medica.html')
```

Os HTML não têm `{{ }}`, então `render_template` os entrega como estão. A pasta `static/` já é servida pelo Flask em `/static/`.

## 2. Carregar os dados fictícios

Sugestão: `carregar_dados_ficticios.py`, rodado uma vez depois de `python database.py`. Sem apagar dados: se a astronauta já existir, não carrega de novo.

```python
"""Carrega data/astronautas-ficticios.json no banco local (dados fictícios)."""
import json
from pathlib import Path
import database

def carregar(caminho=database.CAMINHO_BANCO):
    database.inicializar_banco(caminho)
    dados = json.loads((Path(__file__).parent / 'data' / 'astronautas-ficticios.json').read_text(encoding='utf-8'))
    conexao = database.conectar_banco(caminho)
    try:
        for pessoa in dados['astronautas']:
            if conexao.execute('SELECT 1 FROM astronautas WHERE id = ?', (pessoa['id'],)).fetchone():
                continue  # já carregada: não duplica
            database.salvar_astronauta(conexao, {c: pessoa[c] for c in ('id', 'identificacao', 'nome_exibicao', 'origem')})
            database.salvar_linha_base_sono(conexao, {'astronauta_id': pessoa['id'], **pessoa['linha_base_sono']})
            for registro in pessoa['registros_sono']:
                database.salvar_registro_sono(conexao, {'astronauta_id': pessoa['id'], **registro})
    finally:
        conexao.close()

if __name__ == '__main__':
    carregar()
    print('Dados fictícios carregados em instance/saude.db.')
```

## 3. `GET /api/astronautas/<id>/sono/registros`

Resposta `200`:

```json
{
  "astronauta": { "id": 1, "identificacao": "RAGA-AST-001", "nome_exibicao": "Comandante Aurora", "origem": "ficticia" },
  "linha_base": { "astronauta_id": 1, "duracao_media_horas": 7.5, "qualidade_media": 4.0, "periodo_inicio": "...", "periodo_fim": "...", "origem": "simulada" },
  "registros": [
    { "id": 4, "astronauta_id": 1, "noite_em": "2026-11-08T00:00:00-03:00", "inicio_sono": "2026-11-07T23:50:00-03:00", "fim_sono": "2026-11-08T05:50:00-03:00", "duracao_horas": 6.0, "qualidade": 2, "interrupcoes": 4, "origem": "simulada", "observacao": "..." }
  ]
}
```

- `astronauta`: linha da tabela `astronautas` (falta uma função `buscar_astronauta` em `database.py`; hoje dá para usar SQL parametrizado direto).
- `linha_base`: `buscar_linha_base_sono()` ou `null`.
- `registros`: `buscar_historico_sono()` — cronológico, `[]` se vazio.
- Erros no formato que vocês já usam: `404 {"erro": "Astronauta não encontrado."}`, `503 {"erro": "Banco indisponível."}`.
- **Decisão para vocês:** `observacao` vai para o painel? Hoje o front não mostra; se for texto livre do astronauta, combinar a política de privacidade antes.

Exemplo testado:

```python
@app.get('/api/astronautas/<int:astronauta_id>/sono/registros')
def listar_registros_sono(astronauta_id):
    try:
        conexao = database.conectar_banco(Path(app.config['CAMINHO_BANCO']))
        try:
            linha = conexao.execute(
                'SELECT id, identificacao, nome_exibicao, origem FROM astronautas WHERE id = ?',
                (astronauta_id,)).fetchone()
            if not linha:
                return jsonify(erro='Astronauta não encontrado.'), 404
            return jsonify(
                astronauta=dict(zip(('id', 'identificacao', 'nome_exibicao', 'origem'), linha)),
                linha_base=database.buscar_linha_base_sono(conexao, astronauta_id),
                registros=database.buscar_historico_sono(conexao, astronauta_id))
        finally:
            conexao.close()
    except sqlite3.Error:
        return jsonify(erro='Banco indisponível.'), 503
```

Se o banco ainda não existir, vale responder `503` como a rota de avaliação faz (ela confere `caminho.is_file()` antes).

## 4. `POST /api/astronautas/<id>/sono/registros`

O check-in envia (`Content-Type: application/json`):

```json
{
  "noite_em": "2026-11-12T00:00:00-03:00",
  "inicio_sono": "2026-11-11T23:10:00-03:00",
  "fim_sono": "2026-11-12T06:40:00-03:00",
  "duracao_horas": 7.5,
  "qualidade": 4,
  "interrupcoes": 1
}
```

- `noite_em` = data do despertar às 00:00 (como no JSON do Rodrigo); horários com o fuso do navegador.
- `duracao_horas` é calculada pelo front a partir dos horários; o servidor pode recalcular de `inicio_sono`/`fim_sono` em vez de confiar nela.
- `origem` (`"autorrelato"`) e `astronauta_id` são definidos pelo servidor, não pelo navegador.

Respostas que o front já trata:

| Código | Corpo | O front mostra |
| --- | --- | --- |
| `201` | `{"registro": {...salvo, com id}}` | "Check-in salvo no servidor" e recarrega o painel |
| `400` | `{"erro": "..."}` | A mensagem do servidor ao lado do formulário |
| `404` / `409` / `503` | `{"erro": "..."}` | Idem |

Validações sugeridas (o front já faz as mesmas, mas o servidor precisa repetir):

- todos os campos presentes; `salvar_registro_sono()` já valida fuso, `fim_sono > inicio_sono`, números e `interrupcoes ≥ 0` — repassar o `ValueError` como `400`;
- `qualidade` inteira de 1 a 5 (**escala ainda em aberto em [dados.md](dados.md)**; o formulário usa 1 a 5);
- `duracao_horas` entre 0 e 16;
- **uma noite por data de despertar**: `servico_sono.py` recusa datas duplicadas com `ValueError`, então o POST deve responder `409 {"erro": "Já existe registro para esta data de despertar."}` antes de gravar. Sem isso, um segundo check-in no mesmo dia faz a avaliação responder `422` para sempre.

## 5. Depois (não urgente)

- **Histórico de avaliações**: hoje a API calcula na hora e não guarda nada. Para mostrar "10/11 indicação amarela → 11/11 reavaliação verde" com dados reais, o front precisa de uma lista (ex.: `GET .../sono/avaliacoes`, cada item no formato da rota de avaliação). Nos dados locais o front já mostra esse ciclo com `?simular=reavaliado`.
- **Visão médica**: `GET /api/equipe-medica/sono` com `tripulantes` (formato em [front-caso-sono.md](front-caso-sono.md)). Depende da política de acesso; sem autenticação, só dados fictícios em ambiente local.
- **Outras áreas e estado geral**: o front mostra Coração, Mente, Exercício, Cognição e Metabolismo (6ª área do PDF norte v3) como "sem registros" e não calcula o estado geral.

## 6. Check-in da noite (Mente e equipe) — novo

Os dois check-ins (manhã e noite) ficam juntos em `templates/checkins.html` (CSS e JS próprios), em seções separadas, cada uma com formulário e histórico. A página é ligada pelo menu e pelos cartões do painel. Cada parte decide a própria fonte: a manhã já usa as rotas de sono; a noite usa as rotas abaixo. Enquanto as rotas abaixo não existirem, ela usa dados locais com aviso, como as outras.

**Rota da página** (mesmo padrão das outras, um só nível):

```python
@app.get('/checkins.html')
def pagina_checkin_noite():
    return render_template('checkins.html')
```

**`GET /api/astronautas/<id>/mente/checkins`** → `200`:

```json
{
  "astronauta": { "id": 1, "identificacao": "RAGA-AST-001", "nome_exibicao": "Comandante Aurora", "origem": "ficticia" },
  "checkins": [
    { "id": 3, "data": "2026-11-10", "humor": 3, "estresse": 4, "convivencia": 3, "registrado_em": "2026-11-10T22:05:00-03:00", "origem": "simulada" }
  ]
}
```

**`POST /api/astronautas/<id>/mente/checkins`** recebe `{"data": "AAAA-MM-DD", "humor": 1-5, "estresse": 1-5, "convivencia": 1-5, "registrado_em": "ISO com fuso"}` e responde `201 {"checkin": {...}}`. Erros no formato `{"erro": "..."}` (`400`, `404`, `409` para data repetida, `503`). `origem` = `"autorrelato"`, definido pelo servidor.

- **Escalas**: humor e convivência, 5 = melhor; estresse, 5 = mais estresse. O front mostra número e palavra.
- **Diário**: o front **não envia** o diário. Ele fica só no `sessionStorage` da aba, até a equipe definir a política de privacidade (AGENTS.md e PDF: conversas psicológicas são confidenciais). Não criem campo de diário na API sem essa decisão.
- **Banco**: precisa de uma tabela nova (ex.: `checkins_noite`: `id`, `astronauta_id`, `data`, `humor`, `estresse`, `convivencia`, `registrado_em`, `origem`), criada com `CREATE TABLE IF NOT EXISTS` para não apagar dados.
- **Regra**: não há regra de demonstração para Mente e equipe; a página diz isso e não mostra cor. Se criarem uma (PDF: "humor em queda ou atrito por vários dias → amarelo"), o retorno pode seguir o formato da avaliação de sono.

## 7. Teste de reação (Cognição) — novo

Página `templates/teste-reacao.html` (CSS e JS próprios), inspirada no PVT da bateria Cognition. **Não é o PVT validado.** Ligada pelo menu e pelo cartão "Cognição" do painel; usa dados locais com aviso enquanto as rotas não existirem.

**Rota da página:** `@app.get('/teste-reacao.html')` → `render_template('teste-reacao.html')`.

**`GET /api/astronautas/<id>/cognicao/testes`** → `200`:

```json
{
  "astronauta": { "id": 1, "identificacao": "RAGA-AST-001", "nome_exibicao": "Comandante Aurora", "origem": "ficticia" },
  "linha_base_ms": 285,
  "testes": [
    { "id": 3, "realizado_em": "2026-11-10T08:12:00-03:00", "tentativas": 10, "mediana_ms": 286, "mais_rapida_ms": 248, "mais_lenta_ms": 371, "acima_500ms": 0, "antecipacoes": 0, "origem": "simulada" }
  ]
}
```

**`POST /api/astronautas/<id>/cognicao/testes`** recebe os mesmos campos de um teste (sem `id` e `origem`) mais `tempos_ms` (lista com os tempos de cada tentativa) e responde `201 {"teste": {...}}`. O servidor deve recalcular mediana, mínimo, máximo e contagem acima de 500 ms a partir de `tempos_ms`, em vez de confiar nos números enviados.

- O front conta como **antecipação** a resposta antes do sinal ou em menos de 100 ms (convenção do PVT) e repete a tentativa.
- `linha_base_ms` é fictícia (285 ms). Não há regra para Cognição: o front mostra a diferença para a linha de base, sem cor. Se criarem regra (PDF: "queda no teste de atenção → amarelo"), documentem origem e limites.
- **Banco**: tabela nova (ex.: `testes_reacao`), criada com `CREATE TABLE IF NOT EXISTS`.

## Como testar a ligação

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python database.py
python app.py
```

O script sugerido neste documento ainda não existe. A função `database.carregar_dados_ficticios(conexao)` permite a carga explícita, conforme [dados.md](dados.md); um banco recém-criado não contém astronautas.

Abrir `http://127.0.0.1:5000/`:

- A linha logo abaixo do título deve dizer **"Dados do servidor do Raga"**. Se disser "A API não respondeu", alguma rota está faltando.
- `http://127.0.0.1:5000/?data=2026-11-10` mostra o alerta amarelo do cenário (três noites hachuradas no gráfico).
- Quando o POST estiver implementado, testar um check-in persistido e a atualização da avaliação. Hoje o envio em modo API falha.
- `?fonte=demo` força os dados locais (útil para a apresentação se o servidor cair).
