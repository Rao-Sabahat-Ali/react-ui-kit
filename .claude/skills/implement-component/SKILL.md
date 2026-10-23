---
name: implement-component
description: Step-by-step recipe to implement a react-ui-kit component from its design-system spec — file layout, API conventions, a11y, styling with tokens, exports and registration.
---

# Implement a component

## Files
```
src/components/<Name>/
  <Name>.tsx            component (+ subcomponents)
  <Name>.scss           styles: Bootstrap classes + ui-<slug> BEM, tokens only
  <Name>.test.tsx       one test per AC
  <Name>.examples.tsx   docs examples
  index.ts              named exports (component + Props types)
```
Register in `src/index.ts` (alphabetical) and `src/styles/index.scss`.

## API rules (from specs/rules/component-api.md)
- `value`/`defaultValue`/`onChange(value, event?)` via `useControllableState`.
- Shared props: `className`, `style`, `id`, `ref` (React 19 ref-as-prop), `size: 'sm'|'md'|'lg'`, `variant` intent, `disabled`, `invalid`, `...rest` to the root native element.
- Form controls read `useFieldControl()` so `<Field>` wires id/label/description/invalid/required.
- User-facing strings: `useLocale().t('key')`; add keys to `src/locale/en.ts`.

## Building blocks
- Overlays: `Portal`, `useFocusTrap`, `useScrollLock`, Dialog's overlay stack pattern (Escape top-most, inert background).
- Popups: `useFloating(anchorRef, floatingRef, { placement, matchWidth })`, `useClickOutside`.
- Lists: roving tabindex (Tabs) or `aria-activedescendant` (Select) — follow the spec's APG pattern.
- Utils: `cx`, `safeUrl`, `compareValues`, `getByPath`, `getFocusable`, `computePosition`.

## Styling
- Bootstrap markup first (`btn`, `form-control`, `dropdown-menu`, `nav`, `modal`…), then `ui-*` classes.
- Only `var(--ui-*)` tokens: colours, `--ui-radius*`, `--ui-control-height-*`, `--ui-space-*`, `--ui-z-*`, `--ui-duration`/`--ui-easing`.
- Logical properties (`margin-inline-start`, `inset-inline-end`) for RTL.
- `@media (prefers-reduced-motion: reduce)` for any animation; `@media (pointer: coarse)` touch targets.

## Definition of done
Every AC tested · typecheck/test/build green · examples present · reviewer (+a11y/security) passed · task closed.
