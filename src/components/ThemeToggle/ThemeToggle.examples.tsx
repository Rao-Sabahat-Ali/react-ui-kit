import { ThemeToggle } from './ThemeToggle';

export const examples = [
  {
    title: 'Toggle',
    description: 'Bound to the ThemeProvider at the docs root — try it.',
    code: `<ThemeToggle />\n<ThemeToggle appearance="outline" size="lg" />`,
    render: () => (
      <div className="d-flex gap-2">
        <ThemeToggle />
        <ThemeToggle appearance="outline" size="lg" />
      </div>
    ),
  },
  {
    title: 'Menu with system option',
    description: 'Menu button with Light / Dark / System radio items.',
    code: `<ThemeToggle mode="menu" />`,
    render: () => <ThemeToggle mode="menu" appearance="outline" />,
  },
];
