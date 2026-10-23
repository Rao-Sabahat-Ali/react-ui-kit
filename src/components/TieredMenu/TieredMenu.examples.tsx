import { Button } from '../Button/Button';
import type { MenuItem } from '../Menu/types';
import { TieredMenu } from './TieredMenu';

const items: MenuItem[] = [
  { label: 'New', icon: 'plus', items: [{ label: 'Document' }, { label: 'Spreadsheet' }, { label: 'From template', items: [{ label: 'Invoice' }, { label: 'Report' }] }] },
  { label: 'Open recent', items: [{ label: 'Budget 2026.xlsx' }, { label: 'Roadmap.md' }] },
  { separator: true, label: '' },
  { label: 'Settings', icon: 'settings' },
];

export const examples = [
  {
    title: 'Inline',
    description: 'ArrowRight / Enter opens a submenu, ArrowLeft / Escape closes it. Hover opens after 150 ms and closes 300 ms after leaving.',
    code: `<TieredMenu ariaLabel="File" items={items} />`,
    render: () => <TieredMenu ariaLabel="File" items={items} />,
  },
  {
    title: 'Popup',
    code: `<TieredMenu popup items={items} trigger={<Button variant="secondary">File</Button>} />`,
    render: () => <TieredMenu popup items={items} trigger={<Button variant="secondary">File</Button>} />,
  },
];
