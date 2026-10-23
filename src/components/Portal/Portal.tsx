import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  container?: HTMLElement | null;
  /** Render inline instead of portalling. */
  disabled?: boolean;
}

const noopSubscribe = () => () => {};

/**
 * SSR-safe portal. Client renders portal immediately (so parent effects see refs);
 * during hydration the server snapshot (nothing) is used, then it mounts.
 */
export function Portal({ children, container, disabled = false }: PortalProps) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (disabled) return <>{children}</>;
  if (!isClient) return null;
  return createPortal(children, container ?? document.body);
}
