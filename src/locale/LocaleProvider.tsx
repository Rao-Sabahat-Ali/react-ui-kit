import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { en, type MessageKey, type Messages } from './en';

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'dv', 'yi']);

export interface LocaleContextValue {
  locale: string;
  dir: 'ltr' | 'rtl';
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function createValue(locale: string, messages: Partial<Messages> | undefined, dir?: 'ltr' | 'rtl'): LocaleContextValue {
  const merged = { ...en, ...messages };
  const language = locale.split('-')[0]?.toLowerCase() ?? 'en';
  return {
    locale,
    dir: dir ?? (RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'),
    t: (key, vars) => interpolate(merged[key] ?? en[key], vars),
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
