import type { MegaMenuItem } from './MegaMenu';
import { MegaMenu } from './MegaMenu';

const items: MegaMenuItem[] = [
  {
    label: 'Shop',
    href: '#shop',
    columns: [
      { header: 'Computers', items: [{ label: 'Laptops', href: '#laptops' }, { label: 'Desktops', href: '#desktops' }] },
      { header: 'Phones', items: [{ label: 'Smartphones', href: '#phones' }, { label: 'Cases', href: '#cases' }] },
    ],
    featured: <div className="p-3 rounded bg-body-tertiary">Autumn sale — up to 30% off</div>,
  },
  { label: 'Brands', columns: [{ header: 'Popular', items: [{ label: 'Acme', href: '#acme' }, { label: 'Globex', href: '#globex' }] }] },
  { label: 'Deals', href: '#deals' },
];

export const examples = [
  {
    title: 'Horizontal',
    description: 'Disclosure buttons open multi-column panels in DOM order; Escape or tabbing away closes them.',
    code: `<MegaMenu items={items} ariaLabel="Shop" activeHref="#phones" openOnHover />`,
    render: () => <MegaMenu items={items} ariaLabel="Shop" activeHref="#phones" openOnHover />,
  },
  {
    title: 'Vertical (sidebar)',
    code: `<MegaMenu items={items} orientation="vertical" ariaLabel="Categories" />`,
    render: () => (
      <div style={{ maxWidth: '14rem' }}>
        <MegaMenu items={items} orientation="vertical" ariaLabel="Categories" />
      </div>
    ),
  },
];
