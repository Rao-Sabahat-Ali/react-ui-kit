# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** the owner (a solo developer) and the coding agents (Claude Code) that build his personal web apps. They consume the system through the `design-system` MCP server (specs, tokens, patterns, rules, `check_ui_code`) and the npm package `@sabahat/react-ui-kit`. Their job: ship a new app or screen quickly without re-explaining the design, and have every app look intentional and consistent.
- **Secondary:** the people who use those apps, e.g. Swedish learners using svenska-ord daily on phone and desktop.

## Product Purpose

A personal, agent-native design system: React components plus machine-readable specs and rules, so that AI-built apps share one recognisable, high-quality language instead of generic template output. Success means: a new app built by an agent from the MCP needs no design back-and-forth, passes the checks, and does not look AI-made.

## Positioning

The specs, tokens, patterns and consistency contract are served to coding agents over MCP and enforced by `check_ui_code` and reviewer agents; the component library implements exactly those specs with tests named after their acceptance criteria. Agents get the same rules a human design lead would give, every time.

## Operating Context

- Repos: `design-system-mcp` (specs, tokens, profiles, patterns, rules, MCP server; private) and `react-ui-kit` (components, docs app at react-ui-kit-docs.vercel.app, blueprints, starters; public on npm, MIT). Apps consume the published package; svenska-ord is the reference app.
- Workflow is spec-driven: spec with numbered ACs in the MCP repo → implementation → tests named `AC-n` → docs examples → design/a11y/security reviewer agents → release.
- Apps planned for the next year span every profile: learning/consumer (saas), dashboards and admin tools, landing/marketing pages, games, 3D showcases and commerce.

## Capabilities and Constraints

- React 19, Bootstrap 5.3 SCSS compiled into the kit (no Bootstrap JS, no Popper), TypeScript strict, Vite, Vitest, Playwright.
- **Zero runtime dependencies** besides React in the core package. 3D lives in a separate optional package (three as a peer dependency, lazy-loaded). Animation is built in-house on CSS, the Web Animations API and the View Transitions API.
- Eight app profiles (saas, admin, dashboard, cms, pos, game, ecommerce, landing), light and dark themes, density modes and high-contrast mode must keep working.
- Per-component CSS via the kit's Vite plugin (`virtual:ui-kit-styles`); self-hosted fonts; strict CSP compatibility (no inline styles from the library at runtime beyond CSS custom properties).
- Performance budgets: Lighthouse performance ≥ 0.9 and accessibility = 1 on app key routes in CI; bundle budgets enforced in kit CI.
- Decided 2026-10-29: identity v2 is Monteringsanvisning (assembly sheet) with the four-movement motion grammar (Assemble, Turn, Tick, Lift and drop). Undecided: which components get 3D-capable variants.

## Brand Commitments

- Name: react-ui-kit / `@sabahat/react-ui-kit`; the design system has no consumer-facing brand name.
- The design MCP is the source of truth; third-party design skills (Impeccable, Taste) inform craft but never override it.
- No decorative emoji; flags/symbols only when they carry meaning.

## Evidence on Hand

- 135 implemented components with specs and tests; six blueprints (analytics dashboard, admin list-detail, overview/index, settings, auth, article, checkout) in `templates/blueprints/`.
- svenska-ord in production as the reference consumer app.
- No user research, testimonials, metrics or external adopters exist; never fabricate them.

## Product Principles

1. **Agents first:** every rule is written so an agent can follow and verify it without asking.
2. **One way per need:** a layout or interaction need has exactly one sanctioned component or pattern.
3. **Craft without cost:** richness (motion, depth, 3D) must not break accessibility, performance budgets or the zero-dependency core.
4. **Consistent across apps, distinct per profile:** one family, eight personalities.

## Accessibility & Inclusion

WCAG 2.2 AA is the floor: full keyboard parity (including alternatives to every drag), visible focus, screen-reader announcements for state changes, `prefers-reduced-motion` honoured by every animation, `prefers-contrast` and RTL supported.
