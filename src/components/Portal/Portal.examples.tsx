import { useState } from 'react';
import { Button } from '../Button/Button';
import { Portal } from './Portal';

function Demo() {
  const [on, setOn] = useState(true);
  const [inline, setInline] = useState(false);
  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-2">
        <Button appearance="outline" onClick={() => setOn((v) => !v)}>{on ? 'Remove' : 'Add'} portalled note</Button>
        <Button appearance="outline" onClick={() => setInline((v) => !v)}>{inline ? 'Portal into body' : 'Render inline'}</Button>
      </div>
      <div className="p-3 rounded border" style={{ overflow: 'hidden', height: 96, position: 'relative' }}>
        <p className="mb-0 text-body-secondary small">This box clips its content (<code>overflow: hidden</code>).</p>
        {on && (
          <Portal disabled={inline}>
            <div
              role="note"
              className="p-2 rounded border small"
              style={{ position: inline ? 'static' : 'fixed', insetInlineEnd: 16, bottom: 16, background: 'var(--ui-color-surface-raised)', color: 'var(--ui-color-text)', zIndex: 'var(--ui-z-popover)' }}
            >
              {inline ? 'Inline: clipped by the box.' : 'Portalled to document.body: escapes the clipping box (bottom corner of the page).'}
            </div>
          </Portal>
        )}
      </div>
    </div>
  );
}

export const examples = [
  {
    title: 'Escape clipping containers',
    description: 'Portal renders children into `document.body` (or `container`), so overlays are not cut off by `overflow: hidden` or stacking contexts. `disabled` renders inline.',
    code: `<Portal>\n  <div role="note">Rendered in document.body</div>\n</Portal>\n\n<Portal container={someElement}>…</Portal>\n<Portal disabled>…renders inline…</Portal>`,
    render: () => <Demo />,
  },
];
