import type { ReactNode } from 'react';
import { Button, EmptyState } from '@sabahat/react-ui-kit';

/** Data states every data-driven region implements (rules/consistency, section 6). */
export type WidgetState = 'ready' | 'loading' | 'empty' | 'error';

/** Token-based gap between a header-level block (such as a StatGroup) and the first Section. */
export const SECTION_GAP = { marginBlockEnd: 'var(--ui-space-8)' } as const;

export interface StateBlockProps {
  /** Human name of the region, used in the loading and error copy. */
  name: string;
  state: WidgetState;
  onRetry: () => void;
  /** Shown while loading, at the final size of the content so nothing jumps. */
  skeleton: ReactNode;
  /** Empty-state headline. */
  empty: string;
  emptyDescription?: string;
  /** Heading level of the empty and error titles: `h3` inside a Section, `h2` when the region has no Section heading. */
  headingAs?: 'h2' | 'h3';
  /** Rendered when `state` is `ready`. */
  children: ReactNode;
}

/**
 * Renders one region in its loading, empty, error or ready state, independent of its siblings.
 * Loading announces itself politely, error uses `EmptyState variant="error"` with a retry.
 */
export function StateBlock({ name, state, onRetry, skeleton, empty, emptyDescription, headingAs = 'h3', children }: StateBlockProps) {
  if (state === 'loading') {
    return (
      <div aria-busy="true">
        <span className="visually-hidden" role="status">
          Loading {name.toLowerCase()}
        </span>
        {skeleton}
      </div>
    );
  }
  if (state === 'empty') return <EmptyState size="sm" titleAs={headingAs} title={empty} description={emptyDescription} />;
  if (state === 'error') {
    return (
      <EmptyState
        size="sm"
        titleAs={headingAs}
        variant="error"
        live
        title={`${name} did not load`}
        description="The service did not respond. Other parts of the page are not affected."
        action={
          <Button size="sm" appearance="outline" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}
