# Monitoramento de saúde de astronautas

Estrutura inicial para um sistema web que acompanha frequência cardíaca. O esquema do banco e sua inicialização estão implementados; as consultas, a aplicação, o simulador e o gráfico ainda precisam ser implementados.

## Fluxo

Relógio ou simulador → validação no Flask → SQLite → API → painel e gráfico no navegador. A integração com relógio ainda precisa ser investigada; comecem com leituras fictícias identificadas como simuladas.

## Arquivos

| Arquivo | Finalidade |
| --- | --- |
| `app.py` | Criar a aplicação Flask e as rotas. |
| `database.py` | Acessar o SQLite, gravar e consultar leituras. |
| `schema.sql` | Definir a tabela de leituras. |
| `simulator.py` | Gerar leituras fictícias para demonstração. |
| `requirements.txt` | Listar dependências Python. |
| `templates/index.html` | Estruturar o painel. |
| `static/css/style.css` | Estilizar a interface. |
| `static/js/dashboard.js` | Consultar a API e atualizar o cartão e seus estados. |
| `static/js/chart.js` | Construir e atualizar o gráfico do histórico. |
| `static/vendor/README.md` | Orientar a organização de bibliotecas externas. |
| `instance/README.md` | Explicar o banco local. |
| `docs/api.md` | Registrar o contrato entre interface e servidor. |
| `docs/equipe.md` | Dividir tarefas e orientar os próximos passos. |
| `.gitignore` | Evitar versionar banco, ambiente virtual e credenciais. |

## Preparação

Com Python instalado, no PowerShell dentro da pasta do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Para criar o banco local e suas tabelas, execute `python database.py`. O arquivo é criado em `instance/saude.db`; executar o comando novamente preserva as leituras existentes. Outros módulos podem chamar `inicializar_banco()` e `conectar_banco()` de `database.py`; quem abrir uma conexão deve fechá-la após o uso.

A aplicação ainda não inicia: a equipe implementará o Flask em `app.py` e documentará aqui o comando de execução. Primeiro, façam uma leitura simulada ser salva e exibida com unidade, origem e horário; depois adicionem histórico e atualização automática.

Não enviem dados reais de saúde ou credenciais ao repositório. Frequência cardíaca isolada não descreve a saúde geral; o sistema não oferece diagnóstico.
