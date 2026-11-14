# Project Raga

Protótipo de apoio ao acompanhamento da saúde física e mental de astronautas em missões longas. O desafio é reunir indicadores, ajudar a perceber mudanças e orientar o acompanhamento mesmo sem comunicação imediata com a Terra. A referência da equipe é [Project Raga: o norte do projeto](docs/Project%20Raga%20-%20Norte%20do%20projeto.pdf), versão 2 de 14/11/2026. O planejamento anterior focado apenas em frequência cardíaca foi substituído.

O ciclo planejado é **medir → comparar com a linha de base individual → classificar → recomendar → reavaliar**. O protótipo abrange sono, coração, mente, exercício e cognição, com cinco telas: painel, detalhe de área, check-ins/teste, alertas/recomendações e visão médica. Usará somente dados fictícios; integração real com sensores, diagnóstico e modelos complexos de IA estão fora do escopo do hackathon. Funcionamento a bordo e orientações são objetivos do projeto, não capacidades já verificadas.

## Comece por aqui

- [Norte e planejamento detalhado](docs/raga.md): problema, ciclo, telas, privacidade, decisões e demonstração.
- [Divisão da equipe](docs/equipe.md): responsabilidades propostas para dois integrantes de back-end e dois de front-end.
- [API e integração](docs/api.md): situação atual e necessidades a combinar.
- [Dados e armazenamento](docs/dados.md): formato dos dados fictícios e funções disponíveis.
- [Fundamentação e fontes](docs/fundamentacao-e-proximos-passos.md): evidências, limitações e afirmações a verificar.
- [Instruções para agentes](AGENTS.md): regras compartilhadas para pessoas e IAs.

## Estado real do repositório

- `database.py` e `schema.sql` implementam leituras numéricas e armazenamento de astronautas fictícios, linha de base e registros de sono. As demais áreas, alertas e ciclo completo ainda não estão modelados.
- `app.py` serve o painel, check-ins, teste de reação e visão médica. Oferece histórico, avaliações retrospectivas, check-ins fictícios de sono e mente e consulta para a visão médica, além da rota antiga de leitura recente. Esta última usa por engano `astrounata_id`, enquanto o contrato anterior usa `astronauta_id`. A API ainda está incompleta.
- `avaliacao_sono.py` implementa uma regra ilustrativa para duração do sono; `servico_sono.py` conecta a avaliação aos dados salvos. Detalhes em [API e integração](docs/api.md).
- O painel, os check-ins de sono e mente e a visão médica usam a API quando disponível; o teste de reação ainda usa dados fictícios locais. As respostas e o diário fictício são gravados e disponibilizados na visão médica. Sem autenticação ou controle por papel, qualquer pessoa com acesso ao servidor pode consultá-los. Ver [front-end — caso de sono](docs/front-caso-sono.md). `simulator.py` é apenas um esboço.
- Nenhum ciclo completo do Raga, controle de acesso, notificação, execução de reavaliação ou integração com sensores está implementado. Não se deve anunciar o produto como operacional ou validado.

## Preparação e verificação do código existente

Com Python e PowerShell, na pasta do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python database.py
python database.py --carregar-ficticios
python -m unittest discover -s tests
```

`database.py` cria `instance/saude.db` sem apagar leituras existentes; `--carregar-ficticios` carrega explicitamente o JSON de exemplo, de forma idempotente e transacional. Conflitos interrompem a carga; não apague dados existentes para resolvê-los sem revisão. Bancos antigos com noites duplicadas podem impedir a criação do índice. O banco local não deve ser versionado. `python app.py` inicia o Flask; acesse `http://127.0.0.1:5000/`, ou use `/?data=2026-11-10` para o caso amarelo. As avaliações são cálculos retrospectivos, não eventos agendados. Sem dados fictícios carregados, a API pode retornar 404. As rotas não têm autenticação: use somente dados fictícios em ambiente local. O ciclo completo não está implementado.

O PDF norte presente no repositório é a versão 2 e descreve cinco áreas. Parte do front menciona uma versão 3 e inclui Metabolismo como sexta área demonstrativa; a equipe precisa confirmar essa divergência de escopo.

Não coloquem dados reais de saúde, credenciais, ambientes virtuais ou bancos locais no repositório. O software é um protótipo de apoio, não um diagnóstico ou ferramenta clínica validada.
