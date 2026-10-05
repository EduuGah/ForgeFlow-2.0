# FF-038 — Design system e refatoração de UI/UX

Refatoração completa do aplicativo web (`web/`, Vite + Tailwind CSS 4). A primeira
versão partiu da referência de `Docs/21-Hevy-Inspired-Design-Reference.md`; esta
revisão dá ao ForgeFlow uma **identidade própria ("Forja")**, com paleta, tipografia,
navegação e padrões de tela diferentes do Hevy, mantendo o que a referência tem de
bom: rapidez na academia e foco no treino ativo.

## Direção visual — "Forja"

- **Grafite + brasa.** Fundo grafite frio (`#0D0F12`, não preto puro) e uma única cor
  de ação laranja-brasa (`#FF7A1A`) com texto escuro por cima. Nada de azul de ação.
- **Tipografia única: Sora** (OFL, auto-hospedada em `public/fonts/`, funciona
  offline) para textos e números; números usam `tabular-nums` e espaçamento
  negativo, então cronômetros não "tremem".
- **Assinatura — o "strike":** ao concluir uma série, um brilho de brasa atravessa a
  linha (o golpe do martelo na forja) e ela fica marcada em âmbar. PRs recebem a
  medalha dourada.
- **Borda de brasa (`ember-edge`):** marca o que está "quente" — o exercício atual
  do treino, o treino em andamento, a sugestão do dia.
- **Etiquetas de exercício:** como o catálogo não tem fotos, cada exercício é um
  squircle com o código do grupo muscular (PEI, COS, PER…) e um traço de brasa.
- **Aquecimento = "A"** em azul-aço (aquecimento), séries de trabalho numeradas.
- **Tema claro e escuro:** `Configurações › Aparência` (Sistema, Claro, Escuro).
  A preferência fica em `localStorage` (`forgeflow_theme`) e é aplicada por um
  script inline antes da primeira pintura (sem "flash").

### O que mudou em relação ao Hevy

| Hevy | ForgeFlow |
| --- | --- |
| Preto puro + azul de ação | Grafite frio + laranja-brasa com texto escuro |
| Barra de abas com 3 destinos | Dock flutuante com 4 destinos e botão central **Treinar** |
| Feed social com avatar e foto | Diário em linha do tempo: bloco de data, métricas e grupos musculares |
| Perfil com gráfico | Aba própria **Evolução** (período, KPIs, gráfico, músculos, recordes, 1RM) |
| Mini-player acima das abas | O botão **Treinar** vira cronômetro/anel de descanso |
| Linhas de série verdes, "W" | Linhas em brasa com "strike", aquecimento "A" em azul-aço |
| Barra de descanso de largura total | Cápsula flutuante com anel de progresso |
| Lista de exercícios corrida | Cartões por exercício, progresso segmentado por exercício, exercícios concluídos recolhem sozinhos |
| Abas sublinhadas | Controle segmentado com "pílula" deslizante |
| Avatar e miniaturas circulares | Squircles |

## Tokens (`web/index.css`)

A paleta padrão do Tailwind é removida (`--color-*: initial`): só existem cores do
design system. O bloco `:root[data-theme='light']` redefine os mesmos tokens para o
tema claro, então telas nunca usam hex soltos (exceções documentadas: o botão do
Google, que segue a marca Google, e as medalhas de pódio).

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| `canvas` | `#0D0F12` | `#F3F4F6` | fundo |
| `surface` / `raised` / `overlay` | `#16191E` / `#1F232A` / `#2A2F37` | `#FFFFFF` / `#EEF0F3` / `#E2E5EA` | cartões, campos, pressionado |
| `line` / `line-strong` | `#242830` / `#343A44` | `#E3E6EB` / `#CDD2D9` | divisórias e bordas |
| `ink` / `ink-2` / `ink-3` | `#F2F4F7` / `#A3AAB6` / `#8A92A0` | `#12151A` / `#4A5261` / `#5F6878` | texto (≥ 4,5:1) |
| `brand` + `on-brand` | `#FF7A1A` + `#1B0E04` | igual | ação principal |
| `brand-ink` | `#FF9A4D` | `#C2410C` | links, estado ativo |
| `warmup` | `#5EC2E6` | `#096A93` | aquecimento |
| `record` | `#FFD166` | `#E0A100` | recordes |
| `success` / `danger` | verdes / vermelhos | versões mais escuras | concluído / destrutivo |
| `protein` / `carbs` / `fat` | `#E8604C` / `#1FA88A` / `#9D7BF0` | `#D4553F` / `#12937A` / `#7C5CE0` | macros (validados para daltonismo) |

