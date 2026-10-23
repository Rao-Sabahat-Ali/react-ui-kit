import { Kbd } from './Kbd';

export const examples = [
  {
    title: 'Platform-aware shortcuts',
    description: '`Mod` resolves to ⌘ on Apple platforms and Ctrl elsewhere.',
    code: `<Kbd keys={['Mod', 'K']} />\n<Kbd keys="Escape" />\n<p>Press <Kbd keys={['Shift', '?']} size="sm" /> for help.</p>`,
    render: () => (
      <div className="d-flex flex-column gap-2">
        <div className="d-flex gap-3 align-items-center">
          <Kbd keys={['Mod', 'K']} />
          <Kbd keys="Escape" />
          <Kbd keys={['Mod', 'Shift', 'P']} platform="apple" />
          <Kbd keys={['Mod', 'Shift', 'P']} platform="other" />
        </div>
        <p className="mb-0">
          Press <Kbd keys={['Shift', '?']} size="sm" /> to show shortcuts.
        </p>
      </div>
    ),
  },
];
