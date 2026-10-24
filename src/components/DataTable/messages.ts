import { type LocaleContextValue } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import type { MatchMode } from './types';

/** DataTable message lookup (all keys live in `src/locale/en.ts`). */
export function createMessages({ t }: LocaleContextValue) {
  return (key: MessageKey, vars?: Record<string, string | number>): string => t(key, vars);
}

export const MATCH_MODE_KEY: Record<MatchMode, MessageKey> = {
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