Tipografia (`text-*`): `micro` 11, `caption` 12, `footnote` 13, `callout` 14,
`body` 15, `headline` 17, `title` 22, `title-lg` 28, `display` 36 e métricas
`metric-sm` 19, `metric` 24, `metric-lg` 34, `metric-xl` 48.

Forma: `rounded-sm` 8, `md` 10, `lg` 14, `xl` 20. Movimento: durações 120/200/320 ms,
easings `standard`, `decelerate`, `accelerate` e `sheet`. Com
`prefers-reduced-motion`, todas as animações são reduzidas a 1 ms.

## Ícone do app

Fontes em `assets/brand/` (SVG): "F" em brasa dentro de um anel de progresso
aberto sobre grafite. Gerados a partir delas: `assets/icon.png`,
`assets/splash-icon.png`, `assets/favicon.png`, ícones adaptativos do Android
(frente, fundo e monocromático) e, para o PWA, `public/icons/*` +
`public/manifest.webmanifest`.

## Componentes (`web/ui/` e `web/features/`)

| Arquivo | Componentes |
| --- | --- |
| `ui/Button.tsx` | `Button` (primary, secondary, tinted, ghost, danger, danger-ghost; loading), `IconButton` (alvo de 44 px), `Spinner` |
| `ui/Layout.tsx` | `TabHeader`, `StackHeader`, `SectionHeader`, `GroupLabel`, `Card`, `ListGroup`/`ListRow` (grupos com borda), `Stat`, `Delta` |
| `ui/Form.tsx` | `TextField`, `TextAreaField`, `SelectField`, `NumericInput`, `NumberField`, `Stepper`, `Switch`, `SegmentedControl`, `Tabs` (segmentado) |
| `ui/Overlay.tsx` | `Sheet`, `ActionSheet`, `ConfirmProvider`/`useConfirm`, `ToastProvider`/`useToast` |
| `ui/Feedback.tsx` | `EmptyState`, `Skeleton`, `InlineNotice`, `ProgressBar`, `ProgressRing`, `Avatar`, `ExerciseThumb`, `BrandMark`, `Badge`, `Medal` |
| `ui/Charts.tsx` | `BarChart`, `LineChart`, `RankedBars` (SVG próprio) |
| `ui/core.ts` | `cx`, `usePresence`, `useNow`, `useBackLayer`, `useBackGuard`, `useScrollLock` |
| `features/GoogleSignIn.tsx` | `GoogleButton` (botão oficial claro com o "G"), `useGoogleSignIn` |
| `features/Demos.tsx` | ilustrações animadas: tabela de séries, anel de descanso, gráfico de evolução, importação |

## Navegação

- Dock flutuante: **Hoje**, **Rotinas**, **Treinar** (centro), **Evolução**, **Perfil**.
  "Treinar" abre a folha de início (treino livre, sugestão do dia, rotinas) ou
  retoma o treino em andamento, mostrando o tempo e o anel do descanso.
- Perfil em grupos: Treino (diário, exercícios, metas), Saúde, Comunidade, Dados
  (importar, backup) e App (configurações, tutorial).
