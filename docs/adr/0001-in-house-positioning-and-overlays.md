# ADR 0001 — In-house positioning, focus and overlay stack

- Status: accepted
- Date: 2026-10-23

## Context
Popups (Select, Popover, Tooltip, Menu) and overlays (Dialog, Drawer) need positioning, focus trapping, scroll locking and stacking. Popper/Floating UI and Bootstrap JS are banned (dependency policy).

## Decision
- `utils/position.ts` `computePosition()` (side/align, flip, shift, RTL) + `useFloating` hook with `position: fixed`, updated on scroll/resize.
- `useFocusTrap` with a module-level stack (top-most trap handles Tab; parents mounting with nested traps insert below them).
- Dialog keeps an overlay stack: Escape closes the top-most; background body children get `inert` while an overlay is open; `useScrollLock` is reference-counted.
- `Portal` renders immediately on the client (via `useSyncExternalStore`) so parent effects see refs.

## Consequences
Small, tested, dependency-free primitives reused by every overlay. Arrow/auto-placement features beyond flip/shift are added only when a spec needs them.
