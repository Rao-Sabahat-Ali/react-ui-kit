import { useEffect, useRef, type RefObject } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useScrollLock } from './useScrollLock';

/** Open modal overlays, oldest first. Only the last one reacts to Escape and stays interactive. */
const overlayStack: HTMLElement[] = [];
const inertByUs = new Set<Element>();

function syncInert() {
  for (const el of inertByUs) el.removeAttribute('inert');
  inertByUs.clear();
  const top = overlayStack[overlayStack.length - 1];
  if (!top) return;
  for (const child of Array.from(document.body.children)) {
    if (child === top || child.contains(top) || child.tagName === 'SCRIPT' || child.hasAttribute('inert')) continue;
    child.setAttribute('inert', '');
    inertByUs.add(child);
  }
}

export interface OverlayOptions {
  /** Portal root of the overlay (direct child of body). */
  rootRef: RefObject<HTMLElement | null>;
  /** Element that traps focus (dialog content). */
  contentRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  /** Modal overlays lock scroll, trap focus and make the rest of the page inert. */
  modal?: boolean;
}

/**
 * Shared behaviour for modal overlays (Dialog, Drawer, ConfirmDialog):
 * focus trap + restore, scroll lock, inert background, Escape for the top-most overlay only.
 */
export function useOverlay({ rootRef, contentRef, onEscape, initialFocus, modal = true }: OverlayOptions): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useScrollLock(modal);
  useFocusTrap(contentRef, { active: modal, initialFocus, restoreFocus: true });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    overlayStack.push(root);
    if (modal) syncInert();
    return () => {
      const index = overlayStack.lastIndexOf(root);
      if (index !== -1) overlayStack.splice(index, 1);
      syncInert();
    };
  }, [rootRef, modal]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || overlayStack[overlayStack.length - 1] !== rootRef.current) return;
      if (!onEscapeRef.current) return;
      event.stopPropagation();
      onEscapeRef.current();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [rootRef]);
}
