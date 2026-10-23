const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Returns the URL if it is relative or uses a safe protocol; otherwise undefined. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^(\/|\.\/|\.\.\/|#|\?)/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? trimmed : undefined;
  } catch {
    // Not absolute: treat as relative path only when it has no scheme-like prefix.
    return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? undefined : trimmed;
  }
}
