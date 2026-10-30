import { canUseDOM } from '../../utils/dom';
import type { ConsentMode, ConsentRecord, ConsentStorage } from './types';

export const COOKIE_NAME = 'ui_consent';
const DAY_MS = 86_400_000;
const CATEGORY_ID = /^[\w.:-]{1,64}$/;

/** Snapshot used while rendering on the server and during hydration: nothing has been read yet. */
export const SERVER_SNAPSHOT = '\u0000server';

/**
 * Validates a stored value by shape. Anything unparseable, malformed, from another policy version, older than
 * `maxAgeDays` or dated in the future counts as no record. Never throws.
 */
export function parseRecord(raw: string | null, policyVersion: string, maxAgeDays: number, now: number = Date.now()): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const { version, decidedAt, mode, categories } = value as Record<string, unknown>;
    if (version !== policyVersion) return null;
    if (typeof decidedAt !== 'string') return null;
    const decided = Date.parse(decidedAt);
    if (Number.isNaN(decided) || decided > now + DAY_MS || now - decided > maxAgeDays * DAY_MS) return null;
    if (mode !== 'consent' && mode !== 'notice') return null;
    if (typeof categories !== 'object' || categories === null || Array.isArray(categories)) return null;
    const clean: Record<string, boolean> = {};
    for (const [id, granted] of Object.entries(categories)) {
      if (typeof granted !== 'boolean' || !CATEGORY_ID.test(id) || id === '__proto__') return null;
      clean[id] = granted;
    }
    return { version, decidedAt, mode: mode as ConsentMode, categories: clean };
  } catch {
    return null;
  }
}

export function readCookie(): string | null {
  try {
    for (const part of document.cookie.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === COOKIE_NAME) return decodeURIComponent(rest.join('='));
    }
  } catch {
    // Cookies blocked or malformed: treat as absent.
  }
  return null;
}

function writeCookie(json: string, maxAgeDays: number): void {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(json)}; Path=/; SameSite=Lax; Max-Age=${Math.round(maxAgeDays * 86_400)}${secure}`;
  } catch {
    // Cookies blocked: the caller keeps the decision in memory.
  }
}

export interface ConsentStore {
  subscribe: (notify: () => void) => () => void;
  /** The stored raw JSON, or null. Stable between calls while nothing changed. */
  read: () => string | null;
  write: (json: string) => void;
}

/**
 * Where the record lives. Every storage access is guarded; when persisting fails the decision is kept in memory for
 * the page so the banner still goes away. Cross-tab updates arrive through the `storage` event (localStorage) and
 * when the page regains focus (cookie, which has no change event).
 */
export function createConsentStore(storage: ConsentStorage, key: string, maxAgeDays: number): ConsentStore {
  const listeners = new Set<() => void>();
  let memory: string | null = null;
  const notify = () => listeners.forEach((l) => l());

  const readPersisted = (): string | null => {
    if (!canUseDOM) return null;
    if (storage === 'cookie') return readCookie();
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (storage === 'localStorage' && (event.key === key || event.key === null)) listener();
      };
      const onRefresh = () => {
        if (storage === 'cookie' && document.visibilityState !== 'hidden') listener();
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener('focus', onRefresh);
      document.addEventListener('visibilitychange', onRefresh);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('focus', onRefresh);
        document.removeEventListener('visibilitychange', onRefresh);
      };
    },
    read() {
      return readPersisted() ?? memory;
    },
    write(json) {
      if (storage === 'cookie') writeCookie(json, maxAgeDays);
      else {
        try {
          window.localStorage.setItem(key, json);
        } catch {
          // Quota or blocked storage: keep the decision for this page only.
        }
      }
      // Browsers can silently refuse a cookie: only a value that reads back counts as stored.
      memory = readPersisted() === json ? null : json;
      notify();
    },
  };
}
