import type { ReactNode } from 'react';
import { useConsent } from './ConsentProvider';

export interface ConsentGateProps {
  category: string;
  children?: ReactNode;
}

/** Renders its children only while the category is granted; withdrawing consent unmounts them. */
export function ConsentGate({ category, children }: ConsentGateProps) {
  return useConsent().has(category) ? <>{children}</> : null;
}
