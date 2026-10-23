import { useState } from 'react';
import { Button } from '../Button/Button';
import { CommandPalette, type Command } from './CommandPalette';

const people = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson', 'Linus Torvalds', 'Margaret Hamilton'];

/** Fake server search that honours the AbortSignal. */
function searchPeople(query: string, signal: AbortSignal): Promise<Command[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(people.filter((p) => p.toLowerCase().includes(query.toLowerCase())).map((p) => ({ id: `person-${p}`, label: p, group: 'People', icon: 'user', run: () => {} }))),
      400,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function Demo() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Command[]>([]);
  const [last, setLast] = useState('nothing yet');
  const commands: Command[] = [
    { id: 'new-invoice', label: 'New invoice', group: 'Actions', icon: 'plus', shortcut: ['Mod', 'N'], run: () => setLast('New invoice') },
    { id: 'export', label: 'Export CSV', group: 'Actions', icon: 'download', run: () => setLast('Export CSV') },
    { id: 'delete-all', label: 'Delete everything', group: 'Actions', icon: 'trash', disabled: true, description: 'Requires admin role' },
    { id: 'go-users', label: 'Users', group: 'Navigation', icon: 'user', keywords: ['people', 'accounts'], run: () => setLast('Users') },
    { id: 'go-settings', label: 'Settings', group: 'Navigation', icon: 'settings', run: () => setLast('Settings') },
  ];
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open command palette (Ctrl/⌘ K)</Button>
      <p className="mt-2 mb-0 text-body-secondary">Last run: {last}</p>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        recent={recent}
        onRun={(c) => setRecent((r) => [c, ...r.filter((x) => x.id !== c.id)].slice(0, 5))}
        onSearch={searchPeople}
      />
    </div>
  );
}

export const examples = [
  {
    title: 'Commands, recent and async search',
    description: 'Press Ctrl+K (⌘K on macOS) anywhere on the page. Typing a name searches a fake server; stale requests are aborted.',
    code: `<CommandPalette open={open} onOpenChange={setOpen} commands={commands} recent={recent}\n  onRun={(c) => setRecent((r) => [c, ...r.filter((x) => x.id !== c.id)].slice(0, 5))}\n  onSearch={async (q, signal) => (await fetch(\`/api/search?q=\${encodeURIComponent(q)}\`, { signal })).json()} />`,
    render: () => <Demo />,
  },
];
