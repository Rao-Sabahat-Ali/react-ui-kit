import { Breadcrumb } from './Breadcrumb';

const items = [
  { label: 'Projects', href: '#projects' },
  { label: 'Website redesign', href: '#redesign' },
  { label: 'Assets', href: '#assets' },
  { label: 'Icons', href: '#icons' },
  { label: 'arrow-left.svg' },
];

export const examples = [
  {
    title: 'Basic',
    code: `<Breadcrumb home={{ label: 'Home', href: '/', icon: 'home' }} items={items.slice(0, 3)} />`,
    render: () => <Breadcrumb home={{ label: 'Home', href: '#', icon: 'home' }} items={items.slice(0, 3)} />,
  },
  {
    title: 'Collapsed with maxItems',
    description: 'Middle items move into an accessible "Show hidden pages" menu.',
    code: `<Breadcrumb items={items} maxItems={3} separator="›" />`,
    render: () => <Breadcrumb items={items} maxItems={3} separator="›" />,
  },
];
