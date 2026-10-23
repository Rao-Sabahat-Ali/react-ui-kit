import { useRef } from 'react';
import { Menu } from '../Menu/Menu';
import type { MenuItem } from '../Menu/types';
import { ContextMenu } from './ContextMenu';

const items: MenuItem[] = [
  { label: 'Open', icon: 'eye' },
  { label: 'Rename', icon: 'edit', shortcut: 'F2' },
  { label: 'Move to', items: [{ label: 'Archive' }, { label: 'Shared' }] },
  { separator: true, label: '' },
  { label: 'Delete', icon: 'trash', danger: true },
];

function Example() {
  const rowRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={rowRef} tabIndex={0} role="region" aria-label="Report.pdf" className="d-flex align-items-center justify-content-between border rounded p-3">
      <span>Report.pdf — right-click, long-press or Shift+F10</span>
      {/* Visible equivalent: context menus must not be the only way to reach actions. */}
      <Menu popup items={items} />
      <ContextMenu target={rowRef} items={items} ariaLabel="File actions" />
    </div>
  );
}

export const examples = [
  {
    title: 'On a focusable row',
    description: 'Opens at the pointer on right-click, at the row on Shift+F10 / ContextMenu key, or after a 500 ms long-press. A visible "More actions" button offers the same items.',
    code: `const rowRef = useRef(null);\n<div ref={rowRef} tabIndex={0}>…<Menu popup items={items} /></div>\n<ContextMenu target={rowRef} items={items} ariaLabel="File actions" />`,
    render: () => <Example />,
  },
];
