/**
 * Copies text to the clipboard. Uses the async Clipboard API when available and falls back to a hidden
 * `<textarea>` + `execCommand('copy')` (insecure contexts, older browsers, denied permission).
 * Resolves `true` on success, `false` on failure. The text is never logged.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or not focused: try the legacy path.
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.tabIndex = -1;
  area.style.position = 'fixed';
  area.style.insetBlockStart = '0';
  area.style.insetInlineStart = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  let ok = false;
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    area.remove();
    if (previous?.isConnected) previous.focus();
  }
  return ok;
}
