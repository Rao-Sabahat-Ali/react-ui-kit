import type { ReactNode } from 'react';
import type { Profile } from '@sabahat/react-ui-kit';

export interface PreviewChoice {
  widget: string;
  state: string;
}

export interface Blueprint {
  slug: string;
  title: string;
  summary: string;
  profile: Profile;
  /** design-system-mcp pattern slugs (`get_pattern`). */
  patterns: string[];
  /** Files copied to start an app, first is the screen. */
  files: string[];
  highlights: string[];
  /** Hint shown above the frame. */
  tryIt?: string;
  /** Demo controls: which regions can be forced into which state. */
  preview?: { widgets?: { value: string; label: string }[]; states: { value: string; label: string }[] };
  render: (preview: PreviewChoice) => ReactNode;
}
