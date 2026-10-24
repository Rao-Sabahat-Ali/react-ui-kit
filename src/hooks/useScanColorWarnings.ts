import { useEffect, type RefObject } from 'react';
import { contrastRatio, parseColor, relativeLuminance, resolveCssColor, warnOnce } from '../utils/scan';

/**
 * Development-only: warn (once) when the foreground/background of a scannable code has less than 4:1 contrast
 * or is inverted (light modules on a dark ground), which many scanners cannot read. No-op in production builds.
 */
export function useScanColorWarnings(name: string, host: RefObject<Element | null>, foreground: string, background: string): void {
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    const f = parseColor(resolveCssColor(host.current, foreground));
    const b = parseColor(resolveCssColor(host.current, background));
    if (!f || !b) return;
    const ratio = contrastRatio(f, b);
    if (ratio < 4) warnOnce(`${name}: foreground ${foreground} on background ${background} has a contrast of ${ratio.toFixed(1)}:1 (below 4:1); scanners may fail. Use the default tokens.`);
    if (relativeLuminance(f) > relativeLuminance(b)) warnOnce(`${name}: ${foreground} on ${background} is inverted (light on dark); many scanners cannot read it. Keep the bars darker than the background.`);
  }, [name, host, foreground, background]);
}
