# react-ui-kit

React 19 + Bootstrap 5.3 component library implementing the personal design system for **all personal web apps (not KTH projects)**, plus a docs web app showing every component live. Specs, tokens and app profiles live in the sibling repo **design-system-mcp** and are served over MCP (`.mcp.json` → `design-system`).

## Ground rules
- **Spec-driven.** Every component is implemented from its spec (`get_component_spec("<Name>")`). No spec → write it in design-system-mcp first. Every acceptance criterion gets a test named `AC-n`.
- **Dependencies.** Runtime: React/ReactDOM only (Bootstrap SCSS is compiled into `dist/styles.css`). No PrimeReact, react-bootstrap, MUI, Popper, Bootstrap JS, CSS-in-JS, lodash, moment. New dev deps need the `architect` agent + ADR.
- **Theming.** Only `--ui-*` tokens and Bootstrap utilities. Generated files (`src/styles/_tokens.generated.scss`, `src/theme/profiles.generated.ts`, `docs-app/src/catalog.generated.json`) come from design-system-mcp `npm run sync:ui-kit` — never edit by hand.
- **Identity.** Monteringsanvisning v2 (`get_guidelines('identity')`, `get_guidelines('motion')`): white sheet with a kraft shell, 2px ink lines (`--ui-line-width`), ink primary only for the main action, `--ui-color-accent-*` for the active step/selection/focus/progress, Albert Sans, flat resting surfaces (shadows only on lifted overlays: `--ui-shadow-lift`/`drag`; no gradients, blur, icon bubbles, eyebrows or hero-metric tiles). Multi-step work uses `StepSheet`; counts are quantity marks. Motion comes from `src/motion` (ADR 0002), never a library, and honours reduced motion. Fonts are self-hosted in `src/fonts` and shipped to `dist/fonts` by the `ui-ship-fonts` Vite plugin.
- **Accessibility.** WCAG 2.2 AA, WAI-ARIA APG keyboard models, visible focus, reduced motion, RTL via logical properties.
- **API conventions.** `value`/`defaultValue`/`onChange(value, event?)`, `size`, `variant`, `invalid`, `disabled`, ref-as-prop, named exports, `Props` types exported.

## Layout
```
src/
  components/<Name>/   <Name>.tsx · .scss · .test.tsx · .examples.tsx · index.ts
  hooks/               useControllableState, useFocusTrap, useFloating, useClickOutside, useScrollLock, useMediaQuery
  motion/              tokens, useReducedMotion, usePresence, useAssemble, useFlip, useCountTick, useViewTransition
  utils/               cx, position (flip/shift), compare, url (safeUrl), dom, object
  theme/               ThemeProvider, useTheme, themeScript, profiles.generated.ts
  locale/              LocaleProvider, en.ts (all UI strings)
  styles/              index.scss (entry), _bridge.scss (tokens → Bootstrap), _tokens.generated.scss
packages/react-ui-kit-3d/  optional 3D package @sabahat/react-ui-kit-3d (npm workspace; Scene3D, Model3D; three only as a dynamically imported peer, ADR 0003)
docs-app/              docs web app (Vite), auto-discovers *.examples.tsx (also in packages/*)
test/setup.ts          jsdom setup
tasks.md               all work items (UI-*, OPS-*)
```

## Workflow
Use the `spec-driven-workflow` skill. Agents in `.claude/agents/`:
| Agent | Model | Use for |
|---|---|---|
| `architect` | opus | Plan new components / API or shared-code changes, deps, ADRs |
| `component-builder` | sonnet | Implement from spec + plan, tests per AC |
| `reviewer` | sonnet | Diff review before commit |
| `a11y-reviewer` | sonnet | APG/WCAG verification of interactive components |
| `security-reviewer` | opus | HTML/URL/file/secret/storage handling, releases |
| `docs-writer` | haiku | Examples and docs |
| `design-reviewer` | sonnet | Identity and cross-screen consistency review |

## Model tiers (token budget)
- **opus** — critical decisions only: `architect` (architecture, data/storage model, dependencies, ADRs) and `security-reviewer`. Invoke deliberately, not by default.
- **sonnet** — everything that writes or reviews code, browses or tests: main session, builders, `reviewer`, `a11y-reviewer`, `design-reviewer`, content reviewers, `spec-writer`.
- **haiku** — prose-only docs: `docs-writer` (examples, CHANGELOG, README, ADR text, tasks.md).
When delegating with the Agent tool, pass `model` explicitly to match this table.

Skills: `spec-driven-workflow`, `implement-component`, `write-component-tests`, `add-docs-example`, `theming-and-tokens`. Also useful: `code-review`, `security-review`, `vercel:react-best-practices`.

## Commands
```bash
npm run dev          # docs app on http://localhost:5180
npm test             # vitest + Testing Library (jsdom)
npm run typecheck
npm run build        # dist/index.js + dist/styles.css + dist/types
npm run build:docs   # static docs → docs-dist/
npm run check        # typecheck + test + build
npm run check:3d     # 3D package: typecheck, build, bundle budget (≤ 12 KB gzip without three)
```
Design-system MCP must be built in the sibling checkout (`../design-system-mcp`, `npm run build`) for `.mcp.json` to work.

## Definition of done
Spec ACs all tested · typecheck/test/build/build:docs green · examples added · reviewer passed (+ a11y/security when relevant) · task marked `[x]` · spec status set to `implemented` in design-system-mcp.
