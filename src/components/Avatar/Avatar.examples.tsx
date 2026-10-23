import { Avatar, AvatarGroup } from './Avatar';

export const examples = [
  {
    title: 'Initials, icon, status and group',
    description: 'Initials get a deterministic colour from the chart palette; failed images fall back to initials.',
    code: `<Avatar name="Jane Doe" status="online" />\n<Avatar icon="settings" shape="square" size="lg" />\n<AvatarGroup max={3}>…</AvatarGroup>`,
    render: () => (
      <div className="d-flex flex-column gap-3">
        <div className="d-flex align-items-center gap-3">
          <Avatar name="Jane Doe" status="online" size="sm" />
          <Avatar name="Sam Lee" status="busy" />
          <Avatar name="Åsa Öberg" status="away" size="lg" />
          <Avatar icon="settings" shape="square" size="xl" />
          <Avatar name="Broken" image="/missing.png" />
        </div>
        <AvatarGroup max={3}>
          {['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Linus Torvalds', 'Margaret Hamilton'].map((n) => <Avatar key={n} name={n} />)}
        </AvatarGroup>
      </div>
    ),
  },
];