- Telas secundárias entram pela direita e preservam a rolagem da aba.
- **Botão voltar do Android/navegador:** cada tela, folha ou diálogo aberto ocupa
  uma entrada do histórico. As entradas são reconciliadas em série com o número de
  camadas abertas (o `history.go` é assíncrono); antes, fechar uma camada e abrir
  outra ao mesmo tempo (a folha "Começar treino" iniciando o treino, ou concluir o
  treino e abrir o resumo) fazia o histórico recuar além do app.

## Boas-vindas e tutorial

- `WelcomeScreen`: demonstração animada da tabela de séries, proposta de valor e um
  painel "Entre para começar" com o **botão do Google no padrão da marca** (branco,
  "G" colorido, "Continuar com o Google") e, separado por "ou", "Usar sem conta".
- `TutorialScreen`: 4 passos animados (registrar séries, descanso, evolução, dados
  offline/importação), com progresso, "Pular", voltar, deslizar e setas do teclado.
  Abre sozinho uma vez (`forgeflow_v2_tutorial_done`) e pode ser revisto em
  Perfil › Ver tutorial ou Configurações.

## Importar histórico (CSV)

`Perfil › Importar histórico` (também em Rotinas, Diário e Configurações) aceita o
CSV exportado pelo **Hevy** e pelo **Strong**. A lógica pura está em
`web/lib/importCsv.ts` (testada em `importCsv.test.ts`):

- Parser RFC 4180 (aspas, quebras de linha em notas, `,` ou `;`, BOM).
- Datas localizadas: `21 de set. de 2026, 21:22`, `21 Sep 2026, 21:22`,
  `Sep 21, 2026, 9:22 PM`, `2026-09-21 21:22:00`; libras e milhas são convertidas.
- Aquecimentos viram "A"; séries sem repetições são ignoradas; cardio (distância e
  duração) vira nota do exercício.
- Nomes em inglês do Hevy/Strong são ligados ao catálogo do ForgeFlow (ex.: *Bench
  Press (Barbell)* → Supino reto com barra); os demais viram exercícios
  personalizados com grupo muscular estimado e id estável.
- Treinos já existentes (mesmo minuto de início) são ignorados — reimportar não
  duplica. Os recordes são **recalculados sobre todo o histórico** em ordem
  cronológica, e só documentos alterados vão para a nuvem.
- Fluxo: escolher/arrastar arquivo → prévia (treinos novos, séries, período,
  exercícios reconhecidos e novos) → confirmação → resultado com **Desfazer
  importação**.

## Estados

| Estado | Onde |
| --- | --- |
| Carregamento inicial | splash com o ícone no HTML + `SplashScreen` enquanto a sessão é restaurada |
| Primeira abertura | boas-vindas → tutorial |
| Vazio | todas as listas, com ação (criar rotina, importar histórico…) |
| Erro | formulários, login, sincronização ("Tentar de novo"), arquivo de importação inválido |
| Offline | aviso nas abas e no status de sincronização |
| Sucesso | toasts; resumo do treino com PRs e metas; resultado da importação |

Exclusões pequenas usam **desfazer** no toast; exclusões de rotinas, metas, saída da
conta, descartar treino e importação usam **diálogo de confirmação**.

## Validação

- `npm run typecheck`, `npm run lint`, `npm test` (inclui `web/lib/training.test.ts`
  e `web/lib/importCsv.test.ts`), `npm run format:check` e `npm run build`.
- Percurso automatizado no Chromium (390×844, 360×740, 1280×860; temas escuro e
  claro): boas-vindas, tutorial, Hoje, Rotinas, Evolução, Perfil, Configurações,
  iniciar pelo botão Treinar, concluir séries, PR, recolher exercício concluído,
  finalizar, resumo, detalhe do exercício, comunidade, importação do CSV real
  (51 treinos) com prévia, confirmação, diário e detalhe do treino importado,
  troca de tema — sem erros no console.
