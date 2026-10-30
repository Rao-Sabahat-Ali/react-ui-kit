---
version: 1
slug: "docs-app-index-html"
primary_target: "docs-app/index.html"
related_targets: ["src/styles/index.scss"]
---

# react-ui-kit v2 — design system surface

Scope: the whole component library, its docs app and blueprints. Visitor mode: Operate (people completing tasks in apps); landing/game profiles may lean Persuade/Experience within the same world.
Audience: the owner and coding agents building personal apps; secondary, the apps' end users (learners, dashboard users, players, shoppers).
Constraints: PRODUCT.md (WCAG 2.2 AA, zero runtime deps, perf budgets, 8 profiles, light/dark).

## Direction contract
THESIS: Every flow is an assembly sheet: numbered steps, one action each, a picture before words. It refuses the category default of a SaaS card grid with a blue accent and the previous cream-and-serif editorial.
OWN-WORLD: White instruction paper and black 2px line art; kraft cardboard as the shell material (rail, headers); one signal blue for the active step, selection and focus; quantity marks like "1×" and "8×"; large light step numerals in a Scandinavian grotesk; parts drawn with dashed guide lines and rounded 6px corners, flat, no shadows except overlays lifted off the sheet.
STORY: The user sees what to do next as a numbered step, does it, and watches the part click into place; progress is the sheet filling in.
FIRST VIEWPORT: Kraft rail left with line-art icons; white sheet right; page title, then the work as numbered step panels (step numeral 96–120px light, one diagram or key value, one action) in a ruled strip; the primary action sits inside the active step, bottom left.
FORM: Assembly instructions (Monteringsanvisning), candidate 1 of 7; seed:2e6c43e72e4ad580. Signature move: multi-step work (sessions, onboarding, checkout, steppers, board columns) rendered as numbered step panels whose parts assemble along dashed guide lines when they enter.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
