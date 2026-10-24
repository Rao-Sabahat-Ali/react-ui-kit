import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { en, type MessageKey, type Messages } from './en';

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

export interface LocaleContextValue {
  locale: string;
  dir: 'ltr' | 'rtl';
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  /** Plural-aware lookup: uses `${base}_${Intl.PluralRules category}`, falling back to `_other`. */
  tp: (base: string, count: number, vars?: Record<string, string | number>) => string;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function createValue(locale: string, messages: Partial<Messages> | undefined, dir?: 'ltr' | 'rtl'): LocaleContextValue {
  const merged = { ...en, ...messages };
  const language = locale.split('-')[0]?.toLowerCase() ?? 'en';
  const plural = new Intl.PluralRules(locale);
  const lookup = (key: string) => (merged as Record<string, string | undefined>)[key] ?? (en as Record<string, string | undefined>)[key];
  return {
    locale,
    dir: dir ?? (RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'),
    t: (key, vars) => interpolate(merged[key] ?? en[key], vars),
    tp: (base, count, vars) => interpolate(lookup(`${base}_${plural.select(count)}`) ?? lookup(`${base}_other`) ?? base, { count, ...vars }),
  };
}

const defaultValue = createValue('en', undefined);
const LocaleContext = createContext<LocaleContextValue>(defaultValue);

export interface LocaleProviderProps {
  locale: string;
  dir?: 'ltr' | 'rtl';
  messages?: Partial<Messages>;
  children: ReactNode;
}

export function LocaleProvider({ locale, dir, messages, children }: LocaleProviderProps) {
  const value = useMemo(() => createValue(locale, messages, dir), [locale, messages, dir]);
  return (
    <LocaleContext.Provider value={value}>
      <div dir={value.dir} lang={locale} className="ui-locale">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

/** Works without a provider (English defaults). */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
