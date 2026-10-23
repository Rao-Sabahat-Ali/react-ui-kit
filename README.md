# react-ui-kit

React 19 + Bootstrap 5.3 component library for the personal design system — PrimeReact-level coverage without PrimeReact, light/dark themes, and app-type profiles (`saas`, `admin`, `dashboard`, `cms`, `pos`, `game`, `ecommerce`, `landing`).

Specs, tokens and rules: [`design-system-mcp`](https://github.com/Rao-Sabahat-Ali/design-system-mcp) (also an MCP server for coding agents).

## Use in an app

```bash
npm install react@^19 react-dom@^19
npm install github:Rao-Sabahat-Ali/react-ui-kit#main   # private: uses your git credentials; pin a tag for production
```

```tsx
import '@sabahat/react-ui-kit/styles.css';
import { ThemeProvider, Button, Field, InputText } from '@sabahat/react-ui-kit';

createRoot(root).render(
  <ThemeProvider profile="admin">
    <Field label="Email"><InputText type="email" /></Field>
    <Button>Save changes</Button>
  </ThemeProvider>
);
```

Add `themeScript({ profile })` output to `index.html` `<head>` to avoid a flash of the wrong theme.

## Status

Implemented (v0.1.0): ThemeProvider, LocaleProvider, Icon, Button, Spinner, Field, InputText, Checkbox/CheckboxGroup, Select (custom + native), Card, Badge, Tag, Skeleton, Message, Dialog, Tabs, Paginator, DataTable (phase 1), Portal, FocusTrap, ThemeToggle (toggle mode).
Everything else is specified and queued in [tasks.md](tasks.md). Live catalogue: `npm run dev`.

## Development

```bash
npm install
npm run dev     # docs app http://localhost:5180
npm run check   # typecheck + tests + build
```

See [CLAUDE.md](CLAUDE.md) for the spec-driven workflow, agents and conventions.
