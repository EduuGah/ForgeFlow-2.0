# FF-038 — Design system e refatoração de UI/UX

Refatoração completa do aplicativo web (`web/`, Vite + Tailwind CSS 4), seguindo a
direção de `Docs/21-Hevy-Inspired-Design-Reference.md`: escuro, direto, rápido na
academia e centrado no treino ativo.

## Direção visual

- **Canvas preto puro** (`#000`) para telas OLED; elevação expressa por superfícies
  progressivamente mais claras, não por sombras.
- **Um único azul de ação** (`brand`) para tudo que é ação principal. Nenhuma outra
  cor compete com ele.
- **Identidade própria:** os números de treino (carga, volume, tempo, PRs) usam uma
  fonte condensada industrial (_Big Shoulders Display_), como placas de anilha e
  placares de academia. O restante da interface usa a fonte do sistema (Roboto/SF),
  mantendo a familiaridade do Hevy.
- **Assinatura — o "strike":** ao concluir uma série, um brilho rápido atravessa a
  linha (o golpe do martelo na forja) e ela fica marcada em verde. PRs recebem a
  medalha dourada.
- **"Anilhas" de exercício:** como o catálogo não tem fotos, cada exercício é um
  disco com o código do grupo muscular (PEI, COS, PER…), em vez de ícones genéricos.

## Tokens (`web/index.css`, bloco `@theme`)

A paleta padrão do Tailwind é removida (`--color-*: initial`): só existem cores do
design system. Telas não usam hex soltos.

| Token | Uso | Contraste |
| --- | --- | --- |
| `canvas` `#000000` | fundo | — |
| `surface` `#141416` / `raised` `#1C1C1F` / `overlay` `#26262A` | cartões, campos, pressionado | — |
| `ink` / `ink-2` / `ink-3` | texto primário / secundário / auxiliar | ≥ 4,5:1 em `raised` |
| `brand` `#0A6CF0` | preenchimento de ação | 4,7:1 com texto branco |
| `brand-ink` `#4DA3FF` | links, estado ativo, ícones | 7:1 em `surface` |
| `success` / `success-ink` | série concluída, metas atingidas | ícone ≥ 3:1 |
| `warmup` `#F5A524` | série de aquecimento ("W") | 8:1 em `raised` |
| `record` `#FFC83D` | recordes pessoais (medalha) | — |
| `danger` / `danger-ink` | ações destrutivas | 6,3:1 com texto branco |
| `water` | hidratação | — |
| `protein` / `carbs` / `fat` | macronutrientes | validado para daltonismo (ΔE ≥ 9,7) |

Tipografia (`text-*`): `micro` 11, `caption` 12, `footnote` 13, `callout` 14,
`body` 15, `headline` 17, `title` 22, `title-lg` 28 e a escala de métricas
`metric-sm` 22, `metric` 28, `metric-lg` 40, `metric-xl` 56 (sempre com
`font-metric`). Cronômetros ao vivo usam a fonte do sistema com `tabular-nums`
para não "tremer".

Forma: `rounded-sm` 8, `md` 10, `lg` 14, `xl` 20. Movimento: durações 120/200/320 ms,
easings `standard`, `decelerate`, `accelerate` e `sheet`. Com
`prefers-reduced-motion`, todas as animações são reduzidas a 1 ms.

## Componentes (`web/ui/`)

| Arquivo | Componentes |
| --- | --- |
| `Button.tsx` | `Button` (primary, secondary, tinted, ghost, danger, danger-ghost; loading), `IconButton` (alvo de 44 px), `Spinner` |
| `Layout.tsx` | `TabHeader`, `StackHeader`, `SectionHeader`, `GroupLabel`, `Card`, `ListGroup`/`ListRow`, `Stat`, `Delta` |
| `Form.tsx` | `TextField`, `TextAreaField`, `SelectField`, `NumericInput`, `NumberField`, `Stepper`, `Switch`, `SegmentedControl`, `Tabs` |
| `Overlay.tsx` | `Sheet` (arrastar para fechar, ESC, foco), `ActionSheet`, `ConfirmProvider`/`useConfirm`, `ToastProvider`/`useToast` |
| `Feedback.tsx` | `EmptyState`, `Skeleton`, `WorkoutCardSkeleton`, `InlineNotice`, `ProgressBar`, `ProgressRing`, `Avatar`, `ExerciseThumb`, `BrandMark`, `Badge`, `Medal` |
| `Charts.tsx` | `BarChart`, `LineChart`, `RankedBars` (SVG próprio, sem biblioteca) |
| `core.ts` | `cx`, `usePresence`, `useNow`, `useBackLayer`, `useBackGuard`, `useScrollLock` |

