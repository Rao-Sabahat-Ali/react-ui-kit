import { useState } from 'react';
import { Button } from '@sabahat/react-ui-kit';

export function CodeBlock({ code, label = 'Example code', tall = false }: { code: string; label?: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the code stays selectable.
    }
  };
  return (
    <div className={`docs-code ${tall ? 'docs-code--tall' : ''}`}>
      <Button size="sm" appearance="text" variant="secondary" icon={copied ? 'check' : 'copy'} className="docs-code__copy" onClick={copy} aria-label={label === 'Example code' ? undefined : `Copy ${label}`}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <pre tabIndex={0} role="region" aria-label={label}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
