import { TabMenu } from './TabMenu';

const items = [
  { label: 'Overview', href: '#overview', icon: 'home' as const },
  { label: 'Activity', href: '#activity', badge: 4 },
  { label: 'Members', href: '#members', icon: 'user' as const },
  { label: 'Settings', href: '#settings', icon: 'settings' as const },
];

export const examples = [
  {
    title: 'Variants',
    description: 'Each tab is a link; the active one has aria-current="page". Overflow scrolls horizontally.',
    code: `<TabMenu items={items} activeHref="#activity" ariaLabel="Project" />\n<TabMenu items={items} variant="underline" activeHref="#members" ariaLabel="Project (underline)" />`,
    render: () => (
      <div className="d-flex flex-column gap-3">
        <TabMenu items={items} activeHref="#activity" ariaLabel="Project" />
        <TabMenu items={items} variant="underline" activeHref="#members" ariaLabel="Project (underline)" />
        <TabMenu items={items} variant="pills" activeHref="#overview" ariaLabel="Project (pills)" />
      </div>
    ),
  },
];
