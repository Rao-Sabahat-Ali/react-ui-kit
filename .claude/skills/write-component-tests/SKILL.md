---
name: write-component-tests
description: Write Vitest + Testing Library tests for a react-ui-kit component, one test per spec acceptance criterion, with keyboard and focus coverage.
---

# Component tests

- File: `src/components/<Name>/<Name>.test.tsx`. Environment: jsdom (`test/setup.ts` adds jest-dom matchers, matchMedia stub, cleanup).
- Name tests after ACs: `it('AC-3: Escape closes without change', …)`. Every AC in the spec → at least one test. Extra edge cases get descriptive names.
- Query by role and accessible name (`getByRole('combobox', { name: 'Country' })`); avoid test ids and class selectors except when the AC is about classes.
- Interactions: `userEvent` (`await userEvent.click`, `.keyboard('{ArrowDown}{Enter}')`). For held modifiers use `const user = userEvent.setup()` and the same instance throughout.
- Focus: assert `toHaveFocus()` on open/close/restore.
- Controlled components: test with a small stateful harness; uncontrolled with `defaultValue`.
- Portals render into `document.body` — query with `screen`, not the render container.
- Overlays: assert Escape, outside click, focus trap, scroll lock cleanup.
- Never snapshot whole DOM trees; assert specific semantics.
- Run `npx vitest run src/components/<Name>` while iterating, `npm test` before finishing.
