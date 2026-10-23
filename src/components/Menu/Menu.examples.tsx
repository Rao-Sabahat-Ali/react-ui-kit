import { Button } from '../Button/Button';
import { Menu } from './Menu';
import type { MenuItem } from './types';

const actions: MenuItem[] = [
  { label: 'Edit', icon: 'edit', shortcut: '⌘E' },
  { label: 'Duplicate', icon: 'copy' },
  { label: 'Download', icon: 'download', disabled: true },
  { separator: true, label: '' },
  { label: 'Delete', icon: 'trash', danger: true },
];

export const examples = [
  {
    title: 'Popup menu button',
    description: 'Enter/Space/ArrowDown open on the first item, ArrowUp on the last. Typeahead, Home/End and Escape work as in the APG Menu Button.',
    code: `<Menu popup items={actions} trigger={<Button variant="secondary" icon="more-vertical" aria-label="Row actions" />} />`,
    render: () => <Menu popup items={actions} trigger={<Button variant="secondary" appearance="outline" icon="more-vertical" aria-label="Row actions" />} />,
  },
  {
    title: 'Inline with groups, checkbox and radio items',
    code: `<Menu ariaLabel="View" items={[{ label: 'Layout', items: [{ label: 'Grid', group: 'layout', checked: true }, { label: 'List', group: 'layout' }] }, { label: 'Show hidden files', checked: false }]} />`,
    render: () => (
      <div style={{ maxWidth: '16rem' }}>
        <Menu
          ariaLabel="View"
          items={[
            { label: 'Layout', items: [{ label: 'Grid', group: 'layout', checked: true }, { label: 'List', group: 'layout', checked: false }] },
            { separator: true, label: '' },
            { label: 'Show hidden files', checked: false },
            { label: 'Help centre', href: 'https://example.com/help', target: '_blank', icon: 'external-link' },
          ]}
        />
      </div>
    ),
  },
  {
    title: 'Default trigger',
    description: 'Without a trigger the menu renders a "More actions" icon button.',
    code: `<Menu popup items={actions} />`,
    render: () => (
      <div className="d-flex align-items-center gap-2">
        <span>Invoice #1042</span>
        <Menu popup items={actions} />
        <Button variant="link">Next</Button>
      </div>
    ),
  },
];
