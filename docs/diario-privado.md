# Diário privado por padrão — contexto para o back-end

Para: Alan (back-end). Do: Andrew (front-end). Data: 14/11/2026.

## Decisão

O diário do check-in da noite passa a ser **privado por padrão**. O astronauta escolhe, em cada registro, se compartilha o texto com o psicólogo da missão. As respostas de 1 a 5 (humor, estresse, convivência) continuam sempre visíveis para a equipe médica, porque a regra de Mente e equipe usa só esses números.

Por quê:

- O PDF norte diz que, na NASA, as conversas com o psicólogo são confidenciais e não são gravadas; o `AGENTS.md` pede para não presumir acesso da equipe médica ao diário.
- Se o astronauta sabe que tudo o que escreve é lido pela equipe que decide se ele está apto, ele tende a se autocensurar, e o diário perde valor.
- Dado de saúde mental é sensível; compartilhar deve depender de consentimento explícito.
- No pitch, mostra que o Raga mantém o astronauta no controle dos próprios dados.

## O que o front já faz (sem mudar a API)

- `checkins.html` tem a caixa **"Share this entry with the mission psychologist"**, desmarcada por padrão.
- **Desmarcada:** o front envia `"diario": ""` no `POST /api/astronautas/<id>/mente/checkins` (o campo continua obrigatório na API atual) e guarda o texto só no `sessionStorage` da aba. O texto **não sai do navegador**.
- **Marcada:** o front envia o texto, como hoje.
- `equipe-medica.js` mostra o texto apenas quando `diario` vem preenchido ("Journal shared by the astronaut"); vazio aparece como "Journal: not shared (private to the astronaut)".

Verificado com o `app.py` atual e banco temporário: um check-in privado gravou `diario: ""` no servidor (o texto não apareceu na API nem na visão médica); um compartilhado apareceu normalmente.

## Limitações enquanto a API não muda

1. **"Não compartilhado" e "não escrito" ficam iguais no servidor** (os dois são `""`). A visão médica não sabe se havia diário privado.
2. **Os dados fictícios de `data/indicadores-ficticios.json` têm texto no diário** (08 a 10/11), então aparecem como compartilhados.
3. **Não existe papel de psicólogo:** o que for compartilhado aparece na visão médica para qualquer pessoa com acesso ao servidor. A tela avisa isso.
4. Quem chamar a API diretamente ainda pode gravar e ler diários; a proteção hoje depende do front.

## O que recomendo no back-end

| # | Mudança | Arquivos |
| --- | --- | --- |
| 1 | Coluna `diario_compartilhado INTEGER NOT NULL DEFAULT 0` em `checkins_noite`, criada sem apagar dados (ex.: `ALTER TABLE ... ADD COLUMN` se ainda não existir, rodado por `python database.py`). | `schema.sql`, `database.py` |
| 2 | `POST .../mente/checkins` aceitar `diario_compartilhado` (booleano). Se `false`, gravar `diario` como `""` mesmo que venha texto — o servidor não deve guardar diário não compartilhado. | `app.py` |
| 3 | `GET /api/equipe-medica/sono`: em `checkins_noite`, devolver `diario` só quando `diario_compartilhado` for verdadeiro; nos outros, `diario: null` e `diario_compartilhado: false`. Assim a tela distingue "não compartilhado" de "não escrito". | `app.py` |
| 4 | Dados fictícios: marcar quais diários são compartilhados (sugiro um compartilhado e dois privados, para a demonstração mostrar os dois casos). | `data/indicadores-ficticios.json`, carga |
| 5 | Testes: diário não compartilhado não é gravado nem aparece na visão médica; compartilhado aparece. | `tests/test_api_checkins.py` |
| 6 | Atualizar a seção "Check-in da noite e visão médica fictícia" em `docs/api.md`. | `docs/api.md` |

Quando o item 2 existir, o front passa a enviar `"diario_compartilhado": true/false` junto (mudança de uma linha em `checkins.js`); me avise para trocar ao mesmo tempo, porque a API atual recusa campos extras.

Fora do escopo do hackathon, mas vale citar no pitch como próximo passo: papel de psicólogo com acesso próprio (autenticação e controle por papel), para que o compartilhado vá só para ele e não para toda a equipe médica.
