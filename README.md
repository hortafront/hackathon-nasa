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
- `app.py` serve as duas páginas e oferece consultas de histórico e avaliação de sono conectadas ao banco, além de uma rota antiga de leitura recente fictícia. Esta última usa por engano `astrounata_id`, enquanto o contrato anterior usa `astronauta_id`. A API ainda está incompleta.
- `avaliacao_sono.py` implementa uma regra ilustrativa para duração do sono; `servico_sono.py` conecta a avaliação aos dados salvos. Detalhes em [API e integração](docs/api.md).
- O painel consulta histórico e avaliação na API quando disponíveis; a prévia médica usa dados fictícios locais enquanto sua rota não existe. O front identifica a fonte e dispõe de reserva local. Check-ins ainda não são gravados pelo servidor. Ver [front-end — caso de sono](docs/front-caso-sono.md). `simulator.py` é apenas um esboço.
- Nenhum ciclo completo do Raga, controle de acesso, notificação, execução de reavaliação ou integração com sensores está implementado. Não se deve anunciar o produto como operacional ou validado.

## Preparação e verificação do código existente

Com Python e PowerShell, na pasta do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python database.py
python -m unittest discover -s tests
```

`database.py` cria `instance/saude.db` sem apagar leituras existentes; não carrega automaticamente o JSON de exemplo. A função `database.carregar_dados_ficticios(conexao)` permite carga explícita; veja [dados e armazenamento](docs/dados.md). Não há comando próprio de carga ainda. Bancos antigos com noites duplicadas podem impedir a criação do novo índice e exigem resolução consciente. O banco local não deve ser versionado. `python app.py` inicia o Flask; acesse `http://127.0.0.1:5000/`. Sem dados fictícios carregados, a API pode retornar 404. As rotas não têm autenticação: use somente dados fictícios em ambiente local. O ciclo completo não está implementado.

Não coloquem dados reais de saúde, credenciais, ambientes virtuais ou bancos locais no repositório. O software é um protótipo de apoio, não um diagnóstico ou ferramenta clínica validada.
