# Animação de rolagem e nova tipografia — desenho curto

Data: 14/11/2026. Pedido de Gustavo (front-end).

## Intenção

Melhorar o visual das quatro páginas (painel, check-ins, teste de reação e visão médica). Nada do comportamento dos dados muda. O conteúdo abaixo da dobra aparece quando a pessoa desce e some quando ela sobe. A tipografia passa a ter personalidade própria, ligada ao tema: leitura de dados de saúde por alguém cansado, em missão.

## Objetivos, não objetivos e anti-objetivos

- **Objetivos:** revelação das seções ao rolar, nos dois sentidos; troca das três fontes atuais (Prata, Inter, Public Sans) por um novo par; um único momento de entrada no topo da página (título grande).
- **Não objetivos:** mudar cores da identidade (azul #0B3D91, vermelho #FC3D21, topo preto), layout das seções, textos, contrato da API ou regras.
- **Anti-objetivos (falha mesmo funcionando):** esconder aviso de falha, alerta urgente ou mensagens `role="status"`; animação repetida a cada atualização de 10 s; texto ilegível ou meio transparente enquanto alguém lê; quebrar a demonstração offline; ignorar quem desativou animações no sistema.

## Abordagens consideradas

| Abordagem | Troca | Decisão |
| --- | --- | --- |
| JS puro com `IntersectionObserver` + transições CSS | Sem dependência, controle sobre o que nunca some, funciona em todos os navegadores. | **Escolhida** (escolha do Claude; Gustavo trata do resultado, não do "como"). |
| GSAP + ScrollTrigger local | Mais recursos (scrub, pin), mas dependência nova (~70 KB), contra a regra do AGENTS.md. | Descartada. |
| Só CSS (`animation-timeline: view()`) | Zero JS, mas a opacidade fica presa à posição: texto meio transparente nas bordas da tela. | Descartada. |

Direção visual escolhida por Gustavo entre duas: **"Leitura sob fadiga"** (a outra era "Console de voo", com Archivo e varredura de linha).

## Desenho

**Tipografia** (tokens em `style.css`; todas as páginas já usam `var(--fonte-*)`):
- `--fonte-texto`: **Atkinson Hyperlegible Next**, para textos, formulários e tabelas. Fonte criada pelo Braille Institute para leitura difícil.
- `--fonte-titulo` e `--fonte-display`: **Big Shoulders Display**, condensada, para títulos, título grande e números de leitura (`tabular-nums`).
- Arquivos `.woff2` locais em `static/vendor/fonts/` (subconjunto latin, OFL 1.1), registrados no `static/vendor/README.md`. As três fontes antigas são removidas.
- A escala de tamanhos é revista, porque uma fonte condensada precisa de corpo maior para ter o mesmo peso visual. Comprimento de linha abaixo de 80 caracteres.

**Revelação ao rolar** (`static/js/revelar.js`, incluído nas quatro páginas):
- Alvos: as seções diretas de `<main>`, mais os itens das listas de áreas e de tripulantes, com pequeno escalonamento.
- Entrar na tela: a seção sai de leve desfoque e deslocamento curto para nítida e no lugar ("entrar em foco").
- Sair **por baixo** da tela, ao subir: volta ao estado oculto. Sair por cima, ao descer, não esconde nada.
- O que nunca some: cabeçalho, rodapé, `.aviso`, `.alerta-urgente`, `.nota--urgente` e qualquer `role="status"`.
- Atualização de 10 s: elementos recriados pelo JS dentro de uma seção já visível aparecem direto, sem animar de novo.
- Seções `depende-dados`, que ficam com `display: none` até os dados chegarem, são reveladas quando passam a ocupar espaço.
- Sem JS ou com `prefers-reduced-motion: reduce`: tudo visível, sem movimento. O estado oculto só é aplicado quando o script marca `<html>` como pronto.
- Uma entrada no topo (título grande) no carregamento; o resto fica só na rolagem.

## Deixado para quem implementar

Curvas e durações exatas (alvo em torno de 400–600 ms), valor do desfoque, margem de disparo do observador, ajustes finos da escala tipográfica e dos pesos. Atualizar `docs/front-caso-sono.md` e `static/vendor/README.md`. Verificar nos temas claro e escuro, no celular e com o modo `?fonte=demo`.
