# Instruções para agentes de IA

Estas instruções se aplicam a todo o repositório. O objetivo é ajudar as quatro pessoas da equipe a desenvolverem o projeto de forma coerente, preservando o trabalho umas das outras. Instruções específicas do integrante para a tarefa atual têm prioridade, desde que não coloquem dados ou trabalho existente em risco.

## Antes de alterar arquivos

1. Leia `README.md`, `docs/raga.md`, `docs/equipe.md` e, se a tarefa envolver a comunicação entre front-end e back-end, `docs/api.md`. Consulte o PDF norte em `docs/Project Raga - Norte do projeto.pdf` e leia também os arquivos relacionados à tarefa antes de editá-los.
2. Verifique a branch e o estado do Git com `git status --short --branch`, quando o diretório for um repositório Git. Identifique alterações existentes e preserve o trabalho de outras pessoas. Não descarte, sobrescreva ou reverta mudanças que você não fez sem autorização explícita.
3. Entenda o pedido e limite as alterações ao necessário. Se uma decisão essencial não puder ser inferida, explique a dúvida ao integrante; prossiga com o trabalho independente que for possível.
4. Confira o estado real do código: a documentação descreve planos e pode ficar desatualizada. Não afirme que uma funcionalidade existe sem verificá-la.

## Projeto e arquitetura

O Project Raga é um protótipo de apoio ao acompanhamento da saúde física e mental de astronautas. O PDF norte e `docs/raga.md` substituem o planejamento anterior limitado à frequência cardíaca. O ciclo planejado é medir, comparar com a linha de base individual, classificar, recomendar e reavaliar, nas áreas sono, coração, mente, exercício e cognição. As cinco telas planejadas são painel, detalhe de área, check-ins/teste, alertas/recomendações e visão médica. Sinalize ao integrante se uma proposta se afastar desse norte. Dados, equipamentos e encaminhamentos são simulados no hackathon; não existe integração real prevista no escopo.

O fluxo técnico previsto é dados fictícios e check-ins → validação e persistência em Python/SQLite → regras ilustrativas e API Flask → interface no navegador. A implementação ainda não corresponde ao planejamento; consulte o estado real no README e no código.

- `app.py`: aplicação Flask, rotas HTTP e validação das entradas.
- `database.py` e `schema.sql`: acesso ao SQLite e estrutura das tabelas.
- `simulator.py`: geração de leituras fictícias identificadas como simuladas.
- `templates/`: estrutura HTML servida pelo Flask.
- `static/css/`: estilos; `static/js/`: lógica do painel e do gráfico.
- `static/vendor/`: bibliotecas externas locais, com versão, origem e licença registradas quando adicionadas.
- `instance/`: banco local gerado em tempo de execução, que não deve ser versionado.
- `docs/api.md`: contrato das rotas; `docs/equipe.md`: responsabilidades e organização.

Mantenha as responsabilidades separadas e prefira soluções simples e compreensíveis para a equipe. Não introduza novas tecnologias ou dependências sem necessidade; explique a escolha e atualize as instruções de instalação quando necessário.

## Integração entre equipe e agentes

- Respeite o contrato em `docs/api.md`: nomes de rotas, parâmetros, campos e formato das respostas. Caso precise modificá-lo, atualize a documentação junto com os consumidores e explique o impacto para a equipe.
- A equipe precisa combinar os contratos para as cinco áreas, check-ins, alertas, acompanhamento e visão médica, incluindo dados ausentes e erros. Não suponha implementações inexistentes.
- O histórico deve vir do mais antigo ao mais recente; quando vazio, use uma lista vazia. Os horários devem conter fuso e as leituras devem informar unidade e origem.
- O painel deve distinguir carregamento, ausência de dados e falha de atualização. Se a atualização falhar, preserve a última leitura exibida com seu horário e informe o problema. A consulta periódica planejada é a cada 10 segundos.
- Ao alterar arquivos que outras pessoas usam, avise no resumo quais interfaces ou comportamentos mudaram. Se uma tarefa depender de trabalho ainda não implementado, deixe essa dependência explícita.

## Dados de saúde e confiabilidade

- Use somente dados fictícios para exemplos, testes e demonstrações públicas. Identifique claramente a origem simulada; não apresente simulação como dados reais de um relógio ou da NASA.
- Não apresente sensores reais, API de equipamento, monitoramento contínuo real ou envio de notificações como implementados sem comprovação. Integração com equipamento real está fora do escopo do hackathon.
- Frequência cardíaca isolada não descreve a saúde geral. Não apresente regras de demonstração como diagnóstico ou limites clínicos validados. Documente a origem e as limitações de qualquer referência ou regra utilizada.
- Dados insuficientes não equivalem a verde. Explique os dados e regras usados, não use cores como único indicador e não trate reavaliação de 24–48 horas como resposta a situação urgente.
- Proteja informações sensíveis: definir acesso por papel e compartilhamento de check-ins e diário antes de implementá-los. Não presumir acesso automático da equipe médica ao diário, nem alegar segurança não verificada.
- Não coloque dados reais de saúde, senhas, tokens, arquivos `.env`, ambientes virtuais ou bancos locais no repositório. Use variáveis de ambiente para credenciais e não as imprima em logs.
- Valide dados no servidor, utilize consultas SQL parametrizadas e trate erros sem expor informações sensíveis.

## Qualidade e documentação

- Escreva nomes claros e código simples. Use comentários em português para explicar decisões ou trechos que não sejam óbvios; mantenha-os atualizados e evite repetir o que o código já mostra.
- Siga os padrões já existentes. Não faça refatorações amplas ou mudanças visuais não solicitadas apenas por preferência pessoal.
- Verifique a alteração de modo proporcional: teste o comportamento modificado, incluindo casos de erro relevantes, e verifique a integração quando alterar o contrato entre as partes. Não afirme que algo foi testado se não foi.
- Atualize `README.md` e os documentos relevantes quando mudar instalação, execução, arquitetura, rotas ou comportamento. Documente fontes externas e a forma como foram usadas; não invente referências ou resultados.
- Mantenha o `.gitignore` compatível com os arquivos locais gerados. Bibliotecas necessárias para demonstração offline devem estar disponíveis localmente ou ter sua limitação documentada.

## Git e comunicação

- Trabalhe na branch da tarefa definida pela equipe. Não crie commits, faça push, mescle branches ou altere o repositório remoto sem pedido ou autorização do integrante.
- Antes de um commit autorizado, confira o diff e os arquivos incluídos; não adicione alterações alheias ou arquivos sensíveis por acidente. Use uma mensagem curta que descreva a mudança.
- Ao concluir, explique em português o que mudou, por quê, como foi verificado e o que ainda falta ou não pôde ser testado. Indique os arquivos principais para que a equipe consiga continuar o trabalho.
