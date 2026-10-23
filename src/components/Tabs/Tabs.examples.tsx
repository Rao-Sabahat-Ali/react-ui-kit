import { Tabs } from './Tabs';

const sample = (title: string) => <p className="mb-0">{title} settings go here.</p>;

export const examples = [
  {
    title: 'Compound API',
    code: `<Tabs defaultValue="general">\n  <Tabs.List aria-label="Settings">\n    <Tabs.Tab value="general">General</Tabs.Tab>\n    <Tabs.Tab value="security" icon="eye">Security</Tabs.Tab>\n    <Tabs.Tab value="billing" badge={2}>Billing</Tabs.Tab>\n  </Tabs.List>\n  <Tabs.Panel value="general">…</Tabs.Panel>\n  …\n</Tabs>`,
    render: () => (
      <Tabs defaultValue="general">
        <Tabs.List aria-label="Settings">
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="security" icon="eye">Security</Tabs.Tab>
          <Tabs.Tab value="billing" badge={2}>Billing</Tabs.Tab>
          <Tabs.Tab value="archived" disabled>Archived</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general">{sample('General')}</Tabs.Panel>
        <Tabs.Panel value="security">{sample('Security')}</Tabs.Panel>
        <Tabs.Panel value="billing">{sample('Billing')}</Tabs.Panel>
        <Tabs.Panel value="archived">{sample('Archived')}</Tabs.Panel>
      </Tabs>
    ),
  },
  {
    title: 'Pills, underline, vertical',
    code: `<Tabs variant="pills" items={items} aria-label="Pills" />\n<Tabs variant="underline" items={items} aria-label="Underline" />\n<Tabs variant="pills" orientation="vertical" items={items} aria-label="Vertical" />`,
    render: () => {
      const items = ['Overview', 'Activity', 'Members'].map((t) => ({ value: t.toLowerCase(), label: t, content: sample(t) }));
      return (
        <div className="d-flex flex-column gap-4">
          <Tabs variant="pills" items={items} aria-label="Pills" />
          <Tabs variant="underline" items={items} aria-label="Underline" />
          <Tabs variant="pills" orientation="vertical" items={items} aria-label="Vertical" />
        </div>
      );
    },
  },
];
