# Diário privado por padrão — contexto para o back-end

Contexto original: Andrew (front-end), 14/11/2026. Atualizado após a integração com o back-end.

## Decisão

O diário do check-in da noite passa a ser **privado por padrão**. O astronauta escolhe, em cada registro, se compartilha o texto com o psicólogo da missão. As respostas de 1 a 5 (humor, estresse, convivência) continuam sempre visíveis para a equipe médica, porque a regra de Mente e equipe usa só esses números.

Por quê:

- O PDF norte diz que, na NASA, as conversas com o psicólogo são confidenciais e não são gravadas; o `AGENTS.md` pede para não presumir acesso da equipe médica ao diário.
- Se o astronauta sabe que tudo o que escreve é lido pela equipe que decide se ele está apto, ele tende a se autocensurar, e o diário perde valor.
- Dado de saúde mental é sensível; compartilhar deve depender de consentimento explícito.
- No pitch, mostra que o Raga mantém o astronauta no controle dos próprios dados.

## Comportamento atual

- `checkins.html` tem a caixa **"Share this entry with the mission psychologist"**, desmarcada por padrão.
- **Desmarcada:** o front envia `"diario": ""` e `"diario_compartilhado": false` no `POST /api/astronautas/<id>/mente/checkins` e guarda o texto só no `sessionStorage` da aba. O texto não sai do navegador.
- **Marcada e com texto:** o front envia o texto e `"diario_compartilhado": true`.
- O servidor também descarta textos recebidos sem consentimento e omite diários não compartilhados das duas consultas da API.
- Na visão médica, um diário sem texto visível aparece como "Journal: not shared or not provided". A API não informa se houve um texto privado.

O campo omitido equivale a `false`: clientes antigos não compartilham textos até serem atualizados.

## Limitações atuais

1. **"Não compartilhado" e "não escrito" ficam iguais no servidor** (os dois são `""`). A visão médica não sabe se havia diário privado.
2. **Textos anteriores à migração** permanecem no banco, mas ficam ocultos por falta de prova de consentimento; a equipe deve decidir seu destino.
3. **Não existe papel de psicólogo:** o que for compartilhado aparece na visão médica para qualquer pessoa com acesso ao servidor. A tela avisa isso.
4. O servidor local não tem autenticação. Diários compartilhados ficam disponíveis a qualquer pessoa com acesso à API; use somente dados fictícios.

## Trabalho de integração

| # | Mudança | Arquivos |
| --- | --- | --- |
| 1 | Coluna de consentimento e migração que preserva textos antigos ocultos. | `schema.sql`, `database.py` |
| 2 | API valida consentimento, descarta textos privados novos e filtra as respostas. | `app.py`, `database.py` |
| 3 | A visão médica não presume que um diário privado foi escrito. | `equipe-medica.js` |
| 4 | Dados fictícios para demonstrar as duas situações. | `data/indicadores-ficticios.json`, carga |
| 5 | Testes de privacidade e migração. | `tests/test_api_checkins.py` |
| 6 | Contrato atualizado. | `docs/api.md` |

Escolhemos não transmitir um indicador de que foi escrito um diário privado. Assim, a visão médica não recebe nem mesmo essa informação; não é possível distinguir ausência de escrita e texto privado no servidor.

Fora do escopo do hackathon, mas vale citar no pitch como próximo passo: papel de psicólogo com acesso próprio (autenticação e controle por papel), para que o compartilhado vá só para ele e não para toda a equipe médica.
