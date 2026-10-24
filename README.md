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

## Start from a blueprint

The docs app has a **Blueprints** section: complete, runnable screens (analytics dashboard, admin list to detail, overview and index page, settings, sign in, article/detail) built only from kit components and the design contract. Their source is `templates/blueprints/`.

```bash
npm run create-app -- ../my-dashboard --profile dashboard   # home screen = Analytics dashboard blueprint
npm run create-app -- ../my-backoffice --profile admin      # home screen = Admin list to detail blueprint
npm run create-app -- ../my-app --profile dashboard --blank # empty starter page instead
```

## Status

Implemented (v0.2.0): ThemeProvider, LocaleProvider, Icon, Button, Spinner, Field, InputText, Checkbox/CheckboxGroup, RadioGroup, Switch, SelectButton, Select (custom + native), Card, StatCard, Badge, Tag, Skeleton, ProgressBar, Message, Toast, EmptyState, Dialog, ConfirmDialog, Drawer, Tabs, Paginator, DataTable (phase 1), AppShell, Topbar, SidebarNav, BottomNav, PageHeader, Portal, FocusTrap, ThemeToggle (toggle mode).
Everything else is specified and queued in [tasks.md](tasks.md). Live catalogue: `npm run dev`.

## Development

```bash
npm install
npm run dev     # docs app http://localhost:5180
npm run check   # typecheck + tests + build
```

See [CLAUDE.md](CLAUDE.md) for the spec-driven workflow, agents and conventions.
