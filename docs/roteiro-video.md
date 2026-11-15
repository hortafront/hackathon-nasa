# Roteiro para vídeo de até 30 segundos

Mostre o protótipo funcionando com dados fictícios. A gravação pode ser feita em tela cheia, sem mostrar terminal, informações pessoais ou outras abas. Os tempos abaixo deixam uma margem para cortes e pausas.

| Tempo | Imagem | Narração sugerida |
| --- | --- | --- |
| 0–5 s | Painel com as áreas acompanhadas. | “Em missões longas, acompanhar a saúde da tripulação é um desafio.” |
| 5–10 s | Identificação fictícia e cartões das áreas. | “O Project Raga reúne indicadores físicos e mentais em um painel.” |
| 10–18 s | Gráfico de sono e linha de base, no cenário de 10/11. | “Neste exemplo simulado, três noites ficaram abaixo da referência individual.” |
| 18–25 s | Avaliação amarela e orientação na seção de sono. | “O protótipo explica o sinal e sugere revisar os registros.” |
| 25–29 s | Acompanhamento de sono ou visão médica. | “A equipe pode registrar o acompanhamento e consultar a evolução.” |

Deixe visível durante o vídeo: **“Protótipo • dados fictícios • não é diagnóstico”**. Uma avaliação histórica representa apenas a data escolhida; não a apresente como situação atual. Verde indica apenas que a regra ilustrativa não foi acionada, não uma melhora clínica comprovada.

## Preparação antes de gravar

1. Siga as instruções do [README](../README.md) para instalar as dependências, inicializar o banco e carregar os dados fictícios. Uma carga pode apontar conflitos se o banco já tiver sido alterado; não apague o banco para resolvê-los sem combinar com a equipe.
2. Inicie o servidor com `python app.py` e abra `http://127.0.0.1:5000/?data=2026-11-10`. Confira se a origem indicada é o servidor, se o sono aparece em amarelo e se o gráfico mostra três noites abaixo da referência fictícia.
3. Abra também `http://127.0.0.1:5000/equipe-medica.html?data=2026-11-10` em outra aba. A data histórica precisa constar no endereço dessa página também.
4. Se quiser mostrar o acompanhamento persistido, registre a indicação de 10/11 e a revisão fictícia antes da gravação; para mostrar uma reavaliação, use o despertar de 11/11. O formulário de acompanhamento fica abaixo da avaliação no painel. Essas ações são demonstrações manuais, sem agendamento ou avisos reais.
5. Ensaie os enquadramentos e grave em trechos curtos para editar. Confira a duração final, o áudio, a legibilidade e se os rótulos de simulação aparecem.

O modo local `?fonte=demo` serve como reserva visual, mas não registra o acompanhamento no servidor e contém uma sexta área de exemplo pendente de confirmação. Para o roteiro acima, prefira o cenário da API com as cinco áreas do norte atual. Não alegue integração com sensores, notificações, diagnóstico ou segurança por perfil: essas capacidades não foram implementadas.
