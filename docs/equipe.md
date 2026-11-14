# Organização da equipe — Project Raga

O [norte do projeto](raga.md) descreve a solução. As atribuições abaixo são uma proposta operacional para dois integrantes de back-end e dois de front-end; nomes e alterações em arquivos compartilhados devem ser combinados.

## Back-end 1 — dados e armazenamento

- Definir, junto ao back-end 2, os formatos de astronauta fictício, leituras, linha de base, check-ins, teste de reação e treino. Preservar origem, unidade quando aplicável e horário com fuso.
- Preparar JSON fictício por tripulante, com histórico, perfis distintos e um caso de três noites de sono alterado. Não alegar compatibilidade com API real sem verificação.
- Evoluir `schema.sql` e `database.py`, preservando dados locais existentes por migração apropriada; não apagar ou recriar banco silenciosamente.
- Implementar validação e consultas cronológicas, tratando ausência e valores inválidos, em coordenação com quem trabalha nas rotas.
- Entregar formatos documentados e testes de persistência, filtros, ordenação e erros.

## Back-end 2 — regras, ciclo e API

- Combinar regras **ilustrativas** para as cinco áreas, estado geral e informações insuficientes; documentar fontes e limites.
- Implementar avaliação explicável, recomendações de demonstração, alertas e reavaliação. Diferenciar acompanhamento e prioridade imediata; nunca aguardar 24–48 horas em situação apresentada como urgente.
- Implementar API Flask e entrega do painel, com entradas validadas, erros seguros e respostas combinadas com o front-end.
- Na demonstração fictícia, compartilhar check-ins e diário com a visão médica conforme decisão do integrante; implementar e testar controle por perfil antes de qualquer uso com dados reais. Não alegar autenticação ou notificação real sem implementação e teste.
- Testar regras, ausência de dados, atualização, erros e integração. Atualizar `docs/api.md` e avisar a equipe sobre mudanças de contrato.

## Front-end — Andrew e Gustavo

Dividir de comum acordo painel do astronauta, detalhes e gráficos, check-ins/teste, alertas e visão médica. Mostrar origem simulada, horário, explicação da cor, ausência de dados e falhas. Preservar o último dado visível em falha e informar que está desatualizado. Cores não podem ser o único meio de comunicação. Usar recursos locais para demonstração offline e não afirmar que a interface realiza tarefas não implementadas.

## Trabalho conjunto

1. Confirmar campos, regras, visibilidade e exemplos antes de alterar contrato ou banco.
2. Fazer o caso fictício de sono percorrer dados → avaliação → tela → acompanhamento; ampliar para as demais áreas e visão médica.
3. Ao alterar contrato, atualizar servidor, consumidores e documentação juntos; combinar mudanças em arquivos compartilhados.
4. Revisar fontes e critérios oficiais; preparar demonstração e pitch com limitações explícitas.

Trabalhem na branch combinada, revisem alterações e preservem trabalho existente. Não façam commit, push ou merge sem autorização.
