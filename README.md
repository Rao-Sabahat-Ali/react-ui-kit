# react-ui-kit

React 19 + Bootstrap 5.3 component library for the personal design system — PrimeReact-level coverage without PrimeReact, light/dark themes, and app-type profiles (`saas`, `admin`, `dashboard`, `cms`, `pos`, `game`, `ecommerce`, `landing`).

Specs, tokens and rules: [`design-system-mcp`](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (also an MCP server for coding agents).

## Install

```bash
npm install @sabahat/react-ui-kit react react-dom
```

Requires React 19. Bootstrap is compiled into the stylesheet; install `bootstrap` only if you import the SCSS (`@sabahat/react-ui-kit/scss/*`).

```tsx
import '@sabahat/react-ui-kit/styles.css';
import { ThemeProvider, PageHeader, Section, IndexList, IndexItem, Button } from '@sabahat/react-ui-kit';

createRoot(root).render(
  <ThemeProvider profile="saas">
    <PageHeader title="Today" actions={<Button>Start</Button>} />
    <Section title="Next steps">
      <IndexList>
        <IndexItem title="Review" description="8 words are waiting." action={<Button appearance="outline">Start</Button>} />
      </IndexList>
    </Section>
  </ThemeProvider>
);
```

Add `themeScript({ profile })` output to `index.html` `<head>` to avoid a flash of the wrong theme. Fonts (Fraunces, Instrument Sans) ship in the package and load from your own origin.

## Design contract

The look is the "Nordic editorial" identity: paper surfaces, an ink primary action, a pine accent, serif headings, rules instead of boxes. Build screens from `PageHeader`, `Section`, `IndexList`, `StatGroup` and `DataTable`. Specs, tokens, patterns and the consistency rules live in [design-system-mcp](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (an MCP server for coding agents).

## Start from a blueprint

The docs app has a **Blueprints** section: complete, runnable screens (analytics dashboard, admin list to detail, overview and index page, settings, sign in, article/detail) built only from kit components and the design contract. Their source is `templates/blueprints/`.

```bash
npm run create-app -- ../my-dashboard --profile dashboard   # home screen = Analytics dashboard blueprint
npm run create-app -- ../my-backoffice --profile admin      # home screen = Admin list to detail blueprint
npm run create-app -- ../my-app --profile dashboard --blank # empty starter page instead
```

## Status

All specified components are implemented (see the [live catalogue](https://react-ui-kit-docs.vercel.app) and [CHANGELOG](CHANGELOG.md)). Every component ships with WCAG 2.2 AA keyboard and screen-reader support, light/dark themes and eight app profiles.

## Development

```bash
npm install
npm run dev     # docs app http://localhost:5180
npm run check   # typecheck + tests + build
```

See [CLAUDE.md](CLAUDE.md) for the spec-driven workflow, agents and conventions.
