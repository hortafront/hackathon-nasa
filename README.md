# Project Raga

Protótipo de apoio ao acompanhamento da saúde física e mental de astronautas em missões longas. O desafio é reunir indicadores, ajudar a perceber mudanças e orientar o acompanhamento mesmo sem comunicação imediata com a Terra. A referência da equipe é [Project Raga: o norte do projeto](docs/Project%20Raga%20-%20Norte%20do%20projeto.pdf), versão 2 de 14/11/2026. O planejamento anterior focado apenas em frequência cardíaca foi substituído.

O ciclo planejado é **medir → comparar com a linha de base individual → classificar → recomendar → reavaliar**. O protótipo abrange sono, coração, mente, exercício e cognição, com cinco telas: painel, detalhe de área, check-ins/teste, alertas/recomendações e visão médica. Usará somente dados fictícios; integração real com sensores, diagnóstico e modelos complexos de IA estão fora do escopo do hackathon. Funcionamento a bordo e orientações são objetivos do projeto, não capacidades já verificadas.

## Comece por aqui

- [Norte e planejamento detalhado](docs/raga.md): problema, ciclo, telas, privacidade, decisões e demonstração.
- [Divisão da equipe](docs/equipe.md): responsabilidades propostas para dois integrantes de back-end e dois de front-end.
- [API e integração](docs/api.md): situação atual e necessidades a combinar.
- [Dados e armazenamento](docs/dados.md): formato dos dados fictícios e funções disponíveis.
- [Fundamentação e fontes](docs/fundamentacao-e-proximos-passos.md): evidências, limitações e afirmações a verificar.
- [Roteiro do vídeo de 30 segundos](docs/roteiro-video.md): preparação e sequência da demonstração.
- [Instruções para agentes](AGENTS.md): regras compartilhadas para pessoas e IAs.

## Estado real do repositório

- `database.py` e `schema.sql` armazenam astronautas fictícios, referências, registros das cinco áreas, acompanhamento de sono, check-ins e testes de reação.
- `app.py` serve as páginas e rotas de registro e avaliação. A API segue em evolução.
- `avaliacao_sono.py` e `avaliacao_areas.py` aplicam regras escolhidas apenas para demonstração; `servico_sono.py` conecta o sono ao banco. Não são limiares clínicos. Detalhes e regras em [API e integração](docs/api.md).
- O painel, os check-ins, o teste de reação e a visão médica usam a API quando disponível. As respostas e o diário fictício são gravados e disponibilizados na visão médica. Sem autenticação ou controle por papel, qualquer pessoa com acesso ao servidor pode consultá-los. Ver [front-end — caso de sono](docs/front-caso-sono.md). `simulator.py` é apenas um esboço.
- A interface da demonstração está em inglês; identificadores, campos, estados e rotas da API continuam com seus nomes internos existentes. As explicações geradas pelas regras das áreas e de sono agora são retornadas em inglês.
- O caso fictício de sono permite registrar indicação, revisão dos registros e reavaliação. Os demais ciclos, controle de acesso, notificações e integração com sensores não estão implementados. Não se deve anunciar o produto como operacional ou validado.

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

`database.py` cria as tabelas ausentes em `instance/saude.db` sem apagar leituras existentes; execute-o também após atualizar o projeto. `--carregar-ficticios` carrega explicitamente os arquivos fictícios de sono, tripulação e indicadores. Cada arquivo é transacional e idempotente; um conflito interrompe a carga do arquivo, sem desfazer cargas anteriores nem sobrescrever dados. Bancos antigos com noites duplicadas podem impedir a criação do índice. O banco local não deve ser versionado. `python app.py` inicia o Flask; acesse `http://127.0.0.1:5000/`, ou use `/?data=2026-11-10` para o caso histórico e `/equipe-medica.html?data=2026-11-10` para a tripulação. Na data atual sem registros, as áreas mostram dados insuficientes e o último registro disponível. Em **Acompanhamento do sono**, registre a indicação, confirme a revisão fictícia e reavalie usando o despertar de 11/11. Não há agendamento nem envio de avisos. Sem dados fictícios carregados, a API pode retornar 404. As rotas não têm autenticação: use somente dados fictícios em ambiente local.

O PDF norte presente no repositório é a versão 2 e descreve cinco áreas. O painel ligado à API segue essas cinco; o modo de demonstração local ainda contém Metabolismo como sexta área de exemplo, pendente de confirmação da equipe.

Não coloquem dados reais de saúde, credenciais, ambientes virtuais ou bancos locais no repositório. O software é um protótipo de apoio, não um diagnóstico ou ferramenta clínica validada.
