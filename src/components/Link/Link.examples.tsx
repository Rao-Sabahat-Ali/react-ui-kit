import { Link } from './Link';

export const examples = [
  {
    title: 'Internal, external and current',
    description: 'Router-agnostic: pass `onNavigate` to take over plain left clicks on internal links.',
    code: `<Link href="/users/42" onNavigate={(href) => navigate(href)}>Jane Doe</Link>\n<Link href="https://getbootstrap.com/docs/5.3">Bootstrap docs</Link>\n<Link href="/settings" current="page" underline="hover">Settings</Link>`,
    render: () => (
      <div className="d-flex flex-wrap gap-4">
        <Link href="#users" onNavigate={() => {}}>Jane Doe</Link>
        <Link href="https://getbootstrap.com/docs/5.3">Bootstrap docs</Link>
        <Link href="#settings" current="page" underline="hover">Settings</Link>
        <Link href="#disabled" disabled>Disabled</Link>
        <Link href="#home" icon="home">With icon</Link>
      </div>
    ),
  },
];
