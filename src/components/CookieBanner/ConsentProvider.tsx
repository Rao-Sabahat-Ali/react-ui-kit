import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createConsentStore, parseRecord, SERVER_SNAPSHOT } from './storage';
import type { ConsentApi, ConsentCategory, ConsentMode, ConsentProviderProps, ConsentRecord } from './types';

const DEFAULT_CATEGORIES: ConsentCategory[] = [{ id: 'necessary', required: true }];

/** `notice` when every category is required (nothing to choose), `consent` otherwise. */
export const resolveAutoMode = (categories: ConsentCategory[]): ConsentMode => (categories.every((c) => c.required) ? 'notice' : 'consent');

/** Shared by CookieBanner and the provider; not part of the public API. */
export interface ConsentInternals {
  /** False on the server and during hydration: the banner renders nothing until the record has been read. */
  ready: boolean;
  record: ConsentRecord | null;
  categories: ConsentCategory[];
  /** The banner asked to show again (notice mode `openSettings`). */
  bannerForced: boolean;
  prefsOpen: boolean;
  /** Changes on every open, so the preferences form starts from the stored record each time. */
  prefsKey: number;
  openPrefs: () => void;
  closePrefs: () => void;
  /** The mode the mounted CookieBanner resolved, so decisions are stored with it. */
  registerMode: (mode: ConsentMode | null) => void;
}

const ConsentContext = createContext<ConsentApi | null>(null);
const InternalContext = createContext<ConsentInternals | null>(null);
const serverSnapshot = () => SERVER_SNAPSHOT;

export function ConsentProvider({
  categories = DEFAULT_CATEGORIES,
  policyVersion = '1',
  maxAgeDays = 365,
  storage = 'localStorage',
  storageKey = 'ui:consent',
  onChange,
  children,
}: ConsentProviderProps) {
  const store = useMemo(() => createConsentStore(storage, storageKey, maxAgeDays), [storage, storageKey, maxAgeDays]);
  const raw = useSyncExternalStore(store.subscribe, store.read, serverSnapshot);
  const ready = raw !== SERVER_SNAPSHOT;
  const record = useMemo(() => (ready ? parseRecord(raw, policyVersion, maxAgeDays) : null), [raw, ready, policyVersion, maxAgeDays]);

  const [bannerForced, setBannerForced] = useState(false);
  const [prefs, setPrefs] = useState({ open: false, key: 0 });
  const modeRef = useRef<ConsentMode | null>(null);
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const policyRef = useRef(policyVersion);
  policyRef.current = policyVersion;

  const currentMode = useCallback(() => modeRef.current ?? resolveAutoMode(categoriesRef.current), []);

  const commit = useCallback(
    (choices: (category: ConsentCategory) => boolean) => {
      const granted: Record<string, boolean> = {};
      for (const category of categoriesRef.current) granted[category.id] = category.required ? true : choices(category);
      const next: ConsentRecord = { version: policyRef.current, decidedAt: new Date().toISOString(), mode: currentMode(), categories: granted };
      store.write(JSON.stringify(next));
      setBannerForced(false);
      setPrefs((p) => (p.open ? { ...p, open: false } : p));
    },
    [store, currentMode],
  );

  // onChange runs once per decision, including one made in another tab. The record that was there at load is not a decision.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    if (seen.current === undefined) {
      seen.current = raw;
      return;
    }
    if (raw === seen.current) return;
    seen.current = raw;
    if (record) onChangeRef.current?.(record);
  }, [raw, ready, record]);

  const openPrefs = useCallback(() => setPrefs((p) => (p.open ? p : { open: true, key: p.key + 1 })), []);
  const closePrefs = useCallback(() => setPrefs((p) => (p.open ? { ...p, open: false } : p)), []);
  const registerMode = useCallback((mode: ConsentMode | null) => {
    modeRef.current = mode;
  }, []);

  const api = useMemo<ConsentApi>(() => {
    const required = new Set(categories.filter((c) => c.required).map((c) => c.id));
    return {
      record,
      decided: record !== null,
      has: (id) => required.has(id) || record?.categories[id] === true,
      acceptAll: () => commit(() => true),
      rejectAll: () => commit(() => false),
      save: (choices) => commit((c) => choices[c.id] === true),
      openSettings: () => {
        if (currentMode() === 'notice') setBannerForced(true);
        else openPrefs();
      },
    };
  }, [record, categories, commit, currentMode, openPrefs]);

  const internals = useMemo<ConsentInternals>(
    () => ({ ready, record, categories, bannerForced, prefsOpen: prefs.open, prefsKey: prefs.key, openPrefs, closePrefs, registerMode }),
    [ready, record, categories, bannerForced, prefs, openPrefs, closePrefs, registerMode],
  );

  return (
    <ConsentContext.Provider value={api}>
      <InternalContext.Provider value={internals}>{children}</InternalContext.Provider>
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentApi {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used inside <ConsentProvider>.');
  return ctx;
}

/** @internal */
export function useConsentInternals(): ConsentInternals {
  const ctx = useContext(InternalContext);
  if (!ctx) throw new Error('CookieBanner must be used inside <ConsentProvider>.');
  return ctx;
}