`NumericInput` mantém um rascunho de texto enquanto o campo está em foco: o campo
pode ser apagado e redigitado (antes voltava para 0 a cada tecla), aceita `62,5` e
`62.5` e seleciona o conteúdo ao focar.

## Navegação

- Três abas como no Hevy: **Início**, **Treino** e **Perfil**. Estatísticas,
  exercícios, metas, hidratação, nutrição e comunidade ficam no "Painel" do Perfil.
- Telas secundárias entram pela direita e mantêm a posição de rolagem da aba.
- **Botão voltar do Android/navegador:** cada tela, sheet ou diálogo aberto ocupa
  uma entrada do histórico; "voltar" fecha a camada do topo em vez de sair do app.
  Editores com alterações não salvas pedem confirmação também no "voltar".
- O treino em andamento é uma tela cheia; minimizado, vira um mini-player acima
  das abas com retomar, tempo, séries e descanso.

## Estados

| Estado | Onde |
| --- | --- |
| Carregamento inicial | splash estático no HTML + `SplashScreen` enquanto a sessão é restaurada |
| Tela inicial | `WelcomeScreen`: entrar com Google ou continuar sem conta |
| Skeleton | feed da Início durante a primeira sincronização |
| Vazio | todas as listas (treinos, rotinas, exercícios, metas, água, refeições) |
| Erro | validação em formulários, falha de login, falha de sincronização (com "Tentar de novo") |
| Offline | aviso nas abas e na sincronização; tudo continua funcionando localmente |
| Sincronizando | ícone de nuvem animado e folha de detalhes da sincronização |
| Sucesso | toasts; resumo de treino com PRs e metas atingidas |

Exclusões pequenas (água, refeições) usam **desfazer** no toast; exclusões de
rotinas, metas, treinos e saída da conta usam **diálogo de confirmação**.

## Gráficos

Barras de no máximo 24 px com topo arredondado, linhas de 2 px, grade em linha fina
sólida, escala com passos finos (110 → 120), margem do eixo calculada pelo rótulo
mais longo, tooltip por toque/mouse, navegação por setas e uma tabela oculta para
leitores de tela. Série única não tem legenda (o título já nomeia a métrica).

## Correções incluídas

- Tipo `User` não era exportado de `web/firebase.ts`, quebrando a checagem de tipos;
  `tsconfig.json` perdeu os tipos do Jest na migração para Vite.
- IDs de exercícios das rotinas iniciais apontavam para exercícios errados do
  catálogo (13 de 15); uma migração corrige rotinas e recordes já salvos, inclusive
  cópias na nuvem.
- Aquecimento contava no volume e nos PRs (regra de negócio: só séries de trabalho).
- Água e refeições somavam registros de todos os dias como se fossem "hoje"
  (registros antigos recuperam a data pelo id).
- Iniciar um treino substituía o treino em andamento sem aviso.
- Descanso sempre de 90 s, ignorando o descanso da rotina; o timer era por
  `setInterval` e atrasava em segundo plano (agora é por prazo).
- O estado inteiro era gravado no `localStorage` a cada segundo.
- Login e `onAuthStateChanged` sincronizavam duas vezes em paralelo; a primeira
  pintura mostrava dados do convidado antes do usuário.
- Sincronização substituía o histórico local pelo da nuvem (perdia treinos feitos
  offline) e invertia a ordem; PRs viravam documentos duplicados.
- Duplicar rotina não ia para a nuvem; erros do Firestore viravam rejeições não
  tratadas.
- Sequência de semanas, metas de frequência e metas de carga não se atualizavam.
- Ranking usava um volume fixo para o usuário; inscrições em desafios se perdiam.

## Validação

- `npm run typecheck`, `npm run lint`, `npm test` (inclui `web/lib/training.test.ts`),
  `npm run format:check` e `npm run build`.
- Percurso automatizado no Chromium (390×844, 360×740 e 1280×860): boas-vindas,
  início, iniciar rotina, concluir séries, PR, concluir treino, perfil,
  configurações, voltar do navegador, estatísticas, metas, hidratação, nutrição,
  comunidade, biblioteca, detalhe do exercício, editor de rotina com guarda de
  alterações, histórico, mini-player — sem erros no console.
