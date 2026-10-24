import { interpolate, type LocaleContextValue } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import type { MatchMode } from './types';

/**
 * English defaults for strings that have no key in `src/locale/en.ts` yet.
 * A LocaleProvider `messages` entry with the same key overrides them.
 */
const LOCAL_DEFAULTS = {
  matchIn: 'Is one of',
  matchMode: 'Match mode',
  filterFrom: 'From',
  filterTo: 'To',
  filterValue: 'Value',
  editorLabel: '{header}, row {index}',
  editRowN: 'Edit row {index}',
  saveRowN: 'Save row {index}',
  cancelEditN: 'Cancel editing row {index}',
  rowActions: 'Actions',
  rowMenu: 'Row actions',
} as const;

export type LocalKey = keyof typeof LOCAL_DEFAULTS;

/** Lookup that falls back to the local English default for keys missing from the locale catalogue. */
export function createMessages({ t }: LocaleContextValue) {
  const lookup = t as unknown as (key: string, vars?: Record<string, string | number>) => string | undefined;
  return (key: MessageKey | LocalKey, vars?: Record<string, string | number>): string => {
    if (key in LOCAL_DEFAULTS) {
      let custom: string | undefined;
      try {
        custom = lookup(key, vars);
      } catch {
        custom = undefined;
      }
      return custom && custom !== 'undefined' ? custom : interpolate(LOCAL_DEFAULTS[key as LocalKey], vars);
    }
    return t(key as MessageKey, vars);
  };
}

export const MATCH_MODE_KEY: Record<MatchMode, MessageKey | LocalKey> = {
  contains: 'matchContains',
  startsWith: 'matchStartsWith',
  endsWith: 'matchEndsWith',
  equals: 'matchEquals',
  notEquals: 'matchNotEquals',
  lt: 'matchLt',
  lte: 'matchLte',
  gt: 'matchGt',
  gte: 'matchGte',
  between: 'matchBetween',
  dateIs: 'matchDateIs',
  dateIsNot: 'matchDateIsNot',
  dateBefore: 'matchDateBefore',
  dateAfter: 'matchDateAfter',
  in: 'matchIn',
};

export type Messages = ReturnType<typeof createMessages>;
