import type { ReactNode } from 'react';

export type ConsentMode = 'consent' | 'notice';
export type ConsentStorage = 'localStorage' | 'cookie';

export interface ConsentCategory {
  id: string;
  /** Switch label in the preferences dialog (defaults to the id). */
  label?: ReactNode;
  /** What the category stores and why, in plain words. */
  description?: ReactNode;
  /** Always on and shown as on and disabled (strictly necessary storage). */
  required?: boolean;
}

/** What is stored. It never contains personal data. */
export interface ConsentRecord {
  version: string;
  /** ISO 8601 */
  decidedAt: string;
  mode: ConsentMode;
  categories: Record<string, boolean>;
}

export interface ConsentApi {
  /** The valid stored record, or null while the visitor has not decided (or the record is outdated, expired or unreadable). */
  record: ConsentRecord | null;
  decided: boolean;
  /** True when the category is granted. Required categories are always granted. */
  has: (categoryId: string) => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  /** Stores exactly these choices (required categories stay on, unknown ids are ignored). */
  save: (choices: Record<string, boolean>) => void;
  /** Consent mode: opens the preferences dialog. Notice mode: shows the banner again. */
  openSettings: () => void;
}

export interface ConsentProviderProps {
  categories?: ConsentCategory[];
  /** Changing it invalidates earlier records, so the banner asks again. */
  policyVersion?: string;
  maxAgeDays?: number;
  storage?: ConsentStorage;
  storageKey?: string;
  /** Called after every decision, including one made in another tab. */
  onChange?: (record: ConsentRecord) => void;
  children?: ReactNode;
}

export type CookieBannerPlacement = 'bottom' | 'bottom-start' | 'bottom-end';

export interface CookieBannerProps {
  mode?: 'auto' | ConsentMode;
  title?: ReactNode;
  /** What is stored and why. Defaults to the locale message for the mode. */
  children?: ReactNode;
  /** Link to the privacy or cookie page (passed through `safeUrl`; unsafe URLs render no link). */
  policyHref?: string;
  policyLabel?: ReactNode;
  placement?: CookieBannerPlacement;
  className?: string;
}
