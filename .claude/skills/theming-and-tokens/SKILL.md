---
name: theming-and-tokens
description: How theming works in react-ui-kit — generated token CSS, Bootstrap bridge, light/dark via data-bs-theme, app profiles via data-ui-profile, density — and how to style components or propagate token changes.
---

# Theming and tokens

- Tokens come from design-system-mcp `specs/tokens/tokens.json` and are generated into `src/styles/_tokens.generated.scss` + `src/theme/profiles.generated.ts` by `npm run sync:ui-kit` in that repo. Never edit generated files.
- `src/styles/_bridge.scss` maps `--ui-*` onto Bootstrap's runtime `--bs-*` variables and re-points compile-time Bootstrap colours (buttons, text-bg, form focus, dropdowns, pagination) at tokens.
- Attributes (set by `ThemeProvider`): `data-bs-theme="light|dark"`, `data-ui-profile="<profile>"`, optional `data-ui-density`. Profiles can be nested on subtrees; each profile block resets all profile-overridable tokens.
- Component styles use semantic tokens (`--ui-color-primary`, `--ui-color-surface`, `--ui-color-border`, …) and scales (`--ui-space-*`, `--ui-radius*`, `--ui-control-height-*`, `--ui-z-*`, `--ui-duration`). Never colour primitives or raw values.
- Need a new token? Change tokens.json in design-system-mcp (its `update-tokens` skill), sync, then use it here.
- Check every visual change in light and dark, and in `admin` (compact), `pos` (spacious) and `game` (dark, rounded) profiles via the docs top bar.
