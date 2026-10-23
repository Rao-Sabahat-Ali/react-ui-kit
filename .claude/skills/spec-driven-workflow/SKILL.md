---
name: spec-driven-workflow
description: Mandatory workflow for any react-ui-kit change. Use at the start of every task: pick the UI-* task, read the spec from the design-system MCP, plan with architect, implement, test every AC, review, document, mark done.
---

# Spec-driven workflow (react-ui-kit)

Specs live in **design-system-mcp**. This repo implements them. No spec → no code.

1. **Task** — pick a task from `tasks.md`, mark `[~]`.
2. **Spec** — `get_component_spec("<Name>")` via the design-system MCP (configured in `.mcp.json`) or read `../design-system-mcp/specs/components/<slug>.md`. If the spec is missing/wrong: stop, fix the spec in design-system-mcp first (its own workflow), then continue.
3. **Plan** — `architect` agent for new components or API/shared-code changes.
4. **Implement** — `component-builder` agent or the `implement-component` skill.
5. **Test** — `write-component-tests` skill: one `it('AC-n: …')` per acceptance criterion.
6. **Verify** — `npm run typecheck && npm test && npm run build && npm run build:docs`.
7. **Review** — `reviewer` always; `a11y-reviewer` for interactive components; `security-reviewer` for HTML/URL/file/secret/storage handling. Fix blocker/major findings.
8. **Docs** — examples file (`add-docs-example` skill / `docs-writer` agent); check the page in `npm run dev` in light + dark and at least two profiles.
9. **Close** — mark `[x]` with commit hash; in design-system-mcp set the spec `status: implemented`, run its tests (conformance), bump the submodule pointer there.
