# Design system — Coopera Kós

## Direção

O Coopera Kós deve parecer uma ferramenta clínica educacional premium, não uma landing page. A referência principal continua sendo o guia da marca Kós: preto, marfim, dourado, tipografia editorial e sensação de precisão. A UI deve ser mobile-first, calma, legível e operacional.

## Referências verificadas

- shadcn/ui — componentes acessíveis, composáveis e sem “caixa preta”: https://ui.shadcn.com
- Rare UI — microinterações e componentes animados que parecem especiais, mas devem ser usados com parcimônia: https://www.rareui.com
- Transitions.dev — movimento curto, intencional e útil para comunicar mudança de estado: https://transitions.dev
- beUI — animações/copiar-colar para React; usar como inspiração de comportamento, não como dependência: https://beui.dev
- Coss/Origin UI — blocos simples sobre Base UI, bons como referência de tabs, inputs, drawers e empty states: https://coss.com e https://originui.com
- 21st.dev — catálogo amplo para comparação de padrões; usar para benchmark, não para misturar estilos: https://21st.dev

“Beautiful UI” foi tratado como critério de qualidade solicitado, não como fonte única, porque não há uma URL oficial inequívoca no brief.

## Regras de aplicação

- Não adicionar biblioteca visual nova sem necessidade. Primeiro use React Native, CSS, Expo e os componentes já existentes.
- Superfícies operacionais priorizam clareza: ações óbvias, estados vazios úteis, erro com recuperação e alvos de toque de pelo menos 44px.
- Movimento é micro: feedback de toque, sheet/modal, foco, loading e mudança de estado. Evitar animação decorativa.
- Componentes base devem se comportar como shadcn: nomes claros, acessibilidade explícita e composição simples.
- A marca entra por ritmo, contraste, textura leve e dourado controlado; não por excesso de ornamento.
- Casos clínicos e mensagens nunca devem parecer redes sociais abertas: linguagem de comunidade fechada, privacidade e educação supervisionada.

## Tokens atuais

- `ink`: `#171717`
- `paper`: `#FAFAFA`
- `ivory`: `#FCF0CE`
- `gold`: `#DBBE6D`
- `goldDark`: `#A47928`
- `danger`: `#9B3F37`
- `success`: `#496D42`

## Padrões obrigatórios

- Empty state sempre responde: “o que aconteceu?” e “o que faço agora?”.
- Erro sempre oferece recuperação quando existe ação segura.
- Acessibilidade mínima: label em inputs/ações icon-only, estado selecionado em tabs, estado disabled em botões.
- Web pública deve ter termos, privacidade, suporte, remoção e exclusão acessíveis sem login.
- Mobile nativo é a experiência principal; web é backoffice/fallback.
